(function (global) {
  'use strict';

  const STORAGE_KEYS = Object.freeze({
    progress: 'minigames_math_adventure_v1',
    daily: 'minigames_math_daily_pk_v1'
  });
  const DAILY_ROUNDS = 5;
  const STAGE_LENGTH = 6;
  const PLAYER_AVATAR = 'assets/pets/poses/dog_idle.webp';
  const ROBOT_AVATAR = 'assets/arena/math-rivals/robot-mul-v5.webp';

  const CHAPTERS = Object.freeze({
    addition: {
      id: 'addition',
      label: '加法篇',
      shortLabel: '加法',
      icon: '+',
      description: '从合并数量开始，把心算练成稳定的节奏。',
      stages: [
        { id: 'add-5', title: '5 以内加法', topic: '先把小数量合在一起', kind: 'addition', max: 5 },
        { id: 'add-10', title: '10 以内加法', topic: '找到熟悉的加法朋友', kind: 'addition', max: 10 },
        { id: 'add-20', title: '20 以内加法', topic: '让心算再走远一点', kind: 'addition', max: 20 },
        { id: 'add-20-carry', title: '20 以内进位', topic: '学会凑十再继续', kind: 'addition-carry', max: 20 },
        { id: 'add-100', title: '100 以内加法', topic: '准备好迎接一年级的计算', kind: 'addition', max: 100 }
      ]
    },
    multiplication: {
      id: 'multiplication',
      label: '乘法篇',
      shortLabel: '乘法',
      icon: '×',
      description: '先看懂几组几个，再慢慢走进乘法口诀。',
      stages: [
        { id: 'mul-groups', title: '几组几个', topic: '用分组图看懂乘法', kind: 'groups' },
        { id: 'mul-2', title: '×1、×2', topic: '从重复加法走向乘法', kind: 'multiplication', factors: [1, 2] },
        { id: 'mul-5-10', title: '×5、×10', topic: '发现整齐的规律', kind: 'multiplication', factors: [5, 10] },
        { id: 'mul-3-4', title: '×3、×4', topic: '扩展基础乘法事实', kind: 'multiplication', factors: [3, 4] },
        { id: 'mul-6-9', title: '×6、×7、×8、×9', topic: '一步一步补全口诀', kind: 'multiplication', factors: [6, 7, 8, 9] },
        { id: 'mul-mix', title: '乘法综合挑战', topic: '把已经学会的题混合起来', kind: 'multiplication', factors: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
      ]
    }
  });

  const STAGES = Object.freeze(Object.values(CHAPTERS).reduce((all, chapter) => {
    chapter.stages.forEach((stage, index) => {
      all[stage.id] = Object.freeze({ ...stage, chapterId: chapter.id, index });
    });
    return all;
  }, {}));

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function hashSeed(value) {
    const text = String(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = hashSeed(seed) || 1;
    return function random() {
      state = Math.imul(state ^ (state >>> 15), 1 | state);
      state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
      return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
    };
  }

  function intBetween(random, min, max) {
    return min + Math.floor(random() * (max - min + 1));
  }

  function uniqueOptions(answer, random, candidates) {
    const options = [answer];
    for (const candidate of candidates) {
      const value = Math.max(0, Number(candidate));
      if (!options.includes(value)) options.push(value);
      if (options.length >= 3) break;
    }
    let distance = 1;
    while (options.length < 3) {
      const value = Math.max(0, answer + (random() > 0.5 ? distance : -distance));
      if (!options.includes(value)) options.push(value);
      distance += 1;
    }
    return options.sort(() => random() - 0.5);
  }

  function createAdditionQuestion(stage, seed) {
    const random = seededRandom(`${stage.id}:${seed}`);
    let a;
    let b;
    if (stage.kind === 'addition-carry') {
      a = intBetween(random, 6, 19);
      b = intBetween(random, Math.max(1, 10 - (a % 10)), Math.min(9, 20 - a));
    } else if (stage.max <= 5) {
      a = intBetween(random, 0, stage.max);
      b = intBetween(random, 0, stage.max - a);
    } else {
      a = intBetween(random, 0, stage.max);
      b = intBetween(random, 0, stage.max - a);
    }
    const answer = a + b;
    const options = uniqueOptions(answer, random, [answer + 1, answer - 1, a + 2, b + 2]);
    return {
      id: `${stage.id}:${a}+${b}`,
      chapterId: stage.chapterId,
      stageId: stage.id,
      prompt: `${a} + ${b} = ?`,
      answer,
      options,
      operands: [a, b]
    };
  }

  function createMultiplicationQuestion(stage, seed) {
    const random = seededRandom(`${stage.id}:${seed}`);
    const factors = stage.kind === 'groups' ? null : stage.factors;
    const groups = factors ? factors[intBetween(random, 0, factors.length - 1)] : intBetween(random, 2, 5);
    const groupSize = intBetween(random, 1, stage.kind === 'groups' ? 5 : 9);
    const answer = groups * groupSize;
    const options = uniqueOptions(answer, random, [answer + groups, answer - groups, answer + groupSize, answer - groupSize]);
    return {
      id: `${stage.id}:${groups}x${groupSize}`,
      chapterId: stage.chapterId,
      stageId: stage.id,
      prompt: stage.kind === 'groups' ? `${groups} 组，每组 ${groupSize} 个，共几个？` : `${groups} × ${groupSize} = ?`,
      answer,
      options,
      groups,
      groupSize,
      operands: [groups, groupSize]
    };
  }

  function createQuestion(stageId, seed) {
    const stage = STAGES[stageId];
    if (!stage) throw new Error(`Unknown math stage: ${stageId}`);
    return stage.kind === 'addition' || stage.kind === 'addition-carry'
      ? createAdditionQuestion(stage, seed)
      : createMultiplicationQuestion(stage, seed);
  }

  function createInitialProgress() {
    return {
      version: 1,
      chapters: {
        addition: { unlockedStage: 0, completedStageIds: [] },
        multiplication: { unlockedStage: 0, completedStageIds: [] }
      },
      wrongAnswers: []
    };
  }

  function normalizeProgress(value) {
    const initial = createInitialProgress();
    const source = value && typeof value === 'object' ? value : {};
    const result = clone(initial);
    for (const chapterId of Object.keys(CHAPTERS)) {
      const chapterValue = source.chapters && source.chapters[chapterId];
      if (!chapterValue) continue;
      const maxIndex = CHAPTERS[chapterId].stages.length - 1;
      result.chapters[chapterId].unlockedStage = Math.max(0, Math.min(maxIndex, Number(chapterValue.unlockedStage) || 0));
      result.chapters[chapterId].completedStageIds = Array.isArray(chapterValue.completedStageIds)
        ? chapterValue.completedStageIds.filter((id) => CHAPTERS[chapterId].stages.some((stage) => stage.id === id))
        : [];
    }
    result.wrongAnswers = Array.isArray(source.wrongAnswers)
      ? source.wrongAnswers.filter((item) => item && item.id && item.answer !== undefined).slice(0, 100)
      : [];
    return result;
  }

  function readJsonStorage(key, fallback) {
    try {
      const raw = global.localStorage && global.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeJsonStorage(key, value) {
    try {
      if (global.localStorage) global.localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function readProgress() {
    return normalizeProgress(readJsonStorage(STORAGE_KEYS.progress, createInitialProgress()));
  }

  function writeProgress(progress) {
    const normalized = normalizeProgress(progress);
    writeJsonStorage(STORAGE_KEYS.progress, normalized);
    return normalized;
  }

  function getStageStatus(progress, chapterId, stageId) {
    const chapter = CHAPTERS[chapterId];
    const chapterProgress = progress && progress.chapters && progress.chapters[chapterId];
    const stageIndex = chapter ? chapter.stages.findIndex((stage) => stage.id === stageId) : -1;
    if (!chapter || !chapterProgress || stageIndex < 0) return 'locked';
    if (chapterProgress.completedStageIds.includes(stageId)) return 'completed';
    return stageIndex <= Number(chapterProgress.unlockedStage || 0) ? 'unlocked' : 'locked';
  }

  function completeStage(progress, chapterId, stageId) {
    const next = normalizeProgress(progress);
    const chapter = CHAPTERS[chapterId];
    const chapterProgress = next.chapters[chapterId];
    if (!chapter || !chapterProgress || !chapter.stages.some((stage) => stage.id === stageId)) return next;
    if (!chapterProgress.completedStageIds.includes(stageId)) chapterProgress.completedStageIds.push(stageId);
    const stageIndex = chapter.stages.findIndex((stage) => stage.id === stageId);
    chapterProgress.unlockedStage = Math.max(
      chapterProgress.unlockedStage,
      Math.min(chapter.stages.length - 1, stageIndex + 1)
    );
    return next;
  }

  function recordWrongAnswer(progress, question) {
    const next = normalizeProgress(progress);
    if (!question || !question.id) return next;
    const existing = next.wrongAnswers.find((item) => item.id === question.id);
    if (existing) {
      existing.misses = Number(existing.misses || 1) + 1;
      existing.lastSeen = Date.now();
      return next;
    }
    next.wrongAnswers.push({ ...clone(question), misses: 1, lastSeen: Date.now() });
    return next;
  }

  function resolveWrongAnswer(progress, questionId) {
    const next = normalizeProgress(progress);
    next.wrongAnswers = next.wrongAnswers.filter((item) => item.id !== questionId);
    return next;
  }

  function getUnlockedStageIds(progress) {
    const normalized = normalizeProgress(progress);
    return Object.keys(CHAPTERS).flatMap((chapterId) => {
      const chapter = CHAPTERS[chapterId];
      const max = normalized.chapters[chapterId].unlockedStage;
      return chapter.stages.slice(0, max + 1).map((stage) => stage.id);
    });
  }

  function createDailyQuestions(date, progress, count) {
    const total = Math.max(1, Number(count || DAILY_ROUNDS));
    const stageIds = getUnlockedStageIds(progress);
    const random = seededRandom(`daily:${date}`);
    return Array.from({ length: total }, (_, index) => {
      const stageId = stageIds[Math.floor(random() * stageIds.length)] || 'add-5';
      const question = createQuestion(stageId, `${date}:${index}:${Math.floor(random() * 100000)}`);
      return { ...question, id: `daily:${date}:${index}:${question.id}` };
    });
  }

  function readDailyState() {
    const source = readJsonStorage(STORAGE_KEYS.daily, {});
    return source && typeof source === 'object' ? source : {};
  }

  function saveDailyState(value) {
    writeJsonStorage(STORAGE_KEYS.daily, value);
    return value;
  }

  function localDate() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function getAssetUrl(asset) {
    return typeof global.resolvePetBankAssetUrl === 'function' ? global.resolvePetBankAssetUrl(asset) : `../../${asset}`;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function currentStage(progress, chapterId) {
    const chapter = CHAPTERS[chapterId];
    const index = progress.chapters[chapterId].unlockedStage;
    return chapter.stages[Math.min(index, chapter.stages.length - 1)];
  }

  const state = {
    container: null,
    progress: null,
    chapterId: 'addition',
    view: 'home',
    stageId: null,
    stageQuestions: [],
    stageIndex: 0,
    stageHearts: 3,
    stageCorrect: 0,
    stageWrong: 0,
    stageFeedback: '',
    stageMode: 'stage',
    reviewQueue: [],
    daily: null,
    dailyTimer: null,
    dailyRoundResolved: false,
    dailyFeedback: ''
  };

  function getCurrentQuestion() {
    return state.stageQuestions[state.stageIndex] || null;
  }

  function renderArray(question) {
    if (!question || !question.groups) return '';
    const groups = Array.from({ length: question.groups }, (_, groupIndex) => `
      <span class="ma-array-group" aria-label="第 ${groupIndex + 1} 组">
        ${Array.from({ length: question.groupSize }, () => '<i></i>').join('')}
      </span>
    `).join('');
    return `<div class="ma-array" aria-label="${question.groups} 组，每组 ${question.groupSize} 个">${groups}</div>`;
  }

  function renderHeader(title, subtitle, action) {
    return `<header class="ma-header">
      <button class="ma-icon-button" type="button" data-action="${action || 'back-home'}" aria-label="返回">←</button>
      <div class="ma-header-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(subtitle)}</span></div>
      <span class="ma-header-mark">数学</span>
    </header>`;
  }

  function renderHome() {
    const chapter = CHAPTERS[state.chapterId];
    const progress = state.progress;
    const current = currentStage(progress, state.chapterId);
    const chapterProgress = progress.chapters[state.chapterId];
    const daily = readDailyState();
    const today = localDate();
    const dailyDone = daily.date === today && daily.completed;
    const nodes = chapter.stages.map((stage, index) => {
      const status = getStageStatus(progress, state.chapterId, stage.id);
      const label = status === 'completed' ? '✓' : status === 'locked' ? '锁' : String(index + 1);
      const action = status === 'locked' ? '' : ` data-action="open-stage" data-stage-id="${stage.id}"`;
      return `<button type="button" class="ma-stage-node ${status}"${action} aria-label="${escapeHtml(stage.title)}，${status === 'locked' ? '未解锁' : '可进入'}">
        <span>${label}</span><small>${escapeHtml(stage.title.replace(/以内|乘法|加法/g, ''))}</small>
      </button>`;
    }).join('');
    const wrongCount = progress.wrongAnswers.length;
    state.container.innerHTML = `
      <div class="ma-app">
        <div class="ma-shell">
          <header class="ma-header ma-home-header">
            <div class="ma-brand"><span class="ma-brand-star">★</span><div><strong>数学冒险</strong><span>今天也走一小关</span></div></div>
            <button class="ma-daily-chip ${dailyDone ? 'done' : ''}" type="button" data-action="open-daily"><span>${dailyDone ? '✓' : '★'}</span>${dailyDone ? '今日已完成' : '今日 PK'}</button>
          </header>
          <section class="ma-welcome" aria-labelledby="ma-welcome-title">
            <div><span class="ma-kicker">当前冒险</span><h1 id="ma-welcome-title">${escapeHtml(chapter.label)}</h1><p>${escapeHtml(chapter.description)}</p></div>
            <img src="${getAssetUrl(PLAYER_AVATAR)}" alt="我的宠物" class="ma-welcome-pet">
          </section>
          <nav class="ma-chapter-tabs" aria-label="选择学习篇章">
            ${Object.values(CHAPTERS).map((item) => `<button type="button" class="${item.id === state.chapterId ? 'active' : ''}" data-action="select-chapter" data-chapter-id="${item.id}"><b>${item.icon}</b><span>${item.label}</span></button>`).join('')}
          </nav>
          <section class="ma-map-panel" aria-labelledby="ma-map-title">
            <div class="ma-section-heading"><div><span class="ma-kicker">学习地图</span><h2 id="ma-map-title">${escapeHtml(current.title)}</h2></div><span class="ma-map-count">${chapterProgress.completedStageIds.length} / ${chapter.stages.length}</span></div>
            <div class="ma-map-track"><i class="ma-map-line"></i>${nodes}</div>
            <div class="ma-current-stage"><div><strong>${escapeHtml(current.title)}</strong><span>${escapeHtml(current.topic)}</span></div><button class="ma-primary-button" type="button" data-action="continue-stage">继续闯关 <span>→</span></button></div>
          </section>
          <section class="ma-daily-panel" aria-labelledby="ma-daily-title">
            <div class="ma-daily-icon">⚡</div><div class="ma-daily-copy"><span class="ma-kicker">每天一局</span><h2 id="ma-daily-title">今日随机 PK</h2><p>${dailyDone ? '今天的挑战已经完成，明天再来。' : '从已学内容里随机出题，和机器人抢先答对。'}</p></div><button class="ma-secondary-button" type="button" data-action="open-daily">${dailyDone ? '查看结果' : '开始'} <span>→</span></button>
          </section>
          <button class="ma-wrong-entry" type="button" data-action="open-wrong"><span class="ma-book-icon">▣</span><span><strong>错题本</strong><small>${wrongCount ? `还有 ${wrongCount} 题等你再试` : '答错的题会自动收进这里'}</small></span><b>→</b></button>
          <nav class="ma-bottom-nav" aria-label="数学冒险导航"><button type="button" class="${state.chapterId === 'addition' ? 'active' : ''}" data-action="select-chapter" data-chapter-id="addition">+<span>加法篇</span></button><button type="button" class="${state.chapterId === 'multiplication' ? 'active' : ''}" data-action="select-chapter" data-chapter-id="multiplication">×<span>乘法篇</span></button><button type="button" data-action="open-wrong">▣<span>错题本</span></button></nav>
        </div>
      </div>`;
  }

  function renderStage() {
    const question = getCurrentQuestion();
    if (!question) return renderStageResult(true);
    const stage = STAGES[state.stageId];
    const options = question.options.map((option) => `<button type="button" class="ma-answer-button" data-action="answer-stage" data-answer="${option}">${option}</button>`).join('');
    state.container.innerHTML = `<div class="ma-app"><div class="ma-shell ma-play-shell">
      ${renderHeader(stage.title, `${state.stageIndex + 1} / ${state.stageQuestions.length} 题`, 'back-map')}
      <div class="ma-play-status"><span>${escapeHtml(CHAPTERS[stage.chapterId].label)}</span><div class="ma-hearts" aria-label="剩余 ${state.stageHearts} 颗心">${[0, 1, 2].map((heart) => `<i class="${heart < state.stageHearts ? 'full' : ''}">♥</i>`).join('')}</div></div>
      <section class="ma-battle-card"><div class="ma-battle-top"><img src="${getAssetUrl(PLAYER_AVATAR)}" alt="我的宠物"><span>答对就前进</span><div class="ma-enemy-orb"><img src="${getAssetUrl(ROBOT_AVATAR)}" alt="关卡守卫"></div></div><div class="ma-question-card"><span class="ma-kicker">${escapeHtml(stage.topic)}</span><strong>${escapeHtml(question.prompt)}</strong>${renderArray(question)}<span class="ma-feedback ${state.stageFeedback ? 'show' : ''}">${escapeHtml(state.stageFeedback)}</span></div></section>
      <div class="ma-answer-grid" aria-label="选择答案">${options}</div>
      <p class="ma-play-tip">答错会记进错题本，还可以再来一次。</p>
    </div></div>`;
  }

  function renderStageResult(completed) {
    const stage = STAGES[state.stageId];
    const chapter = CHAPTERS[stage.chapterId];
    const wrong = state.stageWrong;
    state.container.innerHTML = `<div class="ma-app"><div class="ma-shell ma-result-shell">
      ${renderHeader(completed ? '关卡完成' : '先休息一下', `${chapter.label} · ${stage.title}`, 'back-map')}
      <section class="ma-result-hero ${completed ? 'win' : 'retry'}"><div class="ma-result-badge">${completed ? '✓' : '↻'}</div><span class="ma-kicker">${completed ? '向前一步' : '再试一次'}</span><h1>${completed ? '这一关完成啦' : '把这几题再练一遍'}</h1><p>${completed ? `答对 ${state.stageCorrect} / ${state.stageQuestions.length} 题，错题 ${wrong} 道。` : `这关还差一点，错题本已经帮你记好了。`}</p></section>
      <div class="ma-result-actions"><button type="button" class="ma-primary-button" data-action="retry-stage">${completed ? '再玩一遍' : '重新闯关'} <span>→</span></button>${wrong ? '<button type="button" class="ma-secondary-button" data-action="open-wrong">先练错题 <span>→</span></button>' : ''}<button type="button" class="ma-text-button" data-action="back-map">返回地图</button></div>
    </div></div>`;
  }

  function renderWrongBook() {
    const items = state.progress.wrongAnswers;
    const list = items.length ? items.map((question) => `<li><span>${escapeHtml(question.prompt)}</span><b>${question.answer}</b><small>${escapeHtml(CHAPTERS[question.chapterId] ? CHAPTERS[question.chapterId].label : '数学')}</small></li>`).join('') : '<li class="ma-empty-item"><span>还没有错题</span><small>去闯一关，遇到不会的题会自动收进来。</small></li>';
    state.container.innerHTML = `<div class="ma-app"><div class="ma-shell ma-book-shell">
      ${renderHeader('错题本', '把不会的题变成熟悉的题', 'back-home')}
      <section class="ma-book-intro"><span class="ma-book-big">▣</span><div><span class="ma-kicker">共 ${items.length} 题</span><h1>错题再战</h1><p>每次答对一道，就把它从试炼队列里移出去。</p></div></section>
      <ul class="ma-wrong-list">${list}</ul>
      ${items.length ? '<button type="button" class="ma-primary-button ma-full-button" data-action="start-wrong-review">开始错题试炼 <span>→</span></button>' : '<button type="button" class="ma-secondary-button ma-full-button" data-action="back-home">去闯一关 <span>→</span></button>'}
    </div></div>`;
  }

  function renderDaily() {
    const daily = state.daily;
    const question = daily.questions[daily.round];
    if (!question) return renderDailyResult();
    const options = question.options.map((option) => `<button type="button" class="ma-answer-button" data-action="answer-daily" data-answer="${option}">${option}</button>`).join('');
    state.container.innerHTML = `<div class="ma-app"><div class="ma-shell ma-daily-shell">
      ${renderHeader('今日随机 PK', `第 ${daily.round + 1} / ${DAILY_ROUNDS} 轮`, 'leave-daily')}
      <div class="ma-score-row"><div><span>宠物</span><strong>${daily.playerWins}</strong></div><em>:</em><div><span>机器人</span><strong>${daily.robotWins}</strong></div></div>
      <div class="ma-robot-strip"><span>机器人思考中</span><i><b></b></i></div>
      <section class="ma-daily-question"><div class="ma-duel-avatars"><img src="${getAssetUrl(PLAYER_AVATAR)}" alt="我的宠物"><span>VS</span><img src="${getAssetUrl(ROBOT_AVATAR)}" alt="机器人"></div><span class="ma-kicker">抢先答对就攻击</span><strong>${escapeHtml(question.prompt)}</strong>${renderArray(question)}<span class="ma-feedback ${state.dailyFeedback ? 'show' : ''}">${escapeHtml(state.dailyFeedback)}</span></section>
      <div class="ma-answer-grid" aria-label="选择答案">${options}</div><p class="ma-play-tip">答错不会结束本轮，继续想一想。</p>
    </div></div>`;
    startRobotTimer();
  }

  function renderDailyResult() {
    const daily = state.daily;
    const won = daily.playerWins > daily.robotWins;
    state.container.innerHTML = `<div class="ma-app"><div class="ma-shell ma-result-shell">
      ${renderHeader('今日 PK 结束', `${daily.playerWins} : ${daily.robotWins}`, 'back-home')}
      <section class="ma-result-hero ${won ? 'win' : 'retry'}"><div class="ma-result-badge">${won ? '★' : '✓'}</div><span class="ma-kicker">今日挑战</span><h1>${won ? '今天赢得漂亮' : '今天也完成了'}</h1><p>答对 ${daily.correctCount || daily.playerWins} / ${DAILY_ROUNDS} 轮，错题已经收进错题本。</p></section>
      <div class="ma-reward-line"><span>今日奖励</span><strong>+${daily.rewardPoints || 0} 成长积分</strong></div>
      <div class="ma-result-actions"><button type="button" class="ma-primary-button" data-action="open-wrong">查看错题 <span>→</span></button><button type="button" class="ma-secondary-button" data-action="back-home">返回冒险 <span>→</span></button></div>
    </div></div>`;
  }

  function startStage(stageId, reviewItems) {
    const stage = STAGES[stageId];
    if (!stage) return;
    state.stageId = stageId;
    state.stageIndex = 0;
    state.stageHearts = 3;
    state.stageCorrect = 0;
    state.stageWrong = 0;
    state.stageFeedback = '';
    state.stageMode = reviewItems && reviewItems.length ? 'review' : 'stage';
    state.reviewQueue = reviewItems || [];
    state.stageQuestions = reviewItems && reviewItems.length
      ? reviewItems.map((item) => clone(item))
      : Array.from({ length: STAGE_LENGTH }, (_, index) => createQuestion(stageId, index + 1));
    state.view = 'stage';
    renderStage();
  }

  function finishStage(completed) {
    if (completed && state.stageMode === 'stage') {
      state.progress = completeStage(state.progress, STAGES[state.stageId].chapterId, state.stageId);
      writeProgress(state.progress);
    }
    state.view = 'stage-result';
    renderStageResult(completed);
  }

  function answerStage(value) {
    const question = getCurrentQuestion();
    if (!question) return;
    const selected = Number(value);
    if (selected !== question.answer) {
      state.progress = recordWrongAnswer(state.progress, question);
      writeProgress(state.progress);
      state.stageWrong += 1;
      state.stageHearts = Math.max(0, state.stageHearts - 1);
      state.stageFeedback = `还差一点，正确答案是 ${question.answer}`;
      if (state.stageHearts === 0) return finishStage(false);
      return renderStage();
    }
    if (state.reviewQueue.length) {
      state.progress = resolveWrongAnswer(state.progress, question.id);
      writeProgress(state.progress);
    }
    state.stageCorrect += 1;
    state.stageFeedback = '答对了，宠物向前一步！';
    state.stageIndex += 1;
    if (state.stageIndex >= state.stageQuestions.length) return finishStage(true);
    renderStage();
  }

  function startRobotTimer() {
    if (state.dailyTimer) global.clearTimeout(state.dailyTimer);
    const round = state.daily && state.daily.round;
    state.dailyRoundResolved = false;
    state.dailyTimer = global.setTimeout(() => resolveDailyRound('robot'), 4200);
  }

  function resolveDailyRound(winner) {
    if (!state.daily || state.dailyRoundResolved) return;
    state.dailyRoundResolved = true;
    if (state.dailyTimer) global.clearTimeout(state.dailyTimer);
    if (winner === 'player') {
      state.daily.playerWins += 1;
      state.daily.correctCount = Number(state.daily.correctCount || 0) + 1;
      state.dailyFeedback = '答对了，宠物先出招！';
    } else {
      state.daily.robotWins += 1;
      state.dailyFeedback = '机器人先一步，下一题继续！';
    }
    state.daily.round += 1;
    if (state.daily.round >= DAILY_ROUNDS) return finishDaily();
    global.setTimeout(() => {
      state.dailyFeedback = '';
      renderDaily();
    }, 650);
  }

  function answerDaily(value) {
    if (!state.daily || state.dailyRoundResolved) return;
    const question = state.daily.questions[state.daily.round];
    if (Number(value) !== question.answer) {
      state.progress = recordWrongAnswer(state.progress, question);
      writeProgress(state.progress);
      state.dailyFeedback = `再想一想，正确答案是 ${question.answer}`;
      renderDaily();
      return;
    }
    resolveDailyRound('player');
  }

  function finishDaily() {
    if (state.dailyTimer) global.clearTimeout(state.dailyTimer);
    const date = state.daily.date;
    const rewardPoints = 10 + state.daily.playerWins * 5;
    state.daily.completed = true;
    state.daily.rewardPoints = rewardPoints;
    saveDailyState(state.daily);
    const profileId = global.ProfileManager && typeof global.ProfileManager.getActiveId === 'function'
      ? global.ProfileManager.getActiveId() || 'p_default'
      : 'p_default';
    const receipt = global.GameRewardReceipts && typeof global.GameRewardReceipts.claim === 'function'
      ? global.GameRewardReceipts.claim({ profileId, source: 'math-adventure-daily-pk', eventId: date, points: rewardPoints, localDate: date })
      : null;
    if (!receipt && global.PetBankPoints && typeof global.PetBankPoints.add === 'function') global.PetBankPoints.add(rewardPoints, { source: 'math-adventure-daily-pk' });
    if (typeof global.recordBattleRecentActivity === 'function') global.recordBattleRecentActivity({ id: `math_adventure_daily_${date}`, mode: 'mathpk', title: '完成今日随机 PK', detail: `比分 ${state.daily.playerWins}:${state.daily.robotWins}` });
    state.view = 'daily-result';
    renderDailyResult();
  }

  function startDaily() {
    const today = localDate();
    const saved = readDailyState();
    if (saved.date === today && saved.completed) {
      state.daily = saved;
      state.view = 'daily-result';
      return renderDailyResult();
    }
    state.daily = { date: today, questions: createDailyQuestions(today, state.progress, DAILY_ROUNDS), round: 0, playerWins: 0, robotWins: 0, correctCount: 0, completed: false };
    state.dailyFeedback = '';
    state.view = 'daily';
    renderDaily();
  }

  function handleAction(button) {
    const action = button.dataset.action;
    if (action === 'select-chapter') {
      state.chapterId = button.dataset.chapterId || 'addition';
      state.view = 'home';
      return renderHome();
    }
    if (action === 'continue-stage') return startStage(currentStage(state.progress, state.chapterId).id);
    if (action === 'open-stage') return startStage(button.dataset.stageId);
    if (action === 'answer-stage') return answerStage(button.dataset.answer);
    if (action === 'retry-stage') return startStage(state.stageId, state.reviewQueue.length ? state.reviewQueue : null);
    if (action === 'open-wrong') { state.view = 'wrong'; return renderWrongBook(); }
    if (action === 'start-wrong-review') {
      const first = state.progress.wrongAnswers[0];
      if (first) return startStage(first.stageId, state.progress.wrongAnswers.slice(0, STAGE_LENGTH));
    }
    if (action === 'open-daily') return startDaily();
    if (action === 'answer-daily') return answerDaily(button.dataset.answer);
    if (action === 'back-home') { state.view = 'home'; return renderHome(); }
    if (action === 'back-map') { state.view = 'home'; return renderHome(); }
    if (action === 'leave-daily') { if (state.dailyTimer) global.clearTimeout(state.dailyTimer); state.view = 'home'; return renderHome(); }
  }

  function render(containerId) {
    const container = global.document && global.document.getElementById(containerId);
    if (!container) return;
    state.container = container;
    state.progress = readProgress();
    if (!container.dataset.mathAdventureBound) {
      container.addEventListener('click', (event) => {
        const button = event.target.closest('[data-action]');
        if (button) handleAction(button);
      });
      container.dataset.mathAdventureBound = 'true';
    }
    state.view = 'home';
    renderHome();
  }

  const api = {
    STORAGE_KEYS,
    DAILY_ROUNDS,
    CHAPTERS,
    STAGES,
    createInitialProgress,
    normalizeProgress,
    readProgress,
    writeProgress,
    getStageStatus,
    completeStage,
    recordWrongAnswer,
    resolveWrongAnswer,
    createQuestion,
    createDailyQuestions,
    render
  };

  global.MathAdventureGame = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
}(typeof window !== 'undefined' ? window : globalThis));
