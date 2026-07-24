(function () {
  'use strict';

  const {
    VOCAB_QUERY,
    VOCAB_MODE,
    DATA_URL,
    VOICE_MAP_URL,
    WORLD_PACK_REGISTRY,
    VOICE_ASSET_BASE,
    TTS_ENDPOINT,
    TTS_DEFAULT_VOICE,
    TTS_DEFAULT_ENGINE,
    DEBUG_QUERY,
    DEBUG_AUTO_START,
    DEBUG_WORLD_CONTROLS,
    AUTO_START_PLAY_SESSION,
    ENABLE_AUTOMATION_WORLD_CONTROLS,
    TTS_REQUEST_TIMEOUT_MS,
    LOOPBACK_TTS_ENDPOINT,
    ASSET_BASE,
    BOY_ASSET_BASE,
    ENEMY_FALLBACK_POOL,
    WORLD_THEME_ENEMY_FALLBACKS,
    WORLD_PREVIEW_IMAGES,
    ROUND_SIZE,
    SESSION_WORD_TARGET,
    CHECKPOINT_WORDS,
    WORLD_COLS,
    WORLD_ROWS,
    WORLD_TILE_COUNT,
    BASE_WORLD_SCREEN_WIDTH,
    BASE_WORLD_SCREEN_HEIGHT,
    WORLD_SCALE,
    scaleDistance,
    scaleWorldPoint,
    WORLD_SCREEN_WIDTH,
    WORLD_SCREEN_HEIGHT,
    WORLD_WIDTH,
    WORLD_HEIGHT,
    PICKUP_RADIUS,
    MOVE_SPEED,
    THROW_SPEED,
    TARGETED_THROW_SPEED_MULTIPLIER,
    THROW_MAX_MS,
    THROW_HOMING_MAX_MS,
    THROW_HIT_RADIUS,
    THROW_ARM_MS,
    HERO_WALK_FRAME_MS,
    HERO_WALK_FRAME_COUNT,
    HERO_ATTACK_POSE_MS,
    HERO_START_DUST_MS,
    HERO_STEP_DUST_MS,
    MAX_SHIELD,
    HERO_HIT_INVINCIBLE_MS,
    HERO_KNOCKBACK_DISTANCE,
    ENEMY_CHASE_SPEED,
    ENEMY_ATTACK_RADIUS,
    ENEMY_ATTACK_COOLDOWN_MS,
    ENEMY_IMAGE_FALLBACK_MS,
    SUPPORT_PICKUP_RADIUS,
    SUPPORT_DROP_EVERY_SCORE,
    SUPPORT_SLOW_MS,
    SUPPORT_AUTO_AIM_SHOTS,
    SUPPORT_SPEED_MS,
    SUPPORT_HINT_CHARGES,
    SUPPORT_COMBO_BONUS,
    LEVEL_PROGRESS_KEY,
    REWARD_PROGRESS_KEY,
    REVIEW_PROGRESS_KEY,
    HERO_SELECTION_KEY,
    HOST_BRIDGE_SOURCE,
    HOST_BRIDGE_SESSION_ID,
    MAP_BOUNDS,
    PLAYER_START,
    TARGET_SLOTS,
    ORB_SLOTS,
    FARM_ASSETS,
    HERO_REGISTRY,
    SUPPORT_ITEM_ROTATION,
    WORLD_THEME_SUPPORT_ICONS,
    DEFAULT_WORLD_TILES,
    DEFAULT_WORLD_BACKDROP,
    tilesFromLabels,
    CATEGORY_LABELS,
    LEVELS
  } = window.WordMemoryGameData;
  let hostBridgeSeq = 0;

  const state = {
    cards: [],
    deck: [],
    waveIndex: 0,
    totalWaves: 0,
    score: 0,
    shield: MAX_SHIELD,
    streak: 0,
    bestStreak: 0,
    shotsFired: 0,
    wrongShots: 0,
    hitsTaken: 0,
    selectedOrbId: null,
    focusedTargetId: null,
    targets: [],
    orbs: [],
    supportDrops: [],
    shots: [],
    sparks: [],
    player: { x: PLAYER_START.x, y: PLAYER_START.y },
    keys: new Set(),
    message: '点击单词看图片、中文和发音；拿中文球后再点它发射。',
    busy: false,
    finished: false,
    lastFrame: 0,
    clock: 0,
    heroDirection: 'down',
    heroMoving: false,
    heroAnimTime: 0,
    heroPose: 'idle',
    heroPoseTimer: 0,
    heroMoveDustCooldown: 0,
    heroStepSide: 1,
    heroInvincibleMs: 0,
    lastPromptOrbId: null,
    sceneIndex: 0,
    worldTiles: DEFAULT_WORLD_TILES,
    worldBackdrop: DEFAULT_WORLD_BACKDROP,
    camera: { x: 0, y: 0 },
    audioEnabled: true,
    audioReady: false,
    audioContext: null,
    chapterBannerTimer: 0,
    voiceMap: {},
    voiceAudio: null,
    voiceObjectUrl: '',
    voiceToken: 0,
    localTtsDisabled: false,
    blockedEnemyImageKeys: new Set(),
    supportShieldCharges: 0,
    supportSlowMs: 0,
    supportAutoAimShots: 0,
    supportSpeedMs: 0,
    supportHintCharges: 0,
    supportComboBonus: 0,
    viewMode: 'map',
    selectedCategory: 'all',
    selectedWorldPack: 'farm_gpt',
    selectedHeroId: 'boy',
    heroSelectOpen: true,
    onboardingStep: 'welcome',
    pendingLevelId: '',
    currentLevelId: 'level-1',
    highestUnlockedLevel: 1,
    levelPanelCollapsed: !AUTO_START_PLAY_SESSION,
    lockedSceneHintCooldown: 0,
    classicShotFx: null,
    learningHintCard: null,
    learningToastCard: null,
    learningToastTimer: 0,
    levelReward: null,
    rewardBank: { stars: 0, supports: {} }
    ,reviewCardIds: [],
    wrongCardIds: [],
    hintsUsed: 0,
    equippedSupportId: ''
  };

  const els = {
    heroSelectOverlay: document.getElementById('heroSelectOverlay'),
    heroSelectGrid: document.getElementById('heroSelectGrid'),
    onboardingStep: document.getElementById('onboardingStep'),
    onboardingTitle: document.getElementById('onboardingTitle'),
    onboardingCopy: document.getElementById('onboardingCopy'),
    onboardingWelcome: document.getElementById('onboardingWelcome'),
    worldOptionGrid: document.getElementById('worldOptionGrid'),
    onboardingNextButton: document.getElementById('onboardingNextButton'),
    mapScene: document.getElementById('mapScene'),
    worldStage: document.getElementById('worldStage'),
    sceneBackdrop: document.getElementById('sceneBackdrop'),
    decorLayer: document.getElementById('decorLayer'),
    entityLayer: document.getElementById('entityLayer'),
    projectileLayer: document.getElementById('projectileLayer'),
    waveText: document.getElementById('waveText'),
    scoreText: document.getElementById('scoreText'),
    shieldText: document.getElementById('shieldText'),
    shieldStrip: document.getElementById('shieldStrip'),
    progressText: document.getElementById('progressText'),
    starStrip: document.getElementById('starStrip'),
    currentMeaning: document.getElementById('currentMeaning'),
    currentMeaningText: document.getElementById('currentMeaningText'),
    worldOverview: document.getElementById('worldOverview'),
    supportTray: document.getElementById('supportTray'),
    supportTrayTitle: document.getElementById('supportTrayTitle'),
    supportSlotList: document.getElementById('supportSlotList'),
    learningHintButton: document.getElementById('learningHintButton'),
    learningHintCard: document.getElementById('learningHintCard'),
    learningHintImage: document.getElementById('learningHintImage'),
    learningHintWord: document.getElementById('learningHintWord'),
    learningHintMeaning: document.getElementById('learningHintMeaning'),
    learningHintExample: document.getElementById('learningHintExample'),
    learningHintExampleZh: document.getElementById('learningHintExampleZh'),
    learningHintSpeakButton: document.getElementById('learningHintSpeakButton'),
    learningToast: document.getElementById('learningToast'),
    learningToastWord: document.getElementById('learningToastWord'),
    learningToastMeaning: document.getElementById('learningToastMeaning'),
    chapterBanner: document.getElementById('chapterBanner'),
    chapterKicker: document.getElementById('chapterKicker'),
    chapterTitle: document.getElementById('chapterTitle'),
    messageText: document.getElementById('messageText'),
    sceneButton: document.getElementById('sceneButton'),
    levelButton: document.getElementById('levelButton'),
    modeButton: document.getElementById('modeButton'),
    vocabSelect: document.getElementById('vocabSelect'),
    worldSelect: document.getElementById('worldSelect'),
    categorySelect: document.getElementById('categorySelect'),
    soundButton: document.getElementById('soundButton'),
    speakButton: document.getElementById('speakButton'),
    restartButton: document.getElementById('restartButton'),
    finishModal: document.getElementById('finishModal'),
    finishSummary: document.getElementById('finishSummary'),
    finishReward: document.getElementById('finishReward'),
    finishReport: document.getElementById('finishReport'),
    finishStats: document.getElementById('finishStats'),
    finishBadges: document.getElementById('finishBadges'),
    nextLevelButton: document.getElementById('nextLevelButton'),
    changeWorldButton: document.getElementById('changeWorldButton'),
    equipRewardButton: document.getElementById('equipRewardButton'),
    finishRestartButton: document.getElementById('finishRestartButton'),
    levelPanel: document.getElementById('levelPanel'),
    levelText: document.getElementById('levelText'),
    levelDetailText: document.getElementById('levelDetailText'),
    levelList: document.getElementById('levelList'),
    missionCountText: document.getElementById('missionCountText'),
    missionRemainingText: document.getElementById('missionRemainingText'),
    missionWordPreview: document.getElementById('missionWordPreview'),
    comboChip: document.getElementById('comboChip'),
    comboText: document.getElementById('comboText'),
    missionProgressFill: document.getElementById('missionProgressFill'),
    classicStage: document.getElementById('classicStage'),
    classicTargetRow: document.getElementById('classicTargetRow'),
    classicCannonRow: document.getElementById('classicCannonRow'),
    classicFlightLayer: document.getElementById('classicFlightLayer'),
    classicStatusText: document.getElementById('classicStatusText'),
    classicProgressText: document.getElementById('classicProgressText'),
    classicModeButton: document.getElementById('classicModeButton')
  };

  const { shuffle, clamp, randomOffset, distance, isRemoteImageSource, enemyRemoteImageFailureKey } = window.WordMemoryUtils;

  function postHostBridge(kind, payload = {}) {
    if (!window.parent || window.parent === window || typeof window.parent.postMessage !== 'function') {
      return;
    }
    const envelope = {
      source: HOST_BRIDGE_SOURCE,
      sessionId: HOST_BRIDGE_SESSION_ID,
      seq: ++hostBridgeSeq,
      kind,
      payload
    };
    const targetOrigin = window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : '*';
    window.parent.postMessage(envelope, targetOrigin);
  }

  function defaultEnemyFallbackImage(card, index) {
    const existing = String(card.enemyFallbackImage || '').trim();
    if (/topdown-farm-assets\/enemy_/.test(existing)) {
      return existing;
    }
    if (isRemoteImageSource(card.enemyImage)) {
      return ENEMY_FALLBACK_POOL[index % ENEMY_FALLBACK_POOL.length];
    }
    return existing || '';
  }

  async function loadCards() {
    let data = null;
    const fallbackData = VOCAB_MODE === 'extension'
      ? window.WORD_MEMORY_EXTENSION_CARDS_DATA
      : (VOCAB_MODE === 'core' ? window.WORD_MEMORY_CORE_CARDS_DATA : window.WORD_MEMORY_CARDS_DATA);
    if (window.location.protocol === 'file:' && fallbackData) {
      data = fallbackData;
    } else {
      try {
        const response = await fetch(DATA_URL, { cache: 'no-store' });
        data = await response.json();
      } catch (error) {
        if (!fallbackData) {
          throw error;
        }
        console.warn('[word-memory] card json unavailable, using browser fallback data', error);
        data = fallbackData;
      }
    }
    state.cards = Array.isArray(data.cards)
      ? data.cards.map((card, index) => ({
        ...card,
        themeEnemyIndex: index,
        labelImage: FARM_ASSETS.labels[index % FARM_ASSETS.labels.length],
        bombImage: card.bombImage || `${ASSET_BASE}/bomb_plain.png`,
        burstImage: card.burstImage || FARM_ASSETS.bursts[index % FARM_ASSETS.bursts.length],
        enemyFallbackImage: defaultEnemyFallbackImage(card, index)
      }))
      : [];
  }

  function normalizeCategory(card) {
    return String(card.viewCategory || card.category || 'uncategorized').trim() || 'uncategorized';
  }

  function categoryLabel(category) {
    if (category === 'all') {
      return '全部';
    }
    if (CATEGORY_LABELS[category]) {
      return CATEGORY_LABELS[category];
    }
    return category
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function categoryStats() {
    const stats = new Map();
    state.cards.forEach(card => {
      const category = normalizeCategory(card);
      stats.set(category, (stats.get(category) || 0) + 1);
    });
    return [...stats.entries()]
      .sort((a, b) => b[1] - a[1] || categoryLabel(a[0]).localeCompare(categoryLabel(b[0])));
  }

  function activeCardPool() {
    if (state.selectedCategory === 'all') {
      return state.cards;
    }
    const pool = state.cards.filter(card => normalizeCategory(card) === state.selectedCategory);
    return pool.length ? pool : state.cards;
  }

  function currentLevel() {
    return LEVELS.find(level => level.id === state.currentLevelId) || LEVELS[0];
  }

  function nextLevel() {
    const current = currentLevel();
    return LEVELS.find(level => level.order === current.order + 1) || null;
  }

  function isLevelUnlocked(level) {
    return level.order <= state.highestUnlockedLevel;
  }

  function debugLevelOverride() {
    const raw = Number.parseInt(DEBUG_QUERY.get('debugLevel') || '', 10);
    if (!Number.isFinite(raw)) {
      return 0;
    }
    return Math.max(1, Math.min(LEVELS.length, raw));
  }

  function debugWorldPackOverride() {
    const raw = String(DEBUG_QUERY.get('worldPack') || '').trim();
    if (!raw) {
      return '';
    }
    return Object.prototype.hasOwnProperty.call(WORLD_PACK_REGISTRY, raw) ? raw : '';
  }

  function loadLevelProgress() {
    window.WordMemoryStorage.loadLevelProgress(state, LEVEL_PROGRESS_KEY, debugLevelOverride, clamp, LEVELS.length);
  }

  function loadRewardProgress() {
    window.WordMemoryStorage.loadRewardProgress(state, REWARD_PROGRESS_KEY);
  }

  function saveRewardProgress() {
    window.WordMemoryStorage.saveRewardProgress(state, REWARD_PROGRESS_KEY);
  }

  function loadReviewProgress() {
    window.WordMemoryStorage.loadReviewProgress(state, REVIEW_PROGRESS_KEY);
  }

  function saveReviewProgress() {
    window.WordMemoryStorage.saveReviewProgress(state, REVIEW_PROGRESS_KEY);
  }

  function rememberReviewCard(card) {
    if (!card?.id) return;
    state.reviewCardIds = [card.id, ...state.reviewCardIds.filter(id => id !== card.id)].slice(0, 20);
    saveReviewProgress();
  }

  function recordWrongCard(card) {
    if (!card?.id) return;
    state.wrongCardIds = [card.id, ...state.wrongCardIds.filter(id => id !== card.id)].slice(0, 10);
    rememberReviewCard(card);
  }

  function applySupportEffect(typeId) {
    if (typeId === 'shield_leaf') state.supportShieldCharges += 1;
    else if (typeId === 'slow_clock') state.supportSlowMs = Math.max(state.supportSlowMs, SUPPORT_SLOW_MS);
    else if (typeId === 'auto_star') state.supportAutoAimShots += SUPPORT_AUTO_AIM_SHOTS;
    else if (typeId === 'speed_boots') state.supportSpeedMs = Math.max(state.supportSpeedMs, SUPPORT_SPEED_MS);
    else if (typeId === 'hint_card') state.supportHintCharges += SUPPORT_HINT_CHARGES;
    else if (typeId === 'combo_badge') state.supportComboBonus += SUPPORT_COMBO_BONUS;
  }

  function celebrateCheckpoint() {
    if (!state.score || state.score % CHECKPOINT_WORDS !== 0 || state.score >= SESSION_WORD_TARGET) return;
    const item = SUPPORT_ITEM_ROTATION[(state.score / CHECKPOINT_WORDS - 1) % SUPPORT_ITEM_ROTATION.length];
    applySupportEffect(item.id);
    showChapterBanner('检查点奖励', `完成 ${state.score}/${SESSION_WORD_TARGET} · 获得${item.label}`);
    setMessage(`完成 ${state.score} 个词，获得${item.label}。接下来敌人会更快一点！`);
  }

  function loadHeroSelection() {
    window.WordMemoryStorage.loadHeroSelection(state, HERO_SELECTION_KEY, HERO_REGISTRY, AUTO_START_PLAY_SESSION, DEBUG_AUTO_START);
  }

  function saveHeroSelection() {
    window.WordMemoryStorage.saveHeroSelection(state, HERO_SELECTION_KEY);
  }

  function saveLevelProgress(value) {
    window.WordMemoryStorage.saveLevelProgress(state, LEVEL_PROGRESS_KEY, value, clamp, LEVELS.length);
  }

  function cardPoolForCategory(category) {
    if (category === 'all') {
      return state.cards;
    }
    const pool = state.cards.filter(card => normalizeCategory(card) === category);
    return pool.length ? pool : state.cards;
  }

  function levelCardPool(level = currentLevel()) {
    return cardPoolForCategory(level.category);
  }

  function applyLevelSettings(level = currentLevel()) {
    const worldPackOverride = debugWorldPackOverride();
    state.currentLevelId = level.id;
    state.selectedWorldPack = worldPackOverride || level.worldPack;
    state.selectedCategory = level.category;
    if (els.worldSelect) {
      els.worldSelect.value = state.selectedWorldPack;
    }
    if (els.categorySelect) {
      els.categorySelect.value = state.selectedCategory;
    }
  }

  function renderLevelPanel() {
    const level = currentLevel();
    els.levelPanel.classList.toggle('is-collapsed', state.levelPanelCollapsed);
    els.levelText.textContent = `第 ${level.order} 关`;
    els.levelDetailText.textContent = `${level.title} · ${level.wordCount} 个词`;
    els.levelList.innerHTML = LEVELS.map(item => {
      const locked = !isLevelUnlocked(item);
      const classes = [
        'level-choice',
        item.id === state.currentLevelId ? 'is-active' : '',
        locked ? 'is-locked' : '',
        item.order < state.highestUnlockedLevel ? 'is-cleared' : ''
      ].filter(Boolean).join(' ');
      return `
        <button
          class="${classes}"
          type="button"
          data-level-id="${item.id}"
          aria-disabled="${locked ? 'true' : 'false'}"
          title="${locked ? '先通关前一关' : item.title}"
        >${item.order}</button>
      `;
    }).join('');
  }

  function renderCategorySelect() {
    const stats = categoryStats();
    const options = [
      `<option value="all">全部 · ${state.cards.length}</option>`,
      ...stats.map(([category, count]) => (
        `<option value="${category}">${categoryLabel(category)} · ${count}</option>`
      ))
    ];
    els.categorySelect.innerHTML = options.join('');
    els.categorySelect.value = state.selectedCategory;
  }

  function currentWorldPack() {
    return WORLD_PACK_REGISTRY[state.selectedWorldPack] || WORLD_PACK_REGISTRY.farm;
  }

  function currentHeroPack() {
    return HERO_REGISTRY[state.selectedHeroId] || HERO_REGISTRY.boy;
  }

  function worldPreviewImage(worldPackId) {
    return WORLD_PREVIEW_IMAGES[worldPackId] || WORLD_PREVIEW_IMAGES.farm_gpt;
  }

  function renderOnboarding() {
    els.heroSelectGrid.innerHTML = Object.values(HERO_REGISTRY).map(hero => `
      <button
        class="hero-option${hero.id === state.selectedHeroId ? ' is-selected' : ''}"
        type="button"
        data-hero-id="${hero.id}"
        aria-pressed="${hero.id === state.selectedHeroId ? 'true' : 'false'}"
      >
        <span class="hero-option-preview">
          <img src="${hero.preview}" alt="${hero.label}" decoding="async">
        </span>
        <span class="hero-option-copy">
          <strong>${hero.label}</strong>
          <span>${hero.subtitle}</span>
        </span>
      </button>
    `).join('');
    els.worldOptionGrid.innerHTML = Object.entries(WORLD_PACK_REGISTRY).map(([id, pack]) => `
      <button
        class="world-option${id === state.selectedWorldPack ? ' is-selected' : ''}"
        type="button"
      data-world-pack-id="${id}"
      aria-pressed="${id === state.selectedWorldPack ? 'true' : 'false'}"
      >
        <img src="${worldPreviewImage(id)}" alt="${pack.label}地图预览" decoding="async">
        <strong>${pack.label}</strong>
        <span>${id === 'farm_gpt' ? '阳光农场' : '主题探索地图'} · 目标：${categoryLabel(pack.category || 'all')}</span>
      </button>
    `).join('');
    const step = state.onboardingStep;
    els.onboardingStep.textContent = step === 'welcome' ? '准备出发' : (step === 'hero' ? '第 1 步 · 选择角色' : '第 2 步 · 选择地图');
    els.onboardingTitle.textContent = step === 'welcome' ? '像素探险' : (step === 'hero' ? '今天想用谁来冒险？' : '去哪个世界学单词？');
    els.onboardingCopy.textContent = step === 'welcome'
      ? '先选好伙伴和地图，再开始今天的单词冒险。'
      : (step === 'hero' ? '角色不会影响难度，选喜欢的就好。' : '每张地图都有自己的主题敌人，敌人头顶只显示英文单词。');
    els.onboardingWelcome.hidden = step !== 'welcome';
    els.heroSelectGrid.hidden = step !== 'hero';
    els.worldOptionGrid.hidden = step !== 'world';
    els.onboardingNextButton.textContent = step === 'welcome'
      ? '进入游戏'
      : (step === 'hero' ? '下一步：选地图' : '开始探索');
    els.heroSelectOverlay.hidden = !state.heroSelectOpen;
  }

  function selectHero(heroId, persist = true) {
    if (!Object.prototype.hasOwnProperty.call(HERO_REGISTRY, heroId)) {
      return;
    }
    state.selectedHeroId = heroId;
    if (persist) {
      saveHeroSelection();
    }
    renderOnboarding();
    renderEntities();
    syncDynamicEntities();
  }

  function selectOnboardingWorld(worldPackId) {
    if (!Object.prototype.hasOwnProperty.call(WORLD_PACK_REGISTRY, worldPackId)) {
      return;
    }
    state.selectedWorldPack = worldPackId;
    state.selectedCategory = WORLD_PACK_REGISTRY[worldPackId].category || 'all';
    renderOnboarding();
  }

  async function startOnboardingWorld() {
    const pendingLevelId = state.pendingLevelId;
    state.pendingLevelId = '';
    state.heroSelectOpen = false;
    renderOnboarding();
    if (pendingLevelId) {
      await startLevel(pendingLevelId, { preserveWorld: true });
      return;
    }
    await loadWorldTiles();
    renderWorldSelect();
    renderDecor();
    startGame({ applyLevel: false });
    setMessage(`${currentHeroPack().label}来到${currentWorldPack().label}。点击英文先预习，拿中文球后再投掷。`);
    render();
  }

  function renderWorldSelect() {
    const options = Object.entries(WORLD_PACK_REGISTRY).map(([id, pack]) => (
      `<option value="${id}">${pack.label}</option>`
    ));
    els.worldSelect.innerHTML = options.join('');
    els.worldSelect.value = state.selectedWorldPack;
  }

  function hideWorldDebugControls() {
    const worldControl = els.worldSelect?.closest('.world-control');
    if (worldControl) {
      worldControl.hidden = !ENABLE_AUTOMATION_WORLD_CONTROLS;
    }
    if (els.worldSelect) {
      els.worldSelect.disabled = !ENABLE_AUTOMATION_WORLD_CONTROLS;
    }
    if (els.sceneButton) {
      els.sceneButton.hidden = !ENABLE_AUTOMATION_WORLD_CONTROLS;
      els.sceneButton.disabled = !ENABLE_AUTOMATION_WORLD_CONTROLS;
    }
  }

  async function loadVoiceMap() {
    if (window.location.protocol === 'file:' && window.WORD_MEMORY_VOICE_MAP) {
      state.voiceMap = window.WORD_MEMORY_VOICE_MAP;
      return;
    }
    try {
      const response = await fetch(VOICE_MAP_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`voice map http ${response.status}`);
      }
      state.voiceMap = await response.json();
    } catch (error) {
      if (window.WORD_MEMORY_VOICE_MAP) {
        console.warn('[word-memory] voice json unavailable, using browser fallback map', error);
        state.voiceMap = window.WORD_MEMORY_VOICE_MAP;
        return;
      }
      state.voiceMap = {};
      console.warn('[word-memory] local voice map unavailable, fallback to speech synthesis', error);
    }
  }

  async function loadWorldTiles() {
    const pack = WORLD_PACK_REGISTRY[state.selectedWorldPack] || currentWorldPack();
    if (window.location.protocol === 'file:') {
      state.worldTiles = DEFAULT_WORLD_TILES;
      state.worldBackdrop = DEFAULT_WORLD_BACKDROP;
      els.mapScene.dataset.sceneTheme = pack.theme;
      return;
    }
    try {
      const response = await fetch(pack.manifestUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`world tile manifest http ${response.status}`);
      }
      const data = await response.json();
      if (data && data.mode === 'single' && data.image) {
        const labels = Array.isArray(data.labels) && data.labels.length
          ? data.labels
          : (Array.isArray(data.tiles) ? data.tiles.map(tile => tile.label) : []);
        state.worldTiles = tilesFromLabels(labels, data.image);
        state.worldBackdrop = {
          mode: 'single',
          image: data.image,
          labels
        };
      } else {
        state.worldTiles = Array.isArray(data.tiles) && data.tiles.length
          ? data.tiles
          : DEFAULT_WORLD_TILES;
        state.worldBackdrop = {
          mode: 'tiles',
          image: '',
          labels: state.worldTiles.map(tile => tile.label)
        };
      }
    } catch (error) {
      console.warn(`[word-memory] world tile manifest unavailable for ${state.selectedWorldPack}, using fallback tiles`, error);
      state.worldTiles = DEFAULT_WORLD_TILES;
      state.worldBackdrop = DEFAULT_WORLD_BACKDROP;
    }
    els.mapScene.dataset.sceneTheme = pack.theme;
  }

  function setMessage(text) {
    state.message = text;
    els.messageText.textContent = text;
  }

  function tileBase(tileIndex) {
    return {
      x: (tileIndex % WORLD_COLS) * WORLD_SCREEN_WIDTH,
      y: Math.floor(tileIndex / WORLD_COLS) * WORLD_SCREEN_HEIGHT
    };
  }

  function stagePercentX(worldX) {
    return (worldX / WORLD_WIDTH) * 100;
  }

  function stagePercentY(worldY) {
    return (worldY / WORLD_HEIGHT) * 100;
  }

  function tileIndexForPoint(point) {
    const col = clamp(Math.floor(point.x / WORLD_SCREEN_WIDTH), 0, WORLD_COLS - 1);
    const row = clamp(Math.floor(point.y / WORLD_SCREEN_HEIGHT), 0, WORLD_ROWS - 1);
    return row * WORLD_COLS + col;
  }

  function cameraTarget() {
    return {
      x: clamp(state.player.x - WORLD_SCREEN_WIDTH / 2, 0, WORLD_WIDTH - WORLD_SCREEN_WIDTH),
      y: clamp(state.player.y - WORLD_SCREEN_HEIGHT / 2, 0, WORLD_HEIGHT - WORLD_SCREEN_HEIGHT)
    };
  }

  function syncCamera() {
    state.camera = cameraTarget();
    const xPercent = (state.camera.x / WORLD_WIDTH) * 100;
    const yPercent = (state.camera.y / WORLD_HEIGHT) * 100;
    els.worldStage.style.transform = `translate3d(-${xPercent}%, -${yPercent}%, 0)`;
  }

  function currentTile() {
    const tileIndex = state.viewMode === 'classic'
      ? state.waveIndex
      : clamp(state.sceneIndex, 0, WORLD_TILE_COUNT - 1);
    return state.worldTiles[tileIndex] || DEFAULT_WORLD_TILES[tileIndex] || null;
  }

  function activeWaveIndex() {
    return state.waveIndex;
  }

  function isPlayableSceneIndex(tileIndex) {
    return tileIndex >= 0 && tileIndex < WORLD_TILE_COUNT;
  }

  function localScreenPoint(point, tileIndex = tileIndexForPoint(point)) {
    const base = tileBase(tileIndex);
    return {
      x: point.x - base.x,
      y: point.y - base.y
    };
  }

  function worldPointFromScreen(tileIndex, localX, localY) {
    const base = tileBase(tileIndex);
    return {
      x: clamp(base.x + localX, MAP_BOUNDS.minX, MAP_BOUNDS.maxX),
      y: clamp(base.y + localY, MAP_BOUNDS.minY, MAP_BOUNDS.maxY)
    };
  }

  function relocateWaveEntitiesToScene(waveIndex, sceneIndex) {
    if (waveIndex < 0 || sceneIndex < 0 || sceneIndex >= WORLD_TILE_COUNT) {
      return;
    }

    const targetBase = tileBase(sceneIndex);
    state.targets
      .filter(target => target.alive && target.waveIndex === waveIndex)
      .forEach((target, index) => {
        const slot = TARGET_SLOTS[index % TARGET_SLOTS.length];
        const jitterX = ((index % 2 === 0) ? 1 : -1) * 0.9;
        const jitterY = ((index % 3) - 1) * 0.7;
        target.x = clamp(targetBase.x + slot.x + jitterX, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
        target.y = clamp(targetBase.y + slot.y + jitterY, MAP_BOUNDS.minY, MAP_BOUNDS.maxY);
        target.homeX = target.x;
        target.homeY = target.y;
        target.spawnFxUntil = state.clock + 720;
        spawnSceneEntryEffect(target.x, target.y, 'enemy');
      });

    const orbBase = tileBase(sceneIndex);
    state.orbs
      .filter(orb => !orb.used && !orb.inFlight && orb.waveIndex === waveIndex)
      .forEach((orb, index) => {
        const slot = ORB_SLOTS[index % ORB_SLOTS.length];
        const jitterX = ((index % 2 === 0) ? -1 : 1) * 0.8;
        const jitterY = ((index % 3) - 1) * 0.6;
        orb.x = clamp(orbBase.x + slot.x + jitterX, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
        orb.y = clamp(orbBase.y + slot.y + jitterY, MAP_BOUNDS.minY, MAP_BOUNDS.maxY);
        orb.spawnFxUntil = state.clock + 680;
        spawnSceneEntryEffect(orb.x, orb.y + 2, 'orb');
      });
  }

  function aliveTargets(waveIndex = null) {
    return state.targets.filter(target => target.alive && (waveIndex === null || target.waveIndex === waveIndex));
  }

  function availableOrbs(waveIndex = null) {
    return state.orbs.filter(orb => !orb.used && !orb.inFlight && (waveIndex === null || orb.waveIndex === waveIndex));
  }

  function ensureActiveWaveHasLivingTargets() {
    if (aliveTargets(state.waveIndex).length) {
      return;
    }
    const nextIndex = aliveTargets()[0]?.waveIndex;
    if (Number.isInteger(nextIndex)) {
      state.waveIndex = nextIndex;
    }
  }

  function selectedOrb() {
    return state.orbs.find(orb => orb.id === state.selectedOrbId && !orb.used && !orb.inFlight) || null;
  }

  function focusedTarget() {
    return state.targets.find(target => target.id === state.focusedTargetId && target.alive) || null;
  }

  function learningCardFromTarget(target) {
    if (!target?.card) {
      return null;
    }
    const enemyRuntime = enemyImageRuntime(target.card);
    return {
      word: target.card.word,
      meaning: target.card.translation,
      image: enemyRuntime.src,
      fallbackImage: enemyRuntime.fallbackSrc || target.card.enemyFallbackImage,
      card: target.card
    };
  }

  function currentLearningCard() {
    const activeIndex = activeWaveIndex();
    const orb = selectedOrb();
    if (orb) {
      const matchedTarget = state.targets.find(target => target.alive && target.card.id === orb.card.id);
      return {
        word: matchedTarget?.card.word || orb.card.word,
        meaning: orb.card.translation,
        image: matchedTarget?.card.enemyImage || orb.card.enemyImage || orb.card.bombImage,
        fallbackImage: matchedTarget?.card.enemyFallbackImage || orb.card.enemyFallbackImage,
        card: orb.card
      };
    }
    return learningCardFromTarget(focusedTarget())
      || (activeIndex >= 0 ? learningCardFromTarget(aliveTargets(activeIndex)[0]) : null)
      || (state.viewMode === 'classic' ? learningCardFromTarget(aliveTargets()[0]) : null);
  }

  function renderLearningHint() {
    if (!state.learningHintCard) {
      els.learningHintCard.hidden = true;
      return;
    }
    const card = state.learningHintCard;
    const hintMode = card.hintMode || 'full';
    els.learningHintWord.textContent = hintMode === 'image'
      ? '看图想一想'
      : (hintMode === 'initial' ? `${String(card.word).slice(0, 1).toUpperCase()} _ _` : card.word);
    els.learningHintMeaning.textContent = hintMode === 'full' ? card.meaning : '自己先猜一猜';
    const example = String(card.card?.example || '').trim();
    const exampleZh = String(card.card?.exampleZh || '').trim();
    els.learningHintExample.textContent = example ? `用一用：${example}` : '';
    els.learningHintExample.hidden = !example;
    els.learningHintExampleZh.textContent = exampleZh;
    els.learningHintExampleZh.hidden = !exampleZh;
    if (!example && card.hintText) {
      els.learningHintExample.textContent = `提示：${card.hintText}`;
      els.learningHintExample.hidden = false;
    }
    els.learningHintImage.src = card.image || '';
    els.learningHintImage.alt = card.word;
    if (card.fallbackImage && card.fallbackImage !== card.image) {
      els.learningHintImage.dataset.fallbackSrc = card.fallbackImage;
      els.learningHintImage.onerror = () => useEnemyImageFallback(els.learningHintImage);
    } else {
      els.learningHintImage.removeAttribute('data-fallback-src');
      els.learningHintImage.onerror = null;
    }
    els.learningHintCard.hidden = false;
  }

  function showLearningHint(shouldSpeak = false) {
    const card = currentLearningCard();
    if (!card) {
      setMessage('这块地图还没有可提示的单词。');
      return;
    }
    const boosted = state.supportHintCharges > 0;
    if (boosted) {
      state.supportHintCharges = Math.max(0, state.supportHintCharges - 1);
    }
    state.hintsUsed += 1;
    const hintMode = state.score < 10 ? 'full' : (state.score < 30 ? 'image' : 'initial');
    state.learningHintCard = boosted && card.word
      ? {
          ...card,
          hintText: `首字母 ${String(card.word).slice(0, 1).toUpperCase()}`,
          hintMode: 'initial'
        }
      : { ...card, hintMode };
    renderLearningHint();
    updateHud();
    setMessage(boosted
      ? `强化提示：${card.meaning} -> ${card.word}`
      : `${card.meaning} -> ${card.word}`);
    if (shouldSpeak) {
      emitSpeechDebugEvent(card.word, 'en-US', 'hint');
      speak(card.word, 'en-US');
    }
  }

  function showLearningHintForCardId(cardId, shouldSpeak = true) {
    const target = state.targets.find(item => item.card.id === cardId)
      || aliveTargets().find(item => item.card.id === cardId);
    const fallbackCard = state.cards.find(item => item.id === cardId) || null;
    const card = target
      ? learningCardFromTarget(target)
      : (fallbackCard ? {
          word: fallbackCard.word,
          meaning: fallbackCard.translation,
          image: fallbackCard.enemyImage || fallbackCard.bombImage,
          fallbackImage: fallbackCard.enemyFallbackImage,
          card: fallbackCard
        } : null);
    if (!card) {
      return;
    }
    state.learningHintCard = card;
    renderLearningHint();
    setMessage(`${card.meaning} -> ${card.word}`);
    if (shouldSpeak) {
      emitSpeechDebugEvent(card.word, 'en-US', 'hint-preview');
      speak(card.word, 'en-US');
    }
  }

  function showLearningToast(card) {
    if (!card?.word) {
      return;
    }
    state.learningToastCard = card;
    els.learningToastWord.textContent = card.word;
    els.learningToastMeaning.textContent = card.meaning;
    els.learningToast.hidden = false;
    window.clearTimeout(state.learningToastTimer);
    state.learningToastTimer = window.setTimeout(() => {
      els.learningToast.hidden = true;
      state.learningToastCard = null;
    }, 1400);
  }

  function renderMissionWordPreview(waveCards) {
    const aliveIds = new Set(aliveTargets(state.waveIndex).map(target => target.card.id));
    els.missionWordPreview.innerHTML = waveCards.map(card => {
      const done = !aliveIds.has(card.id);
      return `
        <span class="mission-word-chip${done ? ' is-done' : ''}" data-preview-word-id="${card.id}">
          <span class="preview-word">${card.word}</span>
          <span class="preview-meaning">${card.translation}</span>
        </span>
      `;
    }).join('');
  }

  function buildWaveCards(waveIndex = state.waveIndex) {
    const start = waveIndex * ROUND_SIZE;
    return state.deck.slice(start, start + ROUND_SIZE);
  }

  function supportItemById(itemId) {
    return SUPPORT_ITEM_ROTATION.find(item => item.id === itemId) || SUPPORT_ITEM_ROTATION[0];
  }

  function supportStatusEntries() {
    const entries = [];
    if (state.supportShieldCharges > 0) {
      entries.push({
        id: 'shield_leaf',
        label: '补盾叶',
        detail: `挡 ${state.supportShieldCharges} 次`,
        icon: '+',
        iconSrc: supportItemById('shield_leaf').iconSrc,
        accent: 'shield'
      });
    }
    if (state.supportSlowMs > 0) {
      entries.push({
        id: 'slow_clock',
        label: '减速钟',
        detail: `${Math.ceil(state.supportSlowMs / 1000)} 秒`,
        icon: '~',
        iconSrc: supportItemById('slow_clock').iconSrc,
        accent: 'slow'
      });
    }
    if (state.supportAutoAimShots > 0) {
      entries.push({
        id: 'auto_star',
        label: '瞄准星',
        detail: `${state.supportAutoAimShots} 发`,
        icon: '*',
        iconSrc: supportItemById('auto_star').iconSrc,
        accent: 'auto'
      });
    }
    if (state.supportSpeedMs > 0) {
      entries.push({
        id: 'speed_boots',
        label: '加速鞋',
        detail: `${Math.ceil(state.supportSpeedMs / 1000)} 秒`,
        icon: '>',
        iconSrc: supportItemById('speed_boots').iconSrc,
        accent: 'speed'
      });
    }
    if (state.supportHintCharges > 0) {
      entries.push({
        id: 'hint_card',
        label: '词卡提示',
        detail: `${state.supportHintCharges} 次`,
        icon: '?',
        iconSrc: supportItemById('hint_card').iconSrc,
        accent: 'hint'
      });
    }
    if (state.supportComboBonus > 0) {
      entries.push({
        id: 'combo_badge',
        label: '连击加成',
        detail: `下次答对+${state.supportComboBonus}`,
        icon: 'x',
        iconSrc: supportItemById('combo_badge').iconSrc,
        accent: 'combo'
      });
    }
    return entries;
  }

  function consumeComboBonusOnCorrectHit() {
    if (state.supportComboBonus <= 0) {
      return false;
    }
    state.supportComboBonus = Math.max(0, state.supportComboBonus - 1);
    state.shield = Math.min(MAX_SHIELD, state.shield + 1);
    return true;
  }

  function nextSupportRotationItem() {
    const cycleIndex = Math.max(0, Math.floor((state.score / SUPPORT_DROP_EVERY_SCORE) - 1));
    return SUPPORT_ITEM_ROTATION[cycleIndex % SUPPORT_ITEM_ROTATION.length];
  }

  function makeSupportDrop(typeId, x, y, waveIndex = state.waveIndex) {
    const item = supportItemById(typeId);
    const themedIconSrc = WORLD_THEME_SUPPORT_ICONS[currentLevel()?.worldPack]?.[item.id] || item.iconSrc || '';
    return {
      id: `support-${item.id}-${Date.now()}-${Math.random()}`,
      typeId: item.id,
      label: item.label,
      shortLabel: item.shortLabel,
      icon: item.icon,
      iconSrc: themedIconSrc,
      accent: item.accent,
      waveIndex,
      x: clamp(x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX),
      y: clamp(y, MAP_BOUNDS.minY, MAP_BOUNDS.maxY),
      wobble: Math.random() * Math.PI * 2,
      spawnFxUntil: state.clock + 720,
      picked: false
    };
  }

  function spawnSupportDrop(typeId, x, y, waveIndex = state.waveIndex) {
    const drop = makeSupportDrop(typeId, x, y, waveIndex);
    state.supportDrops.push(drop);
    spawnSceneEntryEffect(drop.x, drop.y, 'orb');
    return drop;
  }

  function maybeSpawnSupportDrop(target, waveIndex = state.waveIndex) {
    if (!target || state.score <= 0 || state.score % SUPPORT_DROP_EVERY_SCORE !== 0) {
      return null;
    }
    if (state.supportDrops.some(drop => !drop.picked && drop.waveIndex === waveIndex)) {
      return null;
    }
    const item = nextSupportRotationItem();
    return spawnSupportDrop(item.id, target.x, target.y - 2, waveIndex);
  }

  function makeTarget(card, index, waveIndex) {
    const slot = TARGET_SLOTS[index % TARGET_SLOTS.length];
    const base = tileBase(waveIndex);
    const x = base.x + slot.x + randomOffset(1.6);
    const y = base.y + slot.y + randomOffset(1.2);
    return {
      id: `target-${card.id}`,
      card,
      waveIndex,
      x,
      y,
      spawnFxUntil: 0,
      homeX: x,
      homeY: y,
      radiusX: 1.8 + Math.random() * 1.2,
      radiusY: 1.3 + Math.random() * 1.1,
      speedX: 0.95 + Math.random() * 0.3,
      speedY: 0.75 + Math.random() * 0.35,
      chaseSpeed: (ENEMY_CHASE_SPEED + index * 0.0008) * currentLevel().enemySpeedScale,
      attackRadius: ENEMY_ATTACK_RADIUS,
      attackCooldown: 520 + index * 150,
      phase: Math.random() * Math.PI * 2,
      alive: true,
      flash: ''
    };
  }

  function makeOrb(card, index, waveIndex) {
    const slot = ORB_SLOTS[index % ORB_SLOTS.length];
    const base = tileBase(waveIndex);
    return {
      id: `orb-${card.id}`,
      card,
      waveIndex,
      x: base.x + slot.x + randomOffset(1.6),
      y: base.y + slot.y + randomOffset(1.6),
      wobble: Math.random() * Math.PI * 2,
      spawnFxUntil: 0,
      used: false,
      inFlight: false
    };
  }

  function targetPosition(target) {
    return {
      x: target.x ?? target.homeX,
      y: target.y ?? target.homeY
    };
  }

  function nearestAliveTarget() {
    let best = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    aliveTargets().forEach(target => {
      const position = targetPosition(target);
      const measure = distance(position, state.player);
      if (measure < bestDistance) {
        bestDistance = measure;
        best = target;
      }
    });
    return best;
  }

  function renderSupportTray() {
    const entries = supportStatusEntries();
    els.supportTrayTitle.textContent = entries.length
      ? '拿到后会直接帮你冒险'
      : '答对后会掉落新的小道具';
    els.supportSlotList.innerHTML = entries.length
      ? entries.map(entry => `
        <div class="support-slot is-${entry.accent}" data-support-type="${entry.id}">
          <span class="support-slot-icon" aria-hidden="true">
            ${entry.iconSrc
              ? `<img src="${entry.iconSrc}" alt="" decoding="async">`
              : entry.icon}
          </span>
          <span class="support-slot-copy">
            <strong>${entry.label}</strong>
            <span>${entry.detail}</span>
          </span>
        </div>
      `).join('')
      : `
        <div class="support-slot is-empty">
          <span class="support-slot-icon" aria-hidden="true">+</span>
          <span class="support-slot-copy">
            <strong>还没有支援</strong>
            <span>连着答对会掉落</span>
          </span>
        </div>
      `;
  }

  function updateHud() {
    const activeIndex = activeWaveIndex();
    const hasWave = activeIndex >= 0;
    const tile = currentTile();
    const pack = currentWorldPack();
    const unlockedScenes = Math.max(1, state.totalWaves);
    const waveCards = hasWave ? buildWaveCards(activeIndex) : [];
    const solvedThisWave = waveCards.length - aliveTargets(activeIndex).length;
    const remainingThisWave = aliveTargets(activeIndex).length;
    const waveRatio = waveCards.length ? solvedThisWave / waveCards.length : 0;
    els.waveText.textContent = `第 ${state.sceneIndex + 1} 块 / ${state.totalWaves}`;
    els.scoreText.textContent = String(state.score);
    els.shieldText.textContent = String(state.shield);
    els.shieldStrip.innerHTML = Array.from({ length: MAX_SHIELD }, (_, index) => (
      `<span class="${index < state.shield ? 'is-on' : ''}">◆</span>`
    )).join('');
    els.progressText.textContent = `${state.score} / ${state.deck.length}`;
    els.starStrip.innerHTML = Array.from({ length: state.deck.length }, (_, index) => (
      `<span class="${index < state.score ? 'is-on' : ''}">★</span>`
    )).join('');

    const orb = selectedOrb();
    els.currentMeaning.classList.toggle('is-empty', !orb);
    els.currentMeaningText.textContent = orb
      ? orb.card.translation
      : (hasWave ? '点中文炸弹' : '这块地图暂无单词');
    els.missionCountText.textContent = `${solvedThisWave} / ${waveCards.length || 0}`;
    els.missionRemainingText.textContent = `还剩 ${remainingThisWave} 个`;
    renderMissionWordPreview(waveCards);
    els.comboText.textContent = String(state.streak);
    els.comboChip.classList.toggle('is-hot', state.streak >= 2);
    els.missionProgressFill.style.setProperty('--mission-progress', String(waveRatio));
    els.messageText.textContent = state.message;
    els.sceneButton.setAttribute('aria-label', tile ? `跳到下一块地图，当前${tile.label}` : '跳到下一块地图');
    els.sceneButton.setAttribute('title', tile ? `下一块地图：${tile.label}` : '跳到下一块地图');
    els.worldSelect.setAttribute('aria-label', `选择地图主题，当前${pack.label}`);
    els.soundButton.setAttribute('aria-label', state.audioEnabled ? '音效已开启' : '音效已关闭');
    els.soundButton.setAttribute('title', state.audioEnabled ? '音效已开启' : '音效已关闭');
    els.soundButton.classList.toggle('is-off', !state.audioEnabled);
    els.modeButton.setAttribute('aria-label', state.viewMode === 'classic' ? '切换到俯视地图' : '切换到经典炮弹');
    els.modeButton.setAttribute('title', state.viewMode === 'classic' ? '切换到俯视地图' : '切换到经典炮弹');
    els.modeButton.textContent = state.viewMode === 'classic' ? '▦' : '⇄';
    renderSupportTray();
    renderWorldOverview();
    renderLevelPanel();
  }

  function currentScene() {
    return currentTile();
  }

  function isFallbackWorldTile(tile) {
    return !!tile && /assets\/generated\/world-bg-tiles\/farm(?:-gpt)?-9grid\//.test(tile.src || '');
  }

  function renderWorldOverview() {
    if (!els.worldOverview) {
      return;
    }
    const total = state.worldTiles.length || 0;
    const unlocked = Math.max(1, state.totalWaves);
    els.worldOverview.innerHTML = `
      <div class="world-overview-head">
        <span class="world-overview-status">${unlocked}/${total} 已开放</span>
      </div>
      <div class="world-overview-grid">
        ${state.worldTiles.map((tile, index) => {
          const active = index === state.sceneIndex ? ' is-active' : '';
          const done = index < state.totalWaves && index < state.waveIndex ? ' is-complete' : '';
          const fallback = isFallbackWorldTile(tile) ? ' is-fallback' : '';
          const locked = index >= state.totalWaves ? ' is-locked' : '';
          return `
            <div class="world-overview-cell${active}${done}${fallback}${locked}" title="${tile.label}">
              <img src="${tile.src}" alt="" decoding="async">
              <span class="world-overview-badge" aria-hidden="true"></span>
              <span class="world-overview-cell-label">${tile.label}</span>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function applyWaveScene() {
    state.sceneIndex = state.waveIndex;
    renderDecor();
  }

  function showChapterBanner(kicker, title) {
    if (state.chapterBannerTimer) {
      window.clearTimeout(state.chapterBannerTimer);
      state.chapterBannerTimer = 0;
    }
    els.chapterKicker.textContent = kicker;
    els.chapterTitle.textContent = title;
    els.chapterBanner.hidden = false;
    state.chapterBannerTimer = window.setTimeout(() => {
      els.chapterBanner.hidden = true;
      state.chapterBannerTimer = 0;
    }, 1350);
  }

  function finishBadgeMarkup() {
    const badges = state.worldTiles.slice(0, state.totalWaves).map(tile => `<span>★ ${tile.label}</span>`);
    if (state.hitsTaken === 0) {
      badges.push('<span>灵巧走位</span>');
    }
    if (state.wrongShots === 0 && state.shotsFired > 0) {
      badges.push('<span>零失误</span>');
    }
    if (state.bestStreak >= 3) {
      badges.push('<span>连对高手</span>');
    }
    return badges.join('');
  }

  function finishStatsMarkup() {
    const accuracy = state.shotsFired
      ? Math.round(((state.shotsFired - state.wrongShots) / state.shotsFired) * 100)
      : 100;
    return [
      `<span>命中率 ${accuracy}%</span>`,
      `<span>最长连对 ${state.bestStreak}</span>`,
      `<span>被追到 ${state.hitsTaken}</span>`,
      `<span>发射 ${state.shotsFired}</span>`
    ].join('');
  }

  function ensureAudio() {
    if (!state.audioEnabled) {
      return null;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
      return null;
    }
    if (!state.audioContext) {
      state.audioContext = new AudioCtor();
    }
    if (state.audioContext.state === 'suspended') {
      state.audioContext.resume().catch(() => {});
    }
    state.audioReady = true;
    return state.audioContext;
  }

  function playSfx(kind) {
    if (!state.audioEnabled) {
      return;
    }
    const audio = ensureAudio();
    if (!audio) {
      return;
    }
    const now = audio.currentTime;
    const profiles = {
      pickup: [
        { freq: 622, duration: 0.06, type: 'triangle', gain: 0.022 },
        { freq: 784, duration: 0.08, type: 'triangle', gain: 0.016, delay: 0.055 }
      ],
      correct: [
        { freq: 659, duration: 0.08, type: 'triangle', gain: 0.03 },
        { freq: 880, duration: 0.12, type: 'triangle', gain: 0.024, delay: 0.07 },
        { freq: 988, duration: 0.14, type: 'triangle', gain: 0.018, delay: 0.15 }
      ],
      wrong: [
        { freq: 220, duration: 0.09, type: 'sawtooth', gain: 0.018 },
        { freq: 174, duration: 0.12, type: 'sawtooth', gain: 0.012, delay: 0.06 }
      ],
      chapter: [
        { freq: 392, duration: 0.08, type: 'triangle', gain: 0.02 },
        { freq: 523, duration: 0.11, type: 'triangle', gain: 0.022, delay: 0.06 }
      ],
      finish: [
        { freq: 523, duration: 0.1, type: 'triangle', gain: 0.024 },
        { freq: 659, duration: 0.12, type: 'triangle', gain: 0.02, delay: 0.07 },
        { freq: 784, duration: 0.16, type: 'triangle', gain: 0.018, delay: 0.16 }
      ]
    };
    (profiles[kind] || []).forEach(step => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = now + (step.delay || 0);
      const stop = start + step.duration;
      oscillator.type = step.type;
      oscillator.frequency.setValueAtTime(step.freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(step.gain, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, stop);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(stop);
    });
  }

  function toggleAudio() {
    state.audioEnabled = !state.audioEnabled;
    if (state.audioEnabled) {
      ensureAudio();
      playSfx('pickup');
      setMessage('音效已开启。');
    } else {
      setMessage('音效已关闭。');
    }
    updateHud();
  }

  function renderDecor() {
    els.mapScene.dataset.sceneTheme = currentWorldPack().theme;
    if (state.worldBackdrop?.mode === 'single' && state.worldBackdrop.image) {
      els.sceneBackdrop.innerHTML = `
        <figure class="world-single-frame" data-tile-theme="${currentWorldPack().theme}">
          <img class="world-panorama" src="${state.worldBackdrop.image}" alt="" decoding="async">
        </figure>
      `;
    } else {
      els.sceneBackdrop.innerHTML = state.worldTiles.map(tile => `
        <figure
          class="world-tile-frame"
          data-tile-theme="${currentWorldPack().theme}"
          style="left:${(tile.col / WORLD_COLS) * 100}%; top:${(tile.row / WORLD_ROWS) * 100}%; width:${100 / WORLD_COLS}%; height:${100 / WORLD_ROWS}%; position:absolute; margin:0;"
        >
          <img
            class="world-tile"
            src="${tile.src}"
            alt=""
            decoding="async"
            style="left:0; top:0;"
          >
        </figure>
      `).join('');
    }
    els.decorLayer.innerHTML = '';
  }

  function cycleScene() {
    if (!WORLD_TILE_COUNT) {
      return;
    }
    const nextPlayableScenes = Array.from({ length: WORLD_TILE_COUNT }, (_, index) => index)
      .filter(index => isPlayableSceneIndex(index));
    if (!nextPlayableScenes.length) {
      return;
    }
    const currentPlayableIndex = nextPlayableScenes.indexOf(state.sceneIndex);
    const nextPlayableIndex = currentPlayableIndex >= 0
      ? (currentPlayableIndex + 1) % nextPlayableScenes.length
      : 0;
    state.sceneIndex = nextPlayableScenes[nextPlayableIndex];
    const tile = state.worldTiles[state.sceneIndex];
    if (!tile) {
      return;
    }
    const base = tileBase(state.sceneIndex);
    state.player.x = base.x + PLAYER_START.x;
    state.player.y = base.y + PLAYER_START.y;
    ensureActiveWaveHasLivingTargets();
    relocateWaveEntitiesToScene(state.waveIndex, state.sceneIndex);
    state.selectedOrbId = null;
    state.lastPromptOrbId = null;
    syncCamera();
    showChapterBanner('快速切换', tile.label);
    updateHud();
    render();
  }

  function syncSceneByPlayerScreen(forceBanner = false) {
    const nextSceneIndex = clamp(tileIndexForPoint(state.player), 0, WORLD_TILE_COUNT - 1);
    if (!forceBanner && nextSceneIndex === state.sceneIndex) {
      return;
    }

    const previousSceneIndex = state.sceneIndex;
    state.sceneIndex = nextSceneIndex;
    ensureActiveWaveHasLivingTargets();
    if (previousSceneIndex !== nextSceneIndex && aliveTargets(state.waveIndex).length) {
      relocateWaveEntitiesToScene(state.waveIndex, nextSceneIndex);
    }
    const tile = currentTile();
    if (tile && (forceBanner || !state.finished)) {
      const cards = buildWaveCards(state.waveIndex);
      showChapterBanner(
        `第 ${state.sceneIndex + 1} 块地图`,
        `${tile.label} · ${cards.length} 个词`
      );
    }
    state.focusedTargetId = aliveTargets(state.waveIndex)[0]?.id || aliveTargets()[0]?.id || null;
    updateHud();
    if (state.viewMode === 'classic') {
      renderClassicStage();
      return;
    }
    renderEntities();
    syncDynamicEntities();
  }

  function heroDirectionFamily() {
    if (state.heroDirection === 'left') {
      return 'side';
    }
    if (state.heroDirection === 'right') {
      return 'right';
    }
    return state.heroDirection;
  }

  function heroFrameIndex() {
    return Math.floor(state.heroAnimTime / HERO_WALK_FRAME_MS) % HERO_WALK_FRAME_COUNT;
  }

  function heroSpriteState() {
    const family = heroDirectionFamily();
    const heroSprites = currentHeroPack().sprites;

    if (state.heroPose === 'attack') {
      return {
        key: `attack-${state.heroDirection}`,
        src: state.heroDirection === 'right' ? heroSprites.cast.right : heroSprites.cast.left
      };
    }

    if (state.heroPose === 'happy') {
      return {
        key: 'happy',
        src: heroSprites.happy
      };
    }

    if (state.heroMoving) {
      const frameIndex = heroFrameIndex();
      const frameSources = [
        heroSprites[family].walk[0],
        heroSprites[family].idle,
        heroSprites[family].walk[1]
      ];
      return {
        key: `${family}-walk-${frameIndex}`,
        src: frameSources[frameIndex]
      };
    }

    return {
      key: `${family}-idle`,
      src: heroSprites[family].idle
    };
  }

  function heroClassName() {
    return [
      'hero-unit',
      `is-facing-${state.heroDirection}`,
      state.heroMoving ? 'is-moving' : '',
      `is-pose-${state.heroPose}`,
      state.heroInvincibleMs > 0 ? 'is-shielded' : ''
    ].filter(Boolean).join(' ');
  }

  function renderHero() {
    const heroSprite = heroSpriteState();
    const carriedOrb = selectedOrb();

    return `
      <div class="${heroClassName()}" data-hero="${state.selectedHeroId}" style="left:${stagePercentX(state.player.x)}%; top:${stagePercentY(state.player.y)}%;" aria-hidden="true">
        <img class="entity-shadow hero-shadow-image" src="${FARM_ASSETS.shadows.hero}" alt="" decoding="async">
        <img class="hero-sprite" src="${heroSprite.src}" data-sprite-key="${heroSprite.key}" alt="" decoding="async">
        ${carriedOrb ? `
          <span class="hero-carry-orb">
            <img class="entity-shadow hero-carry-orb-shadow" src="${FARM_ASSETS.shadows.orb}" alt="" decoding="async">
            <img class="hero-orb-badge" src="${carriedOrb.card.bombImage}" alt="" decoding="async">
          </span>
        ` : ''}
      </div>
    `;
  }

  function renderOrbs() {
    const visibleWave = activeWaveIndex();
    return state.orbs.filter(orb => !orb.used && !orb.inFlight && orb.waveIndex === visibleWave && orb.id !== state.selectedOrbId).map(orb => {
      const classes = [
        'meaning-orb',
        'bomb-node',
        state.selectedOrbId === orb.id ? 'is-selected' : '',
        orb.spawnFxUntil > state.clock ? 'is-spawning' : ''
      ].filter(Boolean).join(' ');

      return `
        <button
          class="${classes}"
          type="button"
          data-orb-id="${orb.id}"
          style="left:${stagePercentX(orb.x)}%; top:${stagePercentY(orb.y)}%"
          aria-label="${orb.card.translation}"
        >
          <img class="entity-shadow orb-shadow-image" src="${FARM_ASSETS.shadows.orb}" alt="" decoding="async">
          <img class="orb-sprite" src="${orb.card.bombImage}" alt="" decoding="async">
          <span class="orb-tag">
            <img class="orb-tag-skin" src="${orb.card.labelImage}" alt="" decoding="async">
            <span class="orb-tag-text">${orb.card.translation}</span>
          </span>
        </button>
      `;
    }).join('');
  }

  function renderSupportDrops() {
    return state.supportDrops
      .filter(drop => !drop.picked && drop.waveIndex === state.sceneIndex)
      .map(drop => `
        <button
          class="support-drop is-${drop.accent}${drop.spawnFxUntil > state.clock ? ' is-spawning' : ''}"
          type="button"
          data-support-id="${drop.id}"
          style="left:${stagePercentX(drop.x)}%; top:${stagePercentY(drop.y)}%"
          aria-label="${drop.label}"
          title="${drop.label}"
        >
          <span class="support-drop-badge" aria-hidden="true">
            ${drop.iconSrc
              ? `<img src="${drop.iconSrc}" alt="" decoding="async">`
              : drop.icon}
          </span>
          <span class="support-drop-label">${drop.shortLabel}</span>
        </button>
      `)
      .join('');
  }

  function enemyImageRuntime(card) {
    const themePool = WORLD_THEME_ENEMY_FALLBACKS[currentWorldPack()?.theme] || [];
    const themedFallback = themePool.length
      ? themePool[(Number(card?.themeEnemyIndex) || 0) % themePool.length]
      : '';
    const primary = String(card?.enemyImage || '').trim();
    const themePrimary = themePool.length ? themedFallback : primary;
    const fallback = String(card?.enemyFallbackImage || '').trim();
    const failureKey = enemyRemoteImageFailureKey(primary);
    const blockedPrimary = Boolean(failureKey) && state.blockedEnemyImageKeys.has(failureKey);
    const useFallbackFirst = !themePool.length && isRemoteImageSource(primary) && fallback && fallback !== primary;
    return {
      src: blockedPrimary ? (fallback || themePrimary || primary) : (useFallbackFirst ? fallback : (themePrimary || fallback)),
      primarySrc: useFallbackFirst && !blockedPrimary ? primary : '',
      fallbackSrc: fallback && fallback !== themePrimary ? fallback : ''
    };
  }

  function enemyImageMarkup(card, className) {
    const runtime = enemyImageRuntime(card);
    const primaryAttr = runtime.primarySrc ? ` data-primary-src="${runtime.primarySrc}"` : '';
    const fallbackAttr = runtime.fallbackSrc ? ` data-fallback-src="${runtime.fallbackSrc}"` : '';
    return `<img class="${className}" src="${runtime.src}" alt="" decoding="async"${primaryAttr}${fallbackAttr}>`;
  }

  function useEnemyImageFallback(image) {
    const fallback = image?.dataset?.fallbackSrc;
    if (!fallback || image.dataset.fallbackUsed === 'true') {
      return;
    }
    image.dataset.fallbackUsed = 'true';
    image.src = fallback;
  }

  function armEnemyImageFallbacks(root) {
    root.querySelectorAll('img[data-fallback-src], img[data-primary-src]').forEach(image => {
      if (image.dataset.fallbackArmed !== 'true') {
        image.dataset.fallbackArmed = 'true';
        image.addEventListener('error', () => useEnemyImageFallback(image), { once: true });
        window.setTimeout(() => {
          if (!image.isConnected) {
            return;
          }
          if (!image.complete || image.naturalWidth === 0) {
            useEnemyImageFallback(image);
          }
        }, ENEMY_IMAGE_FALLBACK_MS);
      }

      const primary = image.dataset.primarySrc;
      if (!primary || image.dataset.primaryArmed === 'true') {
        return;
      }
      image.dataset.primaryArmed = 'true';
      const preload = new window.Image();
      preload.decoding = 'async';
      preload.onload = () => {
        if (!image.isConnected) {
          return;
        }
        image.src = primary;
        image.dataset.primaryLoaded = 'true';
      };
      preload.onerror = () => {
        const failureKey = enemyRemoteImageFailureKey(primary);
        if (failureKey) {
          state.blockedEnemyImageKeys.add(failureKey);
        }
        useEnemyImageFallback(image);
      };
      preload.src = primary;
    });
  }

  function renderTargets() {
    const visibleWave = activeWaveIndex();
    return state.targets.filter(target => target.alive && target.waveIndex === visibleWave).map(target => {
      const position = targetPosition(target);
      const classes = [
        'enemy-unit',
        'is-chasing',
        state.focusedTargetId === target.id ? 'is-focused' : '',
        target.flash === 'wrong' ? 'is-wrong' : '',
        target.flash === 'attack' ? 'is-attacking' : '',
        target.spawnFxUntil > state.clock ? 'is-spawning' : ''
      ].filter(Boolean).join(' ');

      return `
        <button
          class="${classes}"
          type="button"
          data-target-id="${target.id}"
          style="left:${stagePercentX(position.x)}%; top:${stagePercentY(position.y)}%"
          aria-label="${target.card.word}"
        >
          <span class="enemy-word">${target.card.word}</span>
          ${enemyImageMarkup(target.card, 'target-avatar enemy-sprite')}
        </button>
      `;
    }).join('');
  }

  function renderEffects() {
    const shots = state.shots.map(shot => {
      const point = pointForPercent(shot.x, shot.y);
      return `${renderShotAimLine(shot)}${renderShotTrailGhosts(shot)}<span class="shot" style="left:${point.x}px; top:${point.y}px; --shot-rotate:${shot.angle}deg;">
        <img class="shot-image" src="${shot.image}" alt="" decoding="async">
      </span>`;
    }).join('');
    const sparks = state.sparks.map(spark => (
      `<span class="spark" style="left:${spark.x}px; top:${spark.y}px;">
        <img class="spark-image" src="${spark.image}" alt="" decoding="async">
      </span>`
    )).join('');
    els.projectileLayer.innerHTML = `${shots}${sparks}`;
  }

  function renderClassicStage() {
    if (!els.classicStage) return;
    const targets = aliveTargets(state.waveIndex);
    const orbs = availableOrbs(state.waveIndex);
    const selected = selectedOrb();
    els.classicStatusText.textContent = selected
      ? `已装填：${selected.card.translation}`
      : '选择下方中文炮弹，再点上方英文目标。';
    els.classicProgressText.textContent = `${state.score} / ${state.deck.length}`;
    els.classicTargetRow.innerHTML = targets.map((target, index) => `
      <button
        class="classic-target${state.focusedTargetId === target.id ? ' is-focused' : ''}${target.flash === 'wrong' ? ' is-wrong' : ''}"
        type="button"
        data-classic-target-id="${target.id}"
        style="--classic-x:${index + 1}"
        aria-label="${target.card.word}"
      >
        <span>${target.card.word}</span>
        ${enemyImageMarkup(target.card, '')}
      </button>
    `).join('');
    els.classicCannonRow.innerHTML = orbs.map((orb, index) => `
      <button
        class="classic-orb${selected?.id === orb.id ? ' is-selected' : ''}"
        type="button"
        data-classic-orb-id="${orb.id}"
        style="--classic-x:${index + 1}"
        aria-label="${orb.card.translation}"
      >
        <img src="${orb.card.bombImage}" alt="" decoding="async">
        <span>${orb.card.translation}</span>
      </button>
    `).join('');
    els.classicFlightLayer.innerHTML = state.classicShotFx ? `
      <span
        class="classic-shot${state.classicShotFx.correct ? ' is-correct' : ' is-wrong'}"
        style="--from-x:${state.classicShotFx.fromX}%; --to-x:${state.classicShotFx.toX}%"
      >
        <img src="${state.classicShotFx.image}" alt="" decoding="async">
      </span>
    ` : '';
    armEnemyImageFallbacks(els.classicStage);
  }

  function renderEntities() {
    els.entityLayer.innerHTML = `${renderOrbs()}${renderSupportDrops()}${renderTargets()}${renderHero()}`;
    armEnemyImageFallbacks(els.entityLayer);
  }

  function syncDynamicEntities() {
    const hero = els.entityLayer.querySelector('.hero-unit');
    if (hero) {
      hero.style.left = `${stagePercentX(state.player.x)}%`;
      hero.style.top = `${stagePercentY(state.player.y)}%`;
      hero.className = heroClassName();
      const heroSprite = hero.querySelector('.hero-sprite');
      const spriteState = heroSpriteState();
      if (heroSprite && heroSprite.dataset.spriteKey !== spriteState.key) {
        heroSprite.src = spriteState.src;
        heroSprite.dataset.spriteKey = spriteState.key;
      }
    }

    state.orbs.filter(orb => !orb.used).forEach(orb => {
      const orbEl = els.entityLayer.querySelector(`[data-orb-id="${orb.id}"]`);
      if (!orbEl) {
        return;
      }
      orbEl.style.left = `${stagePercentX(orb.x)}%`;
      orbEl.style.top = `${stagePercentY(orb.y)}%`;
      orbEl.classList.toggle('is-selected', state.selectedOrbId === orb.id);
    });

    state.targets.filter(target => target.alive).forEach(target => {
      const targetEl = els.entityLayer.querySelector(`[data-target-id="${target.id}"]`);
      if (!targetEl) {
        return;
      }
      const position = targetPosition(target);
      targetEl.style.left = `${stagePercentX(position.x)}%`;
      targetEl.style.top = `${stagePercentY(position.y)}%`;
      targetEl.classList.toggle('is-focused', state.focusedTargetId === target.id);
      targetEl.classList.toggle('is-wrong', target.flash === 'wrong');
    });

    state.supportDrops.filter(drop => !drop.picked).forEach(drop => {
      const dropEl = els.entityLayer.querySelector(`[data-support-id="${drop.id}"]`);
      if (!dropEl) {
        return;
      }
      dropEl.style.left = `${stagePercentX(drop.x)}%`;
      dropEl.style.top = `${stagePercentY(drop.y)}%`;
    });
    syncCamera();
  }

  function render() {
    updateHud();
    renderEntities();
    syncDynamicEntities();
    renderEffects();
    renderClassicStage();
  }

  function applyViewMode() {
    els.mapScene.hidden = state.viewMode === 'classic';
    els.classicStage.hidden = state.viewMode !== 'classic';
    updateHud();
    renderClassicStage();
  }

  function toggleViewMode() {
    state.keys.clear();
    state.viewMode = state.viewMode === 'classic' ? 'map' : 'classic';
    setMessage(state.viewMode === 'classic'
      ? '经典炮弹：先选下方中文炮弹，再点上方英文目标。'
      : '俯视地图：点中文炸弹，再点英文目标。');
    applyViewMode();
  }

  function setHeroPose(pose, duration = 0) {
    if (state.heroPoseTimer) {
      window.clearTimeout(state.heroPoseTimer);
      state.heroPoseTimer = 0;
    }

    state.heroPose = pose;
    if (pose !== 'idle') {
      state.heroMoving = false;
    }
    renderEntities();
    syncDynamicEntities();

    if (duration > 0) {
      state.heroPoseTimer = window.setTimeout(() => {
        state.heroPose = state.finished ? 'happy' : 'idle';
        state.heroAnimTime = 0;
        state.heroPoseTimer = 0;
        renderEntities();
        syncDynamicEntities();
      }, duration);
    }
  }

  function sceneRect() {
    return els.mapScene.getBoundingClientRect();
  }

  function pointForPercent(x, y) {
    const rect = sceneRect();
    return {
      x: ((x - state.camera.x) / WORLD_SCREEN_WIDTH) * rect.width,
      y: ((y - state.camera.y) / WORLD_SCREEN_HEIGHT) * rect.height
    };
  }

  function cleanVoiceText(text) {
    return String(text || '').replace(/\s+/g, '').trim();
  }

  function localVoiceUrl(text) {
    const key = cleanVoiceText(text);
    const digest = key ? state.voiceMap[key] : '';
    return digest ? `${VOICE_ASSET_BASE}/${digest}.mp3` : '';
  }

  function emitSpeechDebugEvent(text, lang, source = 'unknown') {
    if (!Array.isArray(window.__wordMemoryHintSpeechEvents) || !text) {
      return;
    }
    window.__wordMemoryHintSpeechEvents.push({ text, lang, source });
  }

  function stopVoicePlayback() {
    state.voiceToken += 1;
    if (state.voiceAudio) {
      try {
        state.voiceAudio.pause();
        state.voiceAudio.src = '';
      } catch (error) {
        console.warn('[word-memory] failed to stop voice audio', error);
      }
      state.voiceAudio = null;
    }
    if (state.voiceObjectUrl && window.URL && typeof window.URL.revokeObjectURL === 'function') {
      try {
        window.URL.revokeObjectURL(state.voiceObjectUrl);
      } catch (error) {
        console.warn('[word-memory] failed to release voice object url', error);
      }
      state.voiceObjectUrl = '';
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function playAudioUrl(url, token, cleanup) {
    return new Promise(resolve => {
      const audio = new Audio(url);
      state.voiceAudio = audio;
      const finish = () => {
        if (token !== state.voiceToken) {
          return;
        }
        state.voiceAudio = null;
        if (typeof cleanup === 'function') {
          cleanup();
        }
        resolve();
      };
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
    });
  }

  function playLocalVoice(url, token) {
    return playAudioUrl(url, token);
  }

  async function requestRemoteTts(text, lang) {
    if (!TTS_ENDPOINT || state.localTtsDisabled || !text || typeof fetch !== 'function') {
      return '';
    }
    const controller = typeof AbortController !== 'undefined'
      ? new AbortController()
      : null;
    const timeoutId = controller
      ? window.setTimeout(() => controller.abort(), TTS_REQUEST_TIMEOUT_MS)
      : 0;
    let response;
    try {
      response = await fetch(TTS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          lang,
          voice: TTS_DEFAULT_VOICE,
          engine: TTS_DEFAULT_ENGINE
        }),
        signal: controller ? controller.signal : undefined
      });
    } catch (error) {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      if (LOOPBACK_TTS_ENDPOINT) {
        state.localTtsDisabled = true;
      }
      return '';
    }
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }

    if (!response || !response.ok) {
      if (LOOPBACK_TTS_ENDPOINT) {
        state.localTtsDisabled = true;
      }
      return '';
    }

    const contentType = String(response.headers?.get('Content-Type') || '').toLowerCase();
    if (contentType.includes('application/json')) {
      const payload = await response.json().catch(() => ({}));
      if (payload && payload.fallback) {
        return '';
      }
      return typeof payload.audioUrl === 'string' ? payload.audioUrl : '';
    }

    if (typeof response.blob !== 'function' || !window.URL || typeof window.URL.createObjectURL !== 'function') {
      return '';
    }
    const audioBlob = await response.blob();
    if (!audioBlob || !audioBlob.size) {
      return '';
    }
    const objectUrl = window.URL.createObjectURL(audioBlob);
    state.voiceObjectUrl = objectUrl;
    return objectUrl;
  }

  async function playRemoteTts(text, lang, token) {
    try {
      const url = await requestRemoteTts(text, lang);
      if (!url || token !== state.voiceToken) {
        if (state.voiceObjectUrl && url === state.voiceObjectUrl && window.URL && typeof window.URL.revokeObjectURL === 'function') {
          window.URL.revokeObjectURL(state.voiceObjectUrl);
          state.voiceObjectUrl = '';
        }
        return false;
      }
      const isObjectUrl = Boolean(state.voiceObjectUrl) && url === state.voiceObjectUrl;
      await playAudioUrl(url, token, () => {
        if (isObjectUrl && state.voiceObjectUrl === url && window.URL && typeof window.URL.revokeObjectURL === 'function') {
          window.URL.revokeObjectURL(url);
          state.voiceObjectUrl = '';
        }
      });
      return true;
    } catch (error) {
      console.warn('[word-memory] remote tts unavailable', error);
      return false;
    }
  }

  function playSpeechFallback(text, lang, token) {
    return new Promise(resolve => {
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined' || !text) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = lang === 'zh-CN' ? 0.88 : 0.9;
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
      }, 1800);
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
    for (const line of filtered) {
      if (token !== state.voiceToken) {
        return;
      }
      const url = localVoiceUrl(line.text);
      if (url) {
        emitSpeechDebugEvent(line.text, line.lang || 'en-US', 'local');
        await playLocalVoice(url, token);
        continue;
      }
      const playedRemote = await playRemoteTts(line.text, line.lang || 'en-US', token);
      if (playedRemote) {
        emitSpeechDebugEvent(line.text, line.lang || 'en-US', 'remote');
        continue;
      }
      emitSpeechDebugEvent(line.text, line.lang || 'en-US', 'speech');
      await playSpeechFallback(line.text, line.lang || 'en-US', token);
    }
  }

  function speak(text, lang = 'en-US') {
    return speakLines([{ text, lang }]);
  }

  function speakVisibleWords() {
    const lines = aliveTargets().map(target => ({
      text: target.card.word,
      lang: 'en-US'
    }));
    if (!lines.length) {
      return;
    }
    speakLines(lines);
  }

  function previewTargetWord(target) {
    if (!target?.alive) {
      return;
    }
    state.focusedTargetId = target.id;
    rememberReviewCard(target.card);
    state.hintsUsed += 1;
    const hintMode = state.score < 10 ? 'full' : (state.score < 30 ? 'image' : 'initial');
    state.learningHintCard = { ...learningCardFromTarget(target), hintMode };
    renderLearningHint();
    ensureAudio();
    playSfx('pickup');
    emitSpeechDebugEvent(target.card.word, 'en-US', 'target-preview');
    speak(target.card.word, 'en-US');
    setMessage(`预习：${target.card.word} · ${target.card.translation}`);
    render();
  }

  function selectOrb(orbId, shouldSpeak) {
    const orb = state.orbs.find(item => item.id === orbId && !item.used);
    if (!orb) {
      return;
    }
    state.sceneIndex = orb.waveIndex;
    state.selectedOrbId = orb.id;
    state.lastPromptOrbId = orb.id;
    setMessage(`已拿到：${orb.card.translation}`);
    ensureAudio();
    playSfx('pickup');
    spawnPickupEffect(orb);
    if (shouldSpeak) {
      speak(orb.card.translation, 'zh-CN');
    }
    render();
    if (AUTO_START_PLAY_SESSION) {
      window.setTimeout(() => {
        if (state.selectedOrbId !== orb.id || state.shots.length || state.finished) {
          return;
        }
        const matchedTarget = state.targets.find(target => target.alive && target.card.id === orb.card.id);
        if (!matchedTarget) {
          return;
        }
        state.focusedTargetId = matchedTarget.id;
        throwHeldBomb(targetPosition(matchedTarget), matchedTarget.id);
      }, 320);
    }
  }

  function applySupportDrop(drop) {
    if (!drop || drop.picked) {
      return;
    }
    drop.picked = true;
    ensureAudio();
    playSfx('chapter');
    spawnSceneEntryEffect(drop.x, drop.y, 'orb');
    if (drop.typeId === 'shield_leaf') {
      state.supportShieldCharges += 1;
      setMessage('拿到补盾叶：下次被追到时会帮你挡一下。');
    } else if (drop.typeId === 'slow_clock') {
      state.supportSlowMs = Math.max(state.supportSlowMs, SUPPORT_SLOW_MS);
      setMessage('拿到减速钟：敌人会慢下来几秒。');
    } else if (drop.typeId === 'auto_star') {
      state.supportAutoAimShots += SUPPORT_AUTO_AIM_SHOTS;
      setMessage(`拿到瞄准星：接下来 ${SUPPORT_AUTO_AIM_SHOTS} 发会自动找对目标。`);
    } else if (drop.typeId === 'speed_boots') {
      state.supportSpeedMs = Math.max(state.supportSpeedMs, SUPPORT_SPEED_MS);
      setMessage('拿到加速鞋：主角会跑得更快。');
    } else if (drop.typeId === 'hint_card') {
      state.supportHintCharges += SUPPORT_HINT_CHARGES;
      setMessage(`拿到词卡提示：接下来 ${SUPPORT_HINT_CHARGES} 次提示会显示首字母。`);
    } else if (drop.typeId === 'combo_badge') {
      state.supportComboBonus += SUPPORT_COMBO_BONUS;
      setMessage('拿到连击加成：下一次答对会额外补 1 护盾。');
    }
    render();
  }

  function autoPickupNearbyOrb() {
    if (selectedOrb()) {
      return;
    }

    const nearest = availableOrbs()
      .map(orb => ({ orb, measure: distance(orb, state.player) }))
      .sort((a, b) => a.measure - b.measure)
      .find(entry => entry.measure <= PICKUP_RADIUS)?.orb;
    if (!nearest || state.lastPromptOrbId === nearest.id) {
      return;
    }

    state.sceneIndex = nearest.waveIndex;
    state.selectedOrbId = nearest.id;
    state.lastPromptOrbId = nearest.id;
    setMessage(`拿到炸弹：${nearest.card.translation}`);
    ensureAudio();
    playSfx('pickup');
    spawnPickupEffect(nearest);
    speak(nearest.card.translation, 'zh-CN');
    render();
  }

  function autoPickupNearbySupportDrop() {
    const nearest = state.supportDrops
      .filter(drop => !drop.picked && drop.waveIndex === state.sceneIndex)
      .map(drop => ({ drop, measure: distance(drop, state.player) }))
      .sort((a, b) => a.measure - b.measure)
      .find(entry => entry.measure <= SUPPORT_PICKUP_RADIUS)?.drop;
    if (!nearest) {
      return;
    }
    applySupportDrop(nearest);
  }

  function cycleTarget(direction = 1) {
    const targets = aliveTargets(activeWaveIndex());
    if (!targets.length) {
      return;
    }
    const currentIndex = targets.findIndex(target => target.id === state.focusedTargetId);
    const nextIndex = currentIndex < 0
      ? 0
      : (currentIndex + direction + targets.length) % targets.length;
    state.focusedTargetId = targets[nextIndex].id;
    syncDynamicEntities();
  }

  function facingVector() {
    if (state.heroDirection === 'left') {
      return { x: -1, y: 0, angle: 270 };
    }
    if (state.heroDirection === 'right') {
      return { x: 1, y: 0, angle: 90 };
    }
    if (state.heroDirection === 'up') {
      return { x: 0, y: -1, angle: 0 };
    }
    return { x: 0, y: 1, angle: 180 };
  }

  function angleForVector(vector) {
    return (Math.atan2(vector.y, vector.x) * 180 / Math.PI + 90 + 360) % 360;
  }

  function faceTowardVector(vector) {
    if (Math.abs(vector.x) >= Math.abs(vector.y)) {
      state.heroDirection = vector.x < 0 ? 'left' : 'right';
      return;
    }
    state.heroDirection = vector.y < 0 ? 'up' : 'down';
  }

  function aimVector(aimPoint = null) {
    if (!aimPoint) {
      return facingVector();
    }

    const dx = aimPoint.x - state.player.x;
    const dy = aimPoint.y - state.player.y;
    const measure = Math.hypot(dx, dy);
    if (measure < 0.1) {
      return facingVector();
    }

    const vector = {
      x: dx / measure,
      y: dy / measure
    };
    vector.angle = angleForVector(vector);
    faceTowardVector(vector);
    return vector;
  }

  function pointFromMapEvent(event) {
    const rect = els.mapScene.getBoundingClientRect();
    return {
      x: clamp(state.camera.x + ((event.clientX - rect.left) / rect.width) * WORLD_SCREEN_WIDTH, MAP_BOUNDS.minX, MAP_BOUNDS.maxX),
      y: clamp(state.camera.y + ((event.clientY - rect.top) / rect.height) * WORLD_SCREEN_HEIGHT, MAP_BOUNDS.minY, MAP_BOUNDS.maxY)
    };
  }

  function throwHeldBomb(aimPoint = null, targetId = '') {
    const orb = selectedOrb();
    if (!orb) {
      setMessage('先点一个中文炸弹，再点英文目标。');
      updateHud();
      return;
    }
    if (state.shots.length || state.busy) {
      setMessage('炸弹还在飞，先看它会不会命中。');
      updateHud();
      return;
    }

    const matchedTarget = state.targets.find(target => target.alive && target.card.id === orb.card.id) || null;
    if (state.supportAutoAimShots > 0 && matchedTarget) {
      aimPoint = targetPosition(matchedTarget);
      targetId = matchedTarget.id;
      state.focusedTargetId = matchedTarget.id;
      state.supportAutoAimShots = Math.max(0, state.supportAutoAimShots - 1);
    }

    const vector = aimVector(aimPoint);
    const startX = clamp(state.player.x + vector.x * 3.2, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
    const startY = clamp(state.player.y + vector.y * 3.2 - 1.8, MAP_BOUNDS.minY, MAP_BOUNDS.maxY);
    orb.inFlight = true;
    state.busy = true;
    state.selectedOrbId = null;
    state.lastPromptOrbId = null;
    state.shotsFired += 1;
    state.shots.push({
      id: `shot-${Date.now()}-${Math.random()}`,
      orbId: orb.id,
      card: orb.card,
      startX,
      startY,
      x: startX,
      y: startY,
      vx: vector.x * THROW_SPEED,
      vy: vector.y * THROW_SPEED,
      angle: vector.angle,
      age: 0,
      armMs: targetId ? 48 : THROW_ARM_MS,
      autoResolveMs: AUTO_START_PLAY_SESSION && targetId ? 96 : 0,
      targetId,
      maxAge: targetId ? THROW_HOMING_MAX_MS : THROW_MAX_MS,
      image: orb.card.bombImage
    });
    ensureAudio();
    playSfx('pickup');
    setHeroPose('attack', HERO_ATTACK_POSE_MS);
    setMessage(`扔出：${orb.card.translation}`);
    render();
  }

  function updateHomingShot(shot) {
    if (!shot.targetId) {
      return;
    }
    const target = state.targets.find(item => item.id === shot.targetId && item.alive);
    if (!target) {
      return;
    }
    const position = targetPosition(target);
    const dx = position.x - shot.x;
    const dy = position.y - shot.y;
    const measure = Math.hypot(dx, dy);
    if (measure < 0.1) {
      return;
    }
    const vector = {
      x: dx / measure,
      y: dy / measure
    };
    const speed = shot.targetId ? THROW_SPEED * TARGETED_THROW_SPEED_MULTIPLIER : THROW_SPEED;
    shot.vx = vector.x * speed;
    shot.vy = vector.y * speed;
    shot.angle = angleForVector(vector);
  }

  function renderShotAimLine(shot) {
    if (!shot.targetId) {
      return '';
    }
    const target = state.targets.find(item => item.id === shot.targetId && item.alive);
    if (!target) {
      return '';
    }
    const start = pointForPercent(shot.startX, shot.startY);
    const end = pointForPercent(target.x, target.y);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const width = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return `<span class="shot-aim-line" style="left:${start.x}px; top:${start.y}px; width:${width}px; --shot-line-angle:${angle}deg;"></span>`;
  }

  function renderShotTrailGhosts(shot) {
    if (!shot.targetId) {
      return '';
    }
    const start = pointForPercent(shot.startX, shot.startY);
    const end = pointForPercent(shot.x, shot.y);
    return [0.2, 0.4, 0.6, 0.8].map((ratio, index) => {
      const x = start.x + ((end.x - start.x) * ratio);
      const y = start.y + ((end.y - start.y) * ratio);
      const opacity = Math.max(0.18, 0.48 - index * 0.08);
      const scale = (0.72 + ratio * 0.18).toFixed(2);
      return `<span class="shot-trail-ghost" style="left:${x}px; top:${y}px; --shot-rotate:${shot.angle}deg; --trail-opacity:${opacity}; --trail-scale:${scale};">
        <img class="shot-trail-image" src="${shot.image}" alt="" decoding="async">
      </span>`;
    }).join('');
  }

  function finishShot(shot) {
    state.shots = state.shots.filter(item => item.id !== shot.id);
    if (!state.shots.length) {
      state.busy = false;
    }
  }

  function settleMissedShot(shot) {
    finishShot(shot);
    rememberReviewCard(shot.card);
    const orb = state.orbs.find(item => item.id === shot.orbId);
    if (orb && !orb.used) {
      orb.inFlight = false;
      orb.x = clamp(shot.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
      orb.y = clamp(shot.y, MAP_BOUNDS.minY, MAP_BOUNDS.maxY);
    }
    state.wrongShots += 1;
    state.streak = 0;
    setMessage('炸弹落地了，点它重新拿起来。');
    render();
  }

  function resolveShotHit(shot, target) {
    finishShot(shot);
    const orb = state.orbs.find(item => item.id === shot.orbId);
    const hitPosition = targetPosition(target);
    const end = pointForPercent(hitPosition.x, hitPosition.y - 1);
    spawnSparkBurst(end.x, end.y, [
      shot.card.burstImage || FARM_ASSETS.bursts[0],
      FARM_ASSETS.dusts[2],
      FARM_ASSETS.bursts[0]
    ], 34);

    if (shot.card.id === target.card.id) {
      if (orb) {
        orb.used = true;
        orb.inFlight = false;
      }
      target.alive = false;
      state.score += 1;
      celebrateCheckpoint();
      state.streak += 1;
      state.bestStreak = Math.max(state.bestStreak, state.streak);
      const comboBoosted = consumeComboBonusOnCorrectHit();
      maybeSpawnSupportDrop(target, state.sceneIndex);
      state.focusedTargetId = aliveTargets()[0]?.id || null;
      playSfx('correct');
      speak(target.card.word, 'en-US');
      showLearningToast({
        word: target.card.word,
        meaning: target.card.translation,
        image: target.card.enemyImage,
        fallbackImage: target.card.enemyFallbackImage,
        card: target.card
      });
      setMessage(
        `${state.streak >= 2 ? `连对 ${state.streak} 次：` : '炸中了：'}${target.card.translation} -> ${target.card.word}`
        + (comboBoosted ? '，连击加成补了 1 护盾。' : '')
      );
      render();
      resolveWave();
      return;
    }

    if (orb && !orb.used) {
      orb.inFlight = false;
      orb.x = clamp(shot.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
      orb.y = clamp(shot.y, MAP_BOUNDS.minY, MAP_BOUNDS.maxY);
    }
    state.wrongShots += 1;
    recordWrongCard(target.card);
    state.streak = 0;
    playSfx('wrong');
    flashWrong(target);
    showLearningHint(false);
    setMessage(`${shot.card.translation} 不是 ${target.card.word}；${target.card.word} 是 ${target.card.translation}。`);
    render();
  }

  function updateShots(deltaMs) {
    [...state.shots].forEach(shot => {
      shot.age += deltaMs;
      if (shot.autoResolveMs && shot.age >= shot.autoResolveMs) {
        const target = state.targets.find(item => item.id === shot.targetId && item.alive);
        if (target) {
          resolveShotHit(shot, target);
        } else {
          settleMissedShot(shot);
        }
        return;
      }
      updateHomingShot(shot);
      shot.x += shot.vx * deltaMs;
      shot.y += shot.vy * deltaMs;

      const outOfBounds = shot.x < MAP_BOUNDS.minX
        || shot.x > MAP_BOUNDS.maxX
        || shot.y < MAP_BOUNDS.minY
        || shot.y > MAP_BOUNDS.maxY;
      if (outOfBounds || shot.age >= shot.maxAge) {
        settleMissedShot(shot);
        return;
      }

      const hitTarget = shot.age >= (shot.armMs ?? THROW_ARM_MS)
        ? aliveTargets().find(target => distance(shot, targetPosition(target)) <= THROW_HIT_RADIUS)
        : null;
      if (hitTarget) {
        resolveShotHit(shot, hitTarget);
      }
    });
  }

  function spawnSpark(x, y, image, lifetime = 420) {
    const spark = { id: `${Date.now()}-${Math.random()}`, x, y, image };
    state.sparks.push(spark);
    renderEffects();

    window.setTimeout(() => {
      state.sparks = state.sparks.filter(item => item.id !== spark.id);
      renderEffects();
    }, lifetime);
  }

  function spawnSparkBurst(x, y, images, spread = 28) {
    images.forEach((image, index) => {
      window.setTimeout(() => {
        spawnSpark(
          x + randomOffset(spread),
          y + randomOffset(spread * 0.7),
          image,
          420 + index * 40
        );
      }, index * 36);
    });
  }

  function spawnPickupEffect(orb) {
    const point = pointForPercent(orb.x, orb.y + 2);
    spawnSparkBurst(point.x, point.y, [
      FARM_ASSETS.dusts[0],
      FARM_ASSETS.dusts[1]
    ], 18);
  }

  function spawnSceneEntryEffect(worldX, worldY, burst = 'dust') {
    const point = pointForPercent(worldX, worldY);
    const images = burst === 'enemy'
      ? [FARM_ASSETS.bursts[0], FARM_ASSETS.bursts[2], FARM_ASSETS.dusts[0]]
      : [FARM_ASSETS.dusts[2], FARM_ASSETS.dusts[0], FARM_ASSETS.bursts[3]];
    spawnSparkBurst(point.x, point.y, images, burst === 'enemy' ? 18 : 14);
  }

  function movementDustAnchor() {
    const sideOffset = state.heroStepSide * 1.3;
    state.heroStepSide *= -1;

    if (state.heroDirection === 'left') {
      return {
        x: state.player.x + 3.2,
        y: state.player.y + 4.4 + sideOffset * 0.35
      };
    }
    if (state.heroDirection === 'right') {
      return {
        x: state.player.x - 3.2,
        y: state.player.y + 4.4 - sideOffset * 0.35
      };
    }
    if (state.heroDirection === 'up') {
      return {
        x: state.player.x + sideOffset,
        y: state.player.y + 6.1
      };
    }
    return {
      x: state.player.x + sideOffset,
      y: state.player.y + 4.2
    };
  }

  function spawnMovementDust(isStart = false) {
    const anchor = movementDustAnchor();
    const point = pointForPercent(
      clamp(anchor.x, MAP_BOUNDS.minX, MAP_BOUNDS.maxX),
      clamp(anchor.y, MAP_BOUNDS.minY, MAP_BOUNDS.maxY)
    );
    const images = isStart
      ? [FARM_ASSETS.dusts[1], FARM_ASSETS.dusts[0]]
      : [FARM_ASSETS.dusts[0]];
    spawnSparkBurst(point.x, point.y, images, isStart ? 14 : 8);
  }

  function flashWrong(target) {
    target.flash = 'wrong';
    syncDynamicEntities();
    window.setTimeout(() => {
      target.flash = '';
      syncDynamicEntities();
    }, 280);
  }

  function flashAttack(target) {
    target.flash = 'attack';
    syncDynamicEntities();
    window.setTimeout(() => {
      target.flash = '';
      syncDynamicEntities();
    }, 360);
  }

  function resetThreatPositions() {
    aliveTargets().forEach((target, index) => {
      target.x = clamp(target.homeX + randomOffset(1.4), MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
      target.y = clamp(target.homeY + randomOffset(1.2), MAP_BOUNDS.minY, MAP_BOUNDS.maxY);
      target.attackCooldown = 760 + index * 180;
      target.flash = '';
    });
  }

  function shieldBreakReset() {
    state.shield = MAX_SHIELD;
    state.selectedOrbId = null;
    state.lastPromptOrbId = null;
    state.player.x = PLAYER_START.x;
    state.player.y = PLAYER_START.y;
    state.heroInvincibleMs = HERO_HIT_INVINCIBLE_MS;
    resetThreatPositions();
    setMessage('护盾恢复，点中文炸弹再攻击英文目标。');
    render();
  }

  function enemyAttack(target, dx, dy, measure) {
    if (state.finished || state.heroInvincibleMs > 0) {
      return;
    }

    if (state.supportShieldCharges > 0) {
      state.supportShieldCharges = Math.max(0, state.supportShieldCharges - 1);
      state.heroInvincibleMs = Math.max(state.heroInvincibleMs, 520);
      target.attackCooldown = ENEMY_ATTACK_COOLDOWN_MS;
      flashAttack(target);
      const point = pointForPercent(state.player.x, state.player.y - 2);
      spawnSparkBurst(point.x, point.y, [
        FARM_ASSETS.bursts[3],
        FARM_ASSETS.dusts[0]
      ], 16);
      setMessage(`${target.card.word} 撞上来了，但补盾叶帮你挡住了。`);
      updateHud();
      return;
    }

    const safeMeasure = measure || 1;
    const pushX = safeMeasure > 0 ? dx / safeMeasure : randomOffset(1);
    const pushY = safeMeasure > 0 ? dy / safeMeasure : -1;
    state.player.x = clamp(state.player.x + pushX * HERO_KNOCKBACK_DISTANCE, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
    state.player.y = clamp(state.player.y + pushY * HERO_KNOCKBACK_DISTANCE, MAP_BOUNDS.minY, MAP_BOUNDS.maxY);
    state.shield = Math.max(0, state.shield - 1);
    state.hitsTaken += 1;
    state.heroInvincibleMs = HERO_HIT_INVINCIBLE_MS;
    target.attackCooldown = ENEMY_ATTACK_COOLDOWN_MS;
    flashAttack(target);
    playSfx('wrong');
    const point = pointForPercent(state.player.x, state.player.y - 2);
    spawnSparkBurst(point.x, point.y, [
      FARM_ASSETS.dusts[1],
      FARM_ASSETS.bursts[1]
    ], 18);

    if (state.shield <= 0) {
      setMessage(`${target.card.word} 追到了你，护盾碎了。`);
      window.setTimeout(shieldBreakReset, 360);
      return;
    }

    setMessage(`${target.card.word} 追到了你，护盾剩 ${state.shield}。快躲开！`);
    updateHud();
  }

  function updateTargets(deltaMs) {
    const slowMultiplier = state.supportSlowMs > 0 ? 0.58 : 1;
    const checkpointSpeed = 1 + Math.min(0.2, Math.floor(state.score / CHECKPOINT_WORDS) * 0.04);
    aliveTargets().forEach(target => {
      target.attackCooldown = Math.max(0, (target.attackCooldown || 0) - deltaMs);
      const dx = state.player.x - target.x;
      const dy = state.player.y - target.y;
      const measure = Math.hypot(dx, dy);
      if (measure > 0.1) {
        const keepDistance = Math.max(2.8, target.attackRadius * 0.58);
        const step = Math.min(deltaMs * target.chaseSpeed * slowMultiplier * checkpointSpeed, Math.max(0, measure - keepDistance));
        if (step > 0) {
          target.x = clamp(target.x + (dx / measure) * step, MAP_BOUNDS.minX, MAP_BOUNDS.maxX);
          target.y = clamp(target.y + (dy / measure) * step, MAP_BOUNDS.minY, MAP_BOUNDS.maxY);
        }
      }

      const nextDx = state.player.x - target.x;
      const nextDy = state.player.y - target.y;
      const nextMeasure = Math.hypot(nextDx, nextDy);
      if (nextMeasure <= target.attackRadius && target.attackCooldown <= 0) {
        enemyAttack(target, nextDx, nextDy, nextMeasure);
      }
    });
  }

  function finishGame() {
    state.finished = true;
    state.heroMoving = false;
    state.heroAnimTime = 0;
    state.heroPose = 'happy';
    playSfx('finish');
    renderEntities();
    syncDynamicEntities();
    const accuracy = state.shotsFired
      ? Math.round(((state.shotsFired - state.wrongShots) / state.shotsFired) * 100)
      : 100;
    const unlockedNext = unlockNextLevel();
    const next = nextLevel();
    state.levelReward = buildLevelReward(unlockedNext, next);
    state.rewardBank.stars += state.levelReward.stars;
    state.rewardBank.supports[state.levelReward.support.id] = (Number(state.rewardBank.supports[state.levelReward.support.id]) || 0) + 1;
    saveRewardProgress();
    els.finishSummary.textContent = unlockedNext
      ? `已完成 ${SESSION_WORD_TARGET} 个单词，解锁第 ${next?.order || state.highestUnlockedLevel} 关！命中率 ${accuracy}%。`
      : `已完成 ${SESSION_WORD_TARGET} 个单词，命中率 ${accuracy}%。`;
    const supportCount = state.rewardBank.supports[state.levelReward.support.id];
    els.finishReward.innerHTML = `<span class="finish-reward-kicker">闯关奖励</span><strong>+${state.levelReward.stars} 星星</strong><span>获得：${state.levelReward.support.label} × 1（库存 ${supportCount}）</span><span>累计星星：${state.rewardBank.stars}</span>${state.levelReward.unlockedNext ? '<span>解锁下一关</span>' : ''}`;
    const wrongCards = state.wrongCardIds.map(id => state.cards.find(card => card.id === id)).filter(Boolean);
    els.finishReport.innerHTML = `<span class="finish-reward-kicker">学习报告</span><span>提示 ${state.hintsUsed} 次</span><span>错词 ${wrongCards.length} 个</span><span>${wrongCards.length ? `下次优先：${wrongCards.map(card => card.word).join('、')}` : '没有错词，继续保持！'}</span>`;
    els.finishStats.innerHTML = finishStatsMarkup();
    els.finishBadges.innerHTML = finishBadgeMarkup();
    els.nextLevelButton.hidden = !next || !isLevelUnlocked(next);
    els.nextLevelButton.textContent = '下一关（保持地图）';
    els.changeWorldButton.hidden = !next || !isLevelUnlocked(next);
    els.equipRewardButton.hidden = !supportCount;
    els.finishModal.hidden = false;
    setMessage(unlockedNext ? `已完成 ${SESSION_WORD_TARGET} 个单词，新关卡已经解锁。` : `已完成 ${SESSION_WORD_TARGET} 个单词，可以再来一局。`);
    postHostBridge('result', {
      score: state.score,
      earnedStars: state.score,
      accuracy,
      levelOrder: currentLevel().order,
      levelTitle: currentLevel().title,
      highestUnlockedLevel: state.highestUnlockedLevel,
      heroId: state.selectedHeroId,
      worldPack: state.selectedWorldPack
      ,reward: state.levelReward
    });
    updateHud();
  }

  function buildLevelReward(unlockedNext, next) {
    const support = SUPPORT_ITEM_ROTATION[(currentLevel().order - 1) % SUPPORT_ITEM_ROTATION.length];
    return {
      stars: state.score,
      support: { id: support.id, label: support.label },
      unlockedNext: Boolean(unlockedNext && next)
    };
  }

  function equipLevelReward() {
    const reward = state.levelReward;
    if (!reward || !state.rewardBank.supports[reward.support.id]) return;
    state.rewardBank.supports[reward.support.id] -= 1;
    state.equippedSupportId = reward.support.id;
    saveRewardProgress();
    els.equipRewardButton.hidden = true;
    setMessage(`已装备${reward.support.label}，下一局开始时生效。`);
  }

  function unlockNextLevel() {
    const level = currentLevel();
    if (level.order >= state.highestUnlockedLevel && level.order < LEVELS.length) {
      saveLevelProgress(level.order + 1);
      return true;
    }
    return false;
  }

  function resolveWave(waveIndex = state.waveIndex) {
    if (aliveTargets(waveIndex).length) {
      return;
    }

    if (aliveTargets().length === 0) {
      finishGame();
      return;
    }
    playSfx('chapter');
    const nextIndex = aliveTargets()[0]?.waveIndex ?? state.waveIndex;
    state.waveIndex = nextIndex;
    relocateWaveEntitiesToScene(state.waveIndex, state.sceneIndex);
    const nextTile = state.worldTiles[nextIndex];
    setMessage('这块区域清空了，继续探索当前大地图。');
    if (nextTile) {
      showChapterBanner('继续探索', nextTile.label);
    }
    state.focusedTargetId = aliveTargets(state.waveIndex)[0]?.id || aliveTargets()[0]?.id || null;
    updateHud();
    render();
  }

  function classicFireAt(target) {
    const orb = selectedOrb();
    if (!orb) {
      setMessage('先选下方中文炮弹，再点上方英文目标。');
      render();
      return;
    }
    if (!target || !target.alive || state.busy) return;

    const targets = aliveTargets(state.waveIndex);
    const orbs = availableOrbs(state.waveIndex);
    const targetIndex = Math.max(0, targets.findIndex(item => item.id === target.id));
    const orbIndex = Math.max(0, orbs.findIndex(item => item.id === orb.id));
    const fromX = ((orbIndex + 0.5) / Math.max(1, orbs.length)) * 100;
    const toX = ((targetIndex + 0.5) / Math.max(1, targets.length)) * 100;
    const correct = orb.card.id === target.card.id;

    state.busy = true;
    state.focusedTargetId = target.id;
    state.classicShotFx = {
      fromX: Number(fromX.toFixed(2)),
      toX: Number(toX.toFixed(2)),
      image: orb.card.bombImage,
      correct
    };
    state.shotsFired += 1;
    playSfx('pickup');
    render();

    window.setTimeout(() => {
      state.classicShotFx = null;
      if (correct) {
        orb.used = true;
        target.alive = false;
        state.score += 1;
        celebrateCheckpoint();
        state.streak += 1;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        const comboBoosted = consumeComboBonusOnCorrectHit();
        state.selectedOrbId = null;
        state.focusedTargetId = aliveTargets()[0]?.id || null;
        state.lastPromptOrbId = null;
        playSfx('correct');
        speak(target.card.word, 'en-US');
        showLearningToast({
          word: target.card.word,
          meaning: target.card.translation,
          image: target.card.enemyImage,
          fallbackImage: target.card.enemyFallbackImage,
          card: target.card
        });
        setMessage(
          `${state.streak >= 2 ? `连对 ${state.streak} 次：` : '答对了：'}${target.card.translation} -> ${target.card.word}`
          + (comboBoosted ? '，连击加成补了 1 护盾。' : '')
        );
        state.busy = false;
      render();
      resolveWave(target.waveIndex);
        return;
      }

      state.wrongShots += 1;
      recordWrongCard(target.card);
      state.streak = 0;
      playSfx('wrong');
      flashWrong(target);
      state.learningHintCard = learningCardFromTarget(target);
      renderLearningHint();
      setMessage(`${orb.card.translation} 不是 ${target.card.word}；${target.card.word} 是 ${target.card.translation}。`);
      state.busy = false;
      render();
    }, 420);
  }

  function startWave() {
    state.player.x = PLAYER_START.x;
    state.player.y = PLAYER_START.y;
    state.selectedOrbId = null;
    state.focusedTargetId = aliveTargets(0)[0]?.id || null;
    state.busy = false;
    state.classicShotFx = null;
    state.learningHintCard = null;
    state.finished = false;
    state.shield = currentLevel().shield;
    state.heroInvincibleMs = AUTO_START_PLAY_SESSION ? 3200 : 620;
    state.heroDirection = 'down';
    state.heroMoving = false;
    state.heroAnimTime = 0;
    state.lastPromptOrbId = null;
    state.heroMoveDustCooldown = 0;
    state.heroStepSide = 1;
    syncCamera();
    els.finishModal.hidden = true;
    els.learningHintCard.hidden = true;
    els.learningToast.hidden = true;
    window.clearTimeout(state.learningToastTimer);
    els.finishBadges.innerHTML = '';
    setHeroPose('idle');
    setMessage('英文目标会追你。清空当前大地图的全部敌人，才会进入下一关。');
    syncActiveWave(true);
    render();
    applyViewMode();
  }

  function startGame(options = {}) {
    const level = currentLevel();
    const shouldApplyLevel = options.applyLevel !== false;
    if (shouldApplyLevel) {
      applyLevelSettings(level);
    }
    const preferredPool = shouldApplyLevel ? levelCardPool(level) : cardPoolForCategory(state.selectedCategory);
    const pool = preferredPool.length >= SESSION_WORD_TARGET ? preferredPool : state.cards;
    const reviewCards = state.reviewCardIds
      .map(id => pool.find(card => card.id === id))
      .filter(Boolean)
      .slice(0, Math.floor(SESSION_WORD_TARGET / CHECKPOINT_WORDS));
    const reviewIds = new Set(reviewCards.map(card => card.id));
    state.reviewCardIds = state.reviewCardIds.filter(id => !reviewIds.has(id));
    saveReviewProgress();
    state.deck = shuffle(pool.filter(card => !reviewIds.has(card.id)))
      .slice(0, Math.min(SESSION_WORD_TARGET, pool.length));
    reviewCards.forEach((card, index) => {
      state.deck.splice(Math.min(((index + 1) * CHECKPOINT_WORDS) - 1, state.deck.length), 0, card);
    });
    state.deck = state.deck.slice(0, Math.min(SESSION_WORD_TARGET, pool.length));
    state.totalWaves = Math.ceil(state.deck.length / ROUND_SIZE);
    state.waveIndex = 0;
    state.sceneIndex = 0;
    state.score = 0;
    state.shield = level.shield;
    state.streak = 0;
    state.bestStreak = 0;
    state.shotsFired = 0;
    state.wrongShots = 0;
    state.wrongCardIds = [];
    state.hintsUsed = 0;
    state.hitsTaken = 0;
    state.supportShieldCharges = 0;
    state.supportSlowMs = 0;
    state.supportAutoAimShots = 0;
    state.supportSpeedMs = 0;
    state.supportHintCharges = 0;
    state.supportComboBonus = 0;
    if (state.equippedSupportId) {
      applySupportEffect(state.equippedSupportId);
      state.equippedSupportId = '';
    }
    state.supportDrops = [];
    state.shots = [];
    state.sparks = [];
    state.classicShotFx = null;
    state.learningHintCard = null;
    state.learningToastCard = null;
    state.levelReward = null;
    window.clearTimeout(state.learningToastTimer);
    state.keys.clear();
    state.player.x = PLAYER_START.x;
    state.player.y = PLAYER_START.y;
    state.heroDirection = 'down';
    state.heroMoving = false;
    state.heroAnimTime = 0;
    state.heroInvincibleMs = 0;
    state.finished = false;
    state.targets = [];
    state.orbs = [];
    for (let waveIndex = 0; waveIndex < state.totalWaves; waveIndex += 1) {
      const waveCards = buildWaveCards(waveIndex);
      state.targets.push(...waveCards.map((card, index) => makeTarget(card, index, waveIndex)));
      state.orbs.push(...shuffle(waveCards).map((card, index) => makeOrb(card, index, waveIndex)));
    }
    startWave();
  }

  function changeCategory() {
    state.selectedCategory = els.categorySelect.value || 'all';
    const count = cardPoolForCategory(state.selectedCategory).length;
    startGame({ applyLevel: false });
    setMessage(`${categoryLabel(state.selectedCategory)}：从 ${count} 个词里抽本局。`);
  }

  function changeVocabPack() {
    const nextMode = els.vocabSelect.value || 'core';
    const url = new URL(window.location.href);
    url.searchParams.set('vocab', ['core', 'extension', 'all'].includes(nextMode) ? nextMode : 'core');
    window.location.assign(url.toString());
  }

  async function changeWorldPack() {
    const nextPack = els.worldSelect.value || 'farm';
    state.selectedWorldPack = Object.prototype.hasOwnProperty.call(WORLD_PACK_REGISTRY, nextPack)
      ? nextPack
      : 'farm';
    await loadWorldTiles();
    renderWorldSelect();
    renderDecor();
    startGame({ applyLevel: false });
    setMessage(`地图主题切到 ${currentWorldPack().label}。`);
  }

  async function startLevel(levelId, options = {}) {
    const level = LEVELS.find(item => item.id === levelId) || currentLevel();
    if (!isLevelUnlocked(level)) {
      setMessage('先通关前一关，再挑战这一关。');
      renderLevelPanel();
      return;
    }
    const selectedWorldPack = state.selectedWorldPack;
    applyLevelSettings(level);
    if (options.preserveWorld) {
      state.selectedWorldPack = selectedWorldPack;
    }
    await loadWorldTiles();
    renderWorldSelect();
    renderCategorySelect();
    renderDecor();
    startGame();
    setMessage(`第 ${level.order} 关：${level.title}，完成 ${SESSION_WORD_TARGET} 个词才结算。`);
  }

  function syncActiveWave(forceBanner = false) {
    syncSceneByPlayerScreen(forceBanner);
  }

  function updatePlayer(deltaMs) {
    const wasMoving = state.heroMoving;
    const previousSceneIndex = clamp(tileIndexForPoint(state.player), 0, WORLD_TILE_COUNT - 1);
    let intentX = 0;
    let intentY = 0;
    const speedMultiplier = state.supportSpeedMs > 0 ? 1.28 : 1;
    const step = deltaMs * MOVE_SPEED * speedMultiplier;

    if (state.keys.has('arrowleft') || state.keys.has('a')) {
      intentX -= 1;
    }
    if (state.keys.has('arrowright') || state.keys.has('d')) {
      intentX += 1;
    }
    if (state.keys.has('arrowup') || state.keys.has('w')) {
      intentY -= 1;
    }
    if (state.keys.has('arrowdown') || state.keys.has('s')) {
      intentY += 1;
    }

    if (intentX || intentY) {
      if (Math.abs(intentX) >= Math.abs(intentY)) {
        state.heroDirection = intentX < 0 ? 'left' : 'right';
      } else {
        state.heroDirection = intentY < 0 ? 'up' : 'down';
      }
    }

    const magnitude = Math.hypot(intentX, intentY);
    let dx = 0;
    let dy = 0;
    if (magnitude > 0) {
      dx = (intentX / magnitude) * step;
      dy = (intentY / magnitude) * step;
    }

    const tryMove = (nextX, nextY) => {
      const candidate = {
        x: clamp(nextX, MAP_BOUNDS.minX, MAP_BOUNDS.maxX),
        y: clamp(nextY, MAP_BOUNDS.minY, MAP_BOUNDS.maxY)
      };

      return candidate;
    };

    const fullMove = tryMove(state.player.x + dx, state.player.y + dy);
    if (fullMove) {
      state.player.x = fullMove.x;
      state.player.y = fullMove.y;
    } else {
      const xOnlyMove = tryMove(state.player.x + dx, state.player.y);
      if (xOnlyMove) {
        state.player.x = xOnlyMove.x;
      }
      const yOnlyMove = tryMove(state.player.x, state.player.y + dy);
      if (yOnlyMove) {
        state.player.y = yOnlyMove.y;
      }
    }

    state.heroMoveDustCooldown = Math.max(0, state.heroMoveDustCooldown - deltaMs);
    state.heroMoving = magnitude > 0 && state.heroPose === 'idle';
    if (state.heroMoving) {
      state.heroAnimTime = (state.heroAnimTime + deltaMs) % (HERO_WALK_FRAME_MS * HERO_WALK_FRAME_COUNT);
      if (!wasMoving || state.heroMoveDustCooldown <= 0) {
        spawnMovementDust(!wasMoving);
        state.heroMoveDustCooldown = !wasMoving ? HERO_START_DUST_MS : HERO_STEP_DUST_MS;
      }
    } else if (state.heroPose === 'idle') {
      state.heroAnimTime = 0;
      state.heroMoveDustCooldown = 0;
    }
    const nextSceneIndex = clamp(tileIndexForPoint(state.player), 0, WORLD_TILE_COUNT - 1);
    if (nextSceneIndex !== previousSceneIndex) {
      syncSceneByPlayerScreen(true);
    } else {
      syncActiveWave();
    }
    state.supportSlowMs = Math.max(0, state.supportSlowMs - deltaMs);
    state.supportSpeedMs = Math.max(0, state.supportSpeedMs - deltaMs);
    autoPickupNearbyOrb();
    autoPickupNearbySupportDrop();
  }

  function frame(now) {
    if (!state.lastFrame) {
      state.lastFrame = now;
    }
    const delta = Math.min(32, now - state.lastFrame);
    state.lastFrame = now;
    state.clock = now;

    if (!state.finished && state.viewMode === 'map') {
      state.heroInvincibleMs = Math.max(0, state.heroInvincibleMs - delta);
      updatePlayer(delta);
      if (!AUTO_START_PLAY_SESSION) {
        updateTargets(delta);
      }
      updateShots(delta);
      syncDynamicEntities();
    }

    window.requestAnimationFrame(frame);
  }

  function bindEvents() {
    els.heroSelectGrid.addEventListener('click', event => {
      const button = event.target.closest('[data-hero-id]');
      if (!button) {
        return;
      }
      selectHero(button.dataset.heroId, true);
    });
    els.worldOptionGrid.addEventListener('click', event => {
      const button = event.target.closest('[data-world-pack-id]');
      if (button) {
        selectOnboardingWorld(button.dataset.worldPackId);
      }
    });
    els.onboardingNextButton.addEventListener('click', () => {
      if (state.onboardingStep === 'welcome') {
        state.onboardingStep = 'hero';
        renderOnboarding();
        return;
      }
      if (state.onboardingStep === 'hero') {
        state.onboardingStep = 'world';
        renderOnboarding();
        return;
      }
      startOnboardingWorld().catch(error => {
        console.error('[word-memory] failed to start selected world', error);
      });
    });
    document.addEventListener('keydown', event => {
      const key = event.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'w', 'a', 's', 'd'].includes(key)) {
        state.keys.add(key);
        event.preventDefault();
        return;
      }
      if (key === 'tab') {
        cycleTarget(event.shiftKey ? -1 : 1);
        event.preventDefault();
        return;
      }
      if (key === 'enter' || key === ' ') {
        if (state.viewMode === 'classic') {
          classicFireAt(focusedTarget() || aliveTargets()[0]);
        } else {
          throwHeldBomb();
        }
        event.preventDefault();
        return;
      }
      if (key === 'r') {
        ensureAudio();
        speakVisibleWords();
        event.preventDefault();
        return;
      }
      if (key === 'm') {
        toggleAudio();
        event.preventDefault();
      }
    });

    document.addEventListener('keyup', event => {
      state.keys.delete(event.key.toLowerCase());
    });

    els.entityLayer.addEventListener('click', event => {
      const supportButton = event.target.closest('[data-support-id]');
      if (supportButton) {
        const drop = state.supportDrops.find(item => item.id === supportButton.dataset.supportId && !item.picked);
        if (drop) {
          applySupportDrop(drop);
        }
        return;
      }

      const orbButton = event.target.closest('[data-orb-id]');
      if (orbButton) {
        selectOrb(orbButton.dataset.orbId, true);
        return;
      }

      const targetButton = event.target.closest('[data-target-id]');
      if (!targetButton) {
        if (selectedOrb()) {
          throwHeldBomb(pointFromMapEvent(event));
        }
        return;
      }
      const target = state.targets.find(item => item.id === targetButton.dataset.targetId);
      if (!target) {
        return;
      }
      state.focusedTargetId = target.id;
      if (!selectedOrb()) {
        previewTargetWord(target);
        return;
      }
      throwHeldBomb(targetPosition(target), target.id);
    });

    els.entityLayer.addEventListener('mousemove', event => {
      const targetButton = event.target.closest('[data-target-id]');
      if (!targetButton) {
        return;
      }
      state.focusedTargetId = targetButton.dataset.targetId;
      syncDynamicEntities();
    });

    els.classicStage.addEventListener('click', event => {
      const orbButton = event.target.closest('[data-classic-orb-id]');
      if (orbButton) {
        const orb = state.orbs.find(item => item.id === orbButton.dataset.classicOrbId && !item.used && !item.inFlight);
        if (!orb) return;
        state.selectedOrbId = orb.id;
        state.lastPromptOrbId = orb.id;
        ensureAudio();
        playSfx('pickup');
        speak(orb.card.translation, 'zh-CN');
        setMessage(`已装填：${orb.card.translation}`);
        render();
        return;
      }

      const targetButton = event.target.closest('[data-classic-target-id]');
      if (targetButton) {
        const target = state.targets.find(item => item.id === targetButton.dataset.classicTargetId);
        state.focusedTargetId = target?.id || state.focusedTargetId;
        classicFireAt(target);
      }
    });

    els.speakButton.addEventListener('click', speakVisibleWords);
    els.learningHintButton.addEventListener('click', () => showLearningHint(false));
    els.learningHintSpeakButton.addEventListener('click', () => {
      const card = state.learningHintCard || currentLearningCard();
      if (!card) {
        return;
      }
      state.learningHintCard = card;
      renderLearningHint();
      emitSpeechDebugEvent(card.word, 'en-US', 'hint-button');
      speak(card.word, 'en-US');
    });
    els.missionWordPreview.addEventListener('click', event => {
      const chip = event.target.closest('[data-preview-word-id]');
      if (!chip) {
        return;
      }
      showLearningHintForCardId(chip.dataset.previewWordId, true);
    });
    if (ENABLE_AUTOMATION_WORLD_CONTROLS) {
      els.sceneButton.addEventListener('click', cycleScene);
    }
    els.levelButton.addEventListener('click', () => {
      state.levelPanelCollapsed = !state.levelPanelCollapsed;
      renderLevelPanel();
    });
    els.levelList.addEventListener('click', event => {
      const button = event.target.closest('[data-level-id]');
      if (!button) {
        return;
      }
      startLevel(button.dataset.levelId).catch(error => {
        console.error('[word-memory] failed to start level', error);
      });
    });
    els.modeButton.addEventListener('click', toggleViewMode);
    els.classicModeButton.addEventListener('click', toggleViewMode);
    els.vocabSelect.value = VOCAB_MODE;
    els.vocabSelect.addEventListener('change', changeVocabPack);
    if (ENABLE_AUTOMATION_WORLD_CONTROLS) {
      els.worldSelect.addEventListener('change', () => {
        changeWorldPack().catch(error => {
          console.error('[word-memory] failed to change world pack', error);
        });
      });
    }
    els.categorySelect.addEventListener('change', changeCategory);
    els.soundButton.addEventListener('click', toggleAudio);
    els.restartButton.addEventListener('click', () => startGame());
    els.nextLevelButton.addEventListener('click', () => {
      const next = nextLevel();
      if (!next) {
        return;
      }
      startLevel(next.id, { preserveWorld: true }).catch(error => {
        console.error('[word-memory] failed to start next level', error);
      });
    });
    els.changeWorldButton.addEventListener('click', () => {
      const next = nextLevel();
      if (!next || !isLevelUnlocked(next)) {
        return;
      }
      state.pendingLevelId = next.id;
      state.onboardingStep = 'world';
      state.heroSelectOpen = true;
      renderOnboarding();
    });
    els.equipRewardButton.addEventListener('click', equipLevelReward);
    els.finishRestartButton.addEventListener('click', () => startGame());
    window.addEventListener('wordMemoryDebugFinishLevel', () => {
      state.targets.forEach(target => {
        target.alive = false;
      });
      state.score = state.deck.length;
      finishGame();
    });
  }

  async function init() {
    window.__wordMemoryReady = false;
    loadLevelProgress();
    loadRewardProgress();
    loadReviewProgress();
    loadHeroSelection();
    const debugLevel = debugLevelOverride();
    applyLevelSettings(debugLevel ? LEVELS[debugLevel - 1] : currentLevel());
    await Promise.all([
      loadCards(),
      loadVoiceMap(),
      loadWorldTiles()
    ]);
    renderWorldSelect();
    renderCategorySelect();
    renderOnboarding();
    bindEvents();
    hideWorldDebugControls();
    renderDecor();
    startGame();
    window.requestAnimationFrame(now => {
      window.__wordMemoryReady = true;
      window.dispatchEvent(new CustomEvent('wordMemoryReady'));
      frame(now);
    });
  }

  init();
})();



