import { PINYIN_QUESTION_TYPES } from './pinyin-domain.js';
import { PINYIN_LEARNING_REASONS } from './pinyin-learning.js?v=pinyin-learning-1';
import { PINYIN_CARD_DATA } from './pinyin-data.js';
import { createPinyinScoutSession } from './pinyin-scout-session.js?v=pinyin-session-2';
import { createConfiguredPinyinTrack } from './pinyin-track-config.js';
import { normalizePinyinHostCards } from './pinyin-host-adapter.js';

(function () {
  'use strict';

  const HANZI_URL = '../../data/hanzi-questions.json';
  const VOICE_MAP_URL = './assets/voice/map.json';
  const VOICE_ASSET_BASE = './assets/voice';
  const ASSET_BASE = './assets/generated/block-runner-assets/';
  const launchParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const launchId = String(launchParams.get('petbankLaunch') || '').trim();
  const profileRef = String(launchParams.get('petbankProfile') || '').trim();
  const hostOrigin = (() => {
    try { return document.referrer ? new URL(document.referrer).origin : ''; } catch (error) { return ''; }
  })();
  let completionSent = false;

  function sendCompletion(score, stars) {
    if (completionSent || !launchId || !profileRef || !window.opener || !hostOrigin) return false;
    try {
      window.opener.postMessage({
        type: 'petbank.bridge.v1.completed',
        version: 1,
        projectId: 'mini-games',
        launchId,
        profileRef,
        activityId: 'pinyin-star-scout',
        completionId: `run:${launchId}`,
        score: Number(score) || 0,
        stars: Number(stars) || 0,
        occurredAt: new Date().toISOString()
      }, hostOrigin);
      completionSent = true;
      return true;
    } catch (error) {
      console.warn('[pinyin-star-scout] completion send failed', error);
      return false;
    }
  }
  const SCOUT_ASSETS = {
    scout: `${ASSET_BASE}hover_scout.png`,
    trail: `${ASSET_BASE}trail_glow.png`,
    portal: `${ASSET_BASE}portal_gate.png`,
    shard: `${ASSET_BASE}star_shard.png`,
    foods: [
      `${ASSET_BASE}pinyin_tile_mint.png`,
      `${ASSET_BASE}pinyin_tile_yellow.png`,
      `${ASSET_BASE}pinyin_tile_coral.png`,
      `${ASSET_BASE}pinyin_tile_blue.png`
    ]
  };
  const FALLBACK_HANZI = [
    { char: '山', pinyin: 'shān', example: '我们一起去爬山。', opts: ['山', '水', '火', '木'] },
    { char: '水', pinyin: 'shuǐ', example: '小鱼在水里游。', opts: ['水', '火', '山', '石'] },
    { char: '火', pinyin: 'huǒ', example: '冬天烤火真暖和。', opts: ['火', '水', '木', '日'] },
    { char: '木', pinyin: 'mù', example: '这是一棵大木头。', opts: ['木', '日', '月', '石'] }
  ];
  const PINYIN_INITIALS = [
    'zh', 'ch', 'sh',
    'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h',
    'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'
  ];
  const DISTRACTOR_CHUNKS = [
    'a', 'o', 'e', 'i', 'u',
    'ai', 'ei', 'ao', 'ou',
    'an', 'en', 'ang', 'eng', 'ong',
    'ia', 'ie', 'iao', 'ian', 'in', 'ing',
    'ua', 'uo', 'uai', 'uan', 'un'
  ];

  const state = {
    mode: 'star-scout',
    size: 12,
    hanzi: FALLBACK_HANZI,
    targetIndex: 0,
    pieces: [],
    pieceIndex: 0,
    foods: [],
    portal: null,
    shards: [],
    awaitingPortal: false,
    awaitingRoute: false,
    body: [],
    dir: { x: 1, y: 0 },
    score: 0,
    roundStars: 3,
    pinyinRevealed: false,
    hintUsed: false,
    hintPenalty: 0,
    learningSession: null,
    routePhase: null,
    routeResponse: null,
    moves: 0,
    timer: null,
    stepMs: 540,
    lastAdvanceAt: 0,
    taskMessage: '按顺序收集拼音块，完成后点亮星星。',
    voiceMap: {},
    voiceAudio: null,
    voiceToken: 0,
    voiceLearningSlowed: false
  };

  const els = {
    board: document.getElementById('board'),
    levelText: document.getElementById('levelText'),
    targetChar: document.getElementById('targetChar'),
    targetPinyin: document.getElementById('targetPinyin'),
    pieceRow: document.getElementById('pieceRow'),
    score: document.getElementById('score'),
    starRow: document.getElementById('starRow'),
    hintButton: document.getElementById('hintButton'),
    hintStatus: document.getElementById('hintStatus'),
    routePanel: document.getElementById('routePanel'),
    routeStage: document.getElementById('routeStage'),
    routePrompt: document.getElementById('routePrompt'),
    routeOptions: document.getElementById('routeOptions'),
    routeBranches: document.getElementById('routeBranches'),
    routeStatus: document.getElementById('routeStatus'),
    progressFill: document.getElementById('progressFill'),
    feedback: document.getElementById('feedback'),
    taskHint: document.getElementById('taskHint'),
    lengthValue: document.getElementById('lengthValue'),
    speakButton: document.getElementById('speakButton'),
    sparkle: document.getElementById('sparkle'),
    warning: document.getElementById('warning')
  };

  function normalizePinyin(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/ü/g, 'u')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z]/g, '');
  }

  function splitPinyin(value) {
    const pinyin = normalizePinyin(typeof value === 'string' ? value : value?.pinyin);
    if (!pinyin) return ['pin'];
    const initial = PINYIN_INITIALS.find(prefix => pinyin.startsWith(prefix) && pinyin.length > prefix.length);
    return initial ? [initial, pinyin.slice(initial.length)].filter(Boolean) : [pinyin];
  }

  function flattenHanziLevels(data) {
    return Object.values(data?.levels || {})
      .flat()
      .filter(item => item?.char && item?.pinyin);
  }

  async function readHanzi() {
    try {
      const response = await fetch(HANZI_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const items = flattenHanziLevels(data);
      if (items.length) state.hanzi = items.slice(0, 16);
    } catch (err) {
      state.hanzi = FALLBACK_HANZI;
    }
  }

  function createLearningCards() {
    return state.hanzi.map((item, index) => {
      const reference = PINYIN_CARD_DATA.find((card) => {
        return card.char === item.char && normalizePinyin(card.pinyinDisplay) === normalizePinyin(item.pinyin);
      });
      return {
      cardId: item.cardId || reference?.cardId || `pinyin:star-scout:${index + 1}`,
      domain: 'pinyin',
      char: item.char,
      pinyinDisplay: item.pinyin,
      audio: item.audio || reference?.audio || 'speech-synthesis',
      example: item.example || reference?.example || `${item.char}的拼音练习。`
      };
    });
  }

  function mountLearningSession() {
    state.learningSession = createPinyinScoutSession({
      sessionId: launchId || 'pinyin-star-scout-local',
      cards: createLearningCards(),
      track: createConfiguredPinyinTrack(),
      questionType: PINYIN_QUESTION_TYPES.FINAL_CHOICE,
      speed: 0
    });
    state.learningSession.mount();
  }

  function applyHostHanzi(cards) {
    const normalized = normalizePinyinHostCards(cards, {
      allowGeneratedId: true,
      assumePinyin: true
    });
    if (!normalized.length) return false;
    state.hanzi = normalized.map((card) => ({
      cardId: card.cardId,
      char: card.char,
      pinyin: card.pinyinDisplay,
      pinyinDisplay: card.pinyinDisplay,
      audio: card.audio,
      example: card.example
    }));
    state.targetIndex = 0;
    state.score = 0;
    return true;
  }

  async function loadVoiceMap() {
    try {
      const response = await fetch(VOICE_MAP_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`voice map http ${response.status}`);
      }
      state.voiceMap = await response.json();
    } catch (error) {
      state.voiceMap = {};
      console.warn('[pinyin-star-scout] local voice map unavailable, fallback to speech synthesis', error);
    }
  }

  function currentTarget() {
    return state.hanzi[state.targetIndex % state.hanzi.length] || FALLBACK_HANZI[0];
  }

  function cleanVoiceText(text) {
    return String(text || '').replace(/\s+/g, '').trim();
  }

  function localVoiceUrl(text) {
    const key = cleanVoiceText(text);
    const digest = key ? state.voiceMap[key] : '';
    return digest ? `${VOICE_ASSET_BASE}/${digest}.mp3` : '';
  }

  function stopVoicePlayback() {
    state.voiceToken += 1;
    if (state.voiceLearningSlowed) {
      state.learningSession?.resume();
      state.voiceLearningSlowed = false;
    }
    if (state.voiceAudio) {
      try {
        state.voiceAudio.pause();
        state.voiceAudio.src = '';
      } catch (error) {
        console.warn('[pinyin-star-scout] failed to stop voice audio', error);
      }
      state.voiceAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function playLocalVoice(url, token) {
    return new Promise(resolve => {
      const audio = new Audio(url);
      state.voiceAudio = audio;
      const finish = () => {
        if (token !== state.voiceToken) {
          return;
        }
        state.voiceAudio = null;
        resolve();
      };
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
    });
  }

  function playSpeechFallback(text, lang, token) {
    return new Promise(resolve => {
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined' || !text) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = lang === 'zh-CN' ? 0.88 : 0.84;
      utterance.onend = () => {
        if (token === state.voiceToken) {
          resolve();
        }
      };
      utterance.onerror = () => {
        if (token === state.voiceToken) {
          resolve();
        }
      };
      window.speechSynthesis.speak(utterance);
      window.setTimeout(() => {
        if (token === state.voiceToken) {
          resolve();
        }
      }, 2200);
    });
  }

  async function speakLines(lines) {
    const filtered = Array.isArray(lines)
      ? lines.filter(line => line && line.text)
      : [];
    if (!filtered.length) {
      return;
    }
    stopVoicePlayback();
    const token = state.voiceToken;
    const learningSnapshot = state.learningSession?.getSnapshot?.();
    const shouldSlowLearning = !state.awaitingRoute && learningSnapshot?.status === 'running';
    if (shouldSlowLearning) {
      state.learningSession?.slow(PINYIN_LEARNING_REASONS.PLAYBACK, 0.5);
      state.voiceLearningSlowed = true;
    }
    try {
      for (const line of filtered) {
        if (token !== state.voiceToken) {
          return;
        }
        const url = localVoiceUrl(line.text);
        if (url) {
          await playLocalVoice(url, token);
        } else {
          await playSpeechFallback(line.text, line.lang || 'zh-CN', token);
        }
      }
    } finally {
      if (token === state.voiceToken && state.voiceLearningSlowed) {
        state.learningSession?.resume();
        state.voiceLearningSlowed = false;
      }
    }
  }

  function speakCurrentTarget() {
    const target = currentTarget();
    if (!target) {
      return Promise.resolve();
    }
    return speakLines([
      { text: target.char, lang: 'zh-CN' },
      { text: target.pinyin, lang: 'zh-CN' },
      { text: target.example, lang: 'zh-CN' }
    ]);
  }

  function expectedPiece() {
    return state.pieces[state.pieceIndex] || state.pieces[0] || 'pin';
  }

  function resetSnakeBody() {
    const centerY = Math.floor(state.size / 2);
    state.body = [
      { x: 4, y: centerY },
      { x: 3, y: centerY },
      { x: 2, y: centerY }
    ];
    state.dir = { x: 1, y: 0 };
  }

  function chunkPool(expected) {
    const sourceChunks = state.hanzi.flatMap(item => splitPinyin(item));
    return [...new Set([...sourceChunks, ...DISTRACTOR_CHUNKS])]
      .filter(chunk => chunk && chunk !== expected);
  }

  function refreshPieces() {
    state.pieces = splitPinyin(currentTarget());
    state.pieceIndex = 0;
  }

  function nextFoodSlots() {
    const candidates = [
      { x: 9, y: 2 },
      { x: 2, y: 2 },
      { x: 9, y: 9 },
      { x: 2, y: 9 },
      { x: 6, y: 2 },
      { x: 9, y: 6 },
      { x: 6, y: 9 },
      { x: 2, y: 6 }
    ];
    return candidates.filter(position => {
      return !state.body.some(part => part.x === position.x && part.y === position.y);
    }).slice(0, 4);
  }

  function nextPortalSlot() {
    const options = [
      { x: 10, y: 10 },
      { x: 1, y: 10 },
      { x: 10, y: 1 },
      { x: 1, y: 1 },
      { x: 6, y: 10 },
      { x: 10, y: 6 }
    ];
    return options.find(position => {
      return !state.body.some(part => part.x === position.x && part.y === position.y)
        && !state.foods.some(food => food.x === position.x && food.y === position.y);
    }) || { x: 10, y: 10 };
  }

  function makeStarShards(anchor) {
    const offsets = [
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: -1 }
    ];
    state.shards = offsets
      .map(offset => ({ x: anchor.x + offset.x, y: anchor.y + offset.y }))
      .filter(position => position.x >= 0 && position.y >= 0 && position.x < state.size && position.y < state.size);
  }

  function makeFoods() {
    if (state.awaitingPortal) {
      state.foods = [];
      state.portal = nextPortalSlot();
      makeStarShards(state.portal);
      return;
    }
    const expected = expectedPiece();
    const pool = chunkPool(expected);
    const start = (state.targetIndex * 5 + state.pieceIndex) % Math.max(1, pool.length);
    const positions = nextFoodSlots();
    const expectedSlot = (state.targetIndex + state.pieceIndex) % positions.length;
    let distractorIndex = 0;
    state.foods = positions.map((position, index) => {
      const label = index === expectedSlot ? expected : pool[(start + distractorIndex++) % pool.length];
      return {
        ...position,
        label,
        correct: label === expected
      };
    });
    state.portal = null;
    state.shards = [];
  }

  function startTargetRound(message) {
    refreshPieces();
    resetSnakeBody();
    state.roundStars = 3;
    state.pinyinRevealed = false;
    state.hintUsed = false;
    state.hintPenalty = 0;
    state.awaitingPortal = false;
    state.awaitingRoute = false;
    state.routePhase = null;
    state.routeResponse = null;
    makeFoods();
    state.taskMessage = message || '按顺序收集拼音积木，完成后点亮星星。';
    state.feedback = '?';
  }

  function renderStars() {
    els.starRow.innerHTML = Array.from({ length: 3 }, (_, index) => {
      return `<span class="${index < state.roundStars ? 'is-on' : ''}"></span>`;
    }).join('');
  }

  function renderPieces() {
    els.pieceRow.innerHTML = state.pieces.map((piece, index) => {
      const className = index < state.pieceIndex
        ? 'piece-chip is-done'
        : index === state.pieceIndex
          ? 'piece-chip is-current'
          : 'piece-chip';
      const label = state.pinyinRevealed || index < state.pieceIndex
        ? piece
        : '?';
      return `<span class="${className}" aria-label="${index < state.pieceIndex ? `已完成 ${piece}` : '待探索拼读片段'}">${label}</span>`;
    }).join('');
  }

  function renderRouteOptions(options) {
    return options.map((option) => {
      return `<button type="button" class="route-choice-button" data-route-response="${option.response}">
        <strong>${option.label}</strong>
        <span>${option.correct ? '正确拼读' : '再想一想'}</span>
      </button>`;
    }).join('');
  }

  function renderRoutePanel() {
    const visible = Boolean(state.awaitingRoute && state.learningSession);
    if (!els.routePanel) return;
    els.routePanel.hidden = !visible;
    if (!visible) return;

    const options = state.learningSession.getAnswerOptions();
    const isReview = state.routePhase === 'review';
    const isBranch = state.routePhase === 'branch';
    els.routeStage.textContent = isReview ? '错题复习' : isBranch ? '路线选择' : '拼读分叉';
    els.routePrompt.textContent = isReview
      ? '再试一次：这个汉字的韵母是什么？'
      : isBranch
        ? `韵母 ${state.routeResponse}，选择下一段路线。`
        : '你找到的韵母是什么？';
    els.routeOptions.hidden = isBranch;
    els.routeBranches.hidden = !isBranch;
    els.routeOptions.innerHTML = isBranch ? '' : renderRouteOptions(options);
    els.routeBranches.innerHTML = isBranch
      ? `<button type="button" class="route-branch-button route-branch-button--shortcut" data-route-branch="inner">
          <strong>内圈捷径</strong><span>短路线 · 少走一段</span>
        </button>
        <button type="button" class="route-branch-button route-branch-button--recovery" data-route-branch="wide">
          <strong>宽道恢复</strong><span>长路线 · 留出恢复空间</span>
        </button>`
      : '';
    els.routeStatus.textContent = isReview
      ? '赛道已暂停，复习答对后继续。'
      : isBranch
        ? '路线会改变本局赛道后果。'
        : '先判断韵母，再决定走哪条路。';
  }

  function renderBoard() {
    const cells = [];
    const overlays = [];
    for (let y = 0; y < state.size; y += 1) {
      for (let x = 0; x < state.size; x += 1) {
        const scoutIndex = state.body.findIndex(part => part.x === x && part.y === y);
        const food = state.foods.find(item => item.x === x && item.y === y);
        const trailOpacity = scoutIndex > 0
          ? Math.max(0.24, 0.88 - scoutIndex * 0.12).toFixed(2)
          : '1';
        const scoutContent = scoutIndex === 0
          ? `<span class="scout-core"><img class="scout-asset scout-head" src="${SCOUT_ASSETS.scout}" alt=""></span>`
          : scoutIndex > 0
            ? `<span class="trail-node" style="--trail-opacity:${trailOpacity}"><img class="trail-asset" src="${SCOUT_ASSETS.trail}" alt=""></span>`
            : '';
        const foodContent = food
          ? `<b class="scout-food-card"><img class="scout-food-asset" src="${SCOUT_ASSETS.foods[state.foods.indexOf(food) % SCOUT_ASSETS.foods.length]}" alt=""><span>${food.label}</span></b>`
          : '';
        cells.push(
          `<span class="scout-cell${scoutIndex >= 0 ? ' is-scout' : ''}${food ? ` is-food${food.correct ? ' is-target-food' : ''}` : ''}">${foodContent}${scoutContent}</span>`
        );
      }
    }
    if (state.portal) {
      overlays.push(
        `<img class="board-portal" src="${SCOUT_ASSETS.portal}" alt="" style="left:${((state.portal.x + 0.5) / state.size) * 100}%; top:${((state.portal.y + 0.5) / state.size) * 100}%;">`
      );
    }
    state.shards.forEach(shard => {
      overlays.push(
        `<img class="board-shard" src="${SCOUT_ASSETS.shard}" alt="" style="left:${((shard.x + 0.5) / state.size) * 100}%; top:${((shard.y + 0.5) / state.size) * 100}%;">`
      );
    });
    els.board.innerHTML = `${overlays.join('')}${cells.join('')}`;
  }

  function render() {
    const target = currentTarget();
    const progress = state.awaitingPortal
      ? 100
      : state.pieces.length ? (state.pieceIndex / state.pieces.length) * 100 : 0;
    els.levelText.textContent = `第 ${state.targetIndex + 1} 关`;
    els.targetChar.textContent = target.char;
    els.targetPinyin.textContent = state.pinyinRevealed ? normalizePinyin(target.pinyin) : '拼音待探索';
    els.targetPinyin.classList.toggle('is-revealed', state.pinyinRevealed);
    els.targetPinyin.setAttribute('aria-label', state.pinyinRevealed ? `拼音 ${normalizePinyin(target.pinyin)}` : '拼音尚未显示');
    els.score.textContent = state.score;
    els.lengthValue.textContent = state.body.length;
    els.feedback.textContent = state.feedback || '?';
    if (els.hintButton) els.hintButton.disabled = state.hintUsed || state.awaitingRoute;
    if (els.hintStatus) {
      els.hintStatus.textContent = state.hintUsed ? `已用 · -${state.hintPenalty}星` : '未用';
    }
    if (els.taskHint) els.taskHint.textContent = state.taskMessage;
    els.progressFill.style.setProperty('--progress', `${progress}%`);
    renderStars();
    renderPieces();
    renderBoard();
    renderRoutePanel();
  }

  function boardPointForCell(x, y) {
    const raceCanvas = document.getElementById('raceCanvas');
    const visualBoard = raceCanvas || els.board;
    const rect = visualBoard.getBoundingClientRect();
    if (raceCanvas) {
      return {
        x: rect.left + ((Number(x) + 0.5) / state.size) * rect.width,
        y: rect.top + ((Number(y) + 0.5) / state.size) * rect.height
      };
    }
    const style = getComputedStyle(els.board);
    const pad = parseFloat(style.getPropertyValue('--board-pad')) || 26;
    const cell = (rect.width - pad * 2) / state.size;
    return {
      x: rect.left + pad + cell * (x + 0.5),
      y: rect.top + pad + cell * (y + 0.5)
    };
  }

  function showFx(kind, x, y) {
    const img = kind === 'ok' ? els.sparkle : els.warning;
    const other = kind === 'ok' ? els.warning : els.sparkle;
    other.hidden = true;
    const point = boardPointForCell(x, y);
    const shellRect = els.board.parentElement.getBoundingClientRect();
    img.hidden = false;
    img.style.left = `${point.x - shellRect.left}px`;
    img.style.top = `${point.y - shellRect.top}px`;
    img.style.transform = 'translate(-50%, -50%)';
    window.setTimeout(() => { img.hidden = true; }, 520);
  }

  function shrinkSnake() {
    if (state.body.length > 3) state.body.pop();
  }

  function continueAfterRoute(result) {
    state.awaitingRoute = false;
    state.routePhase = null;
    state.routeResponse = null;
    state.awaitingPortal = true;
    const consequence = result?.routeDecision?.consequence;
    state.taskMessage = consequence === 'shortcut'
      ? '内圈捷径已打开，进入星门。'
      : '宽道恢复已打开，进入星门。';
    makeFoods();
    startSnake();
  }

  function failRouteToReview(result) {
    state.routePhase = 'review';
    state.routeResponse = null;
    state.taskMessage = result?.errorTag
      ? '路线判断需要复习，赛道已暂停。'
      : '先复习这张拼音卡，再继续巡航。';
    stopSnake();
  }

  function rewardTarget(nextFood) {
    showFx('ok', nextFood.x, nextFood.y);
    state.awaitingPortal = false;
    state.awaitingRoute = true;
    state.routePhase = 'answer';
    state.routeResponse = null;
    state.taskMessage = '拼好了，先判断韵母并选择路线。';
    state.feedback = 'ROUTE';
    state.foods = [];
    state.portal = null;
    state.shards = [];
    stopSnake();
  }

  function rewardPiece(nextFood) {
    state.pieceIndex += 1;
    showFx('ok', nextFood.x, nextFood.y);
    state.taskMessage = '很好，继续寻找下一块拼音积木。';
    state.feedback = state.pinyinRevealed ? expectedPiece() : '?';
    makeFoods();
  }

  function completePortalRun(cell) {
    state.score += state.roundStars;
    state.targetIndex += 1;
    showFx('ok', cell.x, cell.y);
    sendCompletion(state.score, state.roundStars);
    startTargetRound(`完成第 ${state.targetIndex} 关，巡航到下一关。`);
  }

  function penalize(message, cell) {
    state.roundStars = Math.max(0, state.roundStars - 1);
    shrinkSnake();
    state.taskMessage = message;
    state.feedback = normalizePinyin(currentTarget().pinyin);
    if (cell) showFx('warn', cell.x, cell.y);
  }

  function isBodyCollision(next, willGrow) {
    const bodyToCheck = willGrow ? state.body : state.body.slice(0, -1);
    return bodyToCheck.some(part => part.x === next.x && part.y === next.y);
  }

  function advanceSnake(force) {
    const now = Date.now();
    if (force) {
      if (now - state.lastAdvanceAt < 110) return;
    } else if (now - state.lastAdvanceAt < state.stepMs - 70) {
      return;
    }
    state.lastAdvanceAt = now;

    const head = state.body[0];
    const next = {
      x: (head.x + state.dir.x + state.size) % state.size,
      y: (head.y + state.dir.y + state.size) % state.size
    };
    if (state.awaitingPortal && state.portal && next.x === state.portal.x && next.y === state.portal.y) {
      state.moves += 1;
      state.body.unshift(next);
      state.body.pop();
      completePortalRun(next);
      render();
      return;
    }
    const food = state.foods.find(item => item.x === next.x && item.y === next.y) || null;
    const willGrow = Boolean(food && food.correct);

    if (isBodyCollision(next, willGrow)) {
      penalize(`别撞尾焰，先收集 ${expectedPiece()}。`, head);
      render();
      return;
    }

    state.moves += 1;
    state.body.unshift(next);

    if (!food) {
      state.body.pop();
      render();
      return;
    }

    if (food.correct) {
      if (state.pieceIndex >= state.pieces.length - 1) {
        rewardTarget(food);
      } else {
        rewardPiece(food);
      }
      render();
      return;
    }

    state.body.pop();
    shrinkSnake();
    penalize(`先收集 ${expectedPiece()}，收错会掉星。`, food);
    makeFoods();
    render();
  }

  function canTurn(nextDir) {
    return !(state.body.length > 1
      && nextDir.x === -state.dir.x
      && nextDir.y === -state.dir.y);
  }

  function stopSnake() {
    if (state.timer) window.clearInterval(state.timer);
    state.timer = null;
  }

  function startSnake() {
    stopSnake();
    state.timer = window.setInterval(() => advanceSnake(false), state.stepMs);
  }

  function snapshot() {
    return {
      mode: state.mode,
      size: state.size,
      target: currentTarget().char,
      pinyin: normalizePinyin(currentTarget().pinyin),
      pieces: [...state.pieces],
      pieceIndex: state.pieceIndex,
      foods: state.foods.map(food => ({ ...food })),
      body: state.body.map(part => ({ ...part })),
      dir: { ...state.dir },
      score: state.score,
      roundStars: state.roundStars,
      pinyinRevealed: state.pinyinRevealed,
      hintUsed: state.hintUsed,
      hintPenalty: state.hintPenalty,
      awaitingRoute: state.awaitingRoute,
      routePhase: state.routePhase,
      routeResponse: state.routeResponse,
      learning: state.learningSession?.getSessionSnapshot() || null,
      moves: state.moves
    };
  }

  document.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    const dirs = {
      arrowup: { x: 0, y: -1 },
      arrowdown: { x: 0, y: 1 },
      arrowleft: { x: -1, y: 0 },
      arrowright: { x: 1, y: 0 },
      w: { x: 0, y: -1 },
      s: { x: 0, y: 1 },
      a: { x: -1, y: 0 },
      d: { x: 1, y: 0 },
      i: { x: 0, y: -1 },
      k: { x: 0, y: 1 },
      j: { x: -1, y: 0 },
      l: { x: 1, y: 0 }
    };
    const nextDir = dirs[key];
    if (!nextDir) return;
    if (!canTurn(nextDir)) return;
    event.preventDefault();
    state.dir = nextDir;
    advanceSnake(true);
  });

  const debugApi = {
    advance: () => advanceSnake(true),
    turn: (name) => {
      const map = {
        up: { x: 0, y: -1 },
        down: { x: 0, y: 1 },
        left: { x: -1, y: 0 },
        right: { x: 1, y: 0 }
      };
      const nextDir = map[name];
      if (nextDir && canTurn(nextDir)) state.dir = nextDir;
      advanceSnake(true);
      return snapshot();
    },
    getState: snapshot,
    getLearningState: () => state.learningSession?.getSessionSnapshot() || null,
    speakCurrentTarget
  };

  window.PinyinStarScout = debugApi;
  window.PinyinBlockRunner = debugApi;

  window.addEventListener('message', (event) => {
    const data = event.data || {};
    if (event.origin !== hostOrigin || data.type !== 'petbank.bridge.v1.reward-result' || data.launchId !== launchId) return;
    els.feedback.textContent = data.status === 'accepted' ? '主站奖励已到账。' : data.status === 'duplicate' ? '本局奖励已处理。' : '主站暂未接受奖励。';
  });

  function stopHostRuntime() {
    state.hostStopped = true;
    stopSnake();
    stopVoicePlayback();
    state.learningSession?.stop();
  }

  window.addEventListener('wordquest-host-init', event => {
    if (!applyHostHanzi(event.detail?.payload?.cards || event.detail?.cards || [])) return;
    if (state.learningSession) {
      state.learningSession.stop();
      mountLearningSession();
      startTargetRound();
      render();
      startSnake();
    }
  });
  window.addEventListener('wordquest-host-stop', stopHostRuntime, { once: true });
  window.WordQuestGameBridge?.registerCleanup(stopHostRuntime);

  async function init() {
    await Promise.all([
      readHanzi(),
      loadVoiceMap()
    ]);
    mountLearningSession();
    startTargetRound();
    render();
    startSnake();
  }

  els.speakButton?.addEventListener('click', () => {
    speakCurrentTarget();
  });

  els.routePanel?.addEventListener('click', (event) => {
    const target = event.target;
    const answerButton = target instanceof Element ? target.closest('[data-route-response]') : null;
    const branchButton = target instanceof Element ? target.closest('[data-route-branch]') : null;
    if (answerButton) {
      const response = answerButton.getAttribute('data-route-response');
      if (state.routePhase === 'review') {
        const result = state.learningSession?.submitReviewAnswer(response);
        if (result?.correct) {
          continueAfterRoute(result);
        } else {
          state.taskMessage = '还需要再复习一次，赛道保持暂停。';
        }
      } else if (state.routePhase === 'answer') {
        const selected = state.learningSession?.chooseAnswer(response);
        if (selected?.accepted) {
          state.routeResponse = selected.response;
          state.routePhase = 'branch';
        }
      }
      render();
      return;
    }
    if (branchButton && state.routePhase === 'branch') {
      const result = state.learningSession?.chooseRoute({
        branchId: branchButton.getAttribute('data-route-branch')
      });
      if (result?.correct) {
        continueAfterRoute(result);
      } else {
        failRouteToReview(result);
      }
      render();
    }
  });

  els.hintButton?.addEventListener('click', () => {
    if (state.hintUsed) return;
    state.hintUsed = true;
    state.pinyinRevealed = true;
    state.hintPenalty = 1;
    state.roundStars = Math.max(0, state.roundStars - state.hintPenalty);
    state.taskMessage = `提示已打开：${normalizePinyin(currentTarget().pinyin)}。继续自行收集拼音块。`;
    state.learningSession?.useHint({ mode: 'paused' });
    state.learningSession?.resume();
    render();
  });

  window.addEventListener('beforeunload', () => {
    stopSnake();
    state.learningSession?.stop();
  });
  init();
})();
