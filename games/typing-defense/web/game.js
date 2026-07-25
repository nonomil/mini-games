const ASSETS = {
  creeper: {
    idle: "../assets/generated/typing-defense-assets/creeper_gpt_idle.png",
    attack: "../assets/generated/typing-defense-assets/creeper_gpt_attack_warning.png",
    happy: "../assets/generated/typing-defense-assets/creeper_gpt_idle.png",
    generatedFar: "../assets/generated/typing-defense-assets/creeper_gpt_walk_1.png",
    generatedMid: "../assets/generated/typing-defense-assets/creeper_gpt_walk_3.png",
    generatedNear: "../assets/generated/typing-defense-assets/creeper_gpt_danger_mid.png",
    generatedDanger: "../assets/generated/typing-defense-assets/creeper_gpt_danger_near.png",
    hitReaction: "../assets/generated/typing-defense-assets/creeper_gpt_hit_reaction.png",
    explosionFrames: [
      "../assets/generated/typing-defense-assets/creeper_gpt_explosion_0.png",
      "../assets/generated/typing-defense-assets/creeper_gpt_explosion_1.png",
      "../assets/generated/typing-defense-assets/creeper_gpt_explosion_2.png"
    ],
    shockwaves: [
      "../assets/generated/typing-defense-assets/explosion_shockwave_0.png",
      "../assets/generated/typing-defense-assets/explosion_shockwave_1.png",
      "../assets/generated/typing-defense-assets/explosion_shockwave_2.png"
    ],
    walk: [
      "../assets/generated/typing-defense-assets/creeper_gpt_walk_0.png",
      "../assets/generated/typing-defense-assets/creeper_gpt_walk_1.png",
      "../assets/generated/typing-defense-assets/creeper_gpt_walk_2.png",
      "../assets/generated/typing-defense-assets/creeper_gpt_walk_3.png"
    ]
  },
  weapon: {
    bowIdle: "../assets/generated/typing-defense-assets/bow_launcher_idle.png",
    bowDraw: "../assets/generated/typing-defense-assets/bow_launcher_draw.png",
    bowRelease: "../assets/generated/typing-defense-assets/bow_launcher_release.png",
    arrowProjectile: "../assets/generated/typing-defense-assets/arrow_projectile.png",
    arrowProjectileTrail: "../assets/generated/typing-defense-assets/arrow_projectile_trail.png"
  },
  ui: {
    heartFull: "../assets/generated/typing-defense-assets/heart_full.png",
    heartEmpty: "../assets/generated/typing-defense-assets/heart_empty.png",
    heartCracked: "../assets/generated/typing-defense-assets/heart_cracked.png",
    starFull: "../assets/generated/typing-defense-assets/star_full.png",
    starEmpty: "../assets/generated/typing-defense-assets/star_empty.png",
    particleGreen: "../assets/generated/typing-defense-assets/particle_green.png",
    particleGold: "../assets/generated/typing-defense-assets/particle_gold.png",
    impactFlash: "../assets/generated/typing-defense-assets/impact_flash.png"
  }
};

const preloadedVisualAssets = [
  ASSETS.creeper.idle,
  ASSETS.creeper.attack,
  ASSETS.creeper.happy,
  ASSETS.creeper.generatedFar,
  ASSETS.creeper.generatedMid,
  ASSETS.creeper.generatedNear,
  ASSETS.creeper.generatedDanger,
  ...ASSETS.creeper.explosionFrames,
  ...ASSETS.creeper.shockwaves,
  ...ASSETS.creeper.walk,
  ...Object.values(ASSETS.weapon),
  ...Object.values(ASSETS.ui)
].map((src) => {
  const image = new Image();
  image.src = src;
  return image;
});

const audioManifest = {
  defaultMode: "words",
  roundGoal: 6,
  cues: {
    start: "../assets/generated/audio/cue_start.mp3",
    win: "../assets/generated/audio/cue_win.mp3",
    lose: "../assets/generated/audio/cue_lose.mp3"
  },
  sfx: {
    letter: "../assets/generated/audio/sfx_letter.wav",
    countdown: "../assets/generated/audio/sfx_countdown.wav",
    explosion: "../assets/generated/audio/sfx_explosion.wav"
  }
};

const ROUND_GOAL = audioManifest.roundGoal;
const TEST_ENVIRONMENT_ROUNDS_PER_PACK = 2;
const PLAY_ENVIRONMENT_ROUNDS_PER_PACK = 3;
const RECENT_TASK_HISTORY_LIMIT = 24;

const ROOT_VOCAB_RUNTIME = window.__MINECRAFT_TYPING_DEFENSE_TASKS__ || null;
const ROOT_WORD_TASKS = Array.isArray(ROOT_VOCAB_RUNTIME?.banks?.words) ? ROOT_VOCAB_RUNTIME.banks.words : [];
const VOCAB_BANKS_RUNTIME = window.__TYPING_DEFENSE_VOCAB_BANKS__ || null;
const VOCAB_BANKS = Array.isArray(VOCAB_BANKS_RUNTIME?.banks) ? VOCAB_BANKS_RUNTIME.banks : [];
const VOCAB_BANKS_BY_ID = new Map(VOCAB_BANKS.map((bank) => [bank.id, bank]));
const DEFAULT_VOCAB_ID = VOCAB_BANKS_RUNTIME?.defaultBankId || "minecraft";
const AUTO_GRADED_VOCAB_ID = "auto-graded";
const FRIENDLY_VOCAB_LABELS = {
  kindergarten: "幼儿园",
  "elementary-lower": "小学低年级",
  "elementary-upper": "小学高年级",
  "junior-high": "初中",
  minecraft: "Minecraft主题",
  "bridge-pinyin": "拼音"
};
const AUTO_GRADED_BANK_IDS = ["kindergarten", "elementary-lower", "elementary-upper", "junior-high"]
  .filter((bankId) => VOCAB_BANKS_BY_ID.has(bankId));
const FALLBACK_VOCAB_ID = VOCAB_BANKS_BY_ID.has(DEFAULT_VOCAB_ID)
  ? DEFAULT_VOCAB_ID
  : (VOCAB_BANKS[0]?.id || "fallback");
const AUTO_GRADED_DEFAULT_ENABLED = AUTO_GRADED_BANK_IDS.length >= 2;
const PINYIN_TIERS = {
  single: { label: "单字", speed: 18800 },
  phrase: { label: "词语", speed: 21400 }
};
let selectedVocabId = AUTO_GRADED_DEFAULT_ENABLED ? AUTO_GRADED_VOCAB_ID : FALLBACK_VOCAB_ID;
let activeVocabId = AUTO_GRADED_DEFAULT_ENABLED
  ? (AUTO_GRADED_BANK_IDS[0] || FALLBACK_VOCAB_ID)
  : FALLBACK_VOCAB_ID;
let activePinyinTier = "single";

const FALLBACK_WORD_TASKS = [
  { mode: "单词", target: "cat", hint: "小猫 cat" },
  { mode: "单词", target: "dog", hint: "小狗 dog" },
  { mode: "单词", target: "fox", hint: "狐狸 fox" },
  { mode: "单词", target: "bat", hint: "蝙蝠 bat" },
  { mode: "单词", target: "bear", hint: "小熊 bear" },
  { mode: "单词", target: "frog", hint: "青蛙 frog" },
  { mode: "单词", target: "deer", hint: "小鹿 deer" },
  { mode: "单词", target: "panda", hint: "熊猫 panda" }
];

const TASK_BANKS = {
  pinyin: [
    { mode: "拼音", target: "a", hint: "单韵母 a" },
    { mode: "拼音", target: "o", hint: "单韵母 o" },
    { mode: "拼音", target: "e", hint: "单韵母 e" },
    { mode: "拼音", target: "ai", hint: "复韵母 ai" },
    { mode: "拼音", target: "ao", hint: "复韵母 ao" },
    { mode: "拼音", target: "ma", hint: "拼音 ma" },
    { mode: "拼音", target: "ba", hint: "拼音 ba" },
    { mode: "拼音", target: "pin", hint: "拼音 pin" },
    { mode: "拼音", target: "shi", hint: "整体认读 shi" }
  ],
  letters: [
    { mode: "字母", target: "b", hint: "找到字母 b" },
    { mode: "字母", target: "p", hint: "找到字母 p" },
    { mode: "字母", target: "m", hint: "找到字母 m" },
    { mode: "字母", target: "f", hint: "找到字母 f" },
    { mode: "字母", target: "d", hint: "找到字母 d" },
    { mode: "字母", target: "t", hint: "找到字母 t" },
    { mode: "字母", target: "n", hint: "找到字母 n" },
    { mode: "字母", target: "l", hint: "找到字母 l" }
  ],
  words: ROOT_WORD_TASKS.length ? ROOT_WORD_TASKS : FALLBACK_WORD_TASKS,
  numbers: [
    { mode: "数字", target: "1", hint: "数字 1" },
    { mode: "数字", target: "2", hint: "数字 2" },
    { mode: "数字", target: "5", hint: "数字 5" },
    { mode: "数字", target: "7", hint: "数字 7" },
    { mode: "数字", target: "10", hint: "数字 10" },
    { mode: "数字", target: "12", hint: "数字 12" },
    { mode: "数字", target: "20", hint: "数字 20" }
  ],
  math: []
};

const GAME_MODES = {
  mixed: { label: "综合", banks: ["pinyin", "letters", "words", "numbers"], speed: 17600 },
  pinyin: { label: "拼音", banks: ["pinyin"], speed: 18800 },
  letters: { label: "字母", banks: ["letters"], speed: 17600 },
  words: { label: "年级单词", banks: ["words"], speed: 22000 },
  mathEasy20: { label: "加减起步", banks: ["math"], speed: 21400 },
  mathEasy100: { label: "加减进阶", banks: ["math"], speed: 22200 },
  mathMul: { label: "乘法启程", banks: ["math"], speed: 23800 },
  numbers: { label: "数字", banks: ["numbers"], speed: 13200 }
};

const BASE_WORD_TASKS = TASK_BANKS.words.map((task) => ({
  ...task,
  image: normalizeWordCardImage(task.image)
}));
const BASE_PINYIN_TASKS = [...TASK_BANKS.pinyin];
installVocabBankTasks(getVocabBank(activeVocabId));

const LOCAL_WORD_CARD_ASSETS = {
  cat: "../assets/generated/word-cards/cat.webp",
  dog: "../assets/generated/word-cards/dog.webp",
  fox: "../assets/generated/word-cards/fox.webp",
  bat: "../assets/generated/word-cards/bat.webp",
  bear: "../assets/generated/word-cards/bear.webp",
  frog: "../assets/generated/word-cards/frog.webp",
  deer: "../assets/generated/word-cards/deer.webp",
  panda: "../assets/generated/word-cards/panda.webp"
};

function normalizeWordCardImage(src) {
  const value = String(src || "").trim();
  if (!value || /^(https?:)?\/\//.test(value)) {
    return "../../../../assets/learn/english-vocab/minecraft-card.webp";
  }
  return value.replace(/^\.\.\/\.\.\/\.\.\/assets\//, "../../../../assets/");
}

function preloadWordCardSrc(task) {
  const src = String(task?.image || "").trim();
  return src ? normalizeWordCardImage(src) : "";
}

const preloadedWordCards = [...new Set([
  ...Object.values(LOCAL_WORD_CARD_ASSETS),
  ...TASK_BANKS.words.map((task) => preloadWordCardSrc(task)).filter(Boolean),
  ...VOCAB_BANKS.flatMap((bank) => (Array.isArray(bank.words) ? bank.words : []).map((task) => preloadWordCardSrc(task)).filter(Boolean))
])].map((src) => {
  const image = new Image();
  image.src = src;
  return image;
});

const stage = document.querySelector("#stage");
const monsterWrap = document.querySelector("#monsterWrap");
const monster = document.querySelector("#monster");
const frontCreeperImage = document.querySelector("#frontCreeperImage");
const creeperRig = document.querySelector("#creeperRig");
const backupMonsterWrap = document.querySelector("#backupMonsterWrap");
const backupCreeperImage = document.querySelector("#backupCreeperImage");
const backupCreeperRig = document.querySelector("#backupCreeperRig");
const sideMonsterWrap = document.querySelector("#sideMonsterWrap");
const sideCreeperImage = document.querySelector("#sideCreeperImage");
const sideCreeperRig = document.querySelector("#sideCreeperRig");
const enemyTaskBadges = Array.from(document.querySelectorAll("[data-enemy-badge]"));
const arrowLane = document.querySelector("#arrowLane");
const arrowLauncher = document.querySelector("#arrowLauncher");
const bowLauncherImage = document.querySelector("#bowLauncherImage");
const arrow = document.querySelector("#arrow");
const targetBubble = document.querySelector("#targetBubble");
const wordCardPanel = document.querySelector("#wordCardPanel");
const wordCardDeck = document.querySelector("#wordCardDeck");
const wordCardImage = document.querySelector("#wordCardImage");
const wordCardLabel = document.querySelector("#wordCardLabel");
const progressWord = document.querySelector("#progressWord");
const particleLayer = document.querySelector("#particleLayer");
const explosionLayer = document.querySelector("#explosionLayer");
const comboRibbon = document.querySelector("#comboRibbon");
const floatText = document.querySelector("#floatText");
const typedText = document.querySelector("#typedText");
const typedGhost = document.querySelector("#typedGhost");
const typeBoxHelper = document.querySelector("#typeBoxHelper");
const typeBox = document.querySelector("#typeBox");
const keyboard = document.querySelector("#keyboard");
const modeBadge = document.querySelector("#modeBadge");
const hintText = document.querySelector("#hintText");
const goalChip = document.querySelector("#goalChip");
const goalChipMain = document.querySelector("#goalChipMain");
const goalChipSub = document.querySelector("#goalChipSub");
const starsMeter = document.querySelector(".stars");
const scoreEl = document.querySelector("#score");
const roundCounter = document.querySelector("#roundCounter");
const comboCounter = document.querySelector("#comboCounter");
const sceneChip = document.querySelector("#sceneChip");
const sceneName = document.querySelector("#sceneName");
const sceneHint = document.querySelector("#sceneHint");
const gradeTrack = document.querySelector("#gradeTrack");
const overlayGradeTrack = document.querySelector("#overlayGradeTrack");
const hearts = Array.from(document.querySelectorAll("[data-heart]"));
const stars = Array.from(document.querySelectorAll("[data-star]"));
const approachFill = document.querySelector("#approachFill");
const overlay = document.querySelector("#overlay");
const overlayTitle = overlay.querySelector("h1");
const overlayText = document.querySelector("#overlayText");
const finalStats = document.querySelector("#finalStats");
const modeTabs = document.querySelector("#modeTabs");
const vocabSelect = document.querySelector("#vocabSelect");
const vocabLabel = document.querySelector("#vocabLabel");
const pinyinTierPanel = document.querySelector("#pinyinTierPanel");
const pinyinTierTabs = document.querySelector("#pinyinTierTabs");
const mathGuidePanel = document.querySelector("#mathGuidePanel");
const mathGuideTitle = document.querySelector("#mathGuideTitle");
const mathGuideFit = document.querySelector("#mathGuideFit");
const mathGuideReason = document.querySelector("#mathGuideReason");
const mathGuideRules = document.querySelector("#mathGuideRules");
const mathSupportPanel = document.querySelector("#mathSupportPanel");
const mathSupportTabs = document.querySelector("#mathSupportTabs");
const startSummary = document.querySelector("#startSummary");
const startSummaryTitle = document.querySelector("#startSummaryTitle");
const startSummarySubtitle = document.querySelector("#startSummarySubtitle");
const startSummaryMetas = document.querySelector("#startSummaryMetas");
const startSummarySampleKicker = document.querySelector("#startSummarySampleKicker");
const startSummarySampleMain = document.querySelector("#startSummarySampleMain");
const startSummarySampleSub = document.querySelector("#startSummarySampleSub");
const startButton = document.querySelector("#startButton");
const overlayStart = document.querySelector("#overlayStart");
const skipButton = document.querySelector("#skipButton");
const listenButton = document.querySelector("#listenButton");
const sceneToast = document.querySelector("#sceneToast");
const sceneToastKicker = document.querySelector(".scene-toast-kicker");
const sceneToastName = document.querySelector("#sceneToastName");
const sceneToastHint = document.querySelector("#sceneToastHint");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TEST_MODE = new URLSearchParams(window.location.search).has("test");
const HAPPY_DELAY = TEST_MODE ? 40 : 320;
const HIT_DELAY = TEST_MODE ? 140 : 1900;
const HIT_REACTION_DELAY = TEST_MODE ? 45 : 180;
const DAMAGE_DELAY = TEST_MODE ? 360 : 980;

if (TEST_MODE) {
  document.body.dataset.testMode = "1";
}

setUiState("menu");

let state = "menu";
let activeMode = audioManifest.defaultMode;
let availableTasks = getTasksForMode(activeMode);
let currentTask = availableTasks[0];
let typed = "";
let hp = 3;
let score = 0;
let roundIndex = 1;
let hits = 0;
let misses = 0;
let combo = 0;
let bestCombo = 0;
let progress = 0;
let lastTime = 0;
let spawnDuration = 10200;
let hitLock = false;
let monsterFrame = -1;
let backupMonsterFrame = -1;
let sideMonsterFrame = -1;
let activeEnemies = [];
let activeEnemyId = "";
let lastLostHeart = -1;
let roundTimer = 0;
let lastAttack = "none";
let dangerLevel = 0;
let lastDamageEffect = "none";
let lastCountdownBucket = -1;
let lastLetterFeedback = "none";
let lastMiniArrowCount = 0;
let lastLetterImpactCount = 0;
let explosionClearTimer = 0;
let pendingExplosionTimer = 0;
let bowResetTimer = 0;
let lastKeyFeedback = "";
let lastTargetedEnemyId = "";
let earnedStarCount = 0;
let comboRibbonTimer = 0;
let sceneToastTimer = 0;
let activeEnvironmentId = "";
let recentTaskIds = [];
let translationVoiceTimer = 0;
let pendingGradeToast = null;
let goalChipTimer = 0;
let rewardMeterTimer = 0;
const HOST_BRIDGE_SOURCE = "petbank-typing-defense";
const hostBridgeSessionId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
let hostBridgeSeq = 0;

function postHostEvent(kind, payload = {}) {
  if (!window.parent || window.parent === window) return;
  const message = {
    source: HOST_BRIDGE_SOURCE,
    version: 1,
    kind,
    sessionId: hostBridgeSessionId,
    seq: ++hostBridgeSeq,
    timestamp: Date.now(),
    payload
  };
  try {
    window.parent.postMessage(message, window.location.origin || "*");
  } catch (error) {
    try {
      window.parent.postMessage(message, "*");
    } catch (fallbackError) {}
  }
}
let celebrateStageTimer = 0;
let menuSummaryTimer = 0;
let selectedMathSupportId = "none";
let activeMathSupportId = "none";
let mathRetryUsed = false;
const soundEventLog = [];
const audioCache = new Map();

const MATH_GUIDE_OPTIONS = {
  mathEasy20: {
    fit: "适合刚开始口算",
    reason: "先用小数字练键盘和口算节奏。",
    rules: ["20以内", "加减混合", "慢节奏"]
  },
  mathEasy100: {
    fit: "适合会做基础加减",
    reason: "把两位数口算和输入速度一起练稳。",
    rules: ["100以内", "加减混合", "专注练习"]
  },
  mathMul: {
    fit: "适合刚开始学乘法",
    reason: "乘法里混一点加减过渡题，降低挫败感。",
    rules: ["2到5乘法", "混合过渡题", "可看阵列"]
  }
};

const MATH_SUPPORT_CARDS = {
  none: { id: "none", label: "不用", stages: ["mathEasy20", "mathEasy100", "mathMul"] },
  slow_enemy: { id: "slow_enemy", label: "走慢一点", stages: ["mathEasy20", "mathEasy100", "mathMul"] },
  retry_once: { id: "retry_once", label: "保底一次", stages: ["mathEasy20", "mathEasy100", "mathMul"] },
  show_array: { id: "show_array", label: "看阵列", stages: ["mathMul"] }
};

function setUiState(nextState) {
  document.body.dataset.uiState = nextState;
}

const ENEMY_ROLES = ["front", "side", "back"];
const ENVIRONMENT_PACKS = [
  {
    id: "day",
    label: "白天草地",
    hint: "亮亮的草地练打字",
    hue: 0,
    skyA: "#8fd0ff",
    skyB: "#b9e4ff",
    grassA: "#84cd4a",
    grassB: "#4c8a2a",
    stageBackgroundY: "55%",
    groundForegroundY: "100%",
    horizonBackY: "50%",
    horizonMidY: "49%",
    horizonFrontY: "48%",
    stageBackground: "../assets/generated/typing-defense-assets/voxel_map_background_agnes.jpg",
    groundForeground: "../assets/generated/typing-defense-assets/voxel_ground_foreground_agnes.png",
    horizonBack: "../assets/generated/typing-defense-assets/horizon_day_back_agnes.png",
    horizonMid: "../assets/generated/typing-defense-assets/horizon_day_mid_agnes.png",
    horizonFront: "../assets/generated/typing-defense-assets/horizon_day_front_agnes.png"
  },
  {
    id: "dusk",
    label: "黄昏追逐",
    hint: "天快黑了，快一点",
    hue: 10,
    skyA: "#ffd4a5",
    skyB: "#fff0c8",
    grassA: "#91c451",
    grassB: "#6b8935",
    stageBackgroundY: "57%",
    groundForegroundY: "100%",
    horizonBackY: "52%",
    horizonMidY: "50%",
    horizonFrontY: "49%",
    stageBackground: "../assets/generated/typing-defense-assets/voxel_map_background_dusk_agnes.jpg",
    groundForeground: "../assets/generated/typing-defense-assets/voxel_ground_foreground_dusk_agnes.png",
    horizonBack: "../assets/generated/typing-defense-assets/horizon_dusk_back_agnes.png",
    horizonMid: "../assets/generated/typing-defense-assets/horizon_dusk_mid_agnes.png",
    horizonFront: "../assets/generated/typing-defense-assets/horizon_dusk_front_agnes.png"
  },
  {
    id: "overcast",
    label: "林地疾跑",
    hint: "树影更多了，继续冲",
    hue: -10,
    skyA: "#c8d8e8",
    skyB: "#e8f1f6",
    grassA: "#7ebb63",
    grassB: "#486f34",
    stageBackgroundY: "56%",
    groundForegroundY: "100%",
    horizonBackY: "50%",
    horizonMidY: "49%",
    horizonFrontY: "48%",
    stageBackground: "../assets/generated/typing-defense-assets/voxel_map_background_overcast_agnes.jpg",
    groundForeground: "../assets/generated/typing-defense-assets/voxel_ground_foreground_overcast_agnes.png",
    horizonBack: "../assets/generated/typing-defense-assets/horizon_overcast_back_agnes.png",
    horizonMid: "../assets/generated/typing-defense-assets/horizon_overcast_mid_agnes.png",
    horizonFront: "../assets/generated/typing-defense-assets/horizon_overcast_front_agnes.png"
  }
];

function isMathMode(modeKey = activeMode) {
  return /^math/i.test(String(modeKey || ""));
}

function getEnvironmentPack(themeIndex = 0) {
  return ENVIRONMENT_PACKS[((themeIndex % ENVIRONMENT_PACKS.length) + ENVIRONMENT_PACKS.length) % ENVIRONMENT_PACKS.length];
}

function getEnvironmentRoundsPerPack() {
  return TEST_MODE ? TEST_ENVIRONMENT_ROUNDS_PER_PACK : PLAY_ENVIRONMENT_ROUNDS_PER_PACK;
}

function getRoundEnvironmentPack(round = roundIndex) {
  const normalizedRound = Math.max(1, Number(round) || 1);
  return getEnvironmentPack(Math.floor((normalizedRound - 1) / getEnvironmentRoundsPerPack()));
}

function rememberTaskUsage(task) {
  if (!task?.id) return;
  recentTaskIds = recentTaskIds.filter((id) => id !== task.id);
  recentTaskIds.push(task.id);
  if (recentTaskIds.length > RECENT_TASK_HISTORY_LIMIT) {
    recentTaskIds = recentTaskIds.slice(-RECENT_TASK_HISTORY_LIMIT);
  }
}

function filterRecentTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length <= 1) return tasks;
  const filtered = tasks.filter((task) => !recentTaskIds.includes(task.id));
  return filtered.length ? filtered : tasks;
}

function updateSceneChip(pack = getRoundEnvironmentPack()) {
  if (!sceneName || !sceneHint || !pack) return;
  sceneName.textContent = pack.label;
  sceneHint.textContent = pack.hint;
}

function pulseSceneChip() {
  if (!sceneChip) return;
  sceneChip.classList.remove("is-accent");
  void sceneChip.offsetWidth;
  sceneChip.classList.add("is-accent");
  setTimeout(() => sceneChip.classList.remove("is-accent"), TEST_MODE ? 80 : 620);
}

function showStageToast(payload, force = false) {
  if (!sceneToast || !sceneToastKicker || !sceneToastName || !sceneToastHint || !payload) return;
  if (!force && roundIndex <= 1) return;
  clearTimeout(sceneToastTimer);
  sceneToast.dataset.variant = payload.variant || "scene";
  sceneToastKicker.textContent = payload.kicker || "场景切换";
  sceneToastName.textContent = payload.name || "";
  sceneToastHint.textContent = payload.hint || "";
  sceneToast.classList.remove("is-on");
  sceneToast.setAttribute("aria-hidden", "false");
  void sceneToast.offsetWidth;
  sceneToast.classList.add("is-on");
  pulseSceneChip();
  sceneToastTimer = setTimeout(() => {
    sceneToast.classList.remove("is-on");
    sceneToast.setAttribute("aria-hidden", "true");
    sceneToastTimer = 0;
  }, TEST_MODE ? 120 : 1380);
}

function showSceneToast(pack = getRoundEnvironmentPack(), force = false) {
  if (!pack) return;
  showStageToast({
    kicker: "场景切换",
    name: pack.label,
    hint: pack.hint,
    variant: "scene"
  }, force);
}

function buildGradeToast(bankId) {
  const label = vocabOptionLabel(bankId);
  return {
    kicker: "升级成功",
    name: label,
    hint: `新的 ${label} 词库开始啦`,
    variant: "grade-up"
  };
}

function buildMathTask(index = 0, modeKey = activeMode) {
  const easy20Templates = [
    { left: 7, op: "+", right: 5, label: "20以内加法" },
    { left: 14, op: "-", right: 6, label: "20以内减法" },
    { left: 8, op: "+", right: 9, label: "20以内加法" },
    { left: 16, op: "-", right: 7, label: "20以内减法" },
    { left: 6, op: "+", right: 8, label: "20以内加法" },
    { left: 18, op: "-", right: 9, label: "20以内减法" }
  ];
  const easy100Templates = [
    { left: 34, op: "+", right: 18, label: "100以内加法" },
    { left: 72, op: "-", right: 25, label: "100以内减法" },
    { left: 45, op: "+", right: 22, label: "100以内加法" },
    { left: 63, op: "-", right: 16, label: "100以内减法" },
    { left: 58, op: "+", right: 14, label: "100以内加法" },
    { left: 91, op: "-", right: 37, label: "100以内减法" }
  ];
  const mathMulTemplates = [
    { left: 3, op: "×", right: 4, label: "乘法启程", helper: "3组，每组4个", repeat: "4+4+4" },
    { left: 4, op: "+", right: 7, label: "加法过渡" },
    { left: 5, op: "×", right: 2, label: "乘法启程", helper: "5组，每组2个", repeat: "2+2+2+2+2" },
    { left: 9, op: "+", right: 8, label: "加法过渡" },
    { left: 2, op: "×", right: 5, label: "乘法启程", helper: "2组，每组5个", repeat: "5+5" },
    { left: 12, op: "-", right: 4, label: "减法过渡" }
  ];

  const templates = modeKey === "mathEasy20"
    ? easy20Templates
    : modeKey === "mathMul"
      ? mathMulTemplates
      : easy100Templates;
  const sample = templates[(roundIndex + index) % templates.length];
  const answerNumber = sample.op === "+"
    ? sample.left + sample.right
    : sample.op === "-"
      ? sample.left - sample.right
      : sample.left * sample.right;
  const answer = String(answerNumber);
  const prompt = `${sample.left}${sample.op}${sample.right}`;
  const helper = sample.helper
    ? `${sample.helper} · ${sample.repeat}`
    : "";
  return {
    id: `math-${modeKey}-${sample.left}-${sample.op}-${sample.right}-${roundIndex}-${index}`,
    mode: modeKey === "mathMul" && sample.op === "×" ? "乘法" : "口算",
    target: answer,
    answer,
    prompt,
    hint: `${sample.label} ${prompt}`,
    helper,
    bankKey: "math",
    taskType: "math",
    op: sample.op,
    wordLength: answer.length
  };
}

function taskAnswer(task) {
  return String(task?.answer || task?.target || "").trim().toLowerCase();
}

function taskLabel(task) {
  return String(task?.prompt || task?.target || "").trim();
}

function taskPromptParts(task) {
  const primary = String(task?.prompt || task?.chinese || taskLabel(task)).trim();
  const secondary = String(task?.pinyin || "").trim();
  return { primary, secondary };
}

function nextKeyLabel(key) {
  const value = String(key || "").trim();
  if (!value) return "";
  return /^[a-z]$/i.test(value) ? value.toUpperCase() : value;
}

function promptCopyFor(task) {
  if (!task) {
    return { primary: "准备开始", secondary: "看卡片再敲键盘" };
  }
  const answer = taskAnswer(task);
  const nextKey = answer[typed.length] || "";
  const nextStep = nextKey ? `下一键 ${nextKeyLabel(nextKey)}` : "慢慢输入就好";
  const modeKey = String(task?.bankKey || task?.taskType || "").toLowerCase();

  if (modeKey === "pinyin") {
    const { primary, secondary } = taskPromptParts(task);
    return {
      primary: primary || taskLabel(task),
      secondary: secondary || nextStep
    };
  }
  if (modeKey === "math") {
    return {
      primary: taskLabel(task),
      secondary: task.helper && activeMathSupportId === "show_array"
        ? `${task.helper} · ${nextStep}`
        : (answer ? `答案 ${answer} · ${nextStep}` : nextStep)
    };
  }
  if (isWordTask(task)) {
    const translation = taskTranslation(task);
    return {
      primary: translation ? `${translation} ${taskLabel(task)}` : taskLabel(task),
      secondary: nextStep
    };
  }
  return {
    primary: String(task?.hint || taskLabel(task)).trim(),
    secondary: nextStep
  };
}

function renderPromptHint(task) {
  if (!hintText) return;
  const { primary, secondary } = promptCopyFor(task);
  hintText.innerHTML = `<span class="prompt-primary">${primary}</span><span class="prompt-secondary">${secondary}</span>`;
}

function buildTypeBoxHelper(task, remaining = "") {
  if (!task) return "准备开始";
  const answer = taskAnswer(task);
  const nextKey = remaining[0] || "";
  const nextStep = nextKey ? `下一键 ${nextKeyLabel(nextKey)}` : "这一题完成啦";
  const modeKey = String(task?.bankKey || task?.taskType || "").toLowerCase();
  if (modeKey === "math") {
    if (task.helper && activeMathSupportId === "show_array") return `${task.helper} · ${nextStep}`;
    return answer ? `${taskLabel(task)} = ${answer} · ${nextStep}` : `算一算 · ${nextStep}`;
  }
  if (modeKey === "pinyin") {
    const prompt = taskPromptVoiceText(task) || taskPromptParts(task).primary || taskLabel(task);
    return `${prompt} · ${nextStep}`;
  }
  if (isWordTask(task)) {
    const translation = taskTranslation(task);
    return translation ? `${translation} · ${nextStep}` : nextStep;
  }
  return `${String(task?.hint || taskLabel(task)).trim()} · ${nextStep}`;
}

function menuPaceLabel(modeKey = activeMode) {
  if (modeKey === "words" || modeKey === "pinyin" || modeKey === "mathEasy20") return "慢节奏";
  if (modeKey === "mathEasy100" || modeKey === "mathMul") return "专注练习";
  if (modeKey === "letters") return "轻松热身";
  return "键盘练习";
}

function currentWordBankShortLabel() {
  if (!isWordMode(activeMode)) return "";
  const bank = getVocabBank(activeVocabId);
  return bank?.shortTitle || bank?.title || "单词";
}

function currentModeDisplayLabel(modeKey = activeMode) {
  const modeConfig = GAME_MODES[modeKey] || GAME_MODES.words;
  if (isWordMode(modeKey)) {
    const bankLabel = currentWordBankShortLabel();
    return bankLabel ? `${bankLabel} ${modeConfig.label}` : modeConfig.label;
  }
  if (modeKey === "pinyin") {
    return `拼音 ${getPinyinTierConfig().label}`;
  }
  return modeConfig.label;
}

function startActionLabel() {
  if (activeMode === "pinyin") {
    return activePinyinTier === "phrase" ? "开始词语拼音" : "开始拼音挑战";
  }
  if (activeMode === "mathEasy20" || activeMode === "mathEasy100") return "开始口算挑战";
  if (activeMode === "mathMul") return "开始乘法挑战";
  if (activeMode === "letters") return "开始字母热身";
  if (isWordMode(activeMode)) return `开始${currentModeDisplayLabel(activeMode)}`;
  return "开始挑战";
}

function menuSampleInfo(task = currentTask) {
  if (!task) {
    return { kicker: "示例", main: "abc", sub: "准备开始" };
  }
  const modeKey = String(task?.bankKey || task?.taskType || activeMode || "").toLowerCase();
  if (modeKey === "math") {
    return {
      kicker: "示例算式",
      main: taskLabel(task),
      sub: `答案 ${taskAnswer(task)}`
    };
  }
  if (modeKey === "pinyin") {
    const { primary, secondary } = taskPromptParts(task);
    return {
      kicker: activePinyinTier === "phrase" ? "示例词语" : "示例单字",
      main: primary || taskLabel(task),
      sub: secondary || taskAnswer(task)
    };
  }
  if (isWordTask(task)) {
    return {
      kicker: "示例单词",
      main: taskLabel(task),
      sub: taskTranslation(task) ? `${taskTranslation(task)} ${taskLabel(task)}` : taskLabel(task)
    };
  }
  return {
    kicker: "示例",
    main: taskLabel(task),
    sub: String(task?.hint || "").trim() || taskAnswer(task)
  };
}

function renderStartSummary() {
  if (!startSummary) return;
  const modeConfig = GAME_MODES[activeMode] || GAME_MODES.words;
  const sample = menuSampleInfo(currentTask);
  const subtitle = activeMode === "pinyin"
    ? `共 ${ROUND_GOAL} 关 · ${getPinyinTierConfig().label}`
    : `共 ${ROUND_GOAL} 关 · ${modeConfig.label}`;
  const metaItems = [
    currentVocabLabel(),
    menuPaceLabel(activeMode),
    taskCanListen(currentTask) ? "可听题" : "看题输入"
  ];
  if (activeMode === "pinyin") {
    metaItems[2] = activePinyinTier === "phrase" ? "词语拼音" : "单字拼音";
  } else if (activeMode === "mathEasy20") {
    metaItems[2] = "20以内";
  } else if (activeMode === "mathEasy100") {
    metaItems[2] = "100以内";
  } else if (activeMode === "mathMul") {
    metaItems[2] = "2到5乘法";
  }
  if (isMathMode(activeMode) && selectedMathSupportId !== "none") {
    metaItems.push(`辅助卡：${MATH_SUPPORT_CARDS[selectedMathSupportId]?.label || selectedMathSupportId}`);
  }

  startSummaryTitle.textContent = `${currentModeDisplayLabel(activeMode)} ${menuPaceLabel(activeMode)}`;
  startSummarySubtitle.textContent = subtitle;
  startSummaryMetas.innerHTML = metaItems
    .map((text) => `<span class="start-summary-meta">${text}</span>`)
    .join("");
  startSummarySampleKicker.textContent = sample.kicker;
  startSummarySampleMain.textContent = sample.main;
  startSummarySampleSub.textContent = sample.sub;
}

function pulseMenuSummary() {
  clearTimeout(menuSummaryTimer);
  startSummary?.classList.remove("is-accent");
  overlayStart?.classList.remove("is-accent");
  void (startSummary || overlayStart)?.offsetWidth;
  startSummary?.classList.add("is-accent");
  overlayStart?.classList.add("is-accent");
  menuSummaryTimer = setTimeout(() => {
    startSummary?.classList.remove("is-accent");
    overlayStart?.classList.remove("is-accent");
    menuSummaryTimer = 0;
  }, TEST_MODE ? 120 : 520);
}

function nextStarThreshold(currentHits) {
  const earnedStars = getEarnedStarCount();
  for (let hitCount = Math.max(0, currentHits); hitCount <= ROUND_GOAL; hitCount += 1) {
    const starCount = Math.min(stars.length, Math.floor((hitCount / ROUND_GOAL) * stars.length));
    if (starCount > earnedStars) return hitCount;
  }
  return ROUND_GOAL;
}

function updateGoalChip(pulse = false) {
  if (!goalChip || !goalChipMain || !goalChipSub) return;
  const remaining = Math.max(0, ROUND_GOAL - hits);
  if (state === "menu") {
    goalChipMain.textContent = `准备 ${ROUND_GOAL} 关挑战`;
    goalChipSub.textContent = isWordMode(activeMode)
      ? `${currentWordBankShortLabel()}词库 · 看卡片再敲键盘`
      : "慢慢打也来得及";
  } else if (state === "playing") {
    const threshold = nextStarThreshold(hits);
    const toNextStar = Math.max(0, threshold - hits);
    goalChipMain.textContent = remaining > 0 ? `还差 ${remaining} 只过关` : "马上通关啦";
    goalChipSub.textContent = toNextStar > 0
      ? `再打中 ${toNextStar} 只拿下一颗星`
      : "这一轮星星已经拿满啦";
  } else if (state === "win") {
    goalChipMain.textContent = "宝箱打开啦";
    goalChipSub.textContent = `拿到 ${getEarnedStarCount()}/${stars.length} 颗星`;
  } else {
    goalChipMain.textContent = "整理一下再来";
    goalChipSub.textContent = `本局拿到 ${getEarnedStarCount()}/${stars.length} 颗星`;
  }
  if (!pulse) return;
  clearTimeout(goalChipTimer);
  goalChip.classList.remove("is-pulse");
  void goalChip.offsetWidth;
  goalChip.classList.add("is-pulse");
  goalChipTimer = setTimeout(() => {
    goalChip.classList.remove("is-pulse");
    goalChipTimer = 0;
  }, TEST_MODE ? 110 : 520);
}

function renderTypeBoxDisplay() {
  if (!typeBox) return;
  const answer = taskAnswer(currentTask);
  const done = typed;
  const remaining = answer.slice(done.length);
  if (typedText) typedText.textContent = done;
  if (typedGhost) typedGhost.textContent = remaining;
  if (typeBoxHelper) typeBoxHelper.textContent = buildTypeBoxHelper(currentTask, remaining);
  typeBox.dataset.empty = done ? "false" : "true";
  typeBox.dataset.inputMode = String(currentTask?.bankKey || currentTask?.taskType || activeMode || "words");
  typeBox.setAttribute("aria-label", answer ? `当前输入 ${done || "空"}，目标 ${answer}` : `当前输入 ${done || "空"}`);
}

function taskBadgeMarkup(task) {
  const modeKey = String(task?.bankKey || task?.taskType || "").toLowerCase();
  if (modeKey === "pinyin") {
    const { primary, secondary } = taskPromptParts(task);
    const safePrimary = primary || taskLabel(task);
    const safeSecondary = secondary || task?.hint || "";
    return `<span class="enemy-task-main">${safePrimary}</span><span class="enemy-task-sub">${safeSecondary}</span>`;
  }
  return `<span class="enemy-task-main">${taskLabel(task)}</span>`;
}

function getEnemyElement(role) {
  if (role === "back") return backupMonsterWrap;
  if (role === "side") return sideMonsterWrap;
  return monsterWrap;
}

function getEnemyImage(role) {
  if (role === "back") return backupCreeperImage;
  if (role === "side") return sideCreeperImage;
  return frontCreeperImage;
}

function getEnemyRig(role) {
  if (role === "back") return backupCreeperRig;
  if (role === "side") return sideCreeperRig;
  return creeperRig;
}

function getEnemyTaskBadge(role) {
  return enemyTaskBadges.find((badge) => badge.dataset.enemyBadge === role) || null;
}

function getActiveEnemy() {
  return activeEnemies.find((enemy) => enemy.id === activeEnemyId) || activeEnemies[0] || null;
}

function pickEnemyTasks() {
  if (isMathMode()) {
    return ENEMY_ROLES.map((_, index) => buildMathTask(index, activeMode));
  }

  const pool = filterRecentTasks(
    getTasksForMode(activeMode).filter((task) => /^[a-z0-9]+$/.test(taskAnswer(task)))
  );
  if (!pool.length) return [currentTask || FALLBACK_WORD_TASKS[0]];

  const start = Math.floor(Math.random() * pool.length);
  const rotated = [...pool.slice(start), ...pool.slice(0, start)];
  const selected = [];
  const firstChars = new Set();

  for (const task of rotated) {
    const answer = taskAnswer(task);
    const firstChar = answer[0];
    if (!firstChar || firstChars.has(firstChar)) continue;
    selected.push(task);
    firstChars.add(firstChar);
    if (selected.length >= ENEMY_ROLES.length) return selected;
  }

  for (const task of rotated) {
    if (selected.includes(task)) continue;
    selected.push(task);
    if (selected.length >= ENEMY_ROLES.length) break;
  }
  return selected;
}

function buildActiveEnemies() {
  const wave = createEnemyWavePlan(roundIndex);
  return pickEnemyTasks().slice(0, wave.length).map((task, index) => {
    const role = wave[index];
    return {
      id: `${role}-${roundIndex}-${taskAnswer(task)}-${index}`,
      role,
      task,
      answer: taskAnswer(task),
      label: taskLabel(task),
      gait: createEnemyGait(role, index),
      route: createEnemyRoute(role, index),
      state: "walking",
      isTargeted: index === 0
    };
  });
}

function createEnemyWavePlan(round = roundIndex) {
  const normalizedRound = Math.max(1, Number(round) || 1);
  const count = normalizedRound <= 2 ? 1 : normalizedRound <= 5 ? 2 : 3;
  return ENEMY_ROLES.slice(0, count);
}

function createEnemyRoute(role, index = 0) {
  const bases = {
    front: { startX: 0.5, endX: 0.5, groundStart: 0.55, groundEnd: 0.85, spread: 0.17, scaleStart: 0.46, scaleEnd: 1.56, zIndex: 3 },
    side: { startX: 0.72, endX: 0.64, groundStart: 0.56, groundEnd: 0.8, spread: 0.13, scaleStart: 0.34, scaleEnd: 1.02, zIndex: 2 },
    back: { startX: 0.34, endX: 0.42, groundStart: 0.53, groundEnd: 0.73, spread: 0.1, scaleStart: 0.28, scaleEnd: 0.82, zIndex: 1 }
  };
  const base = bases[role] || bases.front;
  const randomOffset = () => (Math.random() - 0.5) * base.spread;
  const startX = Math.max(0.16, Math.min(0.84, base.startX + randomOffset()));
  const endX = Math.max(0.16, Math.min(0.84, base.endX + randomOffset()));
  return {
    startX,
    middleX: Math.max(0.14, Math.min(0.86, (startX + endX) / 2 + randomOffset())),
    endX,
    curve: (Math.random() < 0.5 ? -1 : 1) * (0.012 + Math.random() * 0.034),
    phase: Math.random() * Math.PI * 2 + index,
    pauseAt: 0.26 + Math.random() * 0.28,
    pauseStrength: 0.04 + Math.random() * 0.05,
    groundStart: base.groundStart,
    groundEnd: base.groundEnd,
    scaleStart: base.scaleStart,
    scaleEnd: base.scaleEnd,
    zIndex: base.zIndex,
    spawnAt: role === "front" ? 0 : 0.1 + Math.random() * 0.28
  };
}

function createEnemyGait(role, index = 0) {
  const roleBases = {
    front: { pace: 0.78, step: 0.94, bob: 0.94, lean: 0.94 },
    side: { pace: 0.72, step: 0.88, bob: 0.86, lean: 0.84 },
    back: { pace: 0.66, step: 0.8, bob: 0.8, lean: 0.78 }
  };
  const base = roleBases[role] || roleBases.front;
  return {
    frameOffset: Math.floor(Math.random() * ASSETS.creeper.walk.length),
    pace: base.pace * (0.9 + Math.random() * 0.18),
    step: base.step * (0.88 + Math.random() * 0.2),
    bob: base.bob * (0.82 + Math.random() * 0.22),
    lean: base.lean * (0.82 + Math.random() * 0.22),
    phase: (index * 0.9) + (Math.random() * Math.PI * 2),
    swayPhase: Math.random() * Math.PI * 2
  };
}

function getEnemyByRole(role) {
  return activeEnemies.find((enemy) => enemy.role === role) || null;
}

function findMatchingEnemies(prefix) {
  const value = String(prefix || "").trim().toLowerCase();
  if (!value) return activeEnemies.filter((enemy) => enemy.state !== "exploding");
  return activeEnemies.filter((enemy) => enemy.state !== "exploding" && enemy.answer.startsWith(value));
}

function setActiveEnemy(enemyOrId) {
  const enemyId = typeof enemyOrId === "string" ? enemyOrId : enemyOrId?.id;
  const next = activeEnemies.find((enemy) => enemy.id === enemyId) || activeEnemies[0] || null;
  if (!next) return null;
  activeEnemyId = next.id;
  lastTargetedEnemyId = next.id;
  currentTask = next.task;
  activeEnemies.forEach((enemy) => {
    enemy.isTargeted = enemy.id === next.id;
  });
  updateEnemyTaskBadges();
  updateWordCard(currentTask);
  renderProgressWord();
  renderKeyboard();
  updateAimForEnemy(next);
  return next;
}

function updateEnemyTaskBadges() {
  activeEnemies.forEach((enemy) => {
    const badge = getEnemyTaskBadge(enemy.role);
    const element = getEnemyElement(enemy.role);
    if (!badge || !element) return;
    const elementScale = Number(element.dataset.scale || 1) || 1;
    const badgeScale = Math.min(2.6, Math.max(0.96, 1 / elementScale));
    badge.innerHTML = taskBadgeMarkup(enemy.task);
    badge.dataset.answer = enemy.answer;
    badge.dataset.enemyRole = enemy.role;
    badge.style.setProperty("--badge-scale", badgeScale.toFixed(3));
    const isMatched = Boolean(typed) && enemy.answer.startsWith(typed);
    badge.classList.toggle("is-targeted", enemy.isTargeted);
    badge.classList.toggle("is-matched", isMatched);
    badge.classList.toggle("is-hot-match", isMatched && enemy.isTargeted);
    element.classList.toggle("is-targeted", enemy.isTargeted);
    element.dataset.enemyId = enemy.id;
  });
}

function updateAimForEnemy(enemy = getActiveEnemy()) {
  const element = enemy ? getEnemyElement(enemy.role) : monsterWrap;
  if (!element) return;
  updateArrowPath(element);
}

function getVocabBank(vocabId) {
  if (!VOCAB_BANKS.length) return null;
  return VOCAB_BANKS_BY_ID.get(vocabId) || VOCAB_BANKS_BY_ID.get(FALLBACK_VOCAB_ID) || VOCAB_BANKS[0];
}

function isAutoVocabEnabled(vocabId = selectedVocabId) {
  return vocabId === AUTO_GRADED_VOCAB_ID;
}

function resolveAutoVocabBankId(round = roundIndex) {
  const [kindergarten, elementaryLower, elementaryUpper, juniorHigh] = AUTO_GRADED_BANK_IDS;
  const fallback = juniorHigh || elementaryUpper || elementaryLower || kindergarten || FALLBACK_VOCAB_ID;
  if (round <= 2) return kindergarten || fallback;
  if (round <= 4) return elementaryLower || kindergarten || fallback;
  if (round <= 5) return elementaryUpper || elementaryLower || kindergarten || fallback;
  return juniorHigh || elementaryUpper || elementaryLower || kindergarten || fallback;
}

function resolveSelectedVocabId(vocabId = selectedVocabId, round = roundIndex, modeKey = activeMode) {
  if (isAutoVocabEnabled(vocabId)) {
    return isWordMode(modeKey) ? resolveAutoVocabBankId(round) : resolveAutoVocabBankId(1);
  }
  return VOCAB_BANKS_BY_ID.has(vocabId) ? vocabId : FALLBACK_VOCAB_ID;
}

function vocabOptionLabel(vocabId) {
  if (vocabId === AUTO_GRADED_VOCAB_ID) return "分级闯关（自动）";
  if (FRIENDLY_VOCAB_LABELS[vocabId]) return FRIENDLY_VOCAB_LABELS[vocabId];
  const bank = getVocabBank(vocabId);
  return bank?.shortTitle || bank?.title || vocabId;
}

function currentVocabLabel() {
  const currentBank = getVocabBank(activeVocabId);
  if (!currentBank) return "";
  if (isAutoVocabEnabled()) {
    return `分级闯关（当前：${vocabOptionLabel(currentBank.id)}）`;
  }
  if (currentBank.id === "minecraft") {
    return `${vocabOptionLabel(currentBank.id)} + 短词练习`;
  }
  return vocabOptionLabel(currentBank.id);
}

function syncActiveVocabBank(round = roundIndex) {
  const bank = getVocabBank(resolveSelectedVocabId(selectedVocabId, round, activeMode));
  if (!bank) return null;
  activeVocabId = bank.id;
  if (bank.kind === "pinyin") {
    setActivePinyinTier(activePinyinTier);
  }
  installVocabBankTasks(bank);
  updateVocabSelect();
  return bank;
}

function getAutoGradeSteps() {
  return AUTO_GRADED_BANK_IDS.map((bankId) => ({
    bankId,
    label: vocabOptionLabel(bankId),
    roundLabel: bankId === "kindergarten"
      ? "1-2关"
      : bankId === "elementary-lower"
        ? "3-4关"
        : bankId === "elementary-upper"
          ? "第5关"
          : "第6关"
  }));
}

function getGradeTrackState(round = roundIndex, modeKey = activeMode) {
  const steps = getAutoGradeSteps();
  const resolvedBankId = resolveSelectedVocabId(selectedVocabId, round, modeKey);
  const currentIndex = steps.findIndex((step) => step.bankId === resolvedBankId);
  const mode = isAutoVocabEnabled() ? "auto" : "manual";
  const visible = isWordMode(modeKey) && steps.length >= 2 && currentIndex >= 0;
  return {
    visible,
    mode,
    currentLabel: currentIndex >= 0 ? `${mode === "auto" ? "当前" : "固定"}：${vocabOptionLabel(resolvedBankId)}` : "",
    kicker: mode === "auto" ? "分级闯关" : "固定词库",
    steps: steps.map((step, index) => {
      let status = "todo";
      if (mode === "auto") {
        status = index < currentIndex ? "done" : (index === currentIndex ? "active" : "todo");
      } else if (index === currentIndex) {
        status = "active";
      }
      return {
        ...step,
        status
      };
    })
  };
}

function renderGradeTrack(round = roundIndex) {
  const trackState = getGradeTrackState(round, activeMode);
  [gradeTrack, overlayGradeTrack].forEach((panel) => {
    if (!panel) return;
    panel.classList.toggle("is-hidden", !trackState.visible);
    panel.setAttribute("aria-hidden", trackState.visible ? "false" : "true");
    panel.dataset.mode = trackState.mode;
    if (!trackState.visible) {
      panel.innerHTML = "";
      return;
    }
    panel.innerHTML = `
      <div class="grade-track-head">
        <span class="grade-track-kicker">${trackState.kicker}</span>
        <span class="grade-track-current" data-grade-current>${trackState.currentLabel}</span>
      </div>
      <div class="grade-track-rail">
        ${trackState.steps.map((step) => `
          <div class="grade-step ${step.status === "active" ? "is-active" : ""}" data-grade-step data-grade-bank="${step.bankId}" data-grade-status="${step.status}">
            <span class="grade-step-star">${step.status === "done" ? "★" : (step.status === "active" ? "⭐" : "☆")}</span>
            <span class="grade-step-label">${step.label}</span>
            <span class="grade-step-round">${step.roundLabel}</span>
          </div>
        `).join("")}
      </div>
    `;
  });
}

function getPinyinTierConfig(tier = activePinyinTier) {
  return PINYIN_TIERS[tier] || PINYIN_TIERS.single;
}

function updatePinyinTierControls() {
  const isVisible = activeMode === "pinyin" && getVocabBank(activeVocabId)?.kind === "pinyin";
  pinyinTierPanel?.classList.toggle("is-hidden", !isVisible);
  pinyinTierPanel?.setAttribute("aria-hidden", isVisible ? "false" : "true");
  Array.from(pinyinTierTabs?.querySelectorAll("[data-pinyin-tier]") || []).forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.pinyinTier === activePinyinTier);
  });
}

function setActivePinyinTier(tier) {
  activePinyinTier = PINYIN_TIERS[tier] ? tier : "single";
  updatePinyinTierControls();
}

function getMathGuide(modeKey = activeMode) {
  return MATH_GUIDE_OPTIONS[modeKey] || null;
}

function isMathSupportAllowed(cardId, modeKey = activeMode) {
  const card = MATH_SUPPORT_CARDS[cardId];
  return Boolean(card && card.stages.includes(modeKey));
}

function normalizeMathSupportSelection(cardId, modeKey = activeMode) {
  if (isMathSupportAllowed(cardId, modeKey)) return cardId;
  return "none";
}

function updateMathGuidePanel() {
  const guide = getMathGuide(activeMode);
  const visible = Boolean(guide);
  mathGuidePanel?.classList.toggle("is-hidden", !visible);
  mathGuidePanel?.setAttribute("aria-hidden", visible ? "false" : "true");
  if (!visible) return;
  mathGuideTitle.textContent = GAME_MODES[activeMode]?.label || "数学";
  mathGuideFit.textContent = guide.fit;
  mathGuideReason.textContent = guide.reason;
  mathGuideRules.innerHTML = guide.rules.map((item) => `<span class="math-guide-rule">${item}</span>`).join("");
}

function updateMathSupportControls() {
  const visible = isMathMode(activeMode);
  mathSupportPanel?.classList.toggle("is-hidden", !visible);
  mathSupportPanel?.setAttribute("aria-hidden", visible ? "false" : "true");
  if (!visible) return;
  selectedMathSupportId = normalizeMathSupportSelection(selectedMathSupportId, activeMode);
  Array.from(mathSupportTabs?.querySelectorAll("[data-math-support]") || []).forEach((button) => {
    const cardId = button.dataset.mathSupport || "none";
    const allowed = isMathSupportAllowed(cardId, activeMode);
    button.hidden = !allowed;
    button.disabled = !allowed;
    button.classList.toggle("is-selected", selectedMathSupportId === cardId);
  });
}

function normalizeVocabBankTasks(bank) {
  if (!bank || !Array.isArray(bank.words)) return [];
  const fallbackBankKey = bank.kind === "pinyin" ? "pinyin" : "words";
  const fallbackImage = "../../../../assets/learn/english-vocab/minecraft-card.webp";
  return bank.words
    .map((task) => ({
      ...task,
      target: String(task.target || "").trim().toLowerCase(),
      image: !String(task.image || "").trim()
        ? fallbackImage
        : normalizeWordCardImage(task.image),
      bankKey: task.bankKey || fallbackBankKey
    }))
    .filter((task) => task.target);
}

function dedupeTasks(tasks) {
  const merged = [];
  const seenIds = new Set();
  tasks.forEach((task) => {
    const taskId = String(task?.id || taskAnswer(task) || "");
    if (!taskId || seenIds.has(taskId)) return;
    seenIds.add(taskId);
    merged.push(task);
  });
  return merged;
}

function buildWordTaskPool(primaryBank) {
  return dedupeTasks(normalizeVocabBankTasks(primaryBank));
}

function installVocabBankTasks(bank) {
  TASK_BANKS.words = [...BASE_WORD_TASKS];
  TASK_BANKS.pinyin = [...BASE_PINYIN_TASKS];
  if (!bank) return;
  const tasks = normalizeVocabBankTasks(bank);
  if (!tasks.length) return;
  if (bank.kind === "pinyin") {
    TASK_BANKS.pinyin = tasks;
    return;
  }
  TASK_BANKS.words = buildWordTaskPool(bank);
}

function updateVocabSelect() {
  if (!vocabSelect) return;
  if (!vocabSelect.options.length) {
    const optionMarkup = [];
    if (AUTO_GRADED_DEFAULT_ENABLED) {
      optionMarkup.push(`<option value="${AUTO_GRADED_VOCAB_ID}">${vocabOptionLabel(AUTO_GRADED_VOCAB_ID)}</option>`);
    }
    vocabSelect.innerHTML = optionMarkup.concat(
      VOCAB_BANKS.map((bank) => `<option value="${bank.id}">${vocabOptionLabel(bank.id)}</option>`)
    ).join("");
  }
  vocabSelect.value = selectedVocabId;
  if (vocabLabel) {
    vocabLabel.textContent = activeVocabId ? `词库：${currentVocabLabel()}` : "词库";
  }
}

function applyVocabBank(vocabId) {
  const requestedVocabId = vocabId === AUTO_GRADED_VOCAB_ID
    ? AUTO_GRADED_VOCAB_ID
    : (getVocabBank(vocabId)?.id || "");
  if (!requestedVocabId) return;
  selectedVocabId = requestedVocabId;
  const bank = syncActiveVocabBank(state === "playing" ? roundIndex : 1);
  if (!bank) return;

  if (bank.kind === "pinyin") {
    activeMode = "pinyin";
  } else if (activeMode === "pinyin") {
    activeMode = audioManifest.defaultMode;
  }

  availableTasks = getTasksForMode(activeMode);
  if (!availableTasks.length) {
    activeMode = bank.kind === "pinyin" ? "pinyin" : audioManifest.defaultMode;
    availableTasks = getTasksForMode(activeMode);
  }

  updateVocabSelect();
  renderGradeTrack(state === "playing" ? roundIndex : 1);
  updatePinyinTierControls();
  if (state === "playing") {
    spawnTask();
    return;
  }
  renderMenu();
  pulseMenuSummary();
}

function getTasksForMode(modeKey) {
  if (isMathMode(modeKey)) {
    return ENEMY_ROLES.map((_, index) => buildMathTask(index, modeKey));
  }
  const mode = GAME_MODES[modeKey] || GAME_MODES.words;
  let tasks = mode.banks.flatMap((bank) => TASK_BANKS[bank].map((task) => ({ ...task, bankKey: bank })));
  if (modeKey === "pinyin") {
    tasks = tasks.filter((task) => (task.pinyinTier || "single") === activePinyinTier);
  }
  return tasks;
}

function isWordTask(task) {
  return Boolean(task && task.bankKey === "words");
}

function isWordMode(modeKey) {
  return modeKey === "words";
}

function slugAudioPart(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function taskAudioPath(task) {
  if (task?.bankKey === "math" || task?.taskType === "math") return "";
  if (task?.bankKey === "pinyin" || task?.taskType === "pinyin") return "";
  if (task.audio) return task.audio;
  return `../assets/generated/audio/task_${task.bankKey}_${slugAudioPart(task.target)}.mp3`;
}

function wordCardSrcFor(task) {
  if (!isWordTask(task)) return "";
  return normalizeWordCardImage(task.image) || LOCAL_WORD_CARD_ASSETS[task.target] || "../../../../assets/learn/english-vocab/minecraft-card.webp";
}

function taskTranslation(task) {
  const direct = String(task?.translation || "").trim();
  if (direct) return direct;
  const hint = String(task?.hint || "").trim();
  const target = String(task?.target || "").trim();
  if (hint && target && hint.toLowerCase().endsWith(` ${target.toLowerCase()}`)) {
    return hint.slice(0, hint.length - target.length).trim();
  }
  return "";
}

function taskPromptVoiceText(task) {
  if (!task) return "";
  const modeKey = String(task.bankKey || task.taskType || "").toLowerCase();
  if (modeKey !== "pinyin") return "";
  return String(task.prompt || task.chinese || "").trim();
}

function taskCanListen(task) {
  return Boolean(taskAudioPath(task) || taskPromptVoiceText(task) || taskTranslation(task));
}

function progressMarkupFor(task, isActive = false) {
  if (!isWordTask(task)) return "";
  const answer = taskAnswer(task);
  const activeDone = isActive ? answer.slice(0, typed.length) : "";
  const activeTodo = isActive ? answer.slice(typed.length) : answer;
  return `<span class="done">${activeDone}</span><span class="todo">${activeTodo}</span>`;
}

function wordCardStatusMarkup(enemy) {
  const isActive = enemy.id === activeEnemyId;
  const statusText = isActive ? "正在打" : "点卡切换";
  return `<div class="word-card-status">${statusText}</div>`;
}

function wordCardVoiceMarkup(enemy) {
  return `<button class="word-card-voice" type="button" data-voice-card="${enemy.id}" aria-label="听一听 ${enemy.answer}"><span class="word-card-voice-glyph" aria-hidden="true"></span><span class="word-card-voice-wave word-card-voice-wave-a" aria-hidden="true"></span><span class="word-card-voice-wave word-card-voice-wave-b" aria-hidden="true"></span></button>`;
}

function renderWordCardDeck() {
  if (!wordCardDeck) return;
  if (!isWordTask(currentTask) || !activeEnemies.length) {
    wordCardDeck.innerHTML = "";
    return;
  }
  wordCardDeck.innerHTML = activeEnemies.map((enemy) => {
    const src = wordCardSrcFor(enemy.task);
    const translation = taskTranslation(enemy.task);
    const classes = [
      "word-card-item",
      `enemy-role-${enemy.role}`,
      enemy.id === activeEnemyId ? "is-active" : "",
      typed && enemy.answer.startsWith(typed) ? "is-matched" : ""
    ].filter(Boolean).join(" ");
    return `
      <article class="${classes}" data-enemy-card="${enemy.id}" data-enemy-role="${enemy.role}" data-answer="${enemy.answer}" tabindex="0" role="button" aria-label="切换到 ${enemy.answer}">
        <img class="word-card-image" src="${src}" alt="${enemy.task.hint || enemy.answer}">
        <div class="word-card-copy">
          <div class="word-card-topline">
            <div class="word-card-label">${enemy.answer}</div>
            ${wordCardVoiceMarkup(enemy)}
          </div>
          <div class="word-card-translation">${translation}</div>
          ${wordCardStatusMarkup(enemy)}
          <div class="word-card-progress">${progressMarkupFor(enemy.task, enemy.id === activeEnemyId)}</div>
        </div>
      </article>
    `;
  }).join("");
}

function updateWordCard(task) {
  const src = wordCardSrcFor(task);
  const isVisible = isWordTask(task);
  wordCardPanel.classList.toggle("is-hidden", !isVisible);
  wordCardPanel.setAttribute("aria-hidden", isVisible ? "false" : "true");
  if (!isVisible) {
    if (wordCardDeck) wordCardDeck.innerHTML = "";
    wordCardImage.removeAttribute("src");
    wordCardImage.dataset.src = "";
    wordCardImage.alt = "";
    wordCardLabel.textContent = "";
    progressWord.textContent = "";
    return;
  }
  if (src) {
    setImage(wordCardImage, src);
  } else {
    wordCardImage.removeAttribute("src");
    wordCardImage.dataset.src = "";
  }
  wordCardImage.alt = task.hint;
  wordCardLabel.textContent = task.target;
  renderWordCardDeck();
}

function renderProgressWord() {
  renderPromptHint(currentTask);
  renderTypeBoxDisplay();
  if (!isWordTask(currentTask)) {
    progressWord.textContent = "";
    renderWordCardDeck();
    return;
  }
  const done = currentTask.target.slice(0, typed.length);
  const todo = currentTask.target.slice(typed.length);
  progressWord.innerHTML = `<span class="done">${done}</span><span class="todo">${todo}</span>`;
  renderWordCardDeck();
}

function playTaskTranslationVoice(task, eventName) {
  const translation = taskTranslation(task);
  if (translation) {
    playTextVoice(translation, "zh-CN", eventName, TEST_MODE ? 0 : 520);
  }
}

function primeAudioAsset(src) {
  if (!src) return null;
  if (!audioCache.has(src)) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audioCache.set(src, audio);
  }
  return audioCache.get(src);
}

function playBufferedAudio(src, eventName, options = {}) {
  rememberSoundEvent(eventName);
  if (TEST_MODE || !src) return;
  try {
    const base = primeAudioAsset(src);
    if (!base) return;
    const player = base.cloneNode(true);
    player.volume = options.volume ?? 1;
    void player.play().catch(() => {
      if (typeof options.fallback === "function") options.fallback();
    });
  } catch {
    if (typeof options.fallback === "function") options.fallback();
  }
}

function playCue(name, eventName = `voice:${name}`) {
  playBufferedAudio(audioManifest.cues[name], eventName);
}

function playTextVoice(text, lang, eventName, delay = 0) {
  const value = String(text || "").trim();
  if (!value) return;
  rememberSoundEvent(eventName);
  if (TEST_MODE) return;
  clearTimeout(translationVoiceTimer);
  translationVoiceTimer = setTimeout(() => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") return;
    try {
      const utterance = new SpeechSynthesisUtterance(value);
      utterance.lang = lang;
      utterance.rate = lang.startsWith("zh") ? 0.92 : 0.88;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore synthesis failures and keep gameplay moving.
    }
  }, delay);
}

function playCurrentTaskVoice(reason = "task") {
  if (!currentTask) return;
  const audioPath = taskAudioPath(currentTask);
  const eventName = reason === "replay" ? "voice:replay" : "voice:task";
  const promptVoice = taskPromptVoiceText(currentTask);
  if (audioPath) {
    playBufferedAudio(audioPath, eventName, { volume: 0.92 });
    if (promptVoice) {
      playTextVoice(promptVoice, "zh-CN", `${eventName}:zh`, TEST_MODE ? 0 : 140);
    } else {
      playTaskTranslationVoice(currentTask, `${eventName}:zh`);
    }
    return;
  }
  if (promptVoice) {
    playTextVoice(promptVoice, "zh-CN", `${eventName}:zh`, TEST_MODE ? 0 : 120);
    return;
  }
  playTaskTranslationVoice(currentTask, `${eventName}:zh`);
}

function pickTask() {
  const pool = filterRecentTasks(availableTasks);
  if (!pool.length) return currentTask || FALLBACK_WORD_TASKS[0];
  let next = pool[Math.floor(Math.random() * pool.length)];
  if (next === currentTask && pool.length > 1) {
    next = pool.find((task) => task !== currentTask) || next;
  }
  return next;
}

function startGame() {
  state = "playing";
  setUiState("playing");
  overlay.classList.remove("is-result");
  clearTimeout(menuSummaryTimer);
  menuSummaryTimer = 0;
  startSummary?.classList.remove("is-accent");
  overlayStart?.classList.remove("is-accent");
  clearTimeout(rewardMeterTimer);
  rewardMeterTimer = 0;
  clearTimeout(celebrateStageTimer);
  celebrateStageTimer = 0;
  starsMeter?.classList.remove("is-celebrate");
  stage.classList.remove("is-celebrate");
  clearTimeout(pendingExplosionTimer);
  pendingExplosionTimer = 0;
  clearExplosion();
  syncActiveVocabBank(1);
  availableTasks = getTasksForMode(activeMode);
  activeMathSupportId = isMathMode(activeMode)
    ? normalizeMathSupportSelection(selectedMathSupportId, activeMode)
    : "none";
  mathRetryUsed = false;
  const modeSpeed = activeMode === "pinyin" ? getPinyinTierConfig().speed : (GAME_MODES[activeMode] || GAME_MODES.words).speed;
  const supportAdjustedSpeed = activeMathSupportId === "slow_enemy" ? Math.round(modeSpeed * 1.18) : modeSpeed;
  spawnDuration = TEST_MODE ? 700 : supportAdjustedSpeed;
  hp = 3;
  score = 0;
  roundIndex = 1;
  hits = 0;
  misses = 0;
  combo = 0;
  bestCombo = 0;
  lastAttack = "none";
  lastDamageEffect = "none";
  lastCountdownBucket = -1;
  lastLetterFeedback = "none";
  lastMiniArrowCount = 0;
  lastLetterImpactCount = 0;
  lastTargetedEnemyId = "";
  soundEventLog.length = 0;
  recentTaskIds = [];
  lastLostHeart = -1;
  pendingGradeToast = null;
  clearTimeout(roundTimer);
  clearTimeout(sceneToastTimer);
  sceneToastTimer = 0;
  sceneToast?.classList.remove("is-on");
  sceneToast?.setAttribute("aria-hidden", "true");
  if (sceneToast) sceneToast.dataset.variant = "scene";
  overlay.classList.remove("is-open");
  finalStats.hidden = true;
  finalStats.textContent = "";
  startButton.textContent = "重新开始";
  resetArrow();
  applyStageThemeForRound(1);
  updateHud();
  updateGoalChip();
  playCue("start");
  spawnTask();
  typeBox.focus();
  lastTime = performance.now();
  requestAnimationFrame(tick);
}

function spawnTask() {
  clearTimeout(celebrateStageTimer);
  celebrateStageTimer = 0;
  stage.classList.remove("is-celebrate");
  clearTimeout(pendingExplosionTimer);
  pendingExplosionTimer = 0;
  activeEnemies = buildActiveEnemies();
  const firstEnemy = activeEnemies[0];
  currentTask = firstEnemy?.task || pickTask();
  activeEnemyId = firstEnemy?.id || "";
  lastTargetedEnemyId = activeEnemyId;
  typed = "";
  lastKeyFeedback = "";
  progress = 0;
  hitLock = false;
  clearTimeout(roundTimer);
  monsterFrame = -1;
  backupMonsterFrame = -1;
  sideMonsterFrame = -1;
  setImage(monster, ASSETS.creeper.idle);
  setImage(frontCreeperImage, ASSETS.creeper.generatedFar);
  setImage(backupCreeperImage, ASSETS.creeper.generatedFar);
  setImage(sideCreeperImage, ASSETS.creeper.generatedFar);
  setMonsterMode("walking");
  ENEMY_ROLES.forEach((role) => {
    const element = getEnemyElement(role);
    if (element) element.hidden = !getEnemyByRole(role);
  });
  [monsterWrap, backupMonsterWrap, sideMonsterWrap].forEach((element) => {
    element?.classList.remove("is-hit", "is-danger", "is-exploding", "is-step", "is-targeted");
  });
  lastDamageEffect = "none";
  lastCountdownBucket = -1;
  lastLetterFeedback = "none";
  lastMiniArrowCount = 0;
  lastLetterImpactCount = 0;
  resetArrow();
  clearExplosion();
  targetBubble.textContent = "";
  modeBadge.textContent = currentModeDisplayLabel(activeMode);
  renderPromptHint(currentTask);
  typedText.textContent = "";
  updateWordCard(currentTask);
  renderProgressWord();
  renderKeyboard();
  updateEnemyTaskBadges();
  renderGradeTrack(roundIndex);
  particleLayer.innerHTML = "";
  comboRibbon.classList.remove("is-on");
  comboRibbon.textContent = "";
  earnedStarCount = getEarnedStarCount();
  const environmentPack = getRoundEnvironmentPack();
  applyStageThemeForRound(roundIndex);
  updateSceneChip(environmentPack);
  if (pendingGradeToast) {
    showStageToast(pendingGradeToast, true);
    pendingGradeToast = null;
  } else {
    showSceneToast(environmentPack);
  }
  updateHud();
  updateGoalChip();
  placeMonster();
  setActiveEnemy(firstEnemy);
  updateListenButton();
  playCurrentTaskVoice();
  activeEnemies.forEach((enemy) => rememberTaskUsage(enemy.task));
}

function updateHud() {
  scoreEl.textContent = String(score);
  roundCounter.textContent = `第 ${roundIndex}/${ROUND_GOAL} 关`;
  comboCounter.textContent = String(combo);
  comboCounter.classList.toggle("is-hot", combo >= 2);
  hearts.forEach((heart, index) => {
    const nextSrc = index < hp ? ASSETS.ui.heartFull : index === lastLostHeart ? ASSETS.ui.heartCracked : ASSETS.ui.heartEmpty;
    setImage(heart, nextSrc);
  });
  const earnedStars = Math.min(stars.length, Math.floor((hits / ROUND_GOAL) * stars.length));
  stars.forEach((star, index) => {
    setImage(star, index < earnedStars ? ASSETS.ui.starFull : ASSETS.ui.starEmpty);
    if (index < earnedStars && index >= earnedStarCount) {
      pulseRewardStar(star);
    }
  });
  earnedStarCount = earnedStars;
  updateGoalChip();
}

function tick(now) {
  if (state !== "playing") return;
  const dt = Math.min(80, now - lastTime);
  lastTime = now;
  progress += dt / spawnDuration;
  activeEnemies.forEach((enemy) => {
    enemy.recoil = Math.max(0, (enemy.recoil || 0) - dt / 5000);
  });
  placeMonster(now);

  if (progress >= 1 && !hitLock) {
    takeDamage();
  }

  requestAnimationFrame(tick);
}

function placeMonster(now = performance.now()) {
  const eased = progress * progress * (3 - 2 * progress);
  updateStageMotion(eased);
  activeEnemies.forEach((enemy, index) => {
    const enemyEased = getEnemyApproachProgress(enemy, eased);
    const element = getEnemyElement(enemy.role);
    if (!element) return;
    element.hidden = enemyEased <= 0;
    if (element.hidden) return;
    applyCreeperTransform(element, enemyEased, enemy.role);
    const enemyDanger = Math.max(0, (enemyEased - (enemy.role === "front" ? 0.54 : 0.7)) / (enemy.role === "front" ? 0.46 : 0.3));
    element.style.setProperty("--danger-level", enemyDanger.toFixed(3));
    element.classList.toggle("is-danger", enemyDanger > 0.42 && !hitLock);
    updateCreeperVisualAsset(enemyEased, enemy.role);
    if (!hitLock) updateCreeperWalk(now + index * 420, enemyEased, getEnemyRig(enemy.role), enemy.role);
  });
  updateThreatVisuals(eased);
  updateCountdownSound(eased);
  targetBubble.style.opacity = progress > 0.82 ? "0.82" : "1";
  approachFill.style.width = `${Math.min(100, progress * 100)}%`;
}

function getEnemyApproachProgress(enemy, eased) {
  const spawnAt = enemy?.route?.spawnAt || 0;
  const recoil = Math.max(0, Number(enemy?.recoil || 0));
  return Math.max(0, Math.min(1, (eased - spawnAt) / Math.max(0.01, 1 - spawnAt) - recoil));
}

function applyCreeperTransform(element, eased, role) {
  const stageRect = stage.getBoundingClientRect();
  const enemy = getEnemyByRole(role);
  const config = enemy?.route || createEnemyRoute(role);
  const depth = Math.pow(eased, 1.18);
  const pauseDistance = Math.abs(depth - config.pauseAt);
  const pausedDepth = pauseDistance < 0.09
    ? depth - (0.09 - pauseDistance) * config.pauseStrength
    : depth;
  const scale = config.scaleStart + pausedDepth * (config.scaleEnd - config.scaleStart);
  const groundRatio = config.groundStart + pausedDepth * (config.groundEnd - config.groundStart);
  const groundY = stageRect.top + stageRect.height * groundRatio;
  const routeX = depth < 0.5
    ? config.startX + (config.middleX - config.startX) * (depth * 2)
    : config.middleX + (config.endX - config.middleX) * ((depth - 0.5) * 2);
  const laneX = stageRect.left + stageRect.width * (routeX + Math.sin(depth * Math.PI * 2 + config.phase) * config.curve * (0.35 + depth * 0.65));
  const bottom = stageRect.bottom - groundY;
  element.style.left = `${Math.round(laneX - stageRect.left)}px`;
  element.style.bottom = `${Math.round(bottom)}px`;
  element.style.transform = `translateX(-50%) scale(${scale})`;
  element.style.zIndex = String(config.zIndex);
  element.dataset.groundY = String(Math.round(groundY));
  element.dataset.role = role;
  element.dataset.scale = scale.toFixed(3);
  element.dataset.routeX = routeX.toFixed(3);
}

function updateBackupCreeper(now, frontEased) {
  const backupEased = Math.max(0, frontEased * 0.62 - 0.04);
  applyCreeperTransform(backupMonsterWrap, backupEased, "back");
  const backupDanger = Math.max(0, (backupEased - 0.72) / 0.28);
  backupMonsterWrap.style.setProperty("--danger-level", backupDanger.toFixed(3));
  backupMonsterWrap.classList.toggle("is-danger", backupDanger > 0.45);
  setImage(backupCreeperImage, getCreeperAssetForProgress(backupEased, "back"));
}

function updateSideCreeper(now, frontEased) {
  const sideEased = Math.max(0, frontEased * 0.74 - 0.02);
  applyCreeperTransform(sideMonsterWrap, sideEased, "side");
  const sideDanger = Math.max(0, (sideEased - 0.76) / 0.24);
  sideMonsterWrap.style.setProperty("--danger-level", sideDanger.toFixed(3));
  sideMonsterWrap.classList.toggle("is-danger", sideDanger > 0.42);
  setImage(sideCreeperImage, getCreeperAssetForProgress(sideEased, "side"));
}

function updateThreatVisuals(eased) {
  dangerLevel = Math.max(0, Math.min(1, (eased - 0.5) / 0.5));
  activeEnemies.forEach((enemy) => {
    const element = getEnemyElement(enemy.role);
    if (!element) return;
    const level = enemy.role === "front"
      ? dangerLevel
      : Number(element.style.getPropertyValue("--danger-level") || 0);
    element.style.setProperty("--danger-level", Number(level).toFixed(3));
    element.classList.toggle("is-danger", level > 0.18 && !hitLock);
  });
}

function getCreeperAssetForProgress(eased, role = "front") {
  if (role === "front" && dangerLevel > 0.66 && !hitLock) return ASSETS.creeper.generatedDanger;
  if (eased > 0.82) return ASSETS.creeper.generatedDanger;
  if (eased > 0.54) return ASSETS.creeper.generatedNear;
  if (eased > 0.25) return ASSETS.creeper.generatedMid;
  return ASSETS.creeper.generatedFar;
}

function updateCreeperVisualAsset(eased, role = "front") {
  const image = getEnemyImage(role);
  if (!image) return;
  setImage(image, getCreeperAssetForProgress(eased, role));
}

function updateCountdownSound(eased) {
  if (hitLock || eased < 0.68) return;
  const bucket = Math.min(3, Math.floor((eased - 0.68) / 0.1));
  if (bucket !== lastCountdownBucket) {
    lastCountdownBucket = bucket;
    playCountdownTick(bucket);
  }
}

function updateCreeperWalk(now, eased, rig = creeperRig, role = "front") {
  const image = getEnemyImage(role);
  const enemy = getEnemyByRole(role);
  const gait = enemy?.gait || createEnemyGait(role, 0);
  const isDangerFrame = eased > 0.84 || (role === "front" && dangerLevel > 0.72);
  const paceBoost = isDangerFrame ? 1.06 : 1;
  const cycleSpeed = (0.002 + eased * 0.00135) * gait.pace * paceBoost;
  const nextFrame = Math.floor((now * cycleSpeed) + gait.frameOffset) % ASSETS.creeper.walk.length;
  if (!hitLock && !isDangerFrame) {
    const nextSrc = ASSETS.creeper.walk[nextFrame];
    if (role === "front" && (nextFrame !== monsterFrame || image.dataset.src !== nextSrc)) {
      monsterFrame = nextFrame;
      setImage(image, nextSrc);
    } else if (role === "side" && (nextFrame !== sideMonsterFrame || image.dataset.src !== nextSrc)) {
      sideMonsterFrame = nextFrame;
      setImage(image, nextSrc);
    } else if (role === "back" && (nextFrame !== backupMonsterFrame || image.dataset.src !== nextSrc)) {
      backupMonsterFrame = nextFrame;
      setImage(image, nextSrc);
    }
  }

  if (reduceMotion) {
    rig.style.setProperty("--front-step", "0px");
    rig.style.setProperty("--back-step", "0px");
    rig.style.setProperty("--body-bob", "0px");
    rig.style.setProperty("--body-lean", "0deg");
    return;
  }

  const speed = (0.0059 + eased * 0.0032) * gait.pace * paceBoost;
  const walkPrimary = Math.sin(now * speed + gait.phase);
  const walkSecondary = Math.sin(now * speed * 0.53 + gait.swayPhase) * 0.32;
  const walk = (walkPrimary * 0.78) + walkSecondary;
  const counterWalk = (Math.sin(now * speed + gait.phase + Math.PI * 0.94) * 0.82)
    + (Math.sin(now * speed * 0.48 + gait.swayPhase + 1.2) * 0.18);
  const footAmp = (7 + eased * 4.6) * gait.step;
  const bob = -((Math.abs(walkPrimary) * 2.4) + (Math.abs(walkSecondary) * 1.4)) * gait.bob;
  const lean = ((walkPrimary * 1.05) + (walkSecondary * 0.7)) * gait.lean;
  image.style.setProperty("--image-bob", `${Math.round(bob * (role === "front" ? 0.72 : 0.62))}px`);
  image.style.setProperty("--image-lean", `${(lean * (role === "front" ? 0.55 : 0.42)).toFixed(2)}deg`);
  rig.style.setProperty("--front-step", `${Math.round(walk * footAmp)}px`);
  rig.style.setProperty("--back-step", `${Math.round(counterWalk * footAmp)}px`);
  rig.style.setProperty("--body-bob", `${Math.round(bob)}px`);
  rig.style.setProperty("--body-lean", `${lean.toFixed(2)}deg`);
}

function handleKey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;

  if ((state === "win" || state === "over") && overlay.classList.contains("is-open")) {
    if (event.key === "Enter" || event.key === " ") {
      triggerRewardAction(getDefaultRewardAction());
      event.preventDefault();
    }
    return;
  }

  if (state !== "playing") return;

  if (event.key === "Backspace") {
    typed = typed.slice(0, -1);
    const matches = findMatchingEnemies(typed);
    setActiveEnemy(matches[0] || activeEnemies[0]);
    typedText.textContent = typed;
    renderProgressWord();
    renderKeyboard();
    updateEnemyTaskBadges();
    event.preventDefault();
    return;
  }

  if (event.key === "Enter") {
    checkFullInput();
    event.preventDefault();
    return;
  }

  if (!/^[a-zA-Z0-9]$/.test(event.key)) return;
  inputCharacter(event.key);
  event.preventDefault();
}

function inputCharacter(rawKey) {
  if (state !== "playing") return;
  const key = String(rawKey || "").toLowerCase();
  if (!/^[a-z0-9]$/.test(key)) return;

  const nextTyped = typed + key;
  let nextValue = nextTyped;
  let matches = findMatchingEnemies(nextTyped);
  if (!matches.length && typed) {
    const retargetMatches = findMatchingEnemies(key);
    if (retargetMatches.length) {
      nextValue = key;
      matches = retargetMatches;
    }
  }
  if (!matches.length) {
    wrongNudge();
    return;
  }

  typed = nextValue;
  lastKeyFeedback = key;
  const preferred = matches.find((enemy) => enemy.id === activeEnemyId) || matches[0];
  setActiveEnemy(preferred);
  typedText.textContent = typed;
  renderProgressWord();
  renderKeyboard();
  updateEnemyTaskBadges();

  if (typed !== currentTask.target) {
    handleLetterStep();
  }

  checkFullInput();
}

function renderKeyboard() {
  if (!keyboard) return;
  const rows = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
  const expectedKey = currentTask?.target?.[typed.length] || "";
  const doneKeys = new Set(String(typed || "").split(""));
  keyboard.innerHTML = rows.map((row, rowIndex) => {
    const rowClass = rowIndex === 0 ? " keyboard-row-numbers" : "";
    const buttons = row.split("").map((key) => {
      const classes = [
        "key-button",
        expectedKey === key ? "is-target" : "",
        doneKeys.has(key) ? "is-done" : "",
        lastKeyFeedback === key ? "is-pressed" : ""
      ].filter(Boolean).join(" ");
      return `<button class="${classes}" type="button" data-key="${key}" aria-label="${key}">${key}</button>`;
    }).join("");
    return `<div class="keyboard-row${rowClass}">${buttons}</div>`;
  }).join("");
}

function resetArrow() {
  arrow.classList.remove("is-flying");
  arrow.style.setProperty("--arrow-x", "0px");
  arrow.style.setProperty("--arrow-y", "0px");
  arrow.style.setProperty("--arrow-angle", "-90deg");
  arrow.style.setProperty("--arrow-angle-deg", "-90");
  arrowLauncher.style.setProperty("--aim-angle-deg", "0");
  resetBow();
}

function updateArrowPath(targetElement = monsterWrap) {
  const launcherRect = arrowLauncher.getBoundingClientRect();
  const monsterRect = targetElement.getBoundingClientRect();
  const laneRect = arrowLane.getBoundingClientRect();
  const startX = launcherRect.left + launcherRect.width / 2 - laneRect.left;
  const startY = launcherRect.top + launcherRect.height / 2 - laneRect.top;
  const endX = monsterRect.left + monsterRect.width / 2 - laneRect.left;
  const endY = monsterRect.top + monsterRect.height * 0.48 - laneRect.top;
  const dx = endX - startX;
  const dy = endY - startY;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  arrow.style.left = `${startX}px`;
  arrow.style.top = `${startY}px`;
  arrow.style.setProperty("--arrow-x", `${Math.round(dx)}px`);
  arrow.style.setProperty("--arrow-y", `${Math.round(dy)}px`);
  arrow.style.setProperty("--arrow-angle", `${angle.toFixed(1)}deg`);
  arrow.style.setProperty("--arrow-angle-deg", `${angle.toFixed(1)}`);
  arrowLauncher.style.setProperty("--aim-angle-deg", `${Math.max(-44, Math.min(44, angle + 90)).toFixed(1)}`);
}

function fireArrow(targetEnemy, onHit) {
  lastAttack = "arrow";
  resetArrow();
  setBowState(ASSETS.weapon.bowRelease, TEST_MODE ? 100 : 720);
  updateArrowPath(getEnemyElement(targetEnemy?.role || "front"));
  void arrow.offsetWidth;
  arrow.classList.add("is-flying");
  const hitDelay = TEST_MODE ? 55 : 620;
  setTimeout(onHit, hitDelay);
}

function checkFullInput() {
  const exactEnemy = activeEnemies.find((enemy) => enemy.answer === typed);
  if (exactEnemy) {
    setActiveEnemy(exactEnemy);
    hitMonster(exactEnemy);
  }
}

function handleLetterStep() {
  lastLetterFeedback = "step";
  setBowState(ASSETS.weapon.bowDraw, TEST_MODE ? 80 : 190);
  pulseLetterStep();
  spawnMiniArrow();
  spawnLetterImpact();
  applyLetterRecoil(getActiveEnemy());
  playLetterStep();
}

function applyLetterRecoil(targetEnemy = getActiveEnemy()) {
  if (!targetEnemy) return;
  targetEnemy.recoil = Math.min(0.16, (targetEnemy.recoil || 0) + 0.055);
  getEnemyElement(targetEnemy.role)?.classList.add("is-step");
}

function spawnMiniArrow() {
  const launcherRect = arrowLauncher.getBoundingClientRect();
  const targetEnemy = getActiveEnemy();
  const targetElement = getEnemyElement(targetEnemy?.role || "front");
  const monsterRect = targetElement.getBoundingClientRect();
  const laneRect = arrowLane.getBoundingClientRect();
  const startX = launcherRect.left + launcherRect.width / 2 - laneRect.left;
  const startY = launcherRect.top + launcherRect.height / 2 - laneRect.top;
  const endX = monsterRect.left + monsterRect.width / 2 - laneRect.left;
  const endY = monsterRect.top + monsterRect.height * 0.6 - laneRect.top;
  const dx = endX - startX;
  const dy = endY - startY;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const miniArrow = document.createElement("span");
  miniArrow.className = "mini-arrow";
  miniArrow.style.left = `${startX}px`;
  miniArrow.style.top = `${startY}px`;
  miniArrow.style.setProperty("--mini-arrow-x", `${Math.round(dx)}px`);
  miniArrow.style.setProperty("--mini-arrow-y", `${Math.round(dy)}px`);
  miniArrow.style.setProperty("--mini-arrow-angle", `${angle.toFixed(1)}deg`);
  arrowLane.appendChild(miniArrow);
  lastMiniArrowCount += 1;
  miniArrow.addEventListener("animationend", () => miniArrow.remove());
}

function spawnLetterImpact() {
  const targetEnemy = getActiveEnemy();
  const targetElement = getEnemyElement(targetEnemy?.role || "front");
  const monsterRect = targetElement.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const letterIndex = Math.max(0, Math.min(typed.length - 1, currentTask.target.length - 1));
  const impact = document.createElement("span");
  impact.className = "letter-impact";
  impact.dataset.letter = currentTask.target[letterIndex] || "";
  impact.style.left = `${monsterRect.left + monsterRect.width / 2 - stageRect.left}px`;
  impact.style.top = `${monsterRect.top + monsterRect.height * 0.58 - stageRect.top}px`;
  particleLayer.appendChild(impact);
  lastLetterImpactCount += 1;
  impact.addEventListener("animationend", () => impact.remove());
}

function pulseLetterStep() {
  targetBubble.classList.remove("is-step");
  arrowLauncher.classList.remove("is-step");
  const targetElement = getEnemyElement(getActiveEnemy()?.role || "front");
  targetElement.classList.remove("is-step");
  void targetBubble.offsetWidth;
  targetBubble.classList.add("is-step");
  arrowLauncher.classList.add("is-step");
  targetElement.classList.add("is-step");
  setTimeout(() => {
    targetBubble.classList.remove("is-step");
    arrowLauncher.classList.remove("is-step");
    targetElement.classList.remove("is-step");
  }, TEST_MODE ? 80 : 160);
}

function hitMonster(targetEnemy = getActiveEnemy()) {
  if (hitLock) return;
  hitLock = true;
  lastLetterFeedback = "finish";
  const earnedStarsBeforeHit = getEarnedStarCount();
  combo += 1;
  bestCombo = Math.max(bestCombo, combo);
  if (combo > 0 && combo % 3 === 0) triggerComboBurst(targetEnemy);
  hits += 1;
  const reward = 10 + Math.min(10, (combo - 1) * 2);
  score += reward;
  postHostEvent("reward", {
    points: reward,
    score,
    hits,
    misses,
    combo,
    bestCombo,
    roundIndex,
    roundGoal: ROUND_GOAL,
    hp,
    mode: activeMode,
    vocabId: activeVocabId,
    earnedStarsBeforeHit,
    earnedStarsAfterHit: getEarnedStarCount()
  });
  updateHud();
  const earnedStarsAfterHit = getEarnedStarCount();
  const gainedStars = Math.max(0, earnedStarsAfterHit - earnedStarsBeforeHit);
  updateGoalChip(true);
  pulseRewardsMeter();
  pulseCelebrateStage();
  pulseTypeBoxSuccess();
  showComboRibbon(combo, reward);
  getEnemyElement(targetEnemy?.role || "front").classList.add("is-hit");
  fireArrow(targetEnemy, () => {
    explodeCreeper("hit", targetEnemy);
    spawnCelebrationStars(getEnemyElement(targetEnemy?.role || "front"), gainedStars);
    showFloat(
      `+${reward} 金币`,
      gainedStars > 0
        ? `拿到第 ${earnedStarsAfterHit} 颗星`
        : (hits >= ROUND_GOAL ? "这一轮打满啦" : `还差 ${Math.max(0, ROUND_GOAL - hits)} 只过关`),
      "reward"
    );
  });
  playTone(620, 0.08, "square");
  completeRound(true, HIT_DELAY);
}

function triggerComboBurst(sourceEnemy) {
  activeEnemies.forEach((enemy) => {
    if (enemy.id === sourceEnemy?.id || enemy.state === "exploding") return;
    enemy.recoil = Math.min(0.2, (enemy.recoil || 0) + 0.12);
    getEnemyElement(enemy.role)?.classList.add("is-step");
  });
  lastLetterFeedback = "burst";
  showFloat("穿透箭", "连击蓄力击退附近苦力怕", "reward");
}

function takeDamage() {
  hitLock = true;
  lastLetterFeedback = "damage";
  if (isMathMode(activeMode) && activeMathSupportId === "retry_once" && !mathRetryUsed) {
    mathRetryUsed = true;
    misses += 1;
    combo = 0;
    updateHud();
    updateGoalChip(true);
    progress = 1;
    placeMonster();
    explodeCreeper("damage", getActiveEnemy());
    stage.classList.add("is-damage");
    showFloat("辅助卡触发", "这次不掉心", "reward");
    hideComboRibbon();
    playTone(180, 0.1, "triangle");
    setTimeout(() => {
      stage.classList.remove("is-damage");
      completeRound(false, TEST_MODE ? 260 : 520);
    }, DAMAGE_DELAY);
    return;
  }
  hp -= 1;
  misses += 1;
  combo = 0;
  lastLostHeart = hp;
  updateHud();
  updateGoalChip(true);
  progress = 1;
  placeMonster();
  explodeCreeper("damage", getActiveEnemy());
  stage.classList.add("is-damage");
  showFloat("小心 -1", hp > 0 ? `还剩 ${hp} 颗心` : "这局先休息一下", "danger");
  hideComboRibbon();
  playTone(120, 0.12, "sawtooth");
  setTimeout(() => {
    lastLostHeart = -1;
    updateHud();
    stage.classList.remove("is-damage");
    if (hp <= 0) {
      endGame(false);
    } else {
      completeRound(false, TEST_MODE ? 260 : 520);
    }
  }, DAMAGE_DELAY);
}

function explodeCreeper(reason = "damage", targetEnemy = getActiveEnemy()) {
  const isHit = reason === "hit";
  const targetElement = getEnemyElement(targetEnemy?.role || "front");
  const targetImage = getEnemyImage(targetEnemy?.role || "front");
  clearTimeout(pendingExplosionTimer);
  pendingExplosionTimer = 0;
  lastDamageEffect = isHit ? "hitExplosion" : "explosion";
  targetElement.classList.add("is-danger");
  if (!isHit) {
    targetElement.classList.add("is-exploding");
  }
  targetElement.style.setProperty("--danger-level", "1");
  setImage(targetImage, isHit ? ASSETS.creeper.hitReaction : ASSETS.creeper.generatedDanger);
  setImage(monster, ASSETS.creeper.attack);
  setMonsterMode("pose");
  showImpact(targetElement);
  if (isHit) {
    burstParticles(18, targetElement);
    pendingExplosionTimer = setTimeout(() => {
      showExplosion(targetElement);
      burstParticles(52, targetElement);
      playExplosionSound();
      pendingExplosionTimer = 0;
    }, HIT_REACTION_DELAY);
    return;
  }
  showExplosion(targetElement);
  burstParticles(52, targetElement);
  playExplosionSound();
}

function completeRound(success, delay = 900) {
  clearTimeout(roundTimer);
  roundTimer = setTimeout(() => {
    if (state !== "playing") return;
    if (roundIndex >= ROUND_GOAL) {
      endGame(true);
      return;
    }
    roundIndex += 1;
    if (isAutoVocabEnabled() && isWordMode(activeMode)) {
      const previousVocabId = activeVocabId;
      syncActiveVocabBank(roundIndex);
      availableTasks = getTasksForMode(activeMode);
      if (activeVocabId !== previousVocabId) {
        pendingGradeToast = buildGradeToast(activeVocabId);
        playGradeUpSound();
      }
    }
    spawnTask();
  }, delay);
}

function endGame(won = false) {
  state = won ? "win" : "over";
  setUiState("result");
  clearTimeout(roundTimer);
  startButton.textContent = "再来一局";
  overlayTitle.textContent = won ? "通关成功" : "再来一局";
  overlayText.textContent = won ? "宝箱打开了，这一轮收获完成。" : "还差一点点，整理好键盘再挑战。";
  finalStats.hidden = false;
  renderFinalStats(won);
  overlayStart.hidden = true;
  overlayStart.textContent = won ? "再闯一局" : "再试一次";
  overlay.classList.add("is-result");
  overlay.classList.add("is-open");
  updateGoalChip();
  finalStats.querySelector(`[data-reward-action="${getDefaultRewardActionForResult(won)}"]`)?.focus();
  postHostEvent("result", {
    won,
    score,
    hits,
    misses,
    hp,
    combo,
    bestCombo,
    roundIndex,
    roundGoal: ROUND_GOAL,
    mode: activeMode,
    vocabId: activeVocabId,
    earnedStars: getEarnedStarCount()
  });
  playCue(won ? "win" : "lose");
}

function getEarnedStarCount() {
  return Math.min(stars.length, Math.floor((hits / ROUND_GOAL) * stars.length));
}

function renderRewardStars(count) {
  return stars.map((_, index) => {
    const src = index < count ? ASSETS.ui.starFull : ASSETS.ui.starEmpty;
    const label = index < count ? "已获得星星" : "未获得星星";
    return `<img class="final-star" src="${src}" alt="${label}">`;
  }).join("");
}

function nextChallengeHint(won) {
  if (!won) {
    return isWordMode(activeMode)
      ? "先听一听，再慢慢打一轮，下一次会更稳。"
      : "整理一下节奏，再试一次就会更顺手。";
  }
  if (activeMode === "words") {
    if (selectedVocabId === AUTO_GRADED_VOCAB_ID) return "继续分级闯关，把更多年级词汇点亮。";
    return "换到下一个年级词库，再闯一局试试。";
  }
  if (activeMode === "pinyin") return "再试试词语拼音，把两字词也敲熟。";
  if (activeMode === "mathEasy20") return "继续加减起步，再进到 100 以内。";
  if (activeMode === "mathEasy100") return "100 以内稳住后，就可以进乘法启程。";
  if (activeMode === "mathMul") return "继续把乘法和加法过渡题敲熟。";
  return "继续闯下一轮，把更多星星装进宝箱。";
}

function rewardTitle(won, earnedStars) {
  if (won && earnedStars >= 5) return "键盘小勇士";
  if (won && earnedStars >= 3) return "闯关小能手";
  if (won) return "宝箱开启啦";
  if (hits >= 3) return "差一点就成功";
  return "暖机完成啦";
}

function rewardSubtitle(won) {
  const gradeLabel = vocabOptionLabel(activeVocabId);
  if (won) return `这次已经闯到 ${gradeLabel} 词库啦`;
  return `这次练到 ${gradeLabel}，再来一次会更稳`;
}

function renderRewardBadges(earnedStars) {
  const gradeLabel = vocabOptionLabel(activeVocabId);
  return [
    `当前：${gradeLabel}`,
    `星星：${earnedStars}/${stars.length}`,
    `连击：${bestCombo}`
  ].map((text) => `<span class="reward-badge">${text}</span>`).join("");
}

function resultHeroLabel(won, earnedStars) {
  if (won && earnedStars >= stars.length) return "满星通关";
  if (won) return `拿到 ${earnedStars}/${stars.length} 颗星`;
  if (hits >= ROUND_GOAL - 1) return "就差最后一只";
  if (hits >= Math.ceil(ROUND_GOAL / 2)) return `已闯到第 ${Math.min(ROUND_GOAL, hits + 1)} 关`;
  return "今天先热热手";
}

function renderResultTrail(won) {
  const steps = Array.from({ length: ROUND_GOAL }, (_, index) => {
    const cleared = index < hits;
    const isCurrent = !won && index === hits && hits < ROUND_GOAL;
    const classes = [
      "result-step",
      cleared ? "is-cleared" : "",
      isCurrent ? "is-current" : ""
    ].filter(Boolean).join(" ");
    const label = cleared ? "已完成" : (isCurrent ? "当前停在这里" : "未完成");
    return `<span class="${classes}" aria-label="第${index + 1}关 ${label}">${index + 1}</span>`;
  }).join("");
  return `<div class="result-trail" aria-label="本局闯关进度">${steps}</div>`;
}

function getNextWordBankId(currentBankId = activeVocabId) {
  const ordered = ["kindergarten", "elementary-lower", "elementary-upper", "junior-high", "minecraft"]
    .filter((bankId) => VOCAB_BANKS_BY_ID.get(bankId)?.kind === "words");
  const currentIndex = ordered.indexOf(currentBankId);
  if (currentIndex < 0 || currentIndex >= ordered.length - 1) return "";
  return ordered[currentIndex + 1];
}

function getNextChallengeAction(won) {
  if (!won) return null;
  if (activeMode === "words") {
    if (selectedVocabId === AUTO_GRADED_VOCAB_ID) {
      return { action: "next", label: "再闯一轮", mode: "words" };
    }
    const nextBankId = getNextWordBankId(activeVocabId);
    if (nextBankId) {
      return { action: "next-grade", label: `切到${vocabOptionLabel(nextBankId)}`, mode: "words", vocabId: nextBankId };
    }
  }
  if (activeMode === "pinyin" && activePinyinTier === "single") {
    return { action: "next", label: "挑战词语", mode: "pinyin", pinyinTier: "phrase" };
  }
  if (activeMode === "letters") {
    return { action: "next", label: "切到单词", mode: "words" };
  }
  if (activeMode === "mathEasy20") {
    return { action: "next", label: "挑战加减进阶", mode: "mathEasy100" };
  }
  if (activeMode === "mathEasy100") {
    return { action: "next", label: "挑战乘法启程", mode: "mathMul" };
  }
  if (activeMode === "mathMul") {
    return { action: "next", label: "切到年级单词", mode: "words" };
  }
  return null;
}

function renderRewardActions(won) {
  const defaultAction = getDefaultRewardActionForResult(won);
  const actions = [
    { action: "replay", label: won ? "再闯一局" : "再试一次", tone: "primary" }
  ];
  const nextAction = getNextChallengeAction(won);
  if (nextAction) {
    actions.push({ ...nextAction, tone: "secondary" });
  }
  return `
    <div class="reward-actions" data-count="${actions.length}">
      ${actions.map((item) => `
        <button
          type="button"
          class="reward-action reward-action-${item.tone} ${item.action === defaultAction ? "is-default" : ""}"
          data-reward-action="${item.action}"
        >${item.label}</button>
      `).join("")}
    </div>
  `;
}

function getDefaultRewardActionForResult(won) {
  return won && getNextChallengeAction(true)?.action ? getNextChallengeAction(true).action : "replay";
}

function getDefaultRewardAction() {
  return getDefaultRewardActionForResult(state === "win");
}

function triggerRewardAction(action) {
  if (action === "next" || action === "next-grade") {
    const nextAction = getNextChallengeAction(true);
    if (nextAction?.mode) activeMode = nextAction.mode;
    if (nextAction?.pinyinTier) setActivePinyinTier(nextAction.pinyinTier);
    if (nextAction?.vocabId) applyVocabBank(nextAction.vocabId);
    availableTasks = getTasksForMode(activeMode);
  }
  startGame();
}

function renderFinalStats(won) {
  const earnedStars = getEarnedStarCount();
  finalStats.className = `final-stats ${won ? "is-win" : "is-lose"}`;
  finalStats.innerHTML = `
    <div class="result-hero">
      <span class="result-ribbon">${resultHeroLabel(won, earnedStars)}</span>
      ${renderResultTrail(won)}
    </div>
    <div class="reward-chest" aria-hidden="true">
      <span class="reward-chest-lid"></span>
      <span class="reward-chest-box"></span>
      <span class="reward-glow"></span>
    </div>
    <div class="reward-copy">
      <strong class="reward-title">${rewardTitle(won, earnedStars)}</strong>
      <span class="reward-subtitle">${rewardSubtitle(won)}</span>
    </div>
    <div class="reward-badges" aria-label="本局奖励标签">${renderRewardBadges(earnedStars)}</div>
    <div class="final-stars" aria-label="本局星星">${renderRewardStars(earnedStars)}</div>
    <div class="reward-metrics">
      <span><b>${score}</b>金币</span>
      <span><b>${hits}/${ROUND_GOAL}</b>答对</span>
      <span><b>${bestCombo}</b>连击</span>
    </div>
    <div class="reward-nextline">${nextChallengeHint(won)}</div>
    ${renderRewardActions(won)}
  `;
}

function wrongNudge() {
  typeBox.classList.remove("is-wrong");
  void typeBox.offsetWidth;
  typeBox.classList.add("is-wrong");
  playTone(190, 0.05, "square");
}

function burstParticles(count, targetElement = monsterWrap) {
  const rect = targetElement.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const x = rect.left + rect.width / 2 - stageRect.left;
  const y = rect.top + rect.height / 2 - stageRect.top;

  for (let i = 0; i < count; i += 1) {
    const p = document.createElement("img");
    p.className = "particle";
    p.alt = "";
    p.src = i % 5 === 0 ? ASSETS.ui.particleGold : ASSETS.ui.particleGreen;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.setProperty("--dx", `${Math.round((Math.random() - 0.5) * 260)}px`);
    p.style.setProperty("--dy", `${Math.round((Math.random() - 0.7) * 220)}px`);
    p.style.setProperty("--spin", `${Math.round((Math.random() - 0.5) * 320)}deg`);
    particleLayer.appendChild(p);
    p.addEventListener("animationend", () => p.remove());
  }
}

function showImpact(targetElement = monsterWrap) {
  const rect = targetElement.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const flash = document.createElement("img");
  flash.className = "impact-flash";
  flash.alt = "";
  flash.src = ASSETS.ui.impactFlash;
  flash.style.left = `${rect.left + rect.width / 2 - stageRect.left}px`;
  flash.style.top = `${rect.top + rect.height / 2 - stageRect.top}px`;
  particleLayer.appendChild(flash);
  flash.addEventListener("animationend", () => flash.remove());
}

function showExplosion(targetElement = monsterWrap) {
  const rect = targetElement.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const x = rect.left + rect.width / 2 - stageRect.left;
  const y = rect.top + rect.height * 0.55 - stageRect.top;
  clearTimeout(explosionClearTimer);
  explosionLayer.classList.remove("is-on");
  explosionLayer.innerHTML = "";
  explosionLayer.style.left = `${x}px`;
  explosionLayer.style.top = `${y}px`;

  ASSETS.creeper.shockwaves.forEach((src, index) => {
    const wave = document.createElement("img");
    wave.className = "shockwave-frame";
    wave.alt = "";
    wave.src = src;
    wave.style.animationDelay = `${index * 70}ms`;
    wave.style.setProperty("--shockwave-rotate", `${index % 2 === 0 ? -8 : 10}deg`);
    explosionLayer.appendChild(wave);
  });

  ASSETS.creeper.explosionFrames.forEach((src, index) => {
    const frame = document.createElement("img");
    frame.className = "explosion-frame";
    frame.alt = "";
    frame.src = src;
    frame.style.animationDelay = `${index * 80}ms`;
    explosionLayer.appendChild(frame);
  });

  const colors = ["#fff4a8", "#ffe15b", "#ff9a3d", "#f05a3c", "#d83b2f", "#7ed957", "#55b947", "#ffffff"];
  for (let i = 0; i < 32; i += 1) {
    const angle = (Math.PI * 2 * i) / 32 + (Math.random() - 0.5) * 0.24;
    const distance = 82 + Math.random() * 120;
    const piece = document.createElement("span");
    piece.className = "explosion-piece";
    piece.style.setProperty("--dx", `${Math.round(Math.cos(angle) * distance)}px`);
    piece.style.setProperty("--dy", `${Math.round(Math.sin(angle) * distance)}px`);
    piece.style.setProperty("--spin", `${Math.round((Math.random() - 0.5) * 540)}deg`);
    piece.style.setProperty("--size", `${18 + Math.round(Math.random() * 24)}px`);
    piece.style.setProperty("--piece-color", colors[i % colors.length]);
    explosionLayer.appendChild(piece);
  }

  void explosionLayer.offsetWidth;
  explosionLayer.classList.add("is-on");
  explosionClearTimer = setTimeout(clearExplosion, TEST_MODE ? 980 : 1240);
}

function clearExplosion() {
  clearTimeout(explosionClearTimer);
  explosionClearTimer = 0;
  explosionLayer.classList.remove("is-on");
  explosionLayer.innerHTML = "";
}

function showFloat(primary, secondary = "", tone = "reward") {
  floatText.dataset.tone = tone;
  floatText.innerHTML = `<span class="float-text-main">${primary}</span>${secondary ? `<span class="float-text-sub">${secondary}</span>` : ""}`;
  floatText.classList.remove("is-on");
  void floatText.offsetWidth;
  floatText.classList.add("is-on");
}

function pulseRewardsMeter() {
  if (!starsMeter) return;
  clearTimeout(rewardMeterTimer);
  starsMeter.classList.remove("is-celebrate");
  void starsMeter.offsetWidth;
  starsMeter.classList.add("is-celebrate");
  rewardMeterTimer = setTimeout(() => {
    starsMeter.classList.remove("is-celebrate");
    rewardMeterTimer = 0;
  }, TEST_MODE ? 180 : 520);
}

function pulseCelebrateStage() {
  clearTimeout(celebrateStageTimer);
  stage.classList.remove("is-celebrate");
  void stage.offsetWidth;
  stage.classList.add("is-celebrate");
  celebrateStageTimer = setTimeout(() => {
    stage.classList.remove("is-celebrate");
    celebrateStageTimer = 0;
  }, TEST_MODE ? 180 : 360);
}

function spawnCelebrationStars(targetElement = monsterWrap, starGain = 0) {
  const rect = targetElement.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const x = rect.left + rect.width / 2 - stageRect.left;
  const y = rect.top + rect.height * 0.4 - stageRect.top;
  const count = 5 + Math.min(3, Math.max(0, starGain));

  for (let i = 0; i < count; i += 1) {
    const star = document.createElement("img");
    star.className = "celebration-star";
    star.alt = "";
    star.src = i % 3 === 0 ? ASSETS.ui.particleGold : ASSETS.ui.starFull;
    star.style.left = `${x}px`;
    star.style.top = `${y}px`;
    star.style.setProperty("--celebrate-x", `${Math.round((Math.random() - 0.5) * 160)}px`);
    star.style.setProperty("--celebrate-y", `${Math.round(-36 - Math.random() * 110)}px`);
    star.style.setProperty("--celebrate-rotate", `${Math.round((Math.random() - 0.5) * 180)}deg`);
    star.style.animationDelay = `${i * 24}ms`;
    particleLayer.appendChild(star);
    star.addEventListener("animationend", () => star.remove());
  }
}

function applyStageTheme(themeIndex) {
  applyEnvironmentPack(themeIndex);
}

function applyStageThemeForRound(round = roundIndex) {
  const normalizedRound = Math.max(1, Number(round) || 1);
  applyEnvironmentPack(Math.floor((normalizedRound - 1) / getEnvironmentRoundsPerPack()));
}

function applyEnvironmentPack(themeIndex) {
  const pack = getEnvironmentPack(themeIndex);
  activeEnvironmentId = pack.id;
  stage.style.setProperty("--stage-hue", `${pack.hue}deg`);
  stage.style.setProperty("--sky-a", pack.skyA);
  stage.style.setProperty("--sky-b", pack.skyB);
  stage.style.setProperty("--grass-a", pack.grassA);
  stage.style.setProperty("--grass-b", pack.grassB);
  stage.style.setProperty("--stage-background-image", `url("${pack.stageBackground}")`);
  stage.style.setProperty("--stage-background-position-y", pack.stageBackgroundY || "54%");
  stage.style.setProperty("--ground-foreground-image", `url("${pack.groundForeground}")`);
  stage.style.setProperty("--ground-foreground-position-y", pack.groundForegroundY || "100%");
  stage.style.setProperty("--horizon-back-image", `url("${pack.horizonBack}")`);
  stage.style.setProperty("--horizon-back-position-y", pack.horizonBackY || "50%");
  stage.style.setProperty("--horizon-mid-image", `url("${pack.horizonMid}")`);
  stage.style.setProperty("--horizon-mid-position-y", pack.horizonMidY || "50%");
  stage.style.setProperty("--horizon-front-image", `url("${pack.horizonFront}")`);
  stage.style.setProperty("--horizon-front-position-y", pack.horizonFrontY || "50%");
}

function updateStageMotion(eased) {
  const pack = getRoundEnvironmentPack();
  const chase = Math.pow(eased, 1.15);
  const motionConfigs = {
    day: { swayAmp: 1.8, swayFreq: 2.1, back: -10, mid: -26, front: -54, sceneryFar: -22, sceneryNear: -34, foreground: -18, grid: 42, speedLines: 110 },
    dusk: { swayAmp: 2.8, swayFreq: 2.7, back: -14, mid: -34, front: -68, sceneryFar: -30, sceneryNear: -46, foreground: -24, grid: 54, speedLines: 156 },
    overcast: { swayAmp: 3.2, swayFreq: 3.1, back: -18, mid: -42, front: -82, sceneryFar: -38, sceneryNear: -58, foreground: -30, grid: 68, speedLines: 196 }
  };
  const motion = motionConfigs[pack.id] || motionConfigs.day;
  const sway = Math.sin(eased * Math.PI * motion.swayFreq);
  stage.style.setProperty("--horizon-drift-back", `${Math.round((motion.back * chase) + sway * motion.swayAmp)}px`);
  stage.style.setProperty("--horizon-drift-mid", `${Math.round((motion.mid * chase) + sway * (motion.swayAmp + 1.8))}px`);
  stage.style.setProperty("--horizon-drift-front", `${Math.round((motion.front * chase) + sway * (motion.swayAmp + 4.2))}px`);
  stage.style.setProperty("--scenery-drift-far", `${Math.round((motion.sceneryFar * chase) + sway * (motion.swayAmp + 2.2))}px`);
  stage.style.setProperty("--scenery-drift-near", `${Math.round((motion.sceneryNear * chase) + sway * (motion.swayAmp + 5.4))}px`);
  stage.style.setProperty("--foreground-shift", `${Math.round((motion.foreground * chase) + sway * (motion.swayAmp + 1.2))}px`);
  stage.style.setProperty("--ground-grid-shift", `${Math.round(chase * motion.grid)}px`);
  stage.style.setProperty("--ground-speed-lines-shift", `${Math.round(chase * motion.speedLines)}px`);
}

function pulseRewardStar(star) {
  star.classList.remove("is-earned");
  void star.offsetWidth;
  star.classList.add("is-earned");
  setTimeout(() => star.classList.remove("is-earned"), TEST_MODE ? 90 : 560);
}

function pulseTypeBoxSuccess() {
  typeBox.classList.remove("is-success");
  void typeBox.offsetWidth;
  typeBox.classList.add("is-success");
  setTimeout(() => typeBox.classList.remove("is-success"), TEST_MODE ? 80 : 420);
}

function comboRibbonLabel(streak) {
  if (streak >= 6) return "超级连击";
  if (streak >= 4) return "火力全开";
  return "连续命中";
}

function showComboRibbon(streak, reward) {
  if (streak < 2) return;
  clearTimeout(comboRibbonTimer);
  comboRibbon.textContent = `${comboRibbonLabel(streak)} x${streak}`;
  comboRibbon.classList.remove("is-on");
  void comboRibbon.offsetWidth;
  comboRibbon.classList.add("is-on");
  comboRibbonTimer = setTimeout(() => {
    comboRibbon.classList.remove("is-on");
    comboRibbonTimer = 0;
  }, TEST_MODE ? 120 : Math.max(680, 820 - Math.min(180, reward * 8)));
}

function hideComboRibbon() {
  clearTimeout(comboRibbonTimer);
  comboRibbonTimer = 0;
  comboRibbon.classList.remove("is-on");
}

function playTone(freq, duration, type) {
  if (TEST_MODE) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.045, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function rememberSoundEvent(name) {
  soundEventLog.push(name);
  if (soundEventLog.length > 40) soundEventLog.shift();
}

function playCountdownTick(bucket = 0) {
  const freq = 520 + bucket * 90;
  playBufferedAudio(audioManifest.sfx.countdown, "sfx:countdown", {
    volume: 0.72,
    fallback: () => playTone(freq, 0.045, "square")
  });
}

function playLetterStep() {
  playBufferedAudio(audioManifest.sfx.letter, "sfx:letter", {
    volume: 0.68,
    fallback: () => playTone(720, 0.035, "square")
  });
}

function playExplosionSound() {
  playBufferedAudio(audioManifest.sfx.explosion, "sfx:explosion", {
    volume: 0.82,
    fallback: playExplosionToneFallback
  });
}

function playGradeUpSound() {
  rememberSoundEvent("sfx:gradeup");
  if (TEST_MODE) return;
  playTone(740, 0.05, "triangle");
  setTimeout(() => playTone(920, 0.06, "triangle"), 70);
  setTimeout(() => playTone(1180, 0.08, "square"), 150);
}

function playExplosionToneFallback() {
  if (TEST_MODE) return;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const ctx = new AudioContext();
  const duration = 0.36;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * (1 - t) * 0.42;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(700, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + duration);
  const boom = ctx.createOscillator();
  boom.type = "sine";
  boom.frequency.setValueAtTime(92, ctx.currentTime);
  boom.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.18, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  noise.connect(filter);
  filter.connect(gain);
  boom.connect(gain);
  gain.connect(ctx.destination);
  noise.start();
  boom.start();
  noise.stop(ctx.currentTime + duration);
  boom.stop(ctx.currentTime + duration);
}

function setImage(image, src) {
  if (image.dataset.src === src) return;
  image.src = src;
  image.dataset.src = src;
}

function resetBow() {
  clearTimeout(bowResetTimer);
  bowResetTimer = 0;
  setImage(bowLauncherImage, ASSETS.weapon.bowIdle);
}

function setBowState(src, duration = 0) {
  clearTimeout(bowResetTimer);
  bowResetTimer = 0;
  setImage(bowLauncherImage, src);
  if (duration > 0) {
    bowResetTimer = setTimeout(resetBow, duration);
  }
}

function setMonsterMode(mode) {
  monsterWrap.classList.toggle("is-walking", mode === "walking");
  monsterWrap.classList.toggle("is-pose", mode === "pose");
}

function updateListenButton() {
  const canListen = taskCanListen(currentTask);
  listenButton.disabled = !canListen;
  listenButton.setAttribute("aria-disabled", canListen ? "false" : "true");
  listenButton.textContent = canListen ? "听一听" : "看题目";
}

function updateModeTabs() {
  Array.from(modeTabs.querySelectorAll("[data-mode]")).forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.mode === activeMode);
  });
  updatePinyinTierControls();
  updateMathGuidePanel();
  updateMathSupportControls();
}

function renderMenu() {
  setUiState("menu");
  overlay.classList.remove("is-result");
  clearTimeout(menuSummaryTimer);
  menuSummaryTimer = 0;
  startSummary?.classList.remove("is-accent");
  overlayStart?.classList.remove("is-accent");
  clearTimeout(rewardMeterTimer);
  rewardMeterTimer = 0;
  clearTimeout(celebrateStageTimer);
  celebrateStageTimer = 0;
  starsMeter?.classList.remove("is-celebrate");
  stage.classList.remove("is-celebrate");
  clearTimeout(pendingExplosionTimer);
  pendingExplosionTimer = 0;
  clearExplosion();
  overlayTitle.textContent = "消灭苦力怕";
  syncActiveVocabBank(1);
  updateVocabSelect();
  renderGradeTrack(1);
  activeEnemies = buildActiveEnemies();
  const firstEnemy = activeEnemies[0];
  currentTask = firstEnemy?.task || getTasksForMode(activeMode)[0];
  activeEnemyId = firstEnemy?.id || "";
  targetBubble.textContent = "";
  modeBadge.textContent = currentModeDisplayLabel(activeMode);
  renderPromptHint(currentTask);
  typedText.textContent = "";
  updateWordCard(currentTask);
  renderProgressWord();
  renderKeyboard();
  updateEnemyTaskBadges();
  placeMonster();
  setActiveEnemy(firstEnemy);
  updateListenButton();
  const pinyinTierLabel = getPinyinTierConfig().label;
  overlayText.textContent = isWordMode(activeMode)
    ? `${currentWordBankShortLabel()}词库 · ${GAME_MODES[activeMode].label}拼写，逐字输入射击苦力怕。共 ${ROUND_GOAL} 关。`
    : isMathMode()
      ? activeMode === "mathMul"
        ? `先练 ${GAME_MODES[activeMode].label}，输入答案射击对应苦力怕，题目会给阵列或重复加法提示。共 ${ROUND_GOAL} 关。`
        : `先练 ${GAME_MODES[activeMode].label}，输入答案射击对应苦力怕。共 ${ROUND_GOAL} 关。`
      : activeMode === "pinyin"
        ? `先练拼音${pinyinTierLabel}，先看汉字再敲拼音。共 ${ROUND_GOAL} 关。`
        : `先练 ${GAME_MODES[activeMode].label}，每次听一遍再敲键盘。共 ${ROUND_GOAL} 关。`;
  renderStartSummary();
  overlayStart.textContent = startActionLabel();
  overlayStart.hidden = false;
  finalStats.hidden = true;
  finalStats.className = "final-stats";
  finalStats.textContent = "";
  hideComboRibbon();
  applyStageThemeForRound(isMathMode(activeMode) ? 1 + (getEnvironmentRoundsPerPack() * 3) : 1);
  updateSceneChip(getRoundEnvironmentPack(1));
  sceneToast?.classList.remove("is-on");
  sceneToast?.setAttribute("aria-hidden", "true");
  updateStageMotion(0);
  updateModeTabs();
  updateGoalChip();
}

function skipCurrent() {
  if (state !== "playing" || hitLock) return;
  combo = 0;
  updateHud();
  hideComboRibbon();
  wrongNudge();
  spawnTask();
}

function getTestSnapshot() {
  const emptyHearts = hearts.filter((heart) => heart.dataset.src === ASSETS.ui.heartEmpty).length;
  const vocabBank = getVocabBank(activeVocabId);
  const environmentPack = getRoundEnvironmentPack();
  const modeTasks = getTasksForMode(activeMode);
  const modeConfig = GAME_MODES[activeMode] || GAME_MODES.words;
  const effectiveSpeed = activeMode === "pinyin" ? getPinyinTierConfig().speed : modeConfig.speed;
  const gradeTrackState = getGradeTrackState(roundIndex, activeMode);
  return {
    state,
    uiState: document.body.dataset.uiState || "menu",
    activeMode,
    selectedVocabId,
    activeVocabId,
    autoVocabEnabled: isAutoVocabEnabled(),
    vocabSource: vocabBank?.source?.file || ROOT_VOCAB_RUNTIME?.source?.file || "fallback",
    vocabTitle: vocabBank?.title || "fallback",
    vocabWordCount: activeMode === "pinyin" ? modeTasks.length : (isWordMode(activeMode) ? modeTasks.length : (TASK_BANKS.words.length || normalizeVocabBankTasks(vocabBank).length)),
    roundGoal: ROUND_GOAL,
    target: currentTask.target,
    typed,
    activePinyinTier,
    selectedMathSupportId,
    activeMathSupportId,
    mathRetryUsed,
    modeConfiguredSpeedMs: effectiveSpeed,
    runtimeSpawnDurationMs: spawnDuration,
    wordCardVisible: !wordCardPanel.classList.contains("is-hidden"),
    hp,
    score,
    roundIndex,
    hits,
    misses,
    combo,
    bestCombo,
    hitLock,
    lastAttack,
    lastTargetedEnemyId,
    lastLetterFeedback,
    lastMiniArrowCount,
    lastLetterImpactCount,
    lastDamageEffect,
    emptyHearts,
    gradeTrackMode: gradeTrackState.mode,
    gradeTrackCurrent: gradeTrackState.currentLabel,
    gradeTrackVisible: gradeTrackState.visible,
    environmentId: activeEnvironmentId || environmentPack.id,
    environmentLabel: environmentPack.label,
    sceneChipName: sceneName?.textContent?.trim() || "",
    sceneChipHint: sceneHint?.textContent?.trim() || "",
    sceneToastOpen: sceneToast?.classList.contains("is-on") || false,
    sceneToastKicker: sceneToastKicker?.textContent?.trim() || "",
    sceneToastName: sceneToastName?.textContent?.trim() || "",
    sceneToastVariant: sceneToast?.dataset.variant || "scene"
  };
}

function getMotionSnapshot() {
  const stageRect = stage.getBoundingClientRect();
  const wrapRect = monsterWrap.getBoundingClientRect();
  const rigRect = creeperRig.getBoundingClientRect();
  const groundY = stageRect.top + stageRect.height * 0.42;
  const matrix = new DOMMatrixReadOnly(getComputedStyle(monsterWrap).transform);
  return {
    top: Math.round(wrapRect.top),
    bottom: Math.round(wrapRect.bottom),
    rigBottom: Math.round(rigRect.bottom),
    groundY: Math.round(groundY),
    scale: Number(matrix.a.toFixed(3)),
    dangerLevel: Number(dangerLevel.toFixed(3)),
    isDanger: monsterWrap.classList.contains("is-danger"),
    asset: frontCreeperImage.dataset.src || frontCreeperImage.currentSrc || frontCreeperImage.src,
    generatedImageLoaded: frontCreeperImage.naturalWidth > 0
  };
}

function getCreeperSnapshots() {
  return [
    creeperSnapshot("front", monsterWrap),
    creeperSnapshot("back", backupMonsterWrap)
  ];
}

function creeperSnapshot(role, element) {
  const rect = element.getBoundingClientRect();
  const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
  const image = role === "front" ? frontCreeperImage : backupCreeperImage;
  const enemy = getEnemyByRole(role);
  return {
    role,
    top: Math.round(rect.top),
    bottom: Math.round(rect.bottom),
    scale: Number(matrix.a.toFixed(3)),
    danger: Number((element.style.getPropertyValue("--danger-level") || 0)),
    gaitPace: Number((enemy?.gait?.pace || 0).toFixed(3)),
    asset: image.dataset.src || image.currentSrc || image.src,
    generatedImageLoaded: image.naturalWidth > 0
  };
}

function enemySnapshots() {
  return activeEnemies.map((enemy) => {
    const element = getEnemyElement(enemy.role);
    const image = getEnemyImage(enemy.role);
    const rect = element.getBoundingClientRect();
    return {
      id: enemy.id,
      role: enemy.role,
      label: enemy.label,
      answer: enemy.answer,
      taskType: enemy.task.taskType || enemy.task.bankKey || "words",
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      feetBottom: Math.round(rect.bottom),
      groundY: Number(element.dataset.groundY || 0),
      route: enemy.route ? {
        startX: Number(enemy.route.startX.toFixed(3)),
        middleX: Number(enemy.route.middleX.toFixed(3)),
        endX: Number(enemy.route.endX.toFixed(3)),
        curve: Number(enemy.route.curve.toFixed(3)),
        groundStart: enemy.route.groundStart,
        groundEnd: enemy.route.groundEnd,
        spawnAt: Number(enemy.route.spawnAt.toFixed(3))
      } : null,
      recoil: Number((enemy.recoil || 0).toFixed(3)),
      isTargeted: enemy.isTargeted,
      generatedImageLoaded: image.naturalWidth > 0
    };
  });
}

if (TEST_MODE) {
  window.__typingDefenseTest = {
    snapshot: getTestSnapshot,
    motionSnapshot: getMotionSnapshot,
    creeperSnapshots: getCreeperSnapshots,
    enemySnapshots,
    soundEvents() {
      return [...soundEventLog];
    },
    setProgress(value) {
      progress = Math.max(0, Math.min(1, Number(value) || 0));
      placeMonster();
    },
    forceDamage() {
      if (state === "playing" && !hitLock) takeDamage();
    },
    previewEnemyWave(round = roundIndex) {
      return createEnemyWavePlan(round).map((role, index) => {
        const route = createEnemyRoute(role, index);
        return {
          role,
          route: {
            startX: Number(route.startX.toFixed(3)),
            endX: Number(route.endX.toFixed(3)),
            curve: Number(route.curve.toFixed(3)),
            spawnAt: Number(route.spawnAt.toFixed(3))
          }
        };
      });
    }
  };
}

window.addEventListener("keydown", handleKey);
startButton.addEventListener("click", startGame);
overlayStart.addEventListener("click", startGame);
skipButton.addEventListener("click", skipCurrent);
listenButton.addEventListener("click", () => {
  if (state !== "playing") return;
  playCurrentTaskVoice("replay");
  typeBox.focus();
});
modeTabs.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (!button || state === "playing") return;
  activeMode = button.dataset.mode;
  availableTasks = getTasksForMode(activeMode);
  renderMenu();
  pulseMenuSummary();
});
pinyinTierTabs?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pinyin-tier]");
  if (!button || state === "playing") return;
  setActivePinyinTier(button.dataset.pinyinTier);
  availableTasks = getTasksForMode(activeMode);
  renderMenu();
  pulseMenuSummary();
});
mathSupportTabs?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-math-support]");
  if (!button || state === "playing") return;
  selectedMathSupportId = normalizeMathSupportSelection(button.dataset.mathSupport || "none", activeMode);
  updateMathSupportControls();
  renderStartSummary();
  pulseMenuSummary();
});
vocabSelect?.addEventListener("change", () => {
  applyVocabBank(vocabSelect.value);
  typeBox.focus();
});
typeBox.addEventListener("click", () => typeBox.focus());
wordCardDeck?.addEventListener("click", (event) => {
  const voiceButton = event.target.closest("[data-voice-card]");
  if (voiceButton) {
    const enemy = setActiveEnemy(voiceButton.dataset.voiceCard);
    if (enemy) playCurrentTaskVoice("replay");
    typeBox.focus();
    return;
  }
  const card = event.target.closest("[data-enemy-card]");
  if (!card) return;
  setActiveEnemy(card.dataset.enemyCard);
  typeBox.focus();
});
wordCardDeck?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest("[data-enemy-card]");
  if (!card) return;
  event.preventDefault();
  setActiveEnemy(card.dataset.enemyCard);
  typeBox.focus();
});
finalStats?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-reward-action]");
  if (!button) return;
  triggerRewardAction(button.getAttribute("data-reward-action") || "replay");
});
keyboard?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-key]");
  if (!button) return;
  inputCharacter(button.dataset.key);
  typeBox.focus();
});

targetBubble.textContent = "";
resetBow();
renderMenu();
updateHud();



