(function () {
  'use strict';

  const GAME_CONTENT_URL = './assets/generated/learning-games-content.json';
  const TYPING_INDEX_URL = './assets/generated/english-typing-index.json';
  const TYPING_VIEW_URL = './assets/generated/english-typing-unified.json';
  const TYPING_VIEW_GLOBAL = 'LearningArcadeTypingUnified';
  const HANZI_URL = '../../data/hanzi-questions.json';
  const HANZI_RUNTIME_URL = './assets/generated/hanzi-pinyin-runtime.json';
  const FILE_TYPING_FALLBACK_SCRIPTS = [
    './assets/generated/english-typing-unified.js?v=english-curriculum-v1'
  ];
  const FILE_HANZI_FALLBACK_SCRIPTS = [
    '../../data/vocab/单词库_分级/06_汉字/幼儿园汉字.js?v=hanzi-pack-v1',
    '../../data/vocab/单词库_分级/07_拼音/常用拼音.js?v=pinyin-pack-v1',
    '../../data/vocab/单词库_分级/08_幼小衔接/幼小衔接总词库.js?v=bridge-pack-v1'
  ];
  const SETTINGS_STORAGE_KEY = 'learning-arcade-settings-v1';
  const WORD_SHOOTER_PROGRESSION_STORAGE_KEY = 'petbank_learning_arcade_word_shooter_progression_v1';
  const HANZI_SHARED_VOICE_MAP_URL = '../拼音块收集台原型/assets/voice/map.json';
  const HANZI_SHARED_VOICE_ASSET_BASE = '../拼音块收集台原型/assets/voice';
  const FALLBACK_MINECRAFT_IMAGE = '../../assets/learn/english-vocab/minecraft-card.webp';
  const PINYIN_SNAKE_ASSET_BASE = './assets/generated/pinyin-snake-assets/';
  const WORD_SHOOTER_ASSET_BASE = './assets/generated/word-shooter-scifi-assets/';
  const WORD_CANNON_ASSET_BASE = './assets/generated/word-cannon-assets/';
  const PINYIN_RACER_ASSET_BASE = './assets/generated/pinyin-racer-assets/';
  const PINYIN_RACER_RETHEME_BASE = './assets/generated/reference/pinyin-racer-retheme-20260711/';
  const PINYIN_RACER_RETHEME_ASSET_BASE = './assets/generated/pinyin-racer-retheme-assets/';
  const PINYIN_RACER_SEMANTIC_BASE = './assets/generated/pinyin-racer-semantic-assets/level-05/';
  const PINYIN_RACER_PREPARED_BASE = './assets/拼音赛车/';
  const HANZI_JUMPER_ASSET_BASE = './assets/generated/hanzi-jumper-assets/';
  const HANZI_IMAGE_BASE = '../../assets/ui/hanzi-img/';
  const PET_JUMPER_ASSETS = {
    idle: '../../assets/banchong2/萌爪伙伴族/边牧-3.webp',
    jump: '../../assets/banchong2/萌爪伙伴族/边牧-3.webp',
    catch: '../../assets/banchong2/萌爪伙伴族/边牧-3.webp'
  };
  const PINYIN_SNAKE_ASSETS = {
    board: `${PINYIN_SNAKE_ASSET_BASE}board_10x10.png`,
    head: `${PINYIN_SNAKE_ASSET_BASE}snake_head_right.png`,
    bodyHorizontal: `${PINYIN_SNAKE_ASSET_BASE}snake_body_horizontal.png`,
    bodyVertical: `${PINYIN_SNAKE_ASSET_BASE}snake_body_vertical.png`,
    corner: `${PINYIN_SNAKE_ASSET_BASE}snake_corner.png`,
    tail: `${PINYIN_SNAKE_ASSET_BASE}snake_tail.png`,
    foods: [
      `${PINYIN_SNAKE_ASSET_BASE}food_tile_1.png`,
      `${PINYIN_SNAKE_ASSET_BASE}food_tile_2.png`,
      `${PINYIN_SNAKE_ASSET_BASE}food_tile_3.png`,
      `${PINYIN_SNAKE_ASSET_BASE}food_tile_4.png`
    ]
  };
  const PINYIN_INITIALS = [
    'zh', 'ch', 'sh',
    'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h',
    'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w'
  ];
  const PINYIN_DISTRACTOR_CHUNKS = [
    'a', 'o', 'e', 'i', 'u', 'ai', 'ei', 'ao', 'ou', 'an', 'en', 'ang', 'eng',
    'ong', 'ia', 'ie', 'iao', 'ian', 'in', 'ing', 'ua', 'uo', 'uai', 'uan', 'un'
  ];
  const HANZI_JUMPER_ASSETS = {
    background: `${HANZI_JUMPER_ASSET_BASE}stage_background.png`,
    target: `${HANZI_JUMPER_ASSET_BASE}target_capsule.png`,
    idle: `${HANZI_JUMPER_ASSET_BASE}jumper_idle.png`,
    jump: `${HANZI_JUMPER_ASSET_BASE}jumper_jump.png`,
    reward: `${HANZI_JUMPER_ASSET_BASE}reward_star.png`,
    platforms: [
      `${HANZI_JUMPER_ASSET_BASE}platform_leaf.png`,
      `${HANZI_JUMPER_ASSET_BASE}platform_cloud.png`,
      `${HANZI_JUMPER_ASSET_BASE}platform_coral.png`,
      `${HANZI_JUMPER_ASSET_BASE}platform_wood.png`,
      `${HANZI_JUMPER_ASSET_BASE}platform_green.png`
    ],
    answerPlatform: `${HANZI_JUMPER_ASSET_BASE}platform_wood.png`,
    glow: `${HANZI_JUMPER_ASSET_BASE}platform_glow.png`
  };
  const WORD_SHOOTER_ASSETS = {
    shipIdle: `${WORD_SHOOTER_ASSET_BASE}interceptor_idle.png`,
    shipFire: `${WORD_SHOOTER_ASSET_BASE}interceptor_fire.png`,
    shipBoost: `${WORD_SHOOTER_ASSET_BASE}interceptor_boost.png`,
    enemyFighters: [
      { asset: `${WORD_SHOOTER_ASSET_BASE}interceptor_fire.png`, hueRotate: '148deg', scale: 0.74, labelTop: '17%' },
      { asset: `${WORD_SHOOTER_ASSET_BASE}interceptor_boost.png`, hueRotate: '210deg', scale: 0.78, labelTop: '15%' },
      { asset: `${WORD_SHOOTER_ASSET_BASE}interceptor_idle.png`, hueRotate: '278deg', scale: 0.72, labelTop: '18%' }
    ],
    targets: [
      `${WORD_SHOOTER_ASSET_BASE}target_shield_pod.png`,
      `${WORD_SHOOTER_ASSET_BASE}target_drone_balloon.png`,
      `${WORD_SHOOTER_ASSET_BASE}target_cargo_crate.png`,
      `${WORD_SHOOTER_ASSET_BASE}target_energy_cloud.png`,
      `${WORD_SHOOTER_ASSET_BASE}target_hex_cube.png`,
      `${WORD_SHOOTER_ASSET_BASE}target_orbit_sphere.png`
    ],
    shots: {
      basic: `${WORD_SHOOTER_ASSET_BASE}shot_laser_basic.png`,
      'triple-beam': `${WORD_SHOOTER_ASSET_BASE}shot_triple_beam.png`,
      'homing-missile': `${WORD_SHOOTER_ASSET_BASE}shot_homing_missile.png`,
      'pierce-laser': `${WORD_SHOOTER_ASSET_BASE}shot_pierce_laser.png`
    },
    impacts: {
      flash: `${WORD_SHOOTER_ASSET_BASE}impact_flash_scifi.png`,
      ring: `${WORD_SHOOTER_ASSET_BASE}impact_burst_ring.png`
    },
    pickups: {
      'triple-beam': `${WORD_SHOOTER_ASSET_BASE}pickup_triple_beam.png`,
      'homing-missile': `${WORD_SHOOTER_ASSET_BASE}pickup_homing_missile.png`,
      'pierce-laser': `${WORD_SHOOTER_ASSET_BASE}pickup_pierce_laser.png`
    },
    panels: {
      hint: `${WORD_SHOOTER_ASSET_BASE}hud_panel_hint.png`,
      long: `${WORD_SHOOTER_ASSET_BASE}hud_panel_long.png`,
      weapon: `${WORD_SHOOTER_ASSET_BASE}hud_panel_weapon.png`
    },
    reward: `${WORD_SHOOTER_ASSET_BASE}reward_badge_scifi.png`
  };
  const WORD_SHOOTER_AGNES_ASSET_BASE = './assets/generated/word-shooter-agnes-assets/';
  const WORD_SHOOTER_AGNES_ASSETS = {
    playerShield: `${WORD_SHOOTER_AGNES_ASSET_BASE}player-shield.png`,
    enemyBolt: `${WORD_SHOOTER_AGNES_ASSET_BASE}enemy-energy-bolt.png`,
    hitSpark: `${WORD_SHOOTER_AGNES_ASSET_BASE}hit-spark.png`,
    impactFlash: `${WORD_SHOOTER_AGNES_ASSET_BASE}impact-flash.png`,
    destroyBurst: `${WORD_SHOOTER_AGNES_ASSET_BASE}destroy-burst-star.png`,
    shieldBreakRing: `${WORD_SHOOTER_AGNES_ASSET_BASE}shield-break-ring.png`,
    shieldRepair: `${WORD_SHOOTER_AGNES_ASSET_BASE}shield-repair-pickup.png`,
    debris: `${WORD_SHOOTER_AGNES_ASSET_BASE}debris-shards.png`,
    victory: `${WORD_SHOOTER_AGNES_ASSET_BASE}victory-starburst.png`
  };
  const WORD_CANNON_ASSETS = {
    stage: './assets/generated/pinyin-racer-reference-bg.png',
    beam: `${PINYIN_RACER_ASSET_BASE}speed_trail_short.png`,
    cannon: {
      frontLarge: `${WORD_CANNON_ASSET_BASE}cannon_front_large.png`,
      frontSmall: `${WORD_CANNON_ASSET_BASE}cannon_front_small.png`,
      angled: `${WORD_CANNON_ASSET_BASE}cannon_angle_large.png`,
      pedestal: `${WORD_CANNON_ASSET_BASE}cannon_pedestal_top.png`
    },
    frames: {
      blue: `${PINYIN_RACER_ASSET_BASE}road_sign_dark_blank.png`,
      red: `${PINYIN_RACER_ASSET_BASE}road_sign_blue_glow.png`,
      purple: `${PINYIN_RACER_ASSET_BASE}road_sign_dark_blank.png`,
      yellow: `${PINYIN_RACER_ASSET_BASE}road_sign_blue_glow.png`,
      green: `${PINYIN_RACER_ASSET_BASE}road_sign_dark_blank.png`
    },
    crosshair: {
      idle: `${WORD_CANNON_ASSET_BASE}crosshair_blue.png`,
      locked: `${WORD_CANNON_ASSET_BASE}crosshair_orange.png`
    },
    impact: {
      cluster: `${PINYIN_RACER_ASSET_BASE}nitro_burst.png`,
      flash: `${PINYIN_RACER_ASSET_BASE}lane_glow_strip.png`
    }
  };
  const PINYIN_RACER_ASSETS = {
    background: `${PINYIN_RACER_PREPARED_BASE}拼音赛车参考图-01-彩色卡通赛车道.webp`,
    checkpointArch: `${PINYIN_RACER_ASSET_BASE}checkpoint_arch.png`,
    facilities: {
      gate: `${PINYIN_RACER_SEMANTIC_BASE}initial_sound_gate.png`,
      fork: `${PINYIN_RACER_SEMANTIC_BASE}fork_gate_pair.png`,
      tone: `${PINYIN_RACER_SEMANTIC_BASE}tone_hanging_sign.png`,
      supply: `${PINYIN_RACER_SEMANTIC_BASE}picture_supply_kiosk.png`,
      tunnel: `${PINYIN_RACER_SEMANTIC_BASE}listening_tunnel_gate.png`,
      finish: `${PINYIN_RACER_SEMANTIC_BASE}finish_sprint_arch.png`
    },
    cars: {
      idle: `${PINYIN_RACER_ASSET_BASE}race_car_top_up.svg`,
      boost: `${PINYIN_RACER_ASSET_BASE}car_pose_accelerate.png`,
      poseIdle: `${PINYIN_RACER_ASSET_BASE}car_pose_idle.png`,
      accelerate: `${PINYIN_RACER_ASSET_BASE}car_pose_accelerate.png`,
      driftLeft: `${PINYIN_RACER_ASSET_BASE}car_pose_drift_left.png`,
      driftRight: `${PINYIN_RACER_ASSET_BASE}car_pose_drift_right.png`,
      shield: `${PINYIN_RACER_ASSET_BASE}car_pose_shield.png`,
      finish: `${PINYIN_RACER_ASSET_BASE}car_pose_finish.png`
    },
    signs: {
      idle: `${PINYIN_RACER_ASSET_BASE}road_sign_dark_blank.png`,
      locked: `${PINYIN_RACER_ASSET_BASE}road_sign_blue_glow.png`
    },
    panels: {
      input: `${PINYIN_RACER_ASSET_BASE}typing_input_panel.png`,
      hud: `${PINYIN_RACER_ASSET_BASE}hud_panel_blank.png`
    },
    rewards: {
      coin: `${PINYIN_RACER_ASSET_BASE}coin_reward.png`,
      star: `${PINYIN_RACER_ASSET_BASE}star_reward.png`,
      diamond: `${PINYIN_RACER_ASSET_BASE}diamond_reward.png`
    },
    upgrades: {
      tire: `${PINYIN_RACER_ASSET_BASE}tire_upgrade_icon.png`,
      nitro: `${PINYIN_RACER_ASSET_BASE}nitro_upgrade_icon.png`,
      engine: `${PINYIN_RACER_ASSET_BASE}engine_upgrade_icon.png`
    },
    fx: {
      longTrail: `${PINYIN_RACER_ASSET_BASE}speed_trail_long.png`,
      shortTrail: `${PINYIN_RACER_ASSET_BASE}speed_trail_short.png`,
      nitroBurst: `${PINYIN_RACER_ASSET_BASE}nitro_burst.png`,
      laneGlow: `${PINYIN_RACER_ASSET_BASE}lane_glow_strip.png`
    }
  };
  const WORD_CANNON_TARGET_THEMES = ['blue', 'purple', 'red', 'yellow', 'green'];
  const WORD_SHOOTER_WEAPONS = {
    basic: { id: 'basic', label: 'Pulse Laser', asset: WORD_SHOOTER_ASSETS.shots.basic, pickupAsset: WORD_SHOOTER_ASSETS.shots.basic, durationMs: 0 },
    'triple-beam': { id: 'triple-beam', label: 'Triple Beam', asset: WORD_SHOOTER_ASSETS.shots['triple-beam'], pickupAsset: WORD_SHOOTER_ASSETS.pickups['triple-beam'], durationMs: 10000 },
    'homing-missile': { id: 'homing-missile', label: 'Homing Missile', asset: WORD_SHOOTER_ASSETS.shots['homing-missile'], pickupAsset: WORD_SHOOTER_ASSETS.pickups['homing-missile'], durationMs: 9000 },
    'pierce-laser': { id: 'pierce-laser', label: 'Pierce Laser', asset: WORD_SHOOTER_ASSETS.shots['pierce-laser'], pickupAsset: WORD_SHOOTER_ASSETS.pickups['pierce-laser'], durationMs: 11000 }
  };
  const WORD_SHOOTER_SHIPS = {
    scout: {
      id: 'scout', label: '侦察翼', description: '移动灵活，适合先熟悉战场。', speedMultiplier: 1.16, shield: 3, fireMultiplier: 1, comboMultiplier: 1.04, hue: '0deg', scale: 0.92
    },
    guardian: {
      id: 'guardian', label: '守护舰', description: '护盾更厚，适合练习躲避。', speedMultiplier: 0.86, shield: 4, fireMultiplier: 1.04, comboMultiplier: 1, hue: '122deg', scale: 1.06
    },
    nova: {
      id: 'nova', label: '新星号', description: '火力更强，连击收益更高。', speedMultiplier: 1, shield: 3, fireMultiplier: 1.22, comboMultiplier: 1.1, hue: '232deg', scale: 1
    }
  };
  const WORD_SHOOTER_UPGRADE_COSTS = { speed: 4, shield: 5, fire: 6 };
  const WORD_SHOOTER_UPGRADE_LABELS = { speed: '机动', shield: '护盾', fire: '火力' };
  const WORD_SHOOTER_DEFAULT_PROGRESSION = {
    version: 1,
    level: 1,
    experience: 0,
    starDust: 0,
    totalRuns: 0,
    selectedShip: 'scout',
    equippedWeapon: 'basic',
    shipUpgrades: {
      scout: { speed: 0, shield: 0, fire: 0 },
      guardian: { speed: 0, shield: 0, fire: 0 },
      nova: { speed: 0, shield: 0, fire: 0 }
    }
  };
  const WORD_SHOOTER_DROP_TYPES = ['triple-beam', 'homing-missile', 'pierce-laser'];
  const WORD_SHOOTER_LANES = [18, 38, 58, 76, 88];
  const WORD_SHOOTER_TICK_MS = 100;
  const WORD_SHOOTER_PLAYER_X = 12;
  const WORD_SHOOTER_PLAYER_START_Y = 50;
  const WORD_SHOOTER_PLAYER_BOUNDS = { minX: 7, maxX: 34, minY: 14, maxY: 84 };
  const WORD_SHOOTER_PLAYER_SPEED = 24;
  const WORD_SHOOTER_PLAYER_SHIELD = 3;
  const WORD_SHOOTER_ENEMY_BULLET_SPEED = 24;
  const WORD_SHOOTER_ENEMY_FIRE_INTERVAL = 1800;
  const WORD_SHOOTER_ENEMY_BULLET_RADIUS = 3.8;
  const WORD_SHOOTER_INVULNERABLE_MS = 900;
  const WORD_SHOOTER_COLLISION_X = 17;
  const WORD_SHOOTER_ROUND_GOAL = 6;
  const WORD_SHOOTER_HAZARD_RADIUS = 7;
  const WORD_SHOOTER_BOSS_MAX_HEALTH = 4;
  const WORD_SHOOTER_BOSS_START_GAP = 4;
  const WORD_SHOOTER_MINE_INTERVAL = 2600;
  const WORD_SHOOTER_METEOR_INTERVAL = 1900;
  const WORD_SHOOTER_BOSS_ATTACK_INTERVAL = 1800;
  const WORD_SHOOTER_MECHANICS = {
    basic: { id: 'energy', label: '能量球训练', hazardTypes: [] },
    intermediate: { id: 'minefield', label: '糖果雷区', hazardTypes: ['mine'] },
    full: { id: 'meteor-boss', label: '陨石带 · 指挥官', hazardTypes: ['meteor', 'charge'] }
  };
  const WORD_CANNON_STAGE_GOAL = 8;
  const WORD_CANNON_ROUND_GOAL = 32;
  const WORD_CANNON_TICK_MS = 140;
  const WORD_CANNON_LANES = [28, 50, 72];
  const PINYIN_RACER_TARGET_LAYOUTS = {
    basic: [
      { x: 30, visualOffset: -12 },
      { x: 70, visualOffset: -12 },
      { x: 35, visualOffset: 12 },
      { x: 65, visualOffset: 12 }
    ],
    intermediate: [
      { x: 20, visualOffset: -12 },
      { x: 50, visualOffset: -12 },
      { x: 80, visualOffset: -12 },
      { x: 30, visualOffset: 12 },
      { x: 70, visualOffset: 12 }
    ],
    full: [
      { x: 20, visualOffset: -12 },
      { x: 50, visualOffset: -12 },
      { x: 80, visualOffset: -12 },
      { x: 20, visualOffset: 12 },
      { x: 50, visualOffset: 12 },
      { x: 80, visualOffset: 12 }
    ]
  };
  const WORD_CANNON_DANGER_Y = 82;
  const PINYIN_RACER_CATCH_Y = 76;
  const PINYIN_RACER_CARD_START_Y = 36;
  const WORD_CANNON_DEFAULT_FEEDBACK = '看汉字，上下左右移动车子，接住正确拼音卡。';
  const DEFAULT_HANZI_PACK_CANDIDATES = ['kindergarten-hanzi', 'kindergarten-pinyin', 'grade1-ready', 'bridge-hanzi', 'level-1', 'all'];
  const WORD_CANNON_MAPS = [
    { id: 'pinyin-racer-meadow-sbend', title: '赛车·草地 S 弯', asset: `${PINYIN_RACER_PREPARED_BASE}拼音赛车参考图-01-彩色卡通赛车道.webp`, artDirection: 'retheme' },
    { id: 'pinyin-racer-cloud-fork', title: '赛车·云桥分叉', asset: `${PINYIN_RACER_PREPARED_BASE}拼音赛车参考图-02-漂浮天空赛道.webp`, artDirection: 'retheme' },
    { id: 'pinyin-racer-forest-tunnel', title: '赛车·森林隧道', asset: `${PINYIN_RACER_PREPARED_BASE}拼音赛车参考图-03--玩具森林赛道png.webp`, artDirection: 'retheme' },
    { id: 'pinyin-racer-candy-bridge', title: '赛车·糖果声调桥', asset: `${PINYIN_RACER_PREPARED_BASE}拼音赛车参考图-04-梦幻通话赛道.webp`, artDirection: 'retheme' },
    { id: 'pinyin-racer-finish-sprint', title: '赛车·终点冲刺', asset: `${PINYIN_RACER_PREPARED_BASE}拼音赛车参考图-05--赛道终点.webp`, artDirection: 'retheme' }
  ];
  const PINYIN_RACER_SEGMENTS = [
    { id: 's-bend', shape: 's-bend', taskType: 'sound-gate', correctRoute: 'inner', recoveryRoute: 'wide', landmark: '声母弯道', mapIndex: 0, laneXs: [32, 50, 68] },
    { id: 'fork', shape: 'fork', taskType: 'image-supply', correctRoute: 'shortcut', recoveryRoute: 'outer', landmark: '图片补给站', mapIndex: 1, laneXs: [24, 68, 50] },
    { id: 'bridge', shape: 'bridge', taskType: 'tone-sign', correctRoute: 'bridge', recoveryRoute: 'slow-bridge', landmark: '声调桥', mapIndex: 3, laneXs: [31, 50, 69] },
    { id: 'tunnel', shape: 'tunnel', taskType: 'sound-gate', correctRoute: 'lit-tunnel', recoveryRoute: 'safe-tunnel', landmark: '听音隧道', mapIndex: 2, laneXs: [43, 58, 50] },
    { id: 'finish-sprint', shape: 'finish-sprint', taskType: 'final-gate', correctRoute: 'boost', recoveryRoute: 'buffer', landmark: '终点拼读门', mapIndex: 4, laneXs: [28, 50, 72] }
  ];
  const PINYIN_SNAKE_ROUND_GOAL = 5;
  const SNAKE_DEFAULT_FEEDBACK = '方向键移动，先吃高亮拼音块。';
  const SNAKE_SPEED_PRESETS = { slow: 760, standard: 610 };
  const HANZI_DEFAULT_FEEDBACK = '60 秒短局，左右换平台，空格接正确气泡。';
  const WORD_DIFFICULTY_OPTIONS = [
    { id: 'basic', label: '基础', badge: '基础训练', description: '慢速、少敌机、适合热身' },
    { id: 'intermediate', label: '进阶', badge: '进阶战斗', description: '中速、多一点目标' },
    { id: 'full', label: '完整', badge: '完整挑战', description: '更长一局，敌机更多' }
  ];
  const WORD_DIFFICULTY_TUNING = {
    basic: {
      shooter: { roundGoal: 8, maxEnemies: 2, speedMultiplier: 0.36, crashOnly: true },
      cannon: { roundGoal: 8, stageGoal: 20, maxTargets: 3, speedMultiplier: 0.68, missLimit: 99 }
    },
    intermediate: {
      shooter: { roundGoal: 10, maxEnemies: 3, speedMultiplier: 0.55, crashOnly: true },
      cannon: { roundGoal: 16, stageGoal: 20, maxTargets: 3, speedMultiplier: 0.88, missLimit: 5 }
    },
    full: {
      shooter: { roundGoal: 12, maxEnemies: 4, speedMultiplier: 0.72, crashOnly: true },
      cannon: { roundGoal: 24, stageGoal: 20, maxTargets: 3, speedMultiplier: 1.06, missLimit: 3 }
    }
  };
  const WORD_SHOOTER_STAGE_THEMES = {
    basic: {
      id: 'dawn-training',
      label: '晨曦训练场',
      kicker: 'Dawn Training Ground'
      ,background: './assets/generated/reference/word-shooter-levels-gpt-20260711/agnes-20260712/dawn-training-ground-clean/dawn-training-ground-clean.png'
    },
    intermediate: {
      id: 'candy-nebula',
      label: '糖果星云',
      kicker: 'Candy Nebula'
      ,background: './assets/generated/reference/word-shooter-levels-gpt-20260711/agnes-20260712/candy-nebula-clean/candy-nebula-clean.png'
    },
    full: {
      id: 'volcanic-meteor',
      label: '火山陨石带',
      kicker: 'Volcanic Meteor Belt'
      ,background: './assets/generated/reference/word-shooter-levels-gpt-20260711/agnes-20260712/volcanic-meteor-belt-clean/volcanic-meteor-belt-clean.png'
    }
  };

  const FALLBACK_VOCAB = [
    { word: 'block', translation: '方块', image: '../../assets/learn/english-vocab/block.webp', audio: '../../assets/learn/english-vocab/audio/block.mp3' },
    { word: 'world', translation: '世界', image: '../../assets/learn/english-vocab/world.webp', audio: '../../assets/learn/english-vocab/audio/world.mp3' },
    { word: 'stone', translation: '石头', image: '../../assets/learn/english-vocab/stone.webp', audio: '../../assets/learn/english-vocab/audio/stone.mp3' }
  ];

  const FALLBACK_HANZI = [
    { char: '山', pinyin: 'shān', example: '我们一起去爬山。', opts: ['山', '水', '火', '木'] },
    { char: '水', pinyin: 'shuǐ', example: '小鱼在水里游。', opts: ['水', '火', '山', '石'] },
    { char: '火', pinyin: 'huǒ', example: '冬天烤火真暖和。', opts: ['火', '水', '木', '日'] },
    { char: '木', pinyin: 'mù', example: '这是一棵大木头。', opts: ['木', '日', '月', '石'] }
  ];

  const state = {
    activeGame: 'home',
    soundEnabled: true,
    pinyinStarterSeen: false,
    snakeStarterSeen: false,
    hasExplicitWordDifficultyChoice: false,
    hasExplicitHanziPackChoice: false,
    content: { games: [], homeNotes: [] },
    dataReady: { typing: false, hanzi: false },
    words: [],
    allWords: [],
    wordPacks: [],
    typingIndexReady: false,
    typingPackFiles: {},
    typingLoadedPacks: new Set(),
    wordPackRequestId: 0,
    wordPack: 'minecraft',
    wordDifficulty: 'basic',
    hanziAll: [],
    hanzi: [],
    hanziLevels: {},
    hanziPacks: [],
    hanziPack: 'all',
    wordIndex: 0,
    input: '',
    combo: 0,
    difficultyCue: null,
    typingShotId: 0,
    typingCompleting: false,
    wordShooter: {
      enemies: [],
      roundWords: [],
      completedWords: [],
      activeEnemyId: null,
      currentTyped: '',
      pendingMistakes: 0,
      score: 0,
      combo: 0,
      misses: 0,
      spawnCursor: 0,
      enemyId: 0,
      pickup: null,
      timer: null,
      elapsedMs: 0,
      weaponId: 'basic',
      baseWeaponId: 'basic',
      shipId: 'scout',
      weaponExpiresAt: 0,
      firePoseUntil: 0,
      muzzleFlashUntil: 0,
      arenaShakeUntil: 0,
      arenaShakeLevel: 0,
      attackEvents: [],
      announcedKey: '',
      resolvingHit: false,
      player: { x: WORD_SHOOTER_PLAYER_X, y: WORD_SHOOTER_PLAYER_START_Y },
      moveInput: { up: false, down: false, left: false, right: false },
      shield: WORD_SHOOTER_PLAYER_SHIELD,
      invulnerableUntil: 0,
      enemyBullets: [],
      enemyBulletId: 0,
      hazards: [],
      hazardId: 0,
      nextMineAt: 0,
      nextMeteorAt: 0,
      hazardEvents: [],
      learning: {
        tasksPresented: 0,
        wordsCompleted: 0,
        firstTryWords: 0,
        retryWords: 0,
        correctLetters: 0,
        wrongLetters: 0,
        targetSwitches: 0,
        voiceAnnounced: 0
      },
      boss: {
        active: false,
        defeated: false,
        health: 0,
        maxHealth: WORD_SHOOTER_BOSS_MAX_HEALTH,
        phase: 'dormant',
        nextAttackAt: 0,
        attackCount: 0
      },
      enemyFireEnabled: true,
      roundGoal: WORD_SHOOTER_ROUND_GOAL,
      roundComplete: false,
      rewardClaimed: false,
      phase: 'warmup'
    },
    wordCannon: {
      targets: [],
      activeTargetId: null,
      currentTyped: '',
      completedWords: [],
      completedReview: [],
      score: 0,
      combo: 0,
      misses: 0,
      spawnCursor: 0,
      targetId: 0,
      elapsedMs: 0,
      shotTick: 0,
      feedbackTick: 0,
      announcedKey: '',
      playerLane: 1,
      player: { x: 50, y: 80 },
      drift: 0,
      sprintUntil: 0,
      hintUntil: 0,
      retryTask: null,
      currentTask: null,
      timer: null,
      roundGoal: WORD_CANNON_ROUND_GOAL,
      stageGoal: WORD_CANNON_STAGE_GOAL,
      mapIndex: 0,
      mapLocked: false,
      segmentIndex: 0,
      segment: null,
      taskHadRetry: false,
      learning: {
        tasksPresented: 0,
        tasksResolved: 0,
        correctChoice: 0,
        firstTryCorrect: 0,
        retryCount: 0,
        wrongChoices: 0,
        voiceAnnounced: 0
      },
      roundComplete: false
    },
    snake: {
      size: 12,
      body: [{ x: 4, y: 5 }, { x: 3, y: 5 }, { x: 2, y: 5 }],
      dir: { x: 1, y: 0 },
      foods: [],
      targetIndex: 0,
      pieces: [],
      pieceIndex: 0,
      combo: 0,
      moves: 0,
      score: 0,
      lastResult: 'ready',
      feedbackTick: 0,
      currentFoodState: 'target',
      hintUses: 2,
      hintActiveUntil: 0,
      hintTick: 0,
      roundGoal: PINYIN_SNAKE_ROUND_GOAL,
      roundComplete: false,
      paused: false,
      speedMode: 'slow',
      speedMs: SNAKE_SPEED_PRESETS.slow,
      timer: null
    },
    jumper: {
      targetIndex: 0,
      playerX: 50,
      playerY: 74,
      climb: 0,
      jumpTick: 0,
      moveTick: 0,
      lastResult: '',
      score: 0,
      combo: 0,
      bestCombo: 0,
      timeLeft: 60,
      goal: 8,
      misses: 0,
      phase: 'ready',
      reviewChars: [],
      feedbackTick: 0,
      timer: null,
      lane: 1,
      announcedIndex: -1,
      roundComplete: false
    },
    audio: null,
    hanziVoiceMap: {},
    hanziVoiceAudio: null,
    hanziVoiceToken: 0,
    roundSummary: {
      visible: false,
      gameId: '',
      kicker: '',
      title: '',
      copy: '',
      stats: []
    }
  };
  let difficultyCueTimer = null;
  let savedSettings = {};
  const dataLoadPromises = new Map();
  const fileFallbackPromises = new Map();
  let hanziVoiceMapPromise = null;

  const els = {
    gameHome: document.getElementById('gameHome'),
    gameCards: document.getElementById('gameCards'),
    homeTipsTitle: document.getElementById('homeTipsTitle'),
    homeNotes: document.getElementById('homeNotes'),
    gameScreen: document.getElementById('gameScreen'),
    backHomeButton: document.getElementById('backHomeButton'),
    soundToggle: document.getElementById('soundToggle'),
    wordShooter: document.getElementById('wordShooter'),
    wordQueue: document.getElementById('wordQueue'),
    wordChinese: document.getElementById('wordChinese'),
    typingArena: document.getElementById('typingArena'),
    typingStageBackdropImage: document.getElementById('typingStageBackdropImage'),
    typingStageTheme: document.getElementById('typingStageTheme'),
    typingTargetRail: document.getElementById('typingTargetRail'),
    typingEnemyLayer: document.getElementById('typingEnemyLayer'),
    typingEnemyBulletLayer: document.getElementById('typingEnemyBulletLayer'),
    typingHazardLayer: document.getElementById('typingHazardLayer'),
    typingBoss: document.getElementById('typingBoss'),
    typingBossHealthFill: document.getElementById('typingBossHealthFill'),
    typingBossPhase: document.getElementById('typingBossPhase'),
    typingDropLayer: document.getElementById('typingDropLayer'),
    typingProjectileLayer: document.getElementById('typingProjectileLayer'),
    typingShardLayer: document.getElementById('typingShardLayer'),
    typingTargetImage: document.getElementById('typingTargetImage'),
    typingGun: document.getElementById('typingGun'),
    typingPlayerShield: document.getElementById('typingPlayerShield'),
    typingGunShip: document.getElementById('typingGunShip'),
    typingWeaponStatus: document.getElementById('typingWeaponStatus'),
    typingProgress: document.getElementById('typingProgress'),
    typingStreak: document.getElementById('typingStreak'),
    typingShield: document.getElementById('typingShield'),
    wordShooterHangar: document.getElementById('wordShooterHangar'),
    wordShooterStarDust: document.getElementById('wordShooterStarDust'),
    wordShooterLoadoutSummary: document.getElementById('wordShooterLoadoutSummary'),
    wordShooterShipOptions: document.getElementById('wordShooterShipOptions'),
    wordShooterWeaponOptions: document.getElementById('wordShooterWeaponOptions'),
    wordShooterUpgradeOptions: document.getElementById('wordShooterUpgradeOptions'),
    wordFeedback: document.getElementById('wordFeedback'),
    wordPackSwitch: document.getElementById('wordPackSwitch'),
    wordDifficultySwitch: document.getElementById('wordDifficultySwitch'),
    wordSettingsReset: document.getElementById('wordSettingsReset'),
    wordDifficultyBadge: document.getElementById('wordDifficultyBadge'),
    keyboard: document.getElementById('keyboard'),
    wordCannon: document.getElementById('wordCannon'),
    cannonProgress: document.getElementById('cannonProgress'),
    cannonPromptChinese: document.getElementById('cannonPromptChinese'),
    cannonCombo: document.getElementById('cannonCombo'),
    wordCannonSettings: document.getElementById('wordCannonSettings'),
    cannonDifficultySwitch: document.getElementById('cannonDifficultySwitch'),
    cannonPackSwitch: document.getElementById('cannonPackSwitch'),
    cannonPackHint: document.getElementById('cannonPackHint'),
    cannonMapSwitch: document.getElementById('cannonMapSwitch'),
    cannonSettingsReset: document.getElementById('cannonSettingsReset'),
    cannonDifficultyBadge: document.getElementById('cannonDifficultyBadge'),
    cannonStage: document.getElementById('cannonStage'),
    cannonRouteLayer: document.getElementById('cannonRouteLayer'),
    cannonTargetLayer: document.getElementById('cannonTargetLayer'),
    cannonFxLayer: document.getElementById('cannonFxLayer'),
    cannonCurrentWord: document.getElementById('cannonCurrentWord'),
    cannonBase: document.getElementById('cannonBase'),
    cannonFeedback: document.getElementById('cannonFeedback'),
    cannonKeyboard: document.getElementById('cannonKeyboard'),
    pinyinSnake: document.getElementById('pinyinSnake'),
    snakeBoard: document.getElementById('snakeBoard'),
    snakePauseButton: document.getElementById('snakePauseButton'),
    snakeSpeedSwitch: document.getElementById('snakeSpeedSwitch'),
    snakePrompt: document.getElementById('snakePrompt'),
    snakeTaskWord: document.getElementById('snakeTaskWord'),
    snakeTaskEmoji: document.getElementById('snakeTaskEmoji'),
    snakeTaskExample: document.getElementById('snakeTaskExample'),
    snakePieces: document.getElementById('snakePieces'),
    snakeTaskHint: document.getElementById('snakeTaskHint'),
    snakeStatusBadge: document.getElementById('snakeStatusBadge'),
    snakeLengthStat: document.getElementById('snakeLengthStat'),
    snakeStarStat: document.getElementById('snakeStarStat'),
    snakeScore: document.getElementById('snakeScore'),
    snakeHintButton: document.getElementById('snakeHintButton'),
    snakeHintUses: document.getElementById('snakeHintUses'),
    snakeFeedback: document.getElementById('snakeFeedback'),
    hanziJumper: document.getElementById('hanziJumper'),
    jumperStage: document.getElementById('jumperStage'),
    jumperPrompt: document.getElementById('jumperPrompt'),
    jumperScore: document.getElementById('jumperScore'),
    jumperFeedback: document.getElementById('jumperFeedback'),
    roundSummary: document.getElementById('roundSummary'),
    roundSummaryCard: document.getElementById('roundSummaryCard'),
    roundSummaryKicker: document.getElementById('roundSummaryKicker'),
    roundSummaryTitle: document.getElementById('roundSummaryTitle'),
    roundSummaryCopy: document.getElementById('roundSummaryCopy'),
    roundSummaryStats: document.getElementById('roundSummaryStats'),
    replayRoundButton: document.getElementById('replayRoundButton'),
    roundSummaryHomeButton: document.getElementById('roundSummaryHomeButton')
  };

  const LEARNING_ARCADE_BRIDGE_SOURCE = 'petbank-learning-arcade';
  const learningArcadeBridge = {
    sessionId: `learning-arcade-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    seq: 0
  };

  function bridgeGameLabel(gameId) {
    return ({
      'word-shooter': '飞机大战',
      'word-cannon': '拼音赛车',
      'pinyin-snake': '贪吃蛇'
    })[gameId] || '学习机小游戏';
  }

  function bridgeSettingsSnapshot() {
    return {
      wordDifficulty: state.wordDifficulty,
      wordPack: state.wordPack,
      hanziPack: state.hanziPack,
      pinyinStarterSeen: state.pinyinStarterSeen,
      snakeStarterSeen: state.snakeStarterSeen
    };
  }

  function emitLearningArcadeBridge(kind, payload = {}) {
    if (typeof window === 'undefined' || typeof window.parent?.postMessage !== 'function') return;
    learningArcadeBridge.seq += 1;
    try {
      window.parent.postMessage({
        source: LEARNING_ARCADE_BRIDGE_SOURCE,
        kind,
        sessionId: learningArcadeBridge.sessionId,
        seq: learningArcadeBridge.seq,
        payload: {
          ...payload,
          settings: bridgeSettingsSnapshot(),
          activeGame: state.activeGame
        }
      }, window.location.origin || '*');
    } catch (err) {
      // Host bridge is optional; gameplay should continue even if embedding is unavailable.
    }
  }

  function normalizeAsset(path) {
    if (!path) return FALLBACK_MINECRAFT_IMAGE;
    if (/^https?:/i.test(path) || path.startsWith('../../') || path.startsWith('./')) return path;
    return `../../${String(path).replace(/^\/+/, '')}`;
  }

  function resolveMinecraftImage(card) {
    const image = card?.image || '';
    const fileName = card?.imageFile || '';
    if (/^https:\/\/minecraft\.wiki\/w\/File:/i.test(image) && fileName) {
      return `https://minecraft.wiki/w/Special:Redirect/file/${encodeURIComponent(fileName)}`;
    }
    return normalizeAsset(image);
  }

  function normalizePinyin(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/ü/g, 'u')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z]/g, '');
  }

  function cleanHanziExample(item) {
    return String(item?.example || '').replace(/\*\*/g, '');
  }

  function maskedHanziExample(item) {
    const sentence = String(item?.example || '');
    if (sentence.includes('**')) return sentence.replace(/\*\*.*?\*\*/g, '＿');
    return cleanHanziExample(item).replace(item?.char || '', '＿');
  }

  function getHanziMatchOptions(target) {
    const optionChars = Array.isArray(target?.opts) && target.opts.length
      ? target.opts
      : [target?.char, ...state.hanzi.filter(item => item.char !== target?.char).slice(0, 4).map(item => item.char)];
    const uniqueChars = [...new Set([target?.char, ...optionChars].filter(Boolean))];
    state.hanzi.forEach(item => {
      if (uniqueChars.length < 5 && item?.char && !uniqueChars.includes(item.char)) {
        uniqueChars.push(item.char);
      }
    });
    uniqueChars.splice(5);
    return uniqueChars.map(char => state.hanzi.find(item => item.char === char) || { char, pinyin: '', example: '' });
  }

  function loadFileFallbackScripts(urls = []) {
    if (window.location.protocol !== 'file:') return Promise.resolve();
    const uniqueUrls = [...new Set(urls.filter(Boolean))];
    return Promise.all(uniqueUrls.map(url => {
      if (url.includes('english-typing-unified.js') && window[TYPING_VIEW_GLOBAL]) return Promise.resolve();
      if (fileFallbackPromises.has(url)) return fileFallbackPromises.get(url);
      const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.async = false;
        script.src = url;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load file fallback script: ${url}`));
        document.head.appendChild(script);
      });
      fileFallbackPromises.set(url, promise);
      return promise;
    })).then(() => undefined);
  }

  async function readJson(url, fallback) {
    if (window.location.protocol === 'file:') {
      if (url === TYPING_VIEW_URL && window[TYPING_VIEW_GLOBAL]) {
        return window[TYPING_VIEW_GLOBAL];
      }
      return fallback;
    }
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      if (url === TYPING_VIEW_URL && window[TYPING_VIEW_GLOBAL]) {
        return window[TYPING_VIEW_GLOBAL];
      }
      return fallback;
    }
  }

  async function loadHanziVoiceMap() {
    const fallback = {};
    if (window.location.protocol === 'file:') {
      state.hanziVoiceMap = fallback;
      return;
    }
    try {
      const response = await fetch(HANZI_SHARED_VOICE_MAP_URL, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      state.hanziVoiceMap = await response.json();
    } catch (err) {
      state.hanziVoiceMap = fallback;
    }
  }

  function ensureHanziVoiceMap() {
    if (!hanziVoiceMapPromise) {
      hanziVoiceMapPromise = loadHanziVoiceMap().catch(err => {
        console.warn('[learning-arcade] hanzi voice index unavailable', err);
        state.hanziVoiceMap = {};
      });
    }
    return hanziVoiceMapPromise;
  }

  function flattenHanziLevels(data) {
    return Object.values(data?.levels || {})
      .flat()
      .filter(item => item?.char && item?.pinyin);
  }

  function readGlobalArray(globalName) {
    const direct = window[globalName];
    if (Array.isArray(direct)) return direct;
    return [];
  }

  function readBundledPinyinCorePack() {
    try {
      return typeof PINYIN_CORE_PACK !== 'undefined' && Array.isArray(PINYIN_CORE_PACK) ? PINYIN_CORE_PACK : [];
    } catch (err) {
      return [];
    }
  }

  function readBundledBridgeVocabFull() {
    try {
      return typeof BRIDGE_VOCAB_FULL !== 'undefined' && Array.isArray(BRIDGE_VOCAB_FULL) ? BRIDGE_VOCAB_FULL : [];
    } catch (err) {
      return [];
    }
  }

  function normalizeExternalHanziEntry(entry, fallbackExample = '') {
    const rawChar = String(entry?.character || entry?.chinese || entry?.word || '').trim();
    const rawPinyin = String(entry?.pinyin || '').trim();
    if (!rawChar || !rawPinyin) return null;
    const exampleWord = Array.isArray(entry?.examples) ? String(entry.examples[0]?.word || '').trim() : '';
    const exampleGloss = Array.isArray(entry?.examples) ? String(entry.examples[0]?.english || '').trim() : '';
    const cleanChar = rawChar.replace(/\s+/g, '');
    const example = exampleWord || fallbackExample || cleanChar || exampleGloss;
    return {
      char: cleanChar,
      pinyin: rawPinyin,
      example,
      answer: cleanChar,
      translation: String(entry?.english || entry?.phrase || entry?.phraseTranslation || '').trim(),
      sourceHanzi: entry
    };
  }

  function sampleExternalHanziPack(source, options = {}) {
    const {
      maxItems = 120,
      maxLength = 2,
      fallbackExample = ''
    } = options;
    const unique = [];
    const seen = new Set();
    source.forEach(item => {
      const normalized = normalizeExternalHanziEntry(item, fallbackExample);
      if (!normalized) return;
      if (normalized.char.length > maxLength) return;
      const normalizedPinyin = normalizePinyin(normalized.pinyin);
      const key = `${normalized.char}:${normalizedPinyin}`;
      if (!normalizedPinyin || seen.has(key)) return;
      seen.add(key);
      unique.push(normalized);
    });
    return unique.slice(0, maxItems);
  }

  function mergeHanziPackItems(...groups) {
    const merged = [];
    const seen = new Set();
    groups.flat().forEach(item => {
      if (!item?.char || !item?.pinyin) return;
      const key = `${item.char}:${normalizePinyin(item.pinyin)}`;
      if (!key || seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });
    return merged;
  }

  function normalizeHanziPacks(data) {
    const levels = data?.levels && typeof data.levels === 'object' ? data.levels : {};
    const entries = Object.entries(levels)
      .filter(([, items]) => Array.isArray(items) && items.some(item => item?.char && item?.pinyin))
      .sort((a, b) => Number(a[0]) - Number(b[0]));
    const packs = [];
    const map = {};
    const fallbackLevelPacks = [];
    entries.forEach(([level, items], index) => {
      const normalizedItems = items.filter(item => item?.char && item?.pinyin);
      const packId = `level-${level}`;
      const packTitle = ['启蒙字', '常见字', '进阶字'][index] || `第${index + 1}组`;
      fallbackLevelPacks.push({
        id: packId,
        title: packTitle,
        description: `${packTitle}拼音题卡。`,
        suitability: index === 0 ? '适合第一次玩。' : (index === 1 ? '适合会一点拼音。' : '适合继续加一点词语。'),
        count: normalizedItems.length
      });
      map[packId] = normalizedItems;
    });
    if (!map['kindergarten-hanzi'] && map['level-1']?.length) {
      packs.push({
        id: 'kindergarten-hanzi',
        title: '认汉字',
        description: '先看单字，适合刚开始玩。',
        suitability: '适合第一次玩。',
        count: map['level-1'].length
      });
      map['kindergarten-hanzi'] = map['level-1'];
    }
    const kindergartenHanziPack = sampleExternalHanziPack(data?.runtimePacks?.hanzi || readGlobalArray('kindergartenHanzi'), {
      maxItems: 160,
      maxLength: 1
    });
    if (kindergartenHanziPack.length) {
      packs.push({
        id: 'kindergarten-hanzi',
        title: '认汉字',
        description: '先看单字，适合刚开始玩。',
        suitability: '适合第一次玩。',
        count: kindergartenHanziPack.length
      });
      map['kindergarten-hanzi'] = kindergartenHanziPack;
    }
    const pinyinCorePack = sampleExternalHanziPack(data?.runtimePacks?.pinyin || readBundledPinyinCorePack(), {
      maxItems: 120,
      maxLength: 1
    });
    if (pinyinCorePack.length) {
      packs.push({
        id: 'kindergarten-pinyin',
        title: '拼音启蒙',
        description: '常用拼音基础卡，容易分辨。',
        suitability: '适合会一点拼音。',
        count: pinyinCorePack.length
      });
      map['kindergarten-pinyin'] = pinyinCorePack;
    }
    const bridgePack = sampleExternalHanziPack(
      (data?.runtimePacks?.bridge || readBundledBridgeVocabFull()).filter(item => String(item?.subject || '').toLowerCase() === 'language'),
      {
        maxItems: 180,
        maxLength: 2,
        fallbackExample: '看汉字，接拼音。'
      }
    );
    if (bridgePack.length) {
      packs.push({
        id: 'bridge-hanzi',
        title: '幼小衔接',
        description: '从单字过渡到常见词语。',
        suitability: '适合已经能认一些字。',
        count: bridgePack.length
      });
      map['bridge-hanzi'] = bridgePack;
    }
    const grade1ReadyPack = mergeHanziPackItems(
      map['level-2'] || [],
      map['level-3'] || [],
      bridgePack.slice(0, 120)
    ).slice(0, 220);
    if (grade1ReadyPack.length) {
      packs.push({
        id: 'grade1-ready',
        title: '一年级预备',
        description: '多一点常见字和词，适合入学前后。',
        suitability: '适合准备上一年级。',
        count: grade1ReadyPack.length
      });
      map['grade1-ready'] = grade1ReadyPack;
    }
    if (!packs.length) {
      packs.push(...fallbackLevelPacks);
    }
    const uniquePacks = [...new Map(packs.map(pack => [pack.id, pack])).values()];
    packs.unshift({
      id: 'all',
      title: '全部题卡',
      description: '把当前可用题卡都放进来。',
      suitability: '适合想混着多玩一会儿。',
      count: 0
    });
    return { packs: [packs[0], ...uniquePacks], map };
  }

  function preferredHanziPackId(packs = state.hanziPacks) {
    return DEFAULT_HANZI_PACK_CANDIDATES.find(packId => packs.some(pack => pack.id === packId)) || 'all';
  }

  function normalizeTypingViewCards(cards) {
    const merged = [];
    const seen = new Set();
    (cards || []).forEach(card => {
      const word = String(card?.word || '').toLowerCase().replace(/[^a-z]/g, '');
      const sourcePackGroup = card.sourcePackGroup || 'minecraft';
      const seenKey = `${sourcePackGroup}:${word}`;
      if (!/^[a-z]{2,16}$/.test(word) || seen.has(seenKey)) return;
      seen.add(seenKey);
      merged.push({
        word,
        translation: card.translation || card.chinese || '',
        image: resolveMinecraftImage(card),
        audio: card.audio ? normalizeAsset(card.audio) : '',
        imagePage: card.imagePage || '',
        level: String(card.level || 'full').toLowerCase(),
        difficulty: Number(card.difficulty) || 1,
        sourceProvider: card.sourceProvider || '',
        sourcePackId: card.sourcePackId || '',
        sourcePackTitle: card.sourcePackTitle || '',
        sourcePackGroup,
        sourcePackGroupTitle: card.sourcePackGroupTitle || sourcePackGroup,
        viewCategory: card.viewCategory || ''
      });
    });
    return merged;
  }

  function normalizeWordPacks(packs) {
    const fallbackPacks = [
      { id: 'minecraft', title: 'Minecraft', description: '我的世界主题词库。' },
      { id: 'all', title: '全部英文', description: '全部外部英文词库。' }
    ];
    const source = Array.isArray(packs) && packs.length ? packs : fallbackPacks;
    return source
      .filter(pack => pack?.id && pack?.title)
      .map(pack => ({
        id: String(pack.id),
        title: String(pack.title),
        description: String(pack.description || ''),
        count: Number(pack.count) || 0,
        files: Array.isArray(pack.files) ? pack.files.map(file => String(file || '')).filter(Boolean) : []
      }));
  }

  function initializeFallbackData() {
    state.allWords = FALLBACK_VOCAB;
    state.wordPacks = normalizeWordPacks([]);
    state.words = wordsForDifficulty();
    state.hanziAll = FALLBACK_HANZI;
    state.hanziLevels = { all: FALLBACK_HANZI };
    state.hanziPacks = [{
      id: 'all',
      title: '全部题卡',
      description: '把当前可用题卡都放进来。',
      suitability: '适合想混着多玩一会儿。',
      count: FALLBACK_HANZI.length
    }];
    state.hanzi = FALLBACK_HANZI;
  }

  function applySavedSettings() {
    state.pinyinStarterSeen = Boolean(savedSettings._pinyinStarterSeen);
    state.snakeStarterSeen = Boolean(savedSettings._snakeStarterSeen);
    state.hasExplicitWordDifficultyChoice = Boolean(
      savedSettings._explicitWordDifficulty
      || (typeof savedSettings.wordDifficulty === 'string' && savedSettings.wordDifficulty !== 'basic')
    );
    if (WORD_DIFFICULTY_OPTIONS.some(option => option.id === savedSettings.wordDifficulty)) {
      state.wordDifficulty = savedSettings.wordDifficulty;
    }
    if (typeof savedSettings.wordPack === 'string' && savedSettings.wordPack) {
      state.wordPack = savedSettings.wordPack;
    }
    if (typeof savedSettings.hanziPack === 'string' && savedSettings.hanziPack) {
      state.hanziPack = savedSettings.hanziPack;
    }
    state.hasExplicitHanziPackChoice = Boolean(
      savedSettings._explicitHanziPack
      || (typeof savedSettings.hanziPack === 'string' && savedSettings.hanziPack !== preferredHanziPackId(state.hanziPacks))
    );
  }

  function applyTypingData(typingViewData) {
    const typingCards = Array.isArray(typingViewData?.cards) ? typingViewData.cards : FALLBACK_VOCAB;
    state.allWords = normalizeTypingViewCards(typingCards);
    state.wordPacks = normalizeWordPacks(typingViewData?.packs);
    state.typingIndexReady = true;
    state.typingPackFiles = {};
    state.typingLoadedPacks = new Set(state.wordPacks.map(pack => pack.id));
    if (state.wordPacks.some(pack => pack.id === savedSettings.wordPack)) {
      state.wordPack = savedSettings.wordPack;
    }
    if (!state.wordPacks.some(pack => pack.id === state.wordPack)) {
      state.wordPack = state.wordPacks[0]?.id || 'minecraft';
    }
    state.words = wordsForDifficulty();
    state.dataReady.typing = true;
  }

  function applyTypingIndex(typingIndexData) {
    const packs = normalizeWordPacks(typingIndexData?.packs);
    state.allWords = [];
    state.wordPacks = packs.length ? packs : normalizeWordPacks([]);
    state.typingPackFiles = Object.fromEntries(state.wordPacks.map(pack => [pack.id, pack.files]));
    state.typingLoadedPacks = new Set();
    state.typingIndexReady = true;
    if (state.wordPacks.some(pack => pack.id === savedSettings.wordPack)) {
      state.wordPack = savedSettings.wordPack;
    }
    if (!state.wordPacks.some(pack => pack.id === state.wordPack)) {
      state.wordPack = state.wordPacks.some(pack => pack.id === 'minecraft')
        ? 'minecraft'
        : (state.wordPacks[0]?.id || 'minecraft');
    }
    state.words = [];
  }

  function mergeTypingPackData(packId, typingPackData) {
    const normalized = normalizeTypingViewCards(typingPackData?.cards);
    const existingKeys = new Set(state.allWords.map(card => `${card.sourcePackGroup}:${card.word}`));
    state.allWords.push(...normalized.filter(card => {
      const key = `${card.sourcePackGroup}:${card.word}`;
      if (existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    }));
    state.typingLoadedPacks.add(packId);
    state.dataReady.typing = true;
  }

  function applyHanziData(hanziData, hanziRuntimeData) {
    const normalizedHanzi = normalizeHanziPacks({ ...hanziData, runtimePacks: hanziRuntimeData });
    const combinedHanzi = Object.values(normalizedHanzi.map).flat();
    const uniqueCombinedHanzi = combinedHanzi.filter((item, index, list) => {
      const key = `${item?.char || ''}:${normalizePinyin(item?.pinyin)}`;
      return key && list.findIndex(candidate => `${candidate?.char || ''}:${normalizePinyin(candidate?.pinyin)}` === key) === index;
    });
    state.hanziAll = uniqueCombinedHanzi.length ? uniqueCombinedHanzi : FALLBACK_HANZI;
    state.hanziLevels = Object.keys(normalizedHanzi.map).length ? { ...normalizedHanzi.map, all: state.hanziAll } : { all: state.hanziAll };
    state.hanziPacks = normalizedHanzi.packs.length ? normalizedHanzi.packs : [{
      id: 'all',
      title: '全部题卡',
      description: '把当前可用题卡都放进来。',
      count: state.hanziAll.length
    }];
    state.hasExplicitHanziPackChoice = Boolean(
      savedSettings._explicitHanziPack
      || (typeof savedSettings.hanziPack === 'string' && savedSettings.hanziPack !== preferredHanziPackId(state.hanziPacks))
    );
    if (state.hanziPacks.some(pack => pack.id === savedSettings.hanziPack)) {
      state.hanziPack = savedSettings.hanziPack;
    } else {
      state.hanziPack = preferredHanziPackId(state.hanziPacks);
    }
    state.hanzi = hanziItemsForPack(state.hanziPack);
    state.dataReady.hanzi = true;
  }

  async function ensureTypingData() {
    if (state.dataReady.typing && state.typingLoadedPacks.has(state.wordPack)) return;
    if (!dataLoadPromises.has('typing-index')) {
      const promise = (async () => {
        if (window.location.protocol === 'file:') {
          try {
            await loadFileFallbackScripts(FILE_TYPING_FALLBACK_SCRIPTS);
          } catch (err) {
            console.warn('[learning-arcade] file typing fallback unavailable', err);
          }
          applyTypingData(await readJson(TYPING_VIEW_URL, { cards: FALLBACK_VOCAB }));
          return;
        }
        applyTypingIndex(await readJson(TYPING_INDEX_URL, { packs: [] }));
      })().catch(err => {
        console.warn('[learning-arcade] typing data unavailable', err);
        applyTypingData({ cards: FALLBACK_VOCAB });
      });
      dataLoadPromises.set('typing-index', promise);
    }
    await dataLoadPromises.get('typing-index');
    if (window.location.protocol !== 'file:') {
      await ensureTypingPack(state.wordPack);
    }
    renderWordDifficultySwitch();
  }

  async function ensureTypingPack(packId = state.wordPack) {
    if (!state.typingIndexReady || state.typingLoadedPacks.has(packId)) return;
    const loadKey = `typing-pack:${packId}`;
    if (!dataLoadPromises.has(loadKey)) {
      const promise = (async () => {
        const files = Array.isArray(state.typingPackFiles[packId]) ? state.typingPackFiles[packId] : [];
        if (!files.length) {
          mergeTypingPackData(packId, { cards: FALLBACK_VOCAB });
          return;
        }
        const data = await Promise.all(files.map(file => readJson(`./assets/generated/${file}`, { cards: FALLBACK_VOCAB })));
        data.forEach(packData => mergeTypingPackData(packId, packData));
      })().catch(err => {
        console.warn(`[learning-arcade] typing pack unavailable: ${packId}`, err);
        mergeTypingPackData(packId, { cards: FALLBACK_VOCAB });
      });
      dataLoadPromises.set(loadKey, promise);
    }
    await dataLoadPromises.get(loadKey);
    if (state.wordPack === packId) {
      state.words = wordsForDifficulty();
    }
  }

  async function ensureHanziData() {
    if (state.dataReady.hanzi) return;
    if (!dataLoadPromises.has('hanzi')) {
      const promise = (async () => {
        try {
          await loadFileFallbackScripts(FILE_HANZI_FALLBACK_SCRIPTS);
        } catch (err) {
          console.warn('[learning-arcade] file hanzi fallback unavailable', err);
        }
        const [hanziData, hanziRuntimeData] = await Promise.all([
          readJson(HANZI_URL, { levels: { 1: FALLBACK_HANZI } }),
          readJson(HANZI_RUNTIME_URL, {})
        ]);
        applyHanziData(hanziData, hanziRuntimeData);
        renderWordDifficultySwitch();
      })().catch(err => {
        console.warn('[learning-arcade] hanzi data unavailable', err);
        applyHanziData({ levels: { 1: FALLBACK_HANZI } }, {});
      });
      dataLoadPromises.set('hanzi', promise);
    }
    await dataLoadPromises.get('hanzi');
  }

  function ensureGameData(gameId) {
    if (gameId === 'word-shooter') return ensureTypingData();
    if (['word-cannon', 'pinyin-snake', 'hanzi-jumper'].includes(gameId)) return ensureHanziData();
    return Promise.resolve();
  }

  function wordsForPack(packId = state.wordPack) {
    const allWords = state.allWords.length ? state.allWords : FALLBACK_VOCAB;
    if (!state.typingIndexReady) {
      if (!allWords.length || packId === 'all') return allWords;
    }
    if (!allWords.length) return [];
    if (packId === 'all') {
      return allWords.filter(word => ['minecraft', 'kindergarten', 'elementary', 'junior_high'].includes(word.sourcePackGroup));
    }
    if (packId === 'curriculum-all') {
      return allWords.filter(word => ['core-english', 'extension-english'].includes(word.sourcePackGroup));
    }
    const filtered = allWords.filter(word => word.sourcePackGroup === packId);
    return filtered;
  }

  function wordPackCount(packId = state.wordPack) {
    const loadedCount = wordsForPack(packId).length;
    if (loadedCount && state.typingLoadedPacks.has(packId)) return loadedCount;
    return Number(state.wordPacks.find(pack => pack.id === packId)?.count) || 0;
  }

  function wordsForDifficulty(level = state.wordDifficulty) {
    const packWords = wordsForPack();
    if (!packWords.length) return FALLBACK_VOCAB;
    if (level === 'full') return packWords;
    const filtered = packWords.filter(word => word.level === level);
    return filtered.length ? filtered : packWords;
  }

  function difficultyMeta(level = state.wordDifficulty) {
    return WORD_DIFFICULTY_OPTIONS.find(option => option.id === level) || WORD_DIFFICULTY_OPTIONS[0];
  }

  function wordDifficultyTuning(level = state.wordDifficulty) {
    return WORD_DIFFICULTY_TUNING[level] || WORD_DIFFICULTY_TUNING.basic;
  }

  function wordShooterStageTheme(level = state.wordDifficulty) {
    return WORD_SHOOTER_STAGE_THEMES[level] || WORD_SHOOTER_STAGE_THEMES.basic;
  }

  function wordShooterMechanic(level = state.wordDifficulty) {
    return WORD_SHOOTER_MECHANICS[level] || WORD_SHOOTER_MECHANICS.basic;
  }

  function wordShooterPhaseForCompletedWords(completedWords = state.wordShooter.completedWords.length) {
    const tuning = wordDifficultyTuning().shooter;
    const phaseIndex = Math.floor(Math.max(0, completedWords) / 5) % 4;
    const phases = [
      { id: 'warmup', label: '预热', maxEnemies: Math.min(2, tuning.maxEnemies), speedMultiplier: tuning.speedMultiplier * 0.86 },
      { id: 'formation', label: '编队', maxEnemies: Math.min(2, tuning.maxEnemies), speedMultiplier: tuning.speedMultiplier * 0.86 },
      { id: 'reward', label: '奖励', maxEnemies: Math.min(2, tuning.maxEnemies), speedMultiplier: tuning.speedMultiplier * 0.98 },
      { id: 'climax', label: '小高潮', maxEnemies: tuning.maxEnemies, speedMultiplier: tuning.speedMultiplier * 1.06 }
    ];
    return phases[phaseIndex];
  }

  function wordShooterLearningSnapshot() {
    const learning = state.wordShooter.learning;
    const resolved = Math.max(0, learning.wordsCompleted);
    const attempts = learning.correctLetters + learning.wrongLetters;
    return {
      tasksPresented: learning.tasksPresented,
      wordsCompleted: resolved,
      firstTryWords: learning.firstTryWords,
      retryWords: learning.retryWords,
      firstTryAccuracy: resolved ? Number((learning.firstTryWords / resolved).toFixed(2)) : 0,
      correctLetters: learning.correctLetters,
      wrongLetters: learning.wrongLetters,
      letterAccuracy: attempts ? Number((learning.correctLetters / attempts).toFixed(2)) : 0,
      targetSwitches: learning.targetSwitches,
      voiceAnnounced: learning.voiceAnnounced,
      voiceEnabled: Boolean(state.soundEnabled)
    };
  }

  function wordCannonLearningSnapshot() {
    const learning = state.wordCannon.learning;
    const choices = learning.correctChoice + learning.wrongChoices;
    return {
      tasksPresented: learning.tasksPresented,
      tasksResolved: learning.tasksResolved,
      correctChoice: learning.correctChoice,
      firstTryCorrect: learning.firstTryCorrect,
      firstTryAccuracy: learning.tasksResolved ? Number((learning.firstTryCorrect / learning.tasksResolved).toFixed(2)) : 0,
      retryCount: learning.retryCount,
      wrongChoices: learning.wrongChoices,
      choiceAccuracy: choices ? Number((learning.correctChoice / choices).toFixed(2)) : 0,
      voiceAnnounced: learning.voiceAnnounced,
      voiceEnabled: Boolean(state.soundEnabled)
    };
  }

  function readSavedSettings() {
    try {
      return JSON.parse(window.localStorage?.getItem(SETTINGS_STORAGE_KEY) || '{}') || {};
    } catch (err) {
      return {};
    }
  }

  function cloneWordShooterProgression(value = WORD_SHOOTER_DEFAULT_PROGRESSION) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeWordShooterProgression(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const normalized = cloneWordShooterProgression();
    normalized.version = 1;
    normalized.level = Math.max(1, Math.floor(Number(source.level) || 1));
    normalized.experience = Math.max(0, Math.floor(Number(source.experience) || 0));
    normalized.starDust = Math.max(0, Math.floor(Number(source.starDust) || 0));
    normalized.totalRuns = Math.max(0, Math.floor(Number(source.totalRuns) || 0));
    normalized.selectedShip = WORD_SHOOTER_SHIPS[source.selectedShip] ? source.selectedShip : 'scout';
    normalized.equippedWeapon = WORD_SHOOTER_WEAPONS[source.equippedWeapon] ? source.equippedWeapon : 'basic';
    Object.keys(WORD_SHOOTER_SHIPS).forEach(shipId => {
      const sourceLevels = source.shipUpgrades?.[shipId];
      Object.keys(WORD_SHOOTER_UPGRADE_COSTS).forEach(upgradeId => {
        normalized.shipUpgrades[shipId][upgradeId] = clampNumber(Math.floor(Number(sourceLevels?.[upgradeId]) || 0), 0, 5);
      });
    });
    normalized.level = Math.max(normalized.level, 1 + Math.floor(normalized.experience / 100));
    return normalized;
  }

  function readWordShooterProgression() {
    try {
      const raw = window.localStorage?.getItem(WORD_SHOOTER_PROGRESSION_STORAGE_KEY);
      return normalizeWordShooterProgression(raw ? JSON.parse(raw) : null);
    } catch (err) {
      console.warn('[WordShooter] progression data was invalid; using defaults.', err);
      return cloneWordShooterProgression();
    }
  }

  let wordShooterProgression = readWordShooterProgression();

  function saveWordShooterProgression() {
    try {
      window.localStorage?.setItem(
        WORD_SHOOTER_PROGRESSION_STORAGE_KEY,
        JSON.stringify(wordShooterProgression)
      );
      return true;
    } catch (err) {
      console.warn('[WordShooter] progression could not be saved.', err);
      return false;
    }
  }

  function getWordShooterLoadout() {
    const shipId = wordShooterProgression.selectedShip;
    const ship = WORD_SHOOTER_SHIPS[shipId] || WORD_SHOOTER_SHIPS.scout;
    const upgrade = wordShooterProgression.shipUpgrades[ship.id] || WORD_SHOOTER_DEFAULT_PROGRESSION.shipUpgrades.scout;
    const weaponId = wordShooterProgression.equippedWeapon;
    const weapon = WORD_SHOOTER_WEAPONS[weaponId] || WORD_SHOOTER_WEAPONS.basic;
    return {
      ship: { ...ship },
      weapon: { ...weapon },
      shipId: ship.id,
      weaponId: weapon.id,
      speedMultiplier: ship.speedMultiplier + upgrade.speed * 0.06,
      shield: ship.shield + upgrade.shield,
      fireMultiplier: ship.fireMultiplier + upgrade.fire * 0.08,
      comboMultiplier: ship.comboMultiplier + upgrade.fire * 0.02,
      upgrades: { ...upgrade }
    };
  }

  function wordShooterProgressionSnapshot() {
    return {
      ...cloneWordShooterProgression(wordShooterProgression),
      loadout: getWordShooterLoadout()
    };
  }

  function renderWordShooterHangar() {
    const loadout = getWordShooterLoadout();
    const progress = wordShooterProgression;
    if (els.wordShooterHangar) els.wordShooterHangar.hidden = false;
    if (els.wordShooterStarDust) els.wordShooterStarDust.textContent = `星尘 ${progress.starDust}`;
    if (els.wordShooterLoadoutSummary) {
      els.wordShooterLoadoutSummary.textContent = `${loadout.ship.label} · ${loadout.weapon.label} · Lv.${progress.level}`;
    }
    if (els.wordShooterShipOptions) {
      els.wordShooterShipOptions.innerHTML = Object.values(WORD_SHOOTER_SHIPS).map(ship => {
        const levels = progress.shipUpgrades[ship.id];
        const selected = ship.id === progress.selectedShip;
        return `<button class="hangar-option hangar-ship-option${selected ? ' is-active' : ''}" type="button" data-hangar-ship="${ship.id}" aria-pressed="${selected}">
          <span class="hangar-ship-silhouette" data-hangar-ship-art="${ship.id}"></span>
          <span class="hangar-option-copy"><strong>${ship.label}</strong><small>${ship.description}</small><em>机动 ${levels.speed} · 护盾 ${ship.shield + levels.shield}</em></span>
        </button>`;
      }).join('');
    }
    if (els.wordShooterWeaponOptions) {
      els.wordShooterWeaponOptions.innerHTML = Object.values(WORD_SHOOTER_WEAPONS).map(weapon => {
        const selected = weapon.id === progress.equippedWeapon;
        const detail = weapon.id === 'basic' ? '稳定连射' : weapon.label;
        return `<button class="hangar-option hangar-weapon-option${selected ? ' is-active' : ''}" type="button" data-hangar-weapon="${weapon.id}" aria-pressed="${selected}">
          <span class="hangar-weapon-mark" data-weapon="${weapon.id}"></span><span><strong>${weapon.label}</strong><small>${detail}</small></span>
        </button>`;
      }).join('');
    }
    if (els.wordShooterUpgradeOptions) {
      const levels = progress.shipUpgrades[progress.selectedShip];
      els.wordShooterUpgradeOptions.innerHTML = Object.entries(WORD_SHOOTER_UPGRADE_COSTS).map(([upgradeId, cost]) => {
        const level = levels[upgradeId];
        const canBuy = progress.starDust >= cost && level < 5;
        return `<button class="hangar-upgrade-button" type="button" data-hangar-upgrade="${upgradeId}" ${canBuy ? '' : 'disabled'}>
          <span><strong>${WORD_SHOOTER_UPGRADE_LABELS[upgradeId]}</strong><small>等级 ${level}/5</small></span><b>${level >= 5 ? 'MAX' : `${cost} 星尘`}</b>
        </button>`;
      }).join('');
    }
  }

  function selectWordShooterShip(shipId) {
    if (!WORD_SHOOTER_SHIPS[shipId]) return false;
    wordShooterProgression.selectedShip = shipId;
    saveWordShooterProgression();
    const loadout = getWordShooterLoadout();
    state.wordShooter.shipId = loadout.shipId;
    state.wordShooter.shield = Math.min(state.wordShooter.shield, loadout.shield);
    renderWordShooterHangar();
    if (state.activeGame === 'word-shooter') renderTypingArena();
    return true;
  }

  function equipWordShooterWeapon(weaponId) {
    if (!WORD_SHOOTER_WEAPONS[weaponId]) return false;
    wordShooterProgression.equippedWeapon = weaponId;
    saveWordShooterProgression();
    state.wordShooter.baseWeaponId = weaponId;
    state.wordShooter.weaponId = weaponId;
    state.wordShooter.weaponExpiresAt = 0;
    renderWordShooterHangar();
    if (state.activeGame === 'word-shooter') renderTypingArena();
    return true;
  }

  function upgradeWordShooterShip(upgradeId) {
    if (!WORD_SHOOTER_UPGRADE_COSTS[upgradeId]) return false;
    const shipId = wordShooterProgression.selectedShip;
    const levels = wordShooterProgression.shipUpgrades[shipId];
    const cost = WORD_SHOOTER_UPGRADE_COSTS[upgradeId];
    if (levels[upgradeId] >= 5 || wordShooterProgression.starDust < cost) return false;
    wordShooterProgression.starDust -= cost;
    levels[upgradeId] += 1;
    saveWordShooterProgression();
    renderWordShooterHangar();
    if (state.activeGame === 'word-shooter') renderTypingArena();
    return true;
  }

  function settleWordShooterProgression(completedCount, score) {
    const ws = state.wordShooter;
    if (ws.rewardClaimed) return null;
    ws.rewardClaimed = true;
    const dust = Math.max(3, Math.floor(completedCount / 2) + Math.floor(Math.max(0, score) / 12));
    wordShooterProgression.starDust += dust;
    wordShooterProgression.experience += completedCount * 12;
    wordShooterProgression.totalRuns += 1;
    wordShooterProgression.level = Math.max(1, 1 + Math.floor(wordShooterProgression.experience / 100));
    saveWordShooterProgression();
    renderWordShooterHangar();
    return { starDust: dust, level: wordShooterProgression.level };
  }

  function saveSettings() {
    try {
      window.localStorage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
        wordPack: state.wordPack,
        wordDifficulty: state.wordDifficulty,
        hanziPack: state.hanziPack,
        _explicitWordDifficulty: state.hasExplicitWordDifficultyChoice,
        _explicitHanziPack: state.hasExplicitHanziPackChoice,
        _pinyinStarterSeen: state.pinyinStarterSeen,
        _snakeStarterSeen: state.snakeStarterSeen
      }));
      emitLearningArcadeBridge('settings', {
        wordDifficulty: state.wordDifficulty,
        wordPack: state.wordPack,
        hanziPack: state.hanziPack
      });
    } catch (err) {
      // Ignore private-mode or disabled-storage failures; settings are a convenience.
    }
  }

  function renderDifficultyBadge(target, gameId, level = state.wordDifficulty) {
    if (!target) return;
    const meta = difficultyMeta(level);
    const tuning = wordDifficultyTuning(level);
    const pack = currentWordPackMeta();
    const packCount = wordsForPack(pack.id).length;
    const hanziPack = currentHanziPackMeta();
    const hanziPackCount = hanziItemsForPack(hanziPack.id).length;
    const copy = gameId === 'word-cannon'
      ? `${hanziPack.title} ${hanziPackCount}卡 · ${tuning.cannon.roundGoal}词 · 3车道 · ${tuning.cannon.speedMultiplier > 1 ? '高速' : '稳速'}`
      : `${pack.title} ${packCount}词 · ${tuning.shooter.roundGoal}词 · ${tuning.shooter.maxEnemies}架 · ${tuning.shooter.speedMultiplier > 1 ? '高速' : '稳速'}`;
    target.dataset.difficulty = level;
    target.innerHTML = `<strong>${meta.badge}</strong><span>${copy}</span>`;
  }

  function currentWordPackMeta(packId = state.wordPack) {
    return state.wordPacks.find(pack => pack.id === packId)
      || state.wordPacks.find(pack => pack.id === 'minecraft')
      || { id: 'minecraft', title: 'Minecraft', count: wordsForPack('minecraft').length };
  }

  function renderWordPackSwitch() {
    if (!els.wordPackSwitch) return;
    const packs = state.wordPacks.length ? state.wordPacks : normalizeWordPacks([]);
    els.wordPackSwitch.innerHTML = packs.map(pack => `
      <button
        class="difficulty-chip${state.wordPack === pack.id ? ' is-active' : ''}"
        type="button"
        data-word-pack="${pack.id}"
        aria-pressed="${state.wordPack === pack.id ? 'true' : 'false'}"
        title="${pack.description || `${pack.title}词库`}">
        <span>${pack.title}</span>
        <small>${wordPackCount(pack.id)}</small>
      </button>
    `).join('');
  }

  function hanziItemsForPack(packId = state.hanziPack) {
    if (packId === 'all') return state.hanziAll.length ? state.hanziAll : FALLBACK_HANZI;
    const items = state.hanziLevels[packId];
    return Array.isArray(items) && items.length ? items : (state.hanziAll.length ? state.hanziAll : FALLBACK_HANZI);
  }

  function currentHanziPackMeta(packId = state.hanziPack) {
    return state.hanziPacks.find(pack => pack.id === packId)
      || state.hanziPacks[0]
      || { id: 'all', title: '全部题卡', count: hanziItemsForPack('all').length };
  }

  function renderHanziPackSwitch() {
    if (!els.cannonPackSwitch) return;
    const packs = state.hanziPacks.length ? state.hanziPacks : [{ id: 'all', title: '全部题卡', description: '全部拼音题卡。', count: state.hanziAll.length }];
    els.cannonPackSwitch.innerHTML = packs.map(pack => `
      <button
        class="difficulty-chip${state.hanziPack === pack.id ? ' is-active' : ''}"
        type="button"
        data-hanzi-pack="${pack.id}"
        aria-pressed="${state.hanziPack === pack.id ? 'true' : 'false'}"
        title="${pack.description || `${pack.title}拼音题卡`}">
        <span>${pack.title}</span>
        <small>${hanziItemsForPack(pack.id).length}</small>
      </button>
    `).join('');
    const activePack = currentHanziPackMeta();
    if (els.cannonPackHint) {
      els.cannonPackHint.textContent = `${activePack.description || ''}${activePack.suitability ? ` ${activePack.suitability}` : ''}`.trim();
    }
  }

  function renderWordCannonMapSwitch() {
    if (!els.cannonMapSwitch) return;
    const wc = state.wordCannon;
    els.cannonMapSwitch.innerHTML = WORD_CANNON_MAPS.map((map, index) => `
      <button class="difficulty-chip${wc.mapIndex === index ? ' is-active' : ''}" type="button" data-cannon-map="${index}" aria-pressed="${wc.mapIndex === index ? 'true' : 'false'}">
        <span>${map.title}</span>
      </button>
    `).join('');
  }

  function triggerDifficultyCue(gameId = state.activeGame, level = state.wordDifficulty) {
    const badge = gameId === 'word-cannon' ? els.cannonDifficultyBadge : els.wordDifficultyBadge;
    if (!badge) return;
    state.difficultyCue = { gameId, level };
    if (difficultyCueTimer) window.clearTimeout(difficultyCueTimer);
    badge.classList.remove('is-pulsing');
    void badge.offsetWidth;
    badge.classList.add('is-pulsing');
    difficultyCueTimer = window.setTimeout(() => {
      badge.classList.remove('is-pulsing');
      difficultyCueTimer = null;
    }, 1200);
    sfx.difficulty(level);
  }

  function renderWordDifficultySwitch() {
    const markup = WORD_DIFFICULTY_OPTIONS.map(option => `
      <button
        class="difficulty-chip${state.wordDifficulty === option.id ? ' is-active' : ''}"
        type="button"
        data-word-difficulty="${option.id}"
        aria-pressed="${state.wordDifficulty === option.id ? 'true' : 'false'}"
        title="${option.description}">
        ${option.label}
      </button>
    `).join('');
    if (els.wordDifficultySwitch) els.wordDifficultySwitch.innerHTML = markup;
    if (els.cannonDifficultySwitch) els.cannonDifficultySwitch.innerHTML = markup;
    renderWordPackSwitch();
    renderHanziPackSwitch();
    renderWordCannonMapSwitch();
    renderDifficultyBadge(els.wordDifficultyBadge, 'word-shooter');
    renderDifficultyBadge(els.cannonDifficultyBadge, 'word-cannon');
  }

  async function setWordPack(packId, options = {}) {
    if (!state.wordPacks.some(pack => pack.id === packId)) return;
    if (state.wordPack === packId && !options.force) return;
    const requestId = ++state.wordPackRequestId;
    if (state.typingIndexReady) await ensureTypingPack(packId);
    if (state.wordPackRequestId !== requestId) return;
    state.wordPack = packId;
    state.words = wordsForDifficulty();
    state.wordIndex = 0;
    state.input = '';
    if (!options.skipSave) saveSettings();
    renderWordDifficultySwitch();
    if (options.restart && state.activeGame === 'word-shooter') {
      await openGame('word-shooter');
    }
    if (state.activeGame === 'word-shooter') {
      triggerDifficultyCue('word-shooter', state.wordDifficulty);
    }
  }

  function setWordDifficulty(level, options = {}) {
    if (!WORD_DIFFICULTY_OPTIONS.some(option => option.id === level)) return;
    if (state.wordDifficulty === level && !options.force) return;
    state.wordDifficulty = level;
    if (options.explicit !== false) state.hasExplicitWordDifficultyChoice = true;
    state.words = wordsForDifficulty(level);
    state.wordIndex = 0;
    state.input = '';
    if (!options.skipSave) saveSettings();
    renderWordDifficultySwitch();
    if (options.restart && (state.activeGame === 'word-shooter' || state.activeGame === 'word-cannon')) {
      openGame(state.activeGame);
    }
    if (state.activeGame === 'word-shooter' || state.activeGame === 'word-cannon') {
      triggerDifficultyCue(state.activeGame, level);
    }
  }

  function setHanziPack(packId, options = {}) {
    if (!state.hanziPacks.some(pack => pack.id === packId)) return;
    if (state.hanziPack === packId && !options.force) return;
    state.hanziPack = packId;
    if (options.explicit !== false) state.hasExplicitHanziPackChoice = true;
    state.hanzi = hanziItemsForPack(packId);
    if (!options.skipSave) saveSettings();
    renderWordDifficultySwitch();
    if (options.restart && (state.activeGame === 'word-cannon' || state.activeGame === 'pinyin-snake')) {
      openGame(state.activeGame);
    }
  }

  function resetWordSettings(options = {}) {
    state.wordPack = state.wordPacks.some(pack => pack.id === 'minecraft')
      ? 'minecraft'
      : (state.wordPacks[0]?.id || 'minecraft');
    state.wordDifficulty = 'basic';
    state.words = wordsForDifficulty();
    state.wordIndex = 0;
    state.input = '';
    saveSettings();
    renderWordDifficultySwitch();
    if (options.restart && state.activeGame === 'word-shooter') {
      openGame('word-shooter');
    }
    if (state.activeGame === 'word-shooter') {
      triggerDifficultyCue('word-shooter', state.wordDifficulty);
    }
  }

  function resetCannonSettings(options = {}) {
    const recommendedPack = preferredHanziPackId(state.hanziPacks);
    state.hanziPack = recommendedPack;
    state.hanzi = hanziItemsForPack(recommendedPack);
    state.wordDifficulty = 'basic';
    state.hasExplicitHanziPackChoice = true;
    state.hasExplicitWordDifficultyChoice = true;
    state.pinyinStarterSeen = true;
    saveSettings();
    renderWordDifficultySwitch();
    if (options.restart && state.activeGame === 'word-cannon') {
      openGame('word-cannon');
    }
    if (state.activeGame === 'word-cannon') {
      triggerDifficultyCue('word-cannon', state.wordDifficulty);
    }
  }

  function createSfx() {
    let context = null;
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    function getAudioContext() {
      if (!state.soundEnabled || !AudioCtor) return null;
      if (!context) context = new AudioCtor();
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    }
    function tone(frequency, duration = 0.07, gainValue = 0.04) {
      const audioContext = getAudioContext();
      if (!audioContext) return;
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.025);
    }
    function sweepTone(fromFrequency, toFrequency, duration = 0.12, gainValue = 0.03, type = 'sawtooth') {
      const audioContext = getAudioContext();
      if (!audioContext) return;
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(Math.max(20, fromFrequency), now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, toFrequency), now + duration);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.025);
    }
    function noiseBurst(duration = 0.1, gainValue = 0.03, filterType = 'lowpass', frequency = 520) {
      const audioContext = getAudioContext();
      if (!audioContext) return;
      const now = audioContext.currentTime;
      const frameCount = Math.max(1, Math.floor(audioContext.sampleRate * duration));
      const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < frameCount; index += 1) {
        const fade = 1 - (index / frameCount);
        data[index] = (Math.random() * 2 - 1) * fade;
      }
      const source = audioContext.createBufferSource();
      const filter = audioContext.createBiquadFilter();
      const gain = audioContext.createGain();
      source.buffer = buffer;
      filter.type = filterType;
      filter.frequency.setValueAtTime(frequency, now);
      gain.gain.setValueAtTime(gainValue, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(audioContext.destination);
      source.start(now);
      source.stop(now + duration + 0.02);
    }
    function laserClick(baseFrequency = 560) {
      const audioContext = getAudioContext();
      if (!audioContext) return;
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(baseFrequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.022, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.07);
    }
    function weaponShot(type = 'basic') {
      if (type === 'triple-beam') {
        tone(640, 0.05, 0.038);
        window.setTimeout(() => tone(760, 0.045, 0.028), 20);
        window.setTimeout(() => tone(880, 0.04, 0.024), 42);
        sweepTone(720, 1040, 0.09, 0.014, 'square');
        return;
      }
      if (type === 'homing-missile') {
        tone(220, 0.09, 0.05);
        sweepTone(180, 92, 0.22, 0.02, 'sawtooth');
        noiseBurst(0.08, 0.014, 'lowpass', 420);
        window.setTimeout(() => tone(320, 0.12, 0.03), 55);
        return;
      }
      if (type === 'pierce-laser') {
        tone(860, 0.09, 0.045);
        sweepTone(620, 1320, 0.13, 0.024, 'sine');
        noiseBurst(0.045, 0.01, 'bandpass', 1400);
        window.setTimeout(() => tone(1180, 0.08, 0.026), 26);
        return;
      }
      laserClick(560);
      tone(560, 0.034, 0.028);
      window.setTimeout(() => tone(650, 0.03, 0.024), 12);
      window.setTimeout(() => tone(760, 0.034, 0.02), 28);
    }
    function impact(type = 'basic') {
      if (type === 'homing-missile') {
        tone(180, 0.12, 0.05);
        noiseBurst(0.2, 0.055, 'lowpass', 260);
        sweepTone(150, 70, 0.18, 0.018, 'sawtooth');
        window.setTimeout(() => tone(120, 0.14, 0.03), 36);
        return;
      }
      if (type === 'pierce-laser') {
        tone(940, 0.06, 0.032);
        noiseBurst(0.07, 0.02, 'bandpass', 920);
        sweepTone(1320, 520, 0.09, 0.015, 'triangle');
        window.setTimeout(() => tone(520, 0.07, 0.026), 18);
        return;
      }
      tone(360, 0.08, 0.03);
      noiseBurst(0.07, 0.012, 'highpass', 720);
      window.setTimeout(() => tone(220, 0.06, 0.018), 22);
    }
    function pickup() {
      tone(560, 0.05, 0.03);
      sweepTone(540, 1120, 0.14, 0.018, 'sine');
      window.setTimeout(() => tone(720, 0.06, 0.03), 28);
      window.setTimeout(() => tone(920, 0.08, 0.024), 70);
    }
    function lock() {
      tone(430, 0.04, 0.02);
      window.setTimeout(() => tone(650, 0.04, 0.02), 24);
    }
    function difficulty(level = 'basic') {
      const tones = {
        basic: [420, 560],
        intermediate: [520, 720],
        full: [640, 920]
      }[level] || [460, 620];
      tone(tones[0], 0.055, 0.022);
      window.setTimeout(() => tone(tones[1], 0.07, 0.024), 42);
    }
    return {
      tick: () => { tone(520); window.setTimeout(() => tone(720, 0.06, 0.03), 35); },
      wrong: () => tone(170, 0.12, 0.035),
      done: () => { tone(420); window.setTimeout(() => tone(640), 65); },
      move: () => tone(300, 0.045, 0.025),
      weaponShot,
      impact,
      pickup,
      lock,
      difficulty
    };
  }

  const sfx = createSfx();

  function speakText(text, lang) {
    if (!text || !state.soundEnabled || !('speechSynthesis' in window)) return Promise.resolve();
    return new Promise(resolve => {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = lang === 'zh-CN' ? 0.92 : 0.84;
        utterance.onend = resolve;
        utterance.onerror = resolve;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        resolve();
      }
    });
  }

  function cleanVoiceText(text) {
    return String(text || '').replace(/\s+/g, '').trim();
  }

  function stopHanziVoicePlayback() {
    state.hanziVoiceToken += 1;
    if (state.hanziVoiceAudio) {
      try {
        state.hanziVoiceAudio.pause();
        state.hanziVoiceAudio.src = '';
      } catch (err) {
        console.warn('[learning-arcade] failed to stop hanzi voice audio', err);
      }
      state.hanziVoiceAudio = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  function hanziVoiceUrl(text) {
    const key = cleanVoiceText(text);
    const digest = key ? state.hanziVoiceMap[key] : '';
    return digest ? `${HANZI_SHARED_VOICE_ASSET_BASE}/${digest}.mp3` : '';
  }

  function playHanziLocalVoice(url, token) {
    return new Promise(resolve => {
      const audio = new Audio(url);
      state.hanziVoiceAudio = audio;
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        if (token !== state.hanziVoiceToken) {
          resolve();
          return;
        }
        state.hanziVoiceAudio = null;
        resolve();
      };
      audio.onended = finish;
      audio.onerror = finish;
      audio.play().catch(finish);
      window.setTimeout(finish, 1800);
    });
  }

  function playHanziSpeechFallback(text, lang, token) {
    return new Promise(resolve => {
      if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined' || !text || !state.soundEnabled) {
        resolve();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = lang === 'zh-CN' ? 0.9 : 0.84;
      utterance.onend = () => {
        if (token === state.hanziVoiceToken) {
          resolve();
        }
      };
      utterance.onerror = () => {
        if (token === state.hanziVoiceToken) {
          resolve();
        }
      };
      window.speechSynthesis.speak(utterance);
      window.setTimeout(() => {
        if (token === state.hanziVoiceToken) {
          resolve();
        }
      }, 2200);
    });
  }

  async function speakHanziTask(lines) {
    const filtered = Array.isArray(lines)
      ? lines.filter(line => line && line.text)
      : [];
    if (!filtered.length) {
      return;
    }
    await ensureHanziVoiceMap();
    stopHanziVoicePlayback();
    const token = state.hanziVoiceToken;
    for (const line of filtered) {
      if (token !== state.hanziVoiceToken) {
        return;
      }
      const url = hanziVoiceUrl(line.text);
      if (url && state.soundEnabled) {
        await playHanziLocalVoice(url, token);
      } else {
        await playHanziSpeechFallback(line.text, line.lang || 'zh-CN', token);
      }
    }
  }

  function playWordAudio(word) {
    if (!word?.audio || !state.soundEnabled) return speakText(word?.word, 'en-US');
    return new Promise(resolve => {
      try {
        if (state.audio) state.audio.pause();
        state.audio = new Audio(word.audio);
        state.audio.onended = resolve;
        state.audio.onerror = () => {
          speakText(word.word, 'en-US').then(resolve);
        };
        state.audio.play().catch(() => speakText(word.word, 'en-US').then(resolve));
      } catch (err) {
        speakText(word.word, 'en-US').then(resolve);
      }
    });
  }

  async function speakSequence(word) {
    await playWordAudio(word);
    await new Promise(resolve => window.setTimeout(resolve, 180));
    await speakText(word.translation || word.word, 'zh-CN');
  }

  function currentWord() {
    if (state.activeGame === 'word-shooter') {
      const focusEnemy = focusWordShooterEnemy();
      if (focusEnemy?.wordData) return focusEnemy.wordData;
    }
    if (state.activeGame === 'word-cannon') {
      const focusTarget = focusWordCannonTarget();
      if (focusTarget?.wordData) return focusTarget.wordData;
    }
    return state.words[state.wordIndex] || state.words[0];
  }

  function renderHomeCards() {
    if (!state.content.games?.length) return;
    els.gameCards.innerHTML = state.content.games.map(game => `
      <button class="game-card learn-portal-card" type="button" data-game="${game.id}">
        <img src="${game.image}" alt="" loading="lazy">
        <span>${game.kicker}</span>
        <strong>${game.title}</strong>
        <p>${game.description}</p>
        <em>${game.input}</em>
      </button>
    `).join('');
    if (els.homeTipsTitle) {
      els.homeTipsTitle.textContent = '轻松玩一局';
    }
    if (els.homeNotes) {
      const notes = Array.isArray(state.content.homeNotes) ? state.content.homeNotes.filter(Boolean) : [];
      els.homeNotes.innerHTML = (notes.length ? notes : ['英文、拼音、方向键分开练。先玩得住，再慢慢熟悉键盘。'])
        .map(note => `<p>${note}</p>`)
        .join('');
    }
  }

  function hideRoundSummary() {
    state.roundSummary.visible = false;
    state.roundSummary.gameId = '';
    els.roundSummary.hidden = true;
    els.gameScreen.dataset.roundSummary = 'false';
  }

  function renderRoundSummary() {
    const summary = state.roundSummary;
    els.roundSummaryKicker.textContent = summary.kicker;
    els.roundSummaryTitle.textContent = summary.title;
    els.roundSummaryCopy.textContent = summary.copy;
    els.roundSummaryCard.dataset.summaryGame = summary.gameId;
    els.roundSummaryStats.innerHTML = summary.stats.map(item => `
      <article class="round-summary-stat">
        <span>${item.label}</span>
        <strong>${item.value}</strong>
      </article>
    `).join('');
    els.roundSummary.hidden = !summary.visible;
    els.gameScreen.dataset.roundSummary = summary.visible ? 'true' : 'false';
  }

  function roundRewardFor(gameId, completedCount) {
    const level = state.wordDifficulty;
    const meta = difficultyMeta(level);
    const coinRate = { basic: 10, intermediate: 14, full: 20 }[level] || 10;
    const diamonds = { basic: 0, intermediate: 1, full: 3 }[level] || 0;
    const upgradeItems = {
      'word-shooter': {
        basic: '激光炮芯片',
        intermediate: '导弹蓝图',
        full: '弓箭矩阵'
      },
      'word-cannon': {
        basic: '轮胎升级',
        intermediate: '氮气加速',
        full: '星核引擎'
      }
    };
    return {
      tier: meta.badge,
      title: `${meta.badge}完成`,
      coins: completedCount * coinRate,
      stars: 3,
      diamonds,
      upgrade: upgradeItems[gameId]?.[level] || '武器升级'
    };
  }

  function roundRewardForSnake(score) {
    return {
      tier: '方向键热身',
      title: '方向键热身完成',
      coins: score * 8,
      stars: 2,
      upgrade: '尾巴加长'
    };
  }

  function learningRoundStats(gameId) {
    if (gameId === 'word-shooter') {
      const learning = wordShooterLearningSnapshot();
      return [
        { label: '首答正确', value: `${learning.firstTryWords}/${learning.wordsCompleted}` },
        { label: '字母准确率', value: `${Math.round(learning.letterAccuracy * 100)}%` }
      ];
    }
    if (gameId === 'word-cannon') {
      const learning = wordCannonLearningSnapshot();
      return [
        { label: '首选正确', value: `${learning.firstTryCorrect}/${learning.tasksResolved}` },
        { label: '再试次数', value: String(learning.retryCount) }
      ];
    }
    return [];
  }

  function enhanceRoundSummary(gameId, payload) {
    if (['word-shooter', 'word-cannon'].includes(gameId) && payload.title === '任务完成') {
      const completedStat = payload.stats.find(item => ['击破单词', '击破拼音', '接到拼音'].includes(item.label));
      const completedCount = Number(String(completedStat?.value || '0').split('/')[0]) || 0;
      const reward = roundRewardFor(gameId, completedCount);
      const shooterProgressionReward = gameId === 'word-shooter'
        ? settleWordShooterProgression(completedCount, Number(payload.stats.find(item => item.label === '总得分')?.value) || 0)
        : null;
      const reviewStats = gameId === 'word-cannon'
        ? pinyinRoundReviewStats()
        : [];
      const learningStats = learningRoundStats(gameId);
      const rewardStats = [
        { label: '本局模式', value: reward.tier },
        ...learningStats,
        ...reviewStats,
        { label: '金币', value: `+${reward.coins}` },
        { label: '星星', value: `+${reward.stars}` },
        ...(reward.diamonds ? [{ label: '钻石', value: `+${reward.diamonds}` }] : []),
        { label: '武器升级', value: reward.upgrade },
        ...(shooterProgressionReward ? [
          { label: '星尘', value: `+${shooterProgressionReward.starDust}` },
          { label: '机库等级', value: `Lv.${shooterProgressionReward.level}` }
        ] : [])
      ];
      return {
        ...payload,
        title: reward.title,
        copy: `${payload.copy} 获得金币、星星和${reward.upgrade}。`,
        stats: [...payload.stats, ...rewardStats]
      };
    }

    if (gameId === 'pinyin-snake' && payload.title === '拼音完成') {
      const reward = roundRewardForSnake(state.snake.score);
      const rewardStats = [
        { label: '本局模式', value: reward.tier },
        { label: '金币', value: `+${reward.coins}` },
        { label: '星星', value: `+${reward.stars}` },
        { label: '路线升级', value: reward.upgrade }
      ];
      return {
        ...payload,
        title: reward.title,
        copy: `${payload.copy} 方向键已经更顺手了，继续一局会更轻松。`,
        stats: [...payload.stats, ...rewardStats]
      };
    }

    return payload;
  }

  function pinyinRoundReviewStats() {
    const review = state.wordCannon.completedReview
      .filter(item => item?.char && item?.pinyin)
      .slice(-4);
    if (!review.length) return [];
    const value = review.map(item => `${item.char} ${item.pinyin}`).join(' · ');
    return [{ label: '复习一下', value }];
  }

  function finishRound(gameId, payload) {
    const summaryPayload = enhanceRoundSummary(gameId, payload);
    stopWordShooter();
    stopWordCannon();
    stopSnake();
    stopHanziJumper();
    state.roundSummary.visible = true;
    state.roundSummary.gameId = gameId;
    state.roundSummary.kicker = summaryPayload.kicker;
    state.roundSummary.title = summaryPayload.title;
    state.roundSummary.copy = summaryPayload.copy;
    state.roundSummary.stats = summaryPayload.stats;
    renderRoundSummary();
    emitLearningArcadeBridge('result', {
      gameId,
      gameLabel: bridgeGameLabel(gameId),
      title: summaryPayload.title,
      copy: summaryPayload.copy,
      stats: summaryPayload.stats
    });
  }

  function replayActiveRound() {
    const gameId = state.roundSummary.gameId || state.activeGame;
    if (!gameId || gameId === 'home') return;
    hideRoundSummary();
    openGame(gameId);
  }

  function showHome() {
    stopWordShooter();
    stopWordCannon();
    stopSnake();
    stopHanziJumper();
    hideRoundSummary();
    state.activeGame = 'home';
    els.gameHome.hidden = false;
    els.gameHome.removeAttribute('aria-hidden');
    els.gameScreen.hidden = true;
    els.gameScreen.removeAttribute('aria-busy');
    els.gameScreen.dataset.activeGame = 'home';
    document.querySelectorAll('[data-game-panel]').forEach(panel => { panel.hidden = true; });
  }

  async function openGame(gameId) {
    if (!['word-shooter', 'word-cannon', 'pinyin-snake', 'hanzi-jumper'].includes(gameId)) return;
    stopWordShooter();
    stopWordCannon();
    stopSnake();
    stopHanziJumper();
    hideRoundSummary();
    state.activeGame = gameId;
    els.gameScreen.hidden = false;
    els.gameScreen.dataset.activeGame = gameId;
    els.gameScreen.setAttribute('aria-busy', 'true');
    els.gameScreen.focus({ preventScroll: true });
    els.gameHome.hidden = true;
    els.gameHome.setAttribute('aria-hidden', 'true');
    document.querySelectorAll('[data-game-panel]').forEach(panel => { panel.hidden = true; });
    await ensureGameData(gameId);
    if (state.activeGame !== gameId) return;
    document.querySelectorAll('[data-game-panel]').forEach(panel => {
      panel.hidden = panel.dataset.gamePanel !== gameId;
    });
    if (gameId === 'word-cannon' && !state.pinyinStarterSeen && !state.hasExplicitHanziPackChoice) {
      const recommendedPack = preferredHanziPackId(state.hanziPacks);
      if (recommendedPack && state.hanziPack !== recommendedPack) {
        setHanziPack(recommendedPack, { skipSave: true, explicit: false });
      }
      if (!state.hasExplicitWordDifficultyChoice && state.wordDifficulty !== 'basic') {
        setWordDifficulty('basic', { skipSave: true, explicit: false });
      }
    }
    renderWordDifficultySwitch();
    els.gameScreen.removeAttribute('aria-busy');
    if (gameId === 'word-shooter') startWordShooter();
    if (gameId === 'word-cannon') {
      startWordCannon();
      if (!state.pinyinStarterSeen && !state.hasExplicitHanziPackChoice) {
        const starterPack = currentHanziPackMeta();
        if (els.cannonFeedback) {
          els.cannonFeedback.textContent = `第一次玩，先从 ${starterPack.title} + ${difficultyMeta('basic').label} 开始。`;
        }
        state.pinyinStarterSeen = true;
        saveSettings();
      }
    }
    if (gameId === 'pinyin-snake') {
      startPinyinSnake();
      if (!state.snakeStarterSeen) {
        if (els.snakeFeedback) {
          els.snakeFeedback.textContent = '先把方向键按顺，再慢慢吃对高亮拼音块。';
        }
        state.snakeStarterSeen = true;
        saveSettings();
      }
    }
    emitLearningArcadeBridge('start', {
      gameId,
      gameLabel: bridgeGameLabel(gameId)
    });
    if (gameId === 'hanzi-jumper') startHanziJumper();
    window.setTimeout(() => els.gameScreen?.focus({ preventScroll: true }), 0);
  }

  function restoreActiveGameInputFocus() {
    if (state.activeGame === 'home' || els.gameScreen.hidden) return;
    els.gameScreen?.focus({ preventScroll: true });
  }

  function initialGameFromQuery() {
    try {
      const params = new URLSearchParams(window.location.search || '');
      const gameId = String(params.get('game') || '').trim();
      return ['word-shooter', 'word-cannon', 'pinyin-snake', 'hanzi-jumper'].includes(gameId) ? gameId : '';
    } catch (_) {
      return '';
    }
  }

  function keyboardMarkup(expectedLetters) {
    const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
    return rows.map(row => (
      `<div class="keyboard-row">${row.split('').map(key => (
        `<button class="key-button${expectedLetters.has(key) ? ' is-target' : ''}" type="button" data-key="${key}">${key}</button>`
      )).join('')}</div>`
    )).join('');
  }

  function renderKeyboard() {
    const expectedLetters = state.activeGame === 'word-shooter'
      ? getWordShooterExpectedLetters()
      : new Set([currentWord()?.word?.[state.input.length] || '']);
    if (els.keyboard) els.keyboard.innerHTML = keyboardMarkup(expectedLetters);
  }

  function renderCannonKeyboard() {
    if (els.cannonKeyboard) {
      els.cannonKeyboard.innerHTML = `
        <div class="keyboard-row pinyin-racer-controls">
          <button class="key-button is-target" type="button" data-key="left" aria-label="向左换道">←</button>
          <button class="key-button" type="button" data-key="right" aria-label="向右换道">→</button>
        </div>
      `;
    }
  }

  function displayTypingLetter(letter) {
    return String(letter || '').toLowerCase();
  }

  function letterFromKeyboardEvent(event) {
    const key = String(event.key || '').toLowerCase();
    if (/^[a-z]$/.test(key)) return key;
    const code = String(event.code || '');
    return /^Key[A-Z]$/.test(code) ? code.slice(3).toLowerCase() : '';
  }

  function wordShooterWordAt(index) {
    const list = state.wordShooter.roundWords.length
      ? state.wordShooter.roundWords
      : (state.words.length ? state.words : FALLBACK_VOCAB);
    const safeIndex = ((index % list.length) + list.length) % list.length;
    return list[safeIndex];
  }

  function startWordCursor(list) {
    if (!list.length) return 0;
    const seed = `${state.wordPack}:${state.wordDifficulty}:${Date.now()}:${Math.random()}`;
    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = ((hash << 5) - hash + seed.charCodeAt(index)) | 0;
    }
    return Math.abs(hash) % list.length;
  }

  function shuffleWordsForRound(words) {
    const source = words.length ? words : FALLBACK_VOCAB;
    const start = startWordCursor(source);
    const rotated = source.slice(start).concat(source.slice(0, start));
    for (let index = rotated.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [rotated[index], rotated[swapIndex]] = [rotated[swapIndex], rotated[index]];
    }
    return rotated;
  }

  function pinyinCannonItemAt(index) {
    const list = state.hanzi.length ? state.hanzi : FALLBACK_HANZI;
    const safeIndex = ((index % list.length) + list.length) % list.length;
    const source = list[safeIndex] || FALLBACK_HANZI[0];
    const pinyin = normalizePinyin(source?.pinyin) || 'pin';
    const char = source?.char || '拼';
    return {
      word: pinyin,
      pinyin,
      char,
      translation: char,
      example: cleanHanziExample(source),
      sourceHanzi: source
    };
  }

  function wordShooterEnemiesSorted() {
    return state.wordShooter.enemies.filter(enemy => !enemy.destroying).sort((left, right) => {
      if (left.x !== right.x) return left.x - right.x;
      return left.laneIndex - right.laneIndex;
    });
  }

  function getWordShooterEnemy(enemyId) {
    return state.wordShooter.enemies.find(enemy => enemy.id === enemyId && !enemy.destroying) || null;
  }

  function focusWordShooterEnemy() {
    return getWordShooterEnemy(state.wordShooter.activeEnemyId) || wordShooterEnemiesSorted()[0] || null;
  }

  function getWordShooterWeapon() {
    const ws = state.wordShooter;
    if (ws.weaponId !== 'basic' && ws.weaponExpiresAt <= ws.elapsedMs) {
      ws.weaponId = ws.baseWeaponId || getWordShooterLoadout().weaponId;
      ws.weaponExpiresAt = 0;
    }
    return WORD_SHOOTER_WEAPONS[ws.weaponId] || WORD_SHOOTER_WEAPONS.basic;
  }

  function getWordShooterExpectedLetters() {
    const ws = state.wordShooter;
    const lockedEnemy = getWordShooterEnemy(ws.activeEnemyId);
    if (lockedEnemy) {
      return new Set([
        lockedEnemy.wordData.word[ws.currentTyped.length] || '',
        ...wordShooterEnemiesSorted()
          .filter(enemy => enemy.id !== lockedEnemy.id)
          .map(enemy => enemy.wordData.word[0] || '')
      ].filter(Boolean));
    }
    return new Set(wordShooterEnemiesSorted().map(enemy => enemy.wordData.word[0]).filter(Boolean));
  }

  function wordShooterEnemiesForPrefix(prefix, excludedEnemyId = '') {
    const normalizedPrefix = String(prefix || '').toLowerCase();
    if (!normalizedPrefix) return [];
    return wordShooterEnemiesSorted().filter(enemy => (
      enemy.id !== excludedEnemyId
      && enemy.wordData.word.startsWith(normalizedPrefix)
    ));
  }

  function canWordShooterTypeLetter(letter) {
    const normalizedLetter = String(letter || '').toLowerCase();
    if (!/^[a-z]$/.test(normalizedLetter)) return false;
    const ws = state.wordShooter;
    const lockedEnemy = getWordShooterEnemy(ws.activeEnemyId);
    if (lockedEnemy && lockedEnemy.wordData.word[ws.currentTyped.length] === normalizedLetter) return true;
    return wordShooterEnemiesForPrefix(normalizedLetter, lockedEnemy?.id).length > 0;
  }

  function pickWordShooterLane() {
    const occupied = new Set(state.wordShooter.enemies.map(enemy => enemy.laneIndex));
    const freeLanes = WORD_SHOOTER_LANES.map((_, index) => index).filter(index => !occupied.has(index));
    if (freeLanes.length) return freeLanes[state.wordShooter.enemyId % freeLanes.length];
    return state.wordShooter.enemyId % WORD_SHOOTER_LANES.length;
  }

  function nextWordShooterWord() {
    const ws = state.wordShooter;
    const list = ws.roundWords.length
      ? ws.roundWords
      : (state.words.length ? state.words : FALLBACK_VOCAB);
    if (!list.length) return FALLBACK_VOCAB[0];

    const occupiedStarts = new Set(
      wordShooterEnemiesSorted()
        .map(enemy => String(enemy.wordData?.word || '').charAt(0))
        .filter(Boolean)
    );
    const start = ((ws.spawnCursor % list.length) + list.length) % list.length;
    for (let offset = 0; offset < list.length; offset += 1) {
      const index = (start + offset) % list.length;
      const candidate = list[index];
      const initial = String(candidate?.word || '').charAt(0);
      if (initial && !occupiedStarts.has(initial)) {
        ws.spawnCursor = (index + 1) % list.length;
        return candidate;
      }
    }

    ws.spawnCursor = (start + 1) % list.length;
    return list[start];
  }

  function createWordShooterEnemy(laneIndex = 0) {
    const ws = state.wordShooter;
    const phase = wordShooterPhaseForCompletedWords();
    const wordData = nextWordShooterWord();
    const enemyId = ws.enemyId + 1;
    const fighter = WORD_SHOOTER_ASSETS.enemyFighters[(enemyId - 1) % WORD_SHOOTER_ASSETS.enemyFighters.length];
    ws.enemyId = enemyId;
    ws.learning.tasksPresented += 1;
    return {
      id: `enemy-${enemyId}`,
      kind: 'fighter',
      laneIndex,
      x: 88 + ((enemyId + laneIndex) % 3) * 4,
      y: WORD_SHOOTER_LANES[laneIndex],
      bobPhase: enemyId * 0.73,
      speed: (3.2 + wordData.word.length * 0.2 + laneIndex * 0.08) * phase.speedMultiplier,
      asset: fighter.asset,
      hueRotate: fighter.hueRotate,
      artScale: fighter.scale,
      labelTop: fighter.labelTop,
      wordData,
      learning: {
        mistakes: 0,
        correctLetters: 0,
        totalAttempts: 0
      },
      destroying: false,
      destroyAt: 0,
      nextShotAt: ws.elapsedMs + WORD_SHOOTER_ENEMY_FIRE_INTERVAL + ((enemyId * 137) % 700)
    };
  }

  function ensureWordShooterEnemies() {
    const ws = state.wordShooter;
    const phase = wordShooterPhaseForCompletedWords();
    const baseCount = phase.maxEnemies;
    while (wordShooterEnemiesSorted().length < baseCount) {
      ws.enemies.push(createWordShooterEnemy(pickWordShooterLane()));
    }
    if (wordShooterEnemiesSorted().length < phase.maxEnemies && ws.enemies.every(enemy => enemy.x <= 76)) {
      ws.enemies.push(createWordShooterEnemy(pickWordShooterLane()));
    }
  }

  function renderWordQueue() {
    const ws = state.wordShooter;
    const focusEnemy = focusWordShooterEnemy();
    if (!focusEnemy) {
      els.wordQueue.innerHTML = '';
      return;
    }
    const letters = focusEnemy.wordData.word.split('');
    const doneCount = ws.activeEnemyId === focusEnemy.id ? ws.currentTyped.length : 0;
    const doneWords = ws.completedWords.slice(-1);
    const nextWords = wordShooterEnemiesSorted()
      .filter(enemy => enemy.id !== focusEnemy.id)
      .slice(0, 2)
      .map(enemy => enemy.wordData.word);
    const wordMarkup = word => `<span class="word-queue-item word-queue-preview is-next">${word}</span>`;
    els.wordQueue.innerHTML = `
      <div class="word-queue-zone word-queue-done" aria-label="已完成单词">
        ${doneWords.map(word => `<span class="word-queue-item is-done">${word}</span>`).join('')}
      </div>
      <div class="word-queue-current target-plaque is-active center-target-word${ws.activeEnemyId ? ' is-locked-target' : ''}" aria-label="当前射击单词">
        ${letters.map((letter, index) => {
          const stateClass = index < doneCount ? ' is-done' : index === doneCount ? ' is-current' : '';
          return `<span class="target-letter target-block${stateClass}" data-letter-index="${index}">${displayTypingLetter(letter)}</span>`;
        }).join('')}
      </div>
      <div class="word-queue-zone word-queue-next" aria-label="接下来的单词">
        ${nextWords.map(wordMarkup).join('')}
      </div>
    `;
  }

  function renderWordShooterPreviewCard(focusEnemy) {
    const previewSrc = focusEnemy?.asset || FALLBACK_MINECRAFT_IMAGE;
    if (els.typingTargetImage.dataset.imageSrc !== previewSrc) {
      els.typingTargetImage.dataset.imageSrc = previewSrc;
      els.typingTargetImage.src = previewSrc;
    }
  }

  function renderWordShooterWeaponStatus() {
    const ws = state.wordShooter;
    const weapon = getWordShooterWeapon();
    const loadout = getWordShooterLoadout();
    const remainingSeconds = Math.max(0, Math.ceil((ws.weaponExpiresAt - ws.elapsedMs) / 1000));
    const subline = weapon.id === 'basic'
      ? '每个字母发射一次'
      : `剩余 ${remainingSeconds}s`;
    const icon = weapon.id === 'basic' ? WORD_SHOOTER_ASSETS.reward : weapon.pickupAsset;
    els.typingWeaponStatus.innerHTML = `
      <div class="typing-weapon-card typing-weapon-card-${weapon.id}">
        <img class="typing-weapon-panel" src="${WORD_SHOOTER_ASSETS.panels.long}" alt="" aria-hidden="true">
        <img class="typing-weapon-icon" src="${icon}" alt="" aria-hidden="true">
        <div class="typing-weapon-copy">
          <span>weapon</span>
          <strong>${weapon.label}</strong>
          <small>${subline}</small>
          <em>${loadout.ship.label} · 护盾 ${ws.shield}/${loadout.shield}</em>
        </div>
      </div>
    `;
  }

  function wordShooterFeedbackText() {
    const ws = state.wordShooter;
    const focusEnemy = focusWordShooterEnemy();
    if (!focusEnemy) return '输入任意敌机上的单词，随时切换目标。';
    if (ws.activeEnemyId === focusEnemy.id && ws.currentTyped.length) {
      const remaining = focusEnemy.wordData.word.slice(ws.currentTyped.length);
      if (!remaining) return `击破 ${focusEnemy.wordData.word}，准备输入下一个。`;
      return `继续输入 ${remaining}，也可以改打另一架敌机。`;
    }
    if (ws.combo > 1) {
      return `连击 ${ws.combo}，输入任意敌机单词继续击破。`;
    }
    return `输入任意敌机单词，可随时切换目标；例如按 ${displayTypingLetter(focusEnemy.wordData.word[0])} 开始。`;
  }

  function renderEnemyWordMarkup(enemy, isLocked) {
    const ws = state.wordShooter;
    const doneCount = isLocked ? ws.currentTyped.length : 0;
    return enemy.wordData.word.split('').map((letter, index) => {
      const stateClass = isLocked
        ? index < doneCount
          ? ' is-done'
          : index === doneCount
            ? ' is-current'
            : ''
        : '';
      return `<span class="typing-enemy-letter${stateClass}" data-enemy-letter-index="${index}">${displayTypingLetter(letter)}</span>`;
    }).join('');
  }

  function renderWordShooterEnemies() {
    const ws = state.wordShooter;
    const enemies = wordShooterEnemiesSorted();
    const liveIds = new Set(enemies.map(enemy => enemy.id));
    Array.from(els.typingEnemyLayer.children).forEach(node => {
      if (!liveIds.has(node.dataset.enemyId)) node.remove();
    });
    enemies.forEach(enemy => {
      const bob = Math.sin((ws.elapsedMs / 520) + enemy.bobPhase) * 2.2;
      const isLocked = ws.activeEnemyId === enemy.id;
      const isWarning = enemy.x <= 26;
      const isDestroying = !!enemy.destroying;
      const doneCount = isLocked ? ws.currentTyped.length : 0;
      let node = els.typingEnemyLayer.querySelector(`.typing-enemy[data-enemy-id="${enemy.id}"]`);
      if (!node) {
        node = document.createElement('article');
        node.dataset.enemyId = enemy.id;
        node.innerHTML = `
          <img class="typing-enemy-art" alt="" aria-hidden="true">
          <div class="typing-enemy-word-card" role="group" aria-label="英文目标">
            <span class="typing-enemy-word-kicker">TARGET</span>
            <span class="typing-enemy-word"></span>
            <small class="typing-enemy-translation"></small>
            <span class="typing-enemy-typed-status" aria-live="polite"></span>
          </div>
        `;
      }
      node.className = `typing-enemy enemy-fighter${enemy.kind === 'fighter' ? ' is-fighter' : ''}${isLocked ? ' is-locked' : ''}${isWarning ? ' is-warning' : ''}${isDestroying ? ' is-destroying' : ''}`;
      node.dataset.typingProgress = String(doneCount);
      node.style.left = `${enemy.x.toFixed(2)}%`;
      node.style.top = `calc(${enemy.y.toFixed(2)}% + ${bob.toFixed(2)}px)`;
      node.style.setProperty('--enemy-hue', enemy.hueRotate || '0deg');
      node.style.setProperty('--enemy-scale', enemy.artScale || 1);
      node.style.setProperty('--enemy-label-top', enemy.labelTop || '18%');
      const art = node.querySelector('.typing-enemy-art');
      if (art.dataset.src !== enemy.asset) {
        art.dataset.src = enemy.asset;
        art.src = enemy.asset;
      }
      const word = node.querySelector('.typing-enemy-word');
      word.dataset.enemyWord = enemy.wordData.word;
      word.innerHTML = renderEnemyWordMarkup(enemy, isLocked);
      const translation = node.querySelector('.typing-enemy-translation');
      if (translation) translation.textContent = enemy.wordData.translation || '输入单词击破目标';
      const typedStatus = node.querySelector('.typing-enemy-typed-status');
      if (typedStatus) typedStatus.textContent = isLocked && doneCount ? `${doneCount}/${enemy.wordData.word.length}` : '可自由选择';
      els.typingEnemyLayer.appendChild(node);
    });
  }

  function renderWordShooterDrops() {
    const pickup = state.wordShooter.pickup;
    if (!pickup) {
      els.typingDropLayer.innerHTML = '';
      return;
    }
    const bob = Math.sin((state.wordShooter.elapsedMs / 180) + pickup.bobPhase) * 4;
    els.typingDropLayer.innerHTML = `
      <article class="typing-pickup" style="left:${pickup.x.toFixed(2)}%;top:calc(${pickup.y.toFixed(2)}% + ${bob.toFixed(2)}px)">
        <img src="${pickup.asset}" alt="" aria-hidden="true">
        <span>${pickup.label}</span>
      </article>
    `;
  }

  function renderWordShooterHazards() {
    if (!els.typingHazardLayer) return;
    els.typingHazardLayer.innerHTML = state.wordShooter.hazards.map(hazard => {
      const label = hazard.type === 'mine' ? '地雷' : hazard.type === 'meteor' ? '落弹预警' : '冲撞';
      return `<article class="typing-hazard typing-hazard-${hazard.type}${hazard.warningUntil > state.wordShooter.elapsedMs ? ' is-warning' : ''}"
        data-hazard-id="${hazard.id}" data-hazard-type="${hazard.type}"
        style="left:${hazard.x.toFixed(2)}%;top:${hazard.y.toFixed(2)}%">
        <span class="typing-hazard-core"></span><strong>${label}</strong>
        <small>${hazard.type === 'mine' ? '输入时可清除' : hazard.type === 'meteor' ? '向上/下躲避' : '快速换位'}</small>
      </article>`;
    }).join('');
  }

  function renderWordShooterBoss() {
    const boss = state.wordShooter.boss;
    if (!els.typingBoss) return;
    const active = boss.active && !boss.defeated;
    els.typingBoss.hidden = !active;
    if (!active) return;
    els.typingBoss.dataset.bossPhase = boss.phase;
    if (els.typingBossHealthFill) {
      els.typingBossHealthFill.style.width = `${(boss.health / Math.max(1, boss.maxHealth)) * 100}%`;
    }
    const healthBar = els.typingBoss.querySelector('.typing-boss-health');
    if (healthBar) healthBar.setAttribute('aria-valuenow', String(boss.health));
    if (els.typingBossPhase) els.typingBossPhase.textContent = boss.phase === 'enraged' ? '狂暴阶段 · 落弹与冲撞' : '护盾阶段 · 能量球齐射';
  }

  function renderWordShooterEnemyBullets() {
    if (!els.typingEnemyBulletLayer) return;
    els.typingEnemyBulletLayer.innerHTML = state.wordShooter.enemyBullets.map(bullet => `
      <span class="typing-enemy-bullet typing-enemy-bullet-${bullet.kind || 'enemy-bolt'}" data-bullet-id="${bullet.id}"
        style="left:${bullet.x.toFixed(2)}%;top:${bullet.y.toFixed(2)}%;--bullet-angle:${(Math.atan2(bullet.vy, bullet.vx) * 180 / Math.PI).toFixed(2)}deg">
        <img class="typing-enemy-bullet-core" src="${WORD_SHOOTER_AGNES_ASSETS.enemyBolt}" alt="" aria-hidden="true">
      </span>
    `).join('');
  }

  function renderWordShooterShip() {
    if (!els.typingGunShip) return;
    const ws = state.wordShooter;
    const loadout = getWordShooterLoadout();
    const weapon = getWordShooterWeapon();
    const shipSrc = ws.firePoseUntil > ws.elapsedMs
      ? WORD_SHOOTER_ASSETS.shipFire
      : weapon.id === 'basic'
        ? WORD_SHOOTER_ASSETS.shipIdle
        : WORD_SHOOTER_ASSETS.shipBoost;
    if (els.typingGunShip.dataset.imageSrc !== shipSrc) {
      els.typingGunShip.dataset.imageSrc = shipSrc;
      els.typingGunShip.src = shipSrc;
    }
    els.typingGun.dataset.weapon = weapon.id;
    els.typingGun.dataset.ship = loadout.shipId;
    els.typingGun.style.setProperty('--ship-hue', loadout.ship.hue);
    els.typingGun.style.setProperty('--ship-scale', String(loadout.ship.scale));
    els.typingGun.dataset.firing = ws.firePoseUntil > ws.elapsedMs ? 'true' : 'false';
  }

  function renderTypingArena() {
    const ws = state.wordShooter;
    const stageTheme = wordShooterStageTheme();
    const focusEnemy = focusWordShooterEnemy();
    const letters = focusEnemy?.wordData.word?.split('') || [];
    const doneCount = ws.activeEnemyId === focusEnemy?.id ? ws.currentTyped.length : 0;
    els.typingProgress.textContent = `${ws.completedWords.length} / ${ws.roundGoal}`;
    els.typingStreak.textContent = ws.combo > 1 ? `combo ${ws.combo}` : `miss ${ws.misses}`;
    els.wordChinese.textContent = focusEnemy?.wordData.translation || '锁定目标后开始击破';
    els.typingArena.dataset.weapon = getWordShooterWeapon().id;
    els.typingArena.dataset.ship = getWordShooterLoadout().shipId;
    els.typingArena.dataset.mechanic = wordShooterMechanic().id;
    els.typingArena.dataset.locked = ws.activeEnemyId ? 'true' : 'false';
    els.typingArena.dataset.firing = ws.firePoseUntil > ws.elapsedMs ? 'true' : 'false';
    els.typingArena.dataset.arenaShake = ws.arenaShakeUntil > ws.elapsedMs ? 'true' : 'false';
    els.typingArena.dataset.playerHit = ws.invulnerableUntil > ws.elapsedMs ? 'true' : 'false';
    if (els.typingPlayerShield) els.typingPlayerShield.hidden = ws.invulnerableUntil <= ws.elapsedMs;
    els.typingArena.dataset.stageTheme = stageTheme.id;
    if (els.typingStageBackdropImage && els.typingStageBackdropImage.dataset.src !== stageTheme.background) {
      els.typingStageBackdropImage.dataset.src = stageTheme.background;
      els.typingStageBackdropImage.src = stageTheme.background;
    }
    if (els.typingStageTheme) {
      els.typingStageTheme.innerHTML = `<span>${stageTheme.label}</span><small>${stageTheme.kicker}</small>`;
    }
    els.typingArena.style.setProperty('--player-x', `${ws.player.x.toFixed(2)}%`);
    els.typingArena.style.setProperty('--player-y', `${ws.player.y.toFixed(2)}%`);
    if (els.typingShield) els.typingShield.textContent = `shield ${ws.shield}/${getWordShooterLoadout().shield}`;
    els.typingArena.style.setProperty('--arena-shake-x', ws.arenaShakeUntil > ws.elapsedMs ? `${ws.arenaShakeLevel.toFixed(1)}px` : '0px');
    els.typingArena.style.setProperty('--arena-shake-y', ws.arenaShakeUntil > ws.elapsedMs ? `${(ws.arenaShakeLevel * 0.42).toFixed(1)}px` : '0px');
    if (els.wordFeedback) els.wordFeedback.textContent = wordShooterFeedbackText();
    renderWordQueue();
    renderWordShooterWeaponStatus();
    renderWordShooterEnemies();
    renderWordShooterEnemyBullets();
    renderWordShooterHazards();
    renderWordShooterBoss();
    renderWordShooterDrops();
    renderWordShooterPreviewCard(focusEnemy);
    renderWordShooterShip();
    renderKeyboard();
    aimTypingGun(doneCount);
  }

  function clearTypingFx() {
    els.typingEnemyLayer?.replaceChildren();
    els.typingEnemyBulletLayer?.replaceChildren();
    els.typingHazardLayer?.replaceChildren();
    els.typingDropLayer?.replaceChildren();
    els.typingProjectileLayer.replaceChildren();
    els.typingShardLayer.replaceChildren();
    if (els.typingArena) {
      els.typingArena.dataset.firing = 'false';
      els.typingArena.dataset.arenaShake = 'false';
      els.typingArena.style.setProperty('--arena-shake-x', '0px');
      els.typingArena.style.setProperty('--arena-shake-y', '0px');
    }
  }

  function getArenaPoint(node, fallbackX = 0.5, fallbackY = 0.5) {
    if (!els.typingArena || !node) return null;
    const arenaRect = els.typingArena.getBoundingClientRect();
    const rect = node.getBoundingClientRect();
    return {
      x: rect.left - arenaRect.left + rect.width * fallbackX,
      y: rect.top - arenaRect.top + rect.height * fallbackY
    };
  }

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function targetEnemyHitNode(enemyId) {
    const enemy = enemyId
      ? els.typingEnemyLayer.querySelector(`.typing-enemy[data-enemy-id="${enemyId}"]`)
      : null;
    if (!enemy) return null;
    return enemy.querySelector('.typing-enemy-word')
      || enemy.querySelector('.typing-enemy-art')
      || enemy;
  }

  function targetHudBlockForIndex(letterIndex) {
    return els.wordQueue.querySelector(`.target-block[data-letter-index="${letterIndex}"]`)
      || els.wordQueue.querySelector('.target-block.is-current')
      || els.wordQueue.querySelector('.target-block');
  }

  function targetNodeForLetterIndex(letterIndex) {
    const enemyId = state.wordShooter.activeEnemyId || focusWordShooterEnemy()?.id;
    return targetEnemyHitNode(enemyId) || targetHudBlockForIndex(letterIndex);
  }

  function aimTypingGun(letterIndex) {
    const target = targetNodeForLetterIndex(letterIndex);
    const start = getArenaPoint(els.typingGunShip || els.typingGun, 0.42, 0.52);
    const end = getArenaPoint(target, 0.5, 0.5);
    if (!start || !end) {
      els.typingGun.style.setProperty('--gun-angle', '0deg');
      return 0;
    }
    const angle = clampNumber(Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI, -18, 18);
    els.typingGun.style.setProperty('--gun-angle', `${angle.toFixed(2)}deg`);
    return angle;
  }

  function spawnTypingShards(x, y, letterIndex) {
    for (let index = 0; index < 11; index += 1) {
      const shard = document.createElement('span');
      const angle = -138 + index * 28;
      const distance = 26 + ((index + letterIndex) % 4) * 14;
      const rad = angle * Math.PI / 180;
      shard.className = 'typing-shard';
      shard.style.left = `${x}px`;
      shard.style.top = `${y}px`;
      shard.style.setProperty('--sx', `${Math.cos(rad) * distance}px`);
      shard.style.setProperty('--sy', `${Math.sin(rad) * distance}px`);
      shard.style.setProperty('--spin', `${(index % 2 ? -1 : 1) * (80 + index * 18)}deg`);
      shard.style.setProperty('--shard-hue', `${190 + ((letterIndex + index) % 3) * 18}`);
      shard.style.setProperty('--shard-scale', `${(0.82 + (index % 4) * 0.16).toFixed(2)}`);
      els.typingShardLayer.appendChild(shard);
      shard.addEventListener('animationend', () => shard.remove(), { once: true });
    }
  }

  function spawnWordShooterScorePopup(x, y, label, variant = 'hit') {
    const popup = document.createElement('span');
    popup.className = `typing-score-popup is-${variant}`;
    popup.style.left = `${x}px`;
    popup.style.top = `${y}px`;
    popup.textContent = label;
    els.typingShardLayer.appendChild(popup);
    popup.addEventListener('animationend', () => popup.remove(), { once: true });
  }

  function spawnWordShooterImpact(x, y, weaponId = 'basic') {
    const impact = document.createElement('span');
    impact.className = `typing-impact is-${weaponId}`;
    impact.style.left = `${x}px`;
    impact.style.top = `${y}px`;
    impact.innerHTML = `
      <span class="typing-impact-glow"></span>
      <img class="typing-impact-ring" src="${WORD_SHOOTER_AGNES_ASSETS.destroyBurst}" alt="" aria-hidden="true">
      <img class="typing-impact-flash" src="${WORD_SHOOTER_AGNES_ASSETS.impactFlash}" alt="" aria-hidden="true">
    `;
    els.typingShardLayer.appendChild(impact);
    impact.addEventListener('animationend', () => impact.remove(), { once: true });
  }

  function pulseWordShooterHud(type = 'hit') {
    if (!els.typingProgress || !els.typingStreak) return;
    const progressClass = `typing-hud-pop is-${type}`;
    const streakClass = type === 'combo' ? 'typing-hud-pop is-combo' : 'typing-hud-pop is-hit';
    els.typingProgress.className = progressClass;
    els.typingStreak.className = streakClass;
    window.setTimeout(() => {
      els.typingProgress.className = '';
      els.typingStreak.className = '';
    }, 220);
  }

  function spawnTypingMuzzleFlash(x, y, angle, weaponId = 'basic') {
    const flash = document.createElement('span');
    flash.className = `typing-muzzle-flash is-${weaponId}`;
    flash.style.left = `${x}px`;
    flash.style.top = `${y}px`;
    flash.style.setProperty('--flash-angle', `${angle.toFixed(2)}deg`);
    els.typingProjectileLayer.appendChild(flash);
    flash.addEventListener('animationend', () => flash.remove(), { once: true });
  }

  function spawnMuzzleSparks(start, angle, weaponId = 'basic') {
    const sparkCount = weaponId === 'triple-beam' ? 5 : 3;
    for (let index = 0; index < sparkCount; index += 1) {
      const spark = document.createElement('span');
      const side = index - ((sparkCount - 1) / 2);
      spark.className = `typing-muzzle-spark is-${weaponId}`;
      spark.style.left = `${start.x}px`;
      spark.style.top = `${start.y}px`;
      spark.style.setProperty('--muzzle-spark-angle', `${(angle + side * 11).toFixed(2)}deg`);
      spark.style.setProperty('--muzzle-spark-x', `${(18 + index * 4).toFixed(1)}px`);
      spark.style.setProperty('--muzzle-spark-y', `${(side * 10).toFixed(1)}px`);
      els.typingProjectileLayer.appendChild(spark);
      spark.addEventListener('animationend', () => spark.remove(), { once: true });
    }
  }

  function spawnTripleBeamMuzzleFan(start, angle, distance) {
    [-12, 0, 12].forEach((offsetAngle, index) => {
      const fan = document.createElement('span');
      fan.className = 'typing-triple-muzzle-fan';
      fan.style.left = `${start.x}px`;
      fan.style.top = `${start.y}px`;
      fan.style.setProperty('--fan-angle', `${(angle + offsetAngle).toFixed(2)}deg`);
      fan.style.setProperty('--fan-length', `${Math.max(84, Number(distance) * (0.22 + index * 0.04)).toFixed(1)}px`);
      els.typingProjectileLayer.appendChild(fan);
      fan.addEventListener('animationend', () => fan.remove(), { once: true });
    });
  }

  function spawnHomingMissileWake(start, angle, distance) {
    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const normalX = Math.cos(radians + Math.PI / 2);
    const normalY = Math.sin(radians + Math.PI / 2);
    for (let index = 0; index < 7; index += 1) {
      window.setTimeout(() => {
        if (state.activeGame !== 'word-shooter') return;
        const step = Math.min(0.68, 0.08 + index * 0.09);
        const side = (index % 2 === 0 ? -1 : 1) * (5 + (index % 3) * 2);
        const wake = document.createElement('span');
        wake.className = 'typing-missile-wake';
        wake.style.left = `${start.x + cos * distance * step + normalX * side}px`;
        wake.style.top = `${start.y + sin * distance * step + normalY * side}px`;
        wake.style.setProperty('--wake-drift-x', `${(-cos * (18 + index * 2) + normalX * side * 0.55).toFixed(1)}px`);
        wake.style.setProperty('--wake-drift-y', `${(-sin * (18 + index * 2) + normalY * side * 0.55).toFixed(1)}px`);
        wake.style.setProperty('--wake-scale', `${(0.72 + index * 0.07).toFixed(2)}`);
        els.typingProjectileLayer.appendChild(wake);
        wake.addEventListener('animationend', () => wake.remove(), { once: true });
      }, index * 34);
    }
  }

  function spawnTypingTrail(start, angle, distance, weaponId = 'basic', scale = 1) {
    const trail = document.createElement('span');
    trail.className = `typing-shot-trail is-${weaponId}`;
    trail.style.left = `${start.x}px`;
    trail.style.top = `${start.y}px`;
    trail.style.setProperty('--trail-angle', `${angle.toFixed(2)}deg`);
    trail.style.setProperty('--trail-length', `${Math.max(44, Number(distance) - (weaponId === 'pierce-laser' ? 0 : 24)).toFixed(1)}px`);
    trail.style.setProperty('--trail-scale', String(scale));
    els.typingProjectileLayer.appendChild(trail);
    trail.addEventListener('animationend', () => trail.remove(), { once: true });
  }

  function spawnProjectileBeads(start, angle, distance, weaponId = 'basic', scale = 1) {
    const count = weaponId === 'pierce-laser'
      ? 4
      : weaponId === 'homing-missile'
        ? 6
        : 5;
    const radians = angle * Math.PI / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const safeDistance = Number(distance) || 0;
    for (let index = 0; index < count; index += 1) {
      const ratio = 0.18 + (index / Math.max(1, count - 1)) * 0.66;
      const bead = document.createElement('span');
      bead.className = `typing-projectile-bead is-${weaponId}`;
      bead.style.left = `${start.x + cos * safeDistance * ratio}px`;
      bead.style.top = `${start.y + sin * safeDistance * ratio}px`;
      bead.style.setProperty('--bead-angle', `${angle.toFixed(2)}deg`);
      bead.style.setProperty('--bead-scale', `${(scale * (0.88 + index * 0.04)).toFixed(2)}`);
      bead.style.setProperty('--bead-drift-x', `${(cos * (18 + index * 4)).toFixed(1)}px`);
      bead.style.setProperty('--bead-drift-y', `${(sin * (18 + index * 4)).toFixed(1)}px`);
      bead.style.animationDelay = `${index * 22}ms`;
      els.typingProjectileLayer.appendChild(bead);
      bead.addEventListener('animationend', () => bead.remove(), { once: true });
    }
  }

  function spawnBasicPulseEchoes(start, angle, distance) {
    [
      { delayMs: 18, length: Math.max(42, Number(distance) * 0.7), scale: 0.92 },
      { delayMs: 42, length: Math.max(30, Number(distance) * 0.52), scale: 0.8 }
    ].forEach((echo, index) => {
      window.setTimeout(() => {
        if (state.activeGame !== 'word-shooter') return;
        const pulse = document.createElement('span');
        pulse.className = 'typing-basic-pulse-echo';
        pulse.style.left = `${start.x}px`;
        pulse.style.top = `${start.y}px`;
        pulse.style.setProperty('--pulse-angle', `${angle.toFixed(2)}deg`);
        pulse.style.setProperty('--pulse-length', `${echo.length.toFixed(1)}px`);
        pulse.style.setProperty('--pulse-scale', `${(echo.scale - (index * 0.03)).toFixed(2)}`);
        els.typingProjectileLayer.appendChild(pulse);
        pulse.addEventListener('animationend', () => pulse.remove(), { once: true });
      }, echo.delayMs);
    });
  }

  function spawnPierceBeam(start, end, angle) {
    const beam = document.createElement('span');
    beam.className = 'typing-pierce-beam';
    beam.style.left = `${start.x}px`;
    beam.style.top = `${start.y}px`;
    beam.style.setProperty('--beam-angle', `${angle.toFixed(2)}deg`);
    beam.style.setProperty('--beam-length', `${Math.max(240, Math.hypot(end.x - start.x, end.y - start.y) + 46).toFixed(1)}px`);
    els.typingProjectileLayer.appendChild(beam);
    beam.addEventListener('animationend', () => beam.remove(), { once: true });
  }

  function spawnPierceChargeLine(start, end, angle) {
    const charge = document.createElement('span');
    charge.className = 'typing-pierce-charge-line';
    charge.style.left = `${start.x}px`;
    charge.style.top = `${start.y}px`;
    charge.style.setProperty('--charge-angle', `${angle.toFixed(2)}deg`);
    charge.style.setProperty('--charge-length', `${Math.max(260, Math.hypot(end.x - start.x, end.y - start.y) + 72).toFixed(1)}px`);
    els.typingProjectileLayer.appendChild(charge);
    charge.addEventListener('animationend', () => charge.remove(), { once: true });
  }

  function spawnImpactSparks(x, y, weaponId = 'basic') {
    const sparkCount = weaponId === 'homing-missile'
      ? 9
      : weaponId === 'pierce-laser'
        ? 7
        : weaponId === 'triple-beam'
          ? 6
          : 5;
    for (let index = 0; index < sparkCount; index += 1) {
      const spark = document.createElement('span');
      const angle = (-94 + ((360 / sparkCount) * index)) * Math.PI / 180;
      const distance = weaponId === 'homing-missile'
        ? 38 + (index % 3) * 11
        : weaponId === 'pierce-laser'
          ? 34 + (index % 2) * 12
          : 28 + (index % 2) * 9;
      spark.className = `typing-impact-spark is-${weaponId}`;
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.setProperty('--spark-x', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--spark-y', `${Math.sin(angle) * distance}px`);
      spark.style.setProperty('--spark-rotate', `${((-20 + index * 17) % 360).toFixed(1)}deg`);
      els.typingShardLayer.appendChild(spark);
      spark.addEventListener('animationend', () => spark.remove(), { once: true });
    }
  }

  function spawnTripleBeamFinisherRays(x, y, scale = 1) {
    [
      { offsetX: -118, offsetY: -34, angle: 10 },
      { offsetX: -136, offsetY: 0, angle: 0 },
      { offsetX: -118, offsetY: 34, angle: -10 }
    ].forEach((ray, index) => {
      const node = document.createElement('span');
      node.className = 'typing-finisher-ray';
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      node.style.setProperty('--ray-from-x', `${(ray.offsetX * scale).toFixed(1)}px`);
      node.style.setProperty('--ray-from-y', `${(ray.offsetY * scale).toFixed(1)}px`);
      node.style.setProperty('--ray-angle', `${ray.angle.toFixed(1)}deg`);
      node.style.setProperty('--ray-scale', `${(0.94 + (index * 0.06)).toFixed(2)}`);
      els.typingShardLayer.appendChild(node);
      node.addEventListener('animationend', () => node.remove(), { once: true });
    });
  }

  function spawnHomingFinisherFlare(x, y, scale = 1) {
    const flare = document.createElement('span');
    flare.className = 'typing-homing-finisher-flare';
    flare.style.left = `${x}px`;
    flare.style.top = `${y}px`;
    flare.style.setProperty('--flare-scale', scale.toFixed(2));
    els.typingShardLayer.appendChild(flare);
    flare.addEventListener('animationend', () => flare.remove(), { once: true });
  }

  function spawnPierceFinisherScorch(x, y, angle, scale = 1) {
    const scorch = document.createElement('span');
    scorch.className = 'typing-pierce-finisher-scorch';
    scorch.style.left = `${x}px`;
    scorch.style.top = `${y}px`;
    scorch.style.setProperty('--scorch-angle', `${angle.toFixed(2)}deg`);
    scorch.style.setProperty('--scorch-scale', scale.toFixed(2));
    els.typingShardLayer.appendChild(scorch);
    scorch.addEventListener('animationend', () => scorch.remove(), { once: true });
  }

  function spawnWordShooterFinisher(x, y, weaponId = 'basic', wordLength = 4) {
    const blast = document.createElement('span');
    const scale = Math.min(1.48, 0.9 + (wordLength * 0.08));
    const finisherStart = getArenaPoint(els.typingGunShip || els.typingGun, 0.46, 0.54);
    const finisherAngle = finisherStart
      ? Math.atan2(y - finisherStart.y, x - finisherStart.x) * 180 / Math.PI
      : 0;
    if (weaponId === 'triple-beam') {
      spawnTripleBeamFinisherRays(x, y, scale);
    }
    if (weaponId === 'homing-missile') {
      spawnHomingFinisherFlare(x, y, scale);
    }
    if (weaponId === 'pierce-laser') {
      spawnPierceFinisherScorch(x, y, finisherAngle, scale);
    }
    blast.className = `typing-finisher-blast is-${weaponId}`;
    blast.style.left = `${x}px`;
    blast.style.top = `${y}px`;
    blast.style.setProperty('--finisher-scale', scale.toFixed(2));
    blast.innerHTML = `
      <span class="typing-finisher-core"></span>
      <span class="typing-finisher-ring"></span>
      <span class="typing-finisher-shockwave"></span>
    `;
    els.typingShardLayer.appendChild(blast);
    blast.addEventListener('animationend', () => blast.remove(), { once: true });
    state.wordShooter.arenaShakeUntil = Math.max(state.wordShooter.arenaShakeUntil, state.wordShooter.elapsedMs + 260);
    state.wordShooter.arenaShakeLevel = Math.max(state.wordShooter.arenaShakeLevel, 4.4 + Math.min(1.6, wordLength * 0.16));
    spawnImpactSparks(x, y, weaponId);
    spawnImpactSparks(x, y, weaponId);
    spawnTypingShards(x, y, wordLength + 2);
    window.setTimeout(() => {
      if (state.activeGame !== 'word-shooter') return;
      spawnTypingShards(x, y, wordLength + 5);
    }, 48);
    sfx.impact(weaponId);
  }

  function recordWordShooterAttack(payload) {
    state.wordShooter.attackEvents.push({
      ...payload,
      at: state.wordShooter.elapsedMs
    });
    state.wordShooter.attackEvents = state.wordShooter.attackEvents.slice(-18);
  }

  function spawnTypingBullet(letterIndex) {
    const target = targetNodeForLetterIndex(letterIndex);
    const start = getArenaPoint(els.typingGunShip || els.typingGun, 0.46, 0.54);
    const end = getArenaPoint(target, 0.5, 0.5);
    if (!start || !end) return;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy).toFixed(1);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const weapon = getWordShooterWeapon();
    const loadout = getWordShooterLoadout();
    clearWordShooterHazardsAlongShot(start, end);
    const baseTravelMs = weapon.id === 'homing-missile' ? 520 : weapon.id === 'pierce-laser' ? 260 : 340;
    const travelMs = Math.max(180, Math.round(baseTravelMs / loadout.fireMultiplier));
    const volleys = weapon.id === 'triple-beam'
      ? [
          { angle: -7, scale: 0.92, distance },
          { angle: 0, scale: 1, distance },
          { angle: 7, scale: 0.92, distance }
        ]
      : [{ angle: 0, scale: weapon.id === 'pierce-laser' ? 1.22 : 1, distance: weapon.id === 'pierce-laser' ? Math.max(280, Number(distance)).toFixed(1) : distance }];
    state.wordShooter.firePoseUntil = state.wordShooter.elapsedMs + 220;
    state.wordShooter.muzzleFlashUntil = state.wordShooter.elapsedMs + 120;
    state.wordShooter.arenaShakeUntil = state.wordShooter.elapsedMs + (weapon.id === 'homing-missile' ? 240 : 150);
    state.wordShooter.arenaShakeLevel = weapon.id === 'pierce-laser' ? 3.4 : weapon.id === 'homing-missile' ? 3 : weapon.id === 'triple-beam' ? 2.4 : 1.8;
    target?.classList.add('is-fracturing');
    sfx.weaponShot(weapon.id);
    spawnTypingMuzzleFlash(start.x, start.y, angle, weapon.id);
    spawnMuzzleSparks(start, angle, weapon.id);
    if (weapon.id === 'basic') {
      spawnBasicPulseEchoes(start, angle, distance);
    }
    if (weapon.id === 'triple-beam') {
      spawnTripleBeamMuzzleFan(start, angle, distance);
    }
    if (weapon.id === 'homing-missile') {
      spawnHomingMissileWake(start, angle, Number(distance));
    }
    if (weapon.id === 'pierce-laser') {
      spawnPierceBeam(start, end, angle);
      spawnPierceChargeLine(start, end, angle);
    }
    volleys.forEach((volley, index) => {
      const shotAngle = angle + volley.angle;
      spawnTypingTrail(start, shotAngle, volley.distance, weapon.id, volley.scale);
      spawnProjectileBeads(start, shotAngle, volley.distance, weapon.id, volley.scale);
      recordWordShooterAttack({
        id: `${weapon.id}-${state.wordShooter.elapsedMs}-${index}`,
        type: weapon.id,
        activeEnemyId: state.wordShooter.activeEnemyId,
        letterIndex,
        power: Number(loadout.fireMultiplier.toFixed(2))
      });
    });
    window.setTimeout(() => {
      target?.classList.remove('is-fracturing');
      spawnWordShooterImpact(end.x, end.y, weapon.id);
      spawnWordShooterScorePopup(end.x, end.y, weapon.id === 'basic' ? '+1' : `+${weapon.id === 'triple-beam' ? 2 : 3}`, 'hit');
      spawnImpactSparks(end.x, end.y, weapon.id);
      spawnTypingShards(end.x, end.y, letterIndex);
      sfx.impact(weapon.id);
      renderWordShooterShip();
    }, travelMs);
  }

  function spawnWordShooterPickup(type, x, y) {
    const weapon = WORD_SHOOTER_WEAPONS[type];
    if (!weapon) return;
    state.wordShooter.pickup = {
      type,
      label: weapon.label,
      asset: weapon.pickupAsset,
      x,
      y,
      vx: -10,
      vy: 9,
      bobPhase: state.wordShooter.enemyId * 0.4
    };
  }

  function wordShooterArenaPointFromPercent(xPercent, yPercent) {
    const rect = els.typingArena?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) {
      return { x: xPercent, y: yPercent };
    }
    return {
      x: rect.width * (xPercent / 100),
      y: rect.height * (yPercent / 100)
    };
  }

  function grantWordShooterWeapon(type, durationMs = WORD_SHOOTER_WEAPONS[type]?.durationMs || 9000) {
    if (!WORD_SHOOTER_WEAPONS[type]) return;
    state.wordShooter.weaponId = type;
    state.wordShooter.weaponExpiresAt = state.wordShooter.elapsedMs + durationMs;
    state.wordShooter.pickup = null;
    sfx.pickup();
    renderTypingArena();
  }

  function removeWordShooterEnemy(enemyId) {
    state.wordShooter.enemies = state.wordShooter.enemies.filter(enemy => enemy.id !== enemyId);
  }

  function scheduleWordShooterEnemyDestroy(enemyId, delayMs = 320) {
    const enemy = getWordShooterEnemy(enemyId);
    if (!enemy || enemy.destroying) return;
    enemy.destroying = true;
    enemy.destroyAt = state.wordShooter.elapsedMs + delayMs;
    window.setTimeout(() => {
      removeWordShooterEnemy(enemyId);
      if (state.activeGame === 'word-shooter') {
        renderTypingArena();
      }
    }, delayMs);
  }

  function maybeDropWordShooterPickup(enemy) {
    if (state.wordShooter.pickup || Math.random() >= 0.25) return;
    const type = WORD_SHOOTER_DROP_TYPES[(state.wordShooter.score + enemy.wordData.word.length + state.wordShooter.misses) % WORD_SHOOTER_DROP_TYPES.length];
    spawnWordShooterPickup(type, Math.max(20, enemy.x - 4), Math.min(78, enemy.y + 6));
  }

  function grantWordShooterComboReward() {
    const combo = state.wordShooter.combo;
    if (combo === 3) {
      grantWordShooterWeapon('triple-beam', 10000);
    } else if (combo === 5) {
      grantWordShooterWeapon('homing-missile', 9000);
    }
  }

  function setWordShooterMoveInput(input = {}) {
    const moveInput = state.wordShooter.moveInput;
    ['up', 'down', 'left', 'right'].forEach(direction => {
      moveInput[direction] = Boolean(input[direction]);
    });
    return { ...moveInput };
  }

  function moveWordShooterPlayer(deltaMs) {
    const ws = state.wordShooter;
    const dx = Number(ws.moveInput.right) - Number(ws.moveInput.left);
    const dy = Number(ws.moveInput.down) - Number(ws.moveInput.up);
    if (!dx && !dy) return;
    const length = Math.hypot(dx, dy) || 1;
    const distance = WORD_SHOOTER_PLAYER_SPEED * getWordShooterLoadout().speedMultiplier * (deltaMs / 1000);
    ws.player.x = clampNumber(ws.player.x + (dx / length) * distance, WORD_SHOOTER_PLAYER_BOUNDS.minX, WORD_SHOOTER_PLAYER_BOUNDS.maxX);
    ws.player.y = clampNumber(ws.player.y + (dy / length) * distance, WORD_SHOOTER_PLAYER_BOUNDS.minY, WORD_SHOOTER_PLAYER_BOUNDS.maxY);
  }

  function recordWordShooterHazardEvent(type, payload = {}) {
    const events = state.wordShooter.hazardEvents;
    events.push({ type, at: state.wordShooter.elapsedMs, ...payload });
    state.wordShooter.hazardEvents = events.slice(-20);
  }

  function spawnWordShooterHazard(type, options = {}) {
    const mechanic = wordShooterMechanic();
    if (!mechanic.hazardTypes.includes(type) && !options.force) return null;
    const ws = state.wordShooter;
    const hazardId = ws.hazardId + 1;
    const fallbackY = WORD_SHOOTER_LANES[(hazardId + ws.completedWords.length) % 3] || 38;
    const hazard = {
      id: `hazard-${hazardId}`,
      type,
      x: Number(options.x ?? (type === 'meteor' ? 28 + (hazardId % 5) * 13 : type === 'charge' ? 92 : 72 + (hazardId % 3) * 8)),
      y: Number(options.y ?? (type === 'meteor' ? -8 : type === 'charge' ? ws.player.y : fallbackY)),
      vx: Number(options.vx ?? (type === 'meteor' ? -2.5 : type === 'charge' ? -34 : -11)),
      vy: Number(options.vy ?? (type === 'meteor' ? 24 : 0)),
      radius: Number(options.radius ?? WORD_SHOOTER_HAZARD_RADIUS),
      warningUntil: ws.elapsedMs + (type === 'meteor' ? 500 : 0)
    };
    ws.hazardId = hazardId;
    ws.hazards.push(hazard);
    recordWordShooterHazardEvent('spawn', { hazardType: type, hazardId: hazard.id });
    return hazard;
  }

  function removeWordShooterHazard(hazardId, reason = 'cleared') {
    const hazard = state.wordShooter.hazards.find(item => item.id === hazardId);
    if (!hazard) return false;
    state.wordShooter.hazards = state.wordShooter.hazards.filter(item => item.id !== hazardId);
    recordWordShooterHazardEvent(reason, { hazardType: hazard.type, hazardId });
    return true;
  }

  function distanceToSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy || 1;
    const t = clampNumber(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
    return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
  }

  function clearWordShooterHazardsAlongShot(start, end) {
    const clearable = state.wordShooter.hazards.find(hazard => {
      if (!['mine', 'meteor'].includes(hazard.type)) return false;
      const point = wordShooterArenaPointFromPercent(hazard.x, hazard.y);
      return distanceToSegment(point, start, end) <= 24;
    });
    return clearable ? removeWordShooterHazard(clearable.id, 'shot-clear') : false;
  }

  function activateWordShooterBoss() {
    const ws = state.wordShooter;
    if (state.wordDifficulty !== 'full' || ws.boss.active || ws.boss.defeated) return false;
    ws.boss.active = true;
    ws.boss.defeated = false;
    ws.boss.maxHealth = WORD_SHOOTER_BOSS_MAX_HEALTH;
    ws.boss.health = WORD_SHOOTER_BOSS_MAX_HEALTH;
    ws.boss.phase = 'shielded';
    ws.boss.nextAttackAt = ws.elapsedMs + 1000;
    ws.boss.attackCount = 0;
    recordWordShooterHazardEvent('boss-start', { health: ws.boss.health });
    return true;
  }

  function damageWordShooterBoss(amount = 1) {
    const boss = state.wordShooter.boss;
    if (!boss.active || boss.defeated) return false;
    boss.health = Math.max(0, boss.health - Math.max(1, Number(amount) || 1));
    if (boss.health <= Math.ceil(boss.maxHealth / 2)) boss.phase = 'enraged';
    if (boss.health <= 0) {
      boss.health = 0;
      boss.phase = 'defeated';
      boss.defeated = true;
      recordWordShooterHazardEvent('boss-defeated');
    }
    return true;
  }

  function spawnWordShooterBossVolley() {
    const ws = state.wordShooter;
    const rows = [ws.player.y - 15, ws.player.y, ws.player.y + 15]
      .map(y => clampNumber(y, 12, 88));
    rows.forEach((y, index) => {
      spawnWordShooterEnemyBullet({ id: `boss-${ws.boss.attackCount}`, x: 88, y }, 'boss-bolt');
      if (index === 1) recordWordShooterHazardEvent('boss-volley', { row: y });
    });
  }

  function triggerWordShooterBossAttack() {
    const ws = state.wordShooter;
    const boss = ws.boss;
    if (!boss.active || boss.defeated) return false;
    boss.attackCount += 1;
    if (boss.phase === 'shielded') {
      spawnWordShooterBossVolley();
    } else {
      spawnWordShooterHazard('meteor', { force: true, x: 52 + (boss.attackCount % 3) * 13, y: -8, vy: 27 });
      spawnWordShooterHazard('charge', { force: true, x: 92, y: ws.player.y, vx: -38 });
    }
    boss.nextAttackAt = ws.elapsedMs + WORD_SHOOTER_BOSS_ATTACK_INTERVAL;
    return true;
  }

  function updateWordShooterBoss() {
    const ws = state.wordShooter;
    const bossStartAt = Math.max(1, ws.roundGoal - WORD_SHOOTER_BOSS_START_GAP);
    if (state.wordDifficulty === 'full' && ws.completedWords.length >= bossStartAt) {
      activateWordShooterBoss();
    }
    if (ws.boss.active && !ws.boss.defeated && ws.elapsedMs >= ws.boss.nextAttackAt) {
      triggerWordShooterBossAttack();
    }
  }

  function updateWordShooterHazards(deltaMs) {
    const ws = state.wordShooter;
    const mechanic = wordShooterMechanic();
    if (state.wordDifficulty === 'intermediate' && ws.elapsedMs >= ws.nextMineAt && ws.hazards.filter(item => item.type === 'mine').length < 2) {
      spawnWordShooterHazard('mine');
      ws.nextMineAt = ws.elapsedMs + WORD_SHOOTER_MINE_INTERVAL;
    }
    if (state.wordDifficulty === 'full' && ws.boss.active && ws.elapsedMs >= ws.nextMeteorAt && ws.hazards.filter(item => item.type === 'meteor').length < 2) {
      spawnWordShooterHazard('meteor');
      ws.nextMeteorAt = ws.elapsedMs + WORD_SHOOTER_METEOR_INTERVAL;
    }
    ws.hazards.forEach(hazard => {
      hazard.x += hazard.vx * (deltaMs / 1000);
      hazard.y += hazard.vy * (deltaMs / 1000);
    });
    const collision = ws.hazards.find(hazard => {
      const vertical = Math.abs(hazard.y - ws.player.y);
      const horizontal = Math.abs(hazard.x - ws.player.x);
      return (hazard.type === 'meteor' && vertical <= hazard.radius && horizontal <= hazard.radius)
        || (hazard.type !== 'meteor' && Math.hypot(horizontal, vertical) <= hazard.radius);
    });
    if (collision) {
      removeWordShooterHazard(collision.id, 'player-hit');
      resolveWordShooterPlayerHit(collision.type);
      if (ws.roundComplete) return;
    }
    ws.hazards = ws.hazards.filter(hazard => {
      if (hazard.type === 'meteor') return hazard.y < 108 && hazard.x > -12 && hazard.x < 112;
      return hazard.x > -12 && hazard.x < 112 && hazard.y > -12 && hazard.y < 112;
    });
    if (!mechanic.hazardTypes.length) ws.hazards = [];
  }

  function debugHitWordShooterHazard() {
    const hazard = state.wordShooter.hazards[0];
    if (!hazard) return wordShooterSnapshot();
    state.wordShooter.player.x = hazard.x;
    state.wordShooter.player.y = hazard.y;
    updateWordShooterHazards(0);
    renderTypingArena();
    return wordShooterSnapshot();
  }

  function spawnWordShooterEnemyBullet(enemy, kind = 'enemy-bolt') {
    const ws = state.wordShooter;
    const dx = ws.player.x - enemy.x;
    const dy = ws.player.y - enemy.y;
    const distance = Math.hypot(dx, dy) || 1;
    const speed = WORD_SHOOTER_ENEMY_BULLET_SPEED * wordDifficultyTuning().shooter.speedMultiplier;
    ws.enemyBulletId += 1;
    ws.enemyBullets.push({
      id: `enemy-bullet-${ws.enemyBulletId}`,
      x: enemy.x - 2,
      y: enemy.y,
      vx: (dx / distance) * speed,
      vy: (dy / distance) * speed,
      sourceEnemyId: enemy.id,
      kind
    });
  }

  function resolveWordShooterPlayerHit(reason = 'energy') {
    const ws = state.wordShooter;
    if (ws.invulnerableUntil > ws.elapsedMs || ws.roundComplete) return false;
    ws.shield = Math.max(0, ws.shield - 1);
    ws.invulnerableUntil = ws.elapsedMs + WORD_SHOOTER_INVULNERABLE_MS;
    ws.misses += 1;
    ws.combo = 0;
    recordWordShooterHazardEvent('player-hit', { hazardType: reason });
    sfx.impact('homing-missile');
    if (ws.shield <= 0) {
      ws.roundComplete = true;
      finishRound('word-shooter', {
        kicker: 'English',
        title: '护盾耗尽',
        copy: '躲开能量弹，再用字母锁定敌机。',
        stats: [
          { label: '击破单词', value: `${ws.completedWords.length}/${ws.roundGoal}` },
          { label: '总得分', value: String(ws.score) },
          { label: '护盾', value: `0/${getWordShooterLoadout().shield}` }
        ]
      });
    }
    return true;
  }

  function updateWordShooterEnemyBullets(deltaMs) {
    const ws = state.wordShooter;
    ws.enemies.forEach(enemy => {
      if (enemy.destroying) return;
      if (!ws.enemyFireEnabled) return;
      if (ws.elapsedMs >= enemy.nextShotAt) {
        spawnWordShooterEnemyBullet(enemy);
        enemy.nextShotAt = ws.elapsedMs + WORD_SHOOTER_ENEMY_FIRE_INTERVAL / Math.max(0.7, wordDifficultyTuning().shooter.speedMultiplier);
      }
    });
    ws.enemyBullets.forEach(bullet => {
      bullet.x += bullet.vx * (deltaMs / 1000);
      bullet.y += bullet.vy * (deltaMs / 1000);
    });
    const hit = ws.enemyBullets.find(bullet => Math.hypot(bullet.x - ws.player.x, bullet.y - ws.player.y) <= WORD_SHOOTER_ENEMY_BULLET_RADIUS);
    if (hit) {
      ws.enemyBullets = ws.enemyBullets.filter(bullet => bullet.id !== hit.id);
      resolveWordShooterPlayerHit();
    }
    ws.enemyBullets = ws.enemyBullets.filter(bullet => bullet.x > -8 && bullet.x < 108 && bullet.y > -8 && bullet.y < 108);
  }

  function updateWordShooter(deltaMs = WORD_SHOOTER_TICK_MS) {
    const ws = state.wordShooter;
    if (ws.roundComplete) return;
    ws.elapsedMs += deltaMs;
    getWordShooterWeapon();
    moveWordShooterPlayer(deltaMs);
    ws.enemies.forEach(enemy => {
      enemy.x -= enemy.speed * (deltaMs / 1000);
    });
    const crashed = ws.enemies.filter(enemy => enemy.x <= WORD_SHOOTER_COLLISION_X);
    if (crashed.length) {
      crashed.forEach(enemy => {
        if (ws.activeEnemyId === enemy.id) {
          ws.activeEnemyId = null;
          ws.currentTyped = '';
        }
        ws.combo = 0;
        ws.misses += 1;
        const impactPoint = wordShooterArenaPointFromPercent(WORD_SHOOTER_PLAYER_X, enemy.y);
        spawnWordShooterImpact(impactPoint.x, impactPoint.y, 'homing-missile');
        spawnImpactSparks(impactPoint.x, impactPoint.y, 'homing-missile');
      });
      ws.enemies = ws.enemies.filter(enemy => enemy.x > WORD_SHOOTER_COLLISION_X);
      ws.roundComplete = true;
      finishRound('word-shooter', {
        kicker: 'English',
        title: '战机爆炸',
        copy: '敌机撞到我方战机了，换一局继续锁定单词。',
        stats: [
          { label: '击破单词', value: `${ws.completedWords.length}/${ws.roundGoal}` },
          { label: '总得分', value: String(ws.score) },
          { label: '碰撞', value: String(ws.misses) }
        ]
      });
      return;
    }
    updateWordShooterEnemyBullets(deltaMs);
    if (ws.roundComplete) return;
    updateWordShooterBoss();
    updateWordShooterHazards(deltaMs);
    if (ws.roundComplete) return;
    if (ws.pickup) {
      ws.pickup.x += ws.pickup.vx * (deltaMs / 1000);
      ws.pickup.y += ws.pickup.vy * (deltaMs / 1000);
      if (ws.pickup.x <= 22 && ws.pickup.y >= 64) {
        grantWordShooterWeapon(ws.pickup.type);
      } else if (ws.pickup.x <= 10 || ws.pickup.y >= 92) {
        ws.pickup = null;
      }
    }
    ensureWordShooterEnemies();
  }

  function wordShooterSnapshot() {
    const phase = wordShooterPhaseForCompletedWords();
    return {
      activeEnemyId: state.wordShooter.activeEnemyId,
      currentTyped: state.wordShooter.currentTyped,
      weaponId: getWordShooterWeapon().id,
      baseWeaponId: state.wordShooter.baseWeaponId,
      shipId: getWordShooterLoadout().shipId,
      enemies: state.wordShooter.enemies.filter(enemy => !enemy.destroying).map(enemy => ({
        id: enemy.id,
        word: enemy.wordData.word,
        level: enemy.wordData.level,
        sourcePackGroup: enemy.wordData.sourcePackGroup,
        x: Number(enemy.x.toFixed(2)),
        y: Number(enemy.y.toFixed(2))
      })),
      pickup: state.wordShooter.pickup ? { ...state.wordShooter.pickup } : null,
      combo: state.wordShooter.combo,
      misses: state.wordShooter.misses,
      score: state.wordShooter.score,
      completedWords: state.wordShooter.completedWords.slice(),
      roundGoal: state.wordShooter.roundGoal,
      roundComplete: state.wordShooter.roundComplete,
      phase: phase.id,
      phaseLabel: phase.label,
      spawnCount: state.wordShooter.enemyId,
      difficulty: { ...wordDifficultyTuning().shooter },
      attackEvents: state.wordShooter.attackEvents.slice()
      ,learning: wordShooterLearningSnapshot()
      ,player: { x: Number(state.wordShooter.player.x.toFixed(2)), y: Number(state.wordShooter.player.y.toFixed(2)) }
      ,shield: state.wordShooter.shield
      ,invulnerableUntil: state.wordShooter.invulnerableUntil
      ,enemyBullets: state.wordShooter.enemyBullets.map(bullet => ({ ...bullet }))
      ,hazards: state.wordShooter.hazards.map(hazard => ({ ...hazard }))
      ,hazardEvents: state.wordShooter.hazardEvents.slice()
      ,boss: { ...state.wordShooter.boss }
      ,moveInput: { ...state.wordShooter.moveInput }
      ,stageTheme: { ...wordShooterStageTheme() }
      ,mechanic: { ...wordShooterMechanic() }
      ,loadout: getWordShooterLoadout()
      ,progression: wordShooterProgressionSnapshot()
    };
  }

  function tickWordShooter() {
    if (state.activeGame !== 'word-shooter') return;
    updateWordShooter(WORD_SHOOTER_TICK_MS);
    renderTypingArena();
  }

  function tickWordShooterFrame(stepMs = WORD_SHOOTER_TICK_MS, frames = 1) {
    for (let index = 0; index < Math.max(1, frames); index += 1) {
      updateWordShooter(stepMs);
    }
    renderTypingArena();
    return wordShooterSnapshot();
  }

  function stopWordShooter() {
    if (state.wordShooter.timer) window.clearInterval(state.wordShooter.timer);
    state.wordShooter.timer = null;
    clearTypingFx();
  }

  function startWordShooter() {
    const ws = state.wordShooter;
    const loadout = getWordShooterLoadout();
    stopWordShooter();
    state.words = wordsForDifficulty();
    ws.roundWords = shuffleWordsForRound(state.words);
    ws.enemies = [];
    ws.completedWords = [];
    ws.activeEnemyId = null;
    ws.currentTyped = '';
    ws.score = 0;
    ws.combo = 0;
    ws.misses = 0;
    ws.spawnCursor = 0;
    ws.enemyId = 0;
    ws.pickup = null;
    ws.elapsedMs = 0;
    ws.baseWeaponId = loadout.weaponId;
    ws.weaponId = loadout.weaponId;
    ws.shipId = loadout.shipId;
    ws.weaponExpiresAt = 0;
    ws.firePoseUntil = 0;
    ws.muzzleFlashUntil = 0;
    ws.arenaShakeUntil = 0;
    ws.arenaShakeLevel = 0;
    ws.attackEvents = [];
    ws.announcedKey = '';
    ws.resolvingHit = false;
    ws.pendingMistakes = 0;
    ws.player = { x: WORD_SHOOTER_PLAYER_X, y: WORD_SHOOTER_PLAYER_START_Y };
    ws.moveInput = { up: false, down: false, left: false, right: false };
    ws.shield = loadout.shield;
    ws.invulnerableUntil = 0;
    ws.enemyBullets = [];
    ws.enemyBulletId = 0;
    ws.hazards = [];
    ws.hazardId = 0;
    ws.nextMineAt = WORD_SHOOTER_MINE_INTERVAL;
    ws.nextMeteorAt = WORD_SHOOTER_METEOR_INTERVAL;
    ws.hazardEvents = [];
    ws.learning = {
      tasksPresented: 0,
      wordsCompleted: 0,
      firstTryWords: 0,
      retryWords: 0,
      correctLetters: 0,
      wrongLetters: 0,
      targetSwitches: 0,
      voiceAnnounced: 0
    };
    ws.boss = {
      active: false,
      defeated: false,
      health: 0,
      maxHealth: WORD_SHOOTER_BOSS_MAX_HEALTH,
      phase: 'dormant',
      nextAttackAt: 0,
      attackCount: 0
    };
    ws.enemyFireEnabled = true;
    ws.roundGoal = wordDifficultyTuning().shooter.roundGoal;
    ws.roundComplete = false;
    ws.rewardClaimed = false;
    ws.spawnCursor = startWordCursor(ws.roundWords);
    state.wordIndex = ws.spawnCursor;
    state.input = '';
    state.combo = 0;
    clearTypingFx();
    ensureWordShooterEnemies();
    renderTypingArena();
    ws.timer = window.setInterval(tickWordShooter, WORD_SHOOTER_TICK_MS);
    speakCurrentWord(true);
  }

  function speakCurrentWord(force = false) {
    if (state.activeGame === 'word-shooter') {
      const focusEnemy = focusWordShooterEnemy();
      const announcedKey = focusEnemy ? `${focusEnemy.id}:${focusEnemy.wordData.word}` : '';
      if (!focusEnemy || (!force && state.wordShooter.announcedKey === announcedKey)) return Promise.resolve();
      state.wordShooter.announcedKey = announcedKey;
      state.wordShooter.learning.voiceAnnounced += 1;
      return speakSequence(focusEnemy.wordData);
    }
    return speakSequence(currentWord());
  }

  function inputWordLetter(letter) {
    const ws = state.wordShooter;
    if (state.activeGame !== 'word-shooter' || ws.roundComplete || ws.resolvingHit || !/^[a-z]$/.test(letter)) return;
    let targetEnemy = getWordShooterEnemy(ws.activeEnemyId);
    if (!targetEnemy) {
      targetEnemy = wordShooterEnemiesForPrefix(letter)[0] || null;
      if (targetEnemy) {
        ws.activeEnemyId = targetEnemy.id;
        ws.currentTyped = '';
        targetEnemy.learning.mistakes += ws.pendingMistakes;
        ws.pendingMistakes = 0;
        sfx.lock();
      }
    }
    const expected = targetEnemy?.wordData.word?.[ws.currentTyped.length];
    if (!targetEnemy || letter !== expected) {
      const switchTarget = wordShooterEnemiesForPrefix(letter, targetEnemy?.id)[0] || null;
      if (switchTarget) {
        targetEnemy = switchTarget;
        ws.activeEnemyId = switchTarget.id;
        ws.currentTyped = '';
        ws.learning.targetSwitches += 1;
        sfx.lock();
      } else {
        ws.learning.wrongLetters += 1;
        if (targetEnemy?.learning) {
          targetEnemy.learning.mistakes += 1;
          targetEnemy.learning.totalAttempts += 1;
        } else {
          ws.pendingMistakes += 1;
        }
        sfx.wrong();
        ws.combo = 0;
        renderTypingArena();
        return;
      }
    }
    const nextExpected = targetEnemy.wordData.word[ws.currentTyped.length];
    if (letter !== nextExpected) {
      ws.learning.wrongLetters += 1;
      targetEnemy.learning.mistakes += 1;
      targetEnemy.learning.totalAttempts += 1;
      sfx.wrong();
      ws.combo = 0;
      renderTypingArena();
      return;
    }
    ws.currentTyped += letter;
    ws.learning.correctLetters += 1;
    targetEnemy.learning.correctLetters += 1;
    targetEnemy.learning.totalAttempts += 1;
    state.input = ws.currentTyped;
    sfx.tick();
    pulseWordShooterHud('hit');
    renderTypingArena();
    spawnTypingBullet(ws.currentTyped.length - 1);
    if (ws.currentTyped === targetEnemy.wordData.word) {
      ws.resolvingHit = true;
      ws.combo += 1;
      ws.score += Math.max(1, Math.round(targetEnemy.wordData.word.length * getWordShooterLoadout().comboMultiplier));
      state.combo = ws.combo;
      grantWordShooterComboReward();
      const finisherWeaponId = getWordShooterWeapon().id;
      const finisherNode = targetEnemyHitNode(targetEnemy.id);
      const finisherPoint = getArenaPoint(finisherNode, 0.5, 0.5);
      ws.completedWords.push(targetEnemy.wordData.word);
      ws.learning.wordsCompleted += 1;
      if (targetEnemy.learning.mistakes) ws.learning.retryWords += 1;
      else ws.learning.firstTryWords += 1;
      if (ws.boss.active && !ws.boss.defeated) {
        damageWordShooterBoss(Math.max(1, Math.ceil(targetEnemy.wordData.word.length / 5)));
      }
      maybeDropWordShooterPickup(targetEnemy);
      scheduleWordShooterEnemyDestroy(targetEnemy.id, 520);
      ws.activeEnemyId = null;
      ws.currentTyped = '';
      ws.pendingMistakes = 0;
      ws.resolvingHit = false;
      state.wordIndex = (state.wordIndex + 1) % Math.max(1, state.words.length);
      state.input = '';
      if (ws.completedWords.length >= ws.roundGoal) {
        ws.roundComplete = true;
      }
      ensureWordShooterEnemies();
      renderTypingArena();
      if (!ws.roundComplete) speakCurrentWord(true);
      window.setTimeout(() => {
        if (state.activeGame !== 'word-shooter') return;
        if (finisherPoint) {
          spawnWordShooterScorePopup(finisherPoint.x, finisherPoint.y - 18, `+${targetEnemy.wordData.word.length}`, 'finisher');
          spawnWordShooterFinisher(finisherPoint.x, finisherPoint.y, finisherWeaponId, targetEnemy.wordData.word.length);
        }
        pulseWordShooterHud('combo');
        if (ws.roundComplete) {
          finishRound('word-shooter', {
            kicker: 'English',
            title: '任务完成',
            copy: '这一轮单词战机已经全部击破，做得漂亮。',
            stats: [
              { label: '击破单词', value: `${ws.completedWords.length}/${ws.roundGoal}` },
              { label: '总得分', value: String(ws.score) },
              { label: '漏怪', value: String(ws.misses) }
            ]
          });
        }
      }, 120);
    }
  }

  function wordCannonTargetsSorted() {
    return [...state.wordCannon.targets].sort((left, right) => {
      if (right.y !== left.y) return right.y - left.y;
      return (left.targetIndex ?? left.laneIndex) - (right.targetIndex ?? right.laneIndex);
    });
  }

  function getWordCannonTarget(targetId) {
    return state.wordCannon.targets.find(target => target.id === targetId) || null;
  }

  function currentWordCannonMap() {
    const wc = state.wordCannon;
    return WORD_CANNON_MAPS[wc.mapIndex] || WORD_CANNON_MAPS[0];
  }

  function getWordCannonMapIndex() {
    return state.wordCannon.mapIndex;
  }

  function focusWordCannonTarget() {
    return getWordCannonTarget(state.wordCannon.activeTargetId)
      || state.wordCannon.targets.find(target => target.correct)
      || wordCannonTargetsSorted()[0]
      || null;
  }

  function getWordCannonExpectedLetters() {
    return new Set(['left', 'right']);
  }

  function pinyinInitialKey(pinyin) {
    const normalized = normalizePinyin(pinyin);
    return PINYIN_INITIALS.find(prefix => normalized.startsWith(prefix) && normalized.length > prefix.length)
      || normalized[0]
      || '';
  }

  function pinyinOptionPool(correctPinyin) {
    const level = state.wordDifficulty;
    const correct = normalizePinyin(correctPinyin);
    const correctInitial = pinyinInitialKey(correct);
    const pool = (state.hanzi.length ? state.hanzi : FALLBACK_HANZI)
      .map(item => normalizePinyin(item?.pinyin))
      .filter(item => item && item !== correct);
    const unique = [...new Set(pool)];
    const childFriendly = unique.filter(item => pinyinInitialKey(item) !== correctInitial && Math.abs(item.length - correct.length) >= 1);
    const differentInitial = unique.filter(item => pinyinInitialKey(item) !== correctInitial);
    if (level === 'basic') return childFriendly.length >= 2 ? childFriendly : (differentInitial.length >= 2 ? differentInitial : unique);
    if (level === 'intermediate') return differentInitial.length >= 2 ? differentInitial : unique;
    return unique;
  }

  function pinyinRacerTargetLayout() {
    const tuning = wordDifficultyTuning().cannon;
    const layout = PINYIN_RACER_TARGET_LAYOUTS[state.wordDifficulty] || PINYIN_RACER_TARGET_LAYOUTS.basic;
    return layout.slice(0, tuning.maxTargets);
  }

  function createPinyinRacerChoices(wordData, correctTargetIndex) {
    const choices = [{ text: wordData.pinyin, correct: true }];
    const pool = pinyinOptionPool(wordData.pinyin);
    const targetCount = pinyinRacerTargetLayout().length;
    const fallbackPool = ['ba', 'ma', 'shi', 'xin', 'yue'];
    const used = new Set(choices.map(choice => choice.text));
    while (choices.length < targetCount) {
      const poolCandidate = pool[(state.wordCannon.targetId + choices.length * 5) % Math.max(1, pool.length)];
      const candidate = [poolCandidate, ...pool, ...fallbackPool, `pin${String.fromCharCode(97 + choices.length)}`]
        .find(item => item && !used.has(item));
      if (!candidate) break;
      choices.push({ text: candidate, correct: false });
      used.add(candidate);
    }
    const rotated = choices.slice(0, targetCount);
    const currentCorrectIndex = rotated.findIndex(choice => choice.correct);
    [rotated[currentCorrectIndex], rotated[correctTargetIndex]] = [rotated[correctTargetIndex], rotated[currentCorrectIndex]];
    return rotated;
  }

  function createWordCannonTarget(targetIndex = 0, wordData = null, choice = null, targetNumber = 1) {
    const data = wordData || pinyinCannonItemAt(state.wordCannon.spawnCursor);
    const option = choice || { text: data.pinyin, correct: true };
    const layout = pinyinRacerTargetLayout()[targetIndex] || { x: WORD_CANNON_LANES[targetIndex % WORD_CANNON_LANES.length], visualOffset: 0 };
    const laneIndex = layout.x < 40 ? 0 : layout.x > 60 ? 2 : 1;
    return {
      id: `cannon-${targetNumber}-${targetIndex}`,
      laneIndex,
      targetIndex,
      x: layout.x,
      y: PINYIN_RACER_CARD_START_Y,
      visualOffset: layout.visualOffset || 0,
      speed: (6.6 + data.word.length * 0.12) * wordDifficultyTuning().cannon.speedMultiplier,
      word: option.text,
      pinyin: data.pinyin,
      char: data.char,
      correct: !!option.correct,
      route: option.correct ? 'inner' : 'wide',
      cardType: ['gate', 'boost', 'sign', 'supply', 'finish'][targetIndex % 5],
      wordData: {
        ...data,
        word: option.text,
        option: option.text,
        correct: !!option.correct
      },
      learning: {
        mistakes: 0
      },
      hitTick: 0,
      theme: WORD_CANNON_TARGET_THEMES[(targetNumber + targetIndex - 1) % WORD_CANNON_TARGET_THEMES.length]
    };
  }

  function createPinyinRacerWave() {
    const wc = state.wordCannon;
    const mapSegments = PINYIN_RACER_SEGMENTS.filter(item => item.mapIndex === wc.mapIndex);
    const segment = (mapSegments.length ? mapSegments : PINYIN_RACER_SEGMENTS)[wc.segmentIndex % Math.max(1, mapSegments.length)];
    wc.segment = segment;
    const retryTask = wc.retryTask;
    const wordData = retryTask || pinyinCannonItemAt(wc.spawnCursor);
    const targetNumber = wc.targetId + 1;
    wc.targetId = targetNumber;
    if (!retryTask) {
      wc.spawnCursor = (wc.spawnCursor + 1) % Math.max(1, (state.hanzi.length ? state.hanzi : FALLBACK_HANZI).length);
    }
    wc.retryTask = null;
    wc.taskHadRetry = Boolean(retryTask);
    if (!retryTask) wc.learning.tasksPresented += 1;
    const targetLayout = pinyinRacerTargetLayout();
    const correctTargetIndex = segment.shape === 'fork'
      ? 0
      : segment.shape === 'finish-sprint'
        ? targetLayout.length - 1
        : targetNumber % targetLayout.length;
    const choices = createPinyinRacerChoices(wordData, correctTargetIndex);
    wc.currentTask = wordData;
    wc.activeTargetId = null;
    wc.currentTyped = '';
    return choices.map((choice, targetIndex) => {
      const target = createWordCannonTarget(targetIndex, wordData, choice, targetNumber);
      target.taskType = segment.taskType;
      target.landmark = segment.landmark;
      target.segmentId = segment.id;
      target.cardType = segment.taskType === 'image-supply' && targetIndex === 1
        ? 'supply'
        : segment.taskType === 'tone-sign' && targetIndex === 2
          ? 'sign'
          : segment.taskType === 'final-gate' && targetIndex === 1
            ? 'finish'
            : target.cardType;
      return target;
    });
  }

  function ensureWordCannonTargets() {
    const wc = state.wordCannon;
    if (wc.roundComplete || wc.completedWords.length >= wc.roundGoal) return;
    if (!wc.targets.length) wc.targets = createPinyinRacerWave();
  }

  function renderCannonWordMarkup(word, doneCount = 0, locked = false) {
    return word.split('').map((letter, index) => {
      const stateClass = index < doneCount
        ? ' is-done'
        : locked && index === doneCount
          ? ' is-current'
          : '';
      return `<span class="cannon-letter${stateClass}">${displayTypingLetter(letter)}</span>`;
    }).join('');
  }

  function renderPinyinRacerTask(focusTarget) {
    const task = state.wordCannon.currentTask || focusTarget?.wordData || null;
    if (!task) return '<span>拼音赛车</span><strong>ready</strong>';
    return `
      <span>接正确拼音</span>
      <strong><b class="pinyin-task-char">${task.char || '字'}</b><small>${task.example || '左右移动接卡片'}</small></strong>
    `;
  }

  function pinyinRacerFacilityAsset(target) {
    const segmentId = target?.segmentId || '';
    if (segmentId === 'tunnel') return PINYIN_RACER_ASSETS.facilities.tunnel;
    if (segmentId === 'finish-sprint' || target?.cardType === 'finish') return PINYIN_RACER_ASSETS.facilities.finish;
    if (target?.cardType === 'supply') return PINYIN_RACER_ASSETS.facilities.supply;
    if (target?.cardType === 'sign') return PINYIN_RACER_ASSETS.facilities.tone;
    if (segmentId === 'fork') return PINYIN_RACER_ASSETS.facilities.fork;
    if (target?.cardType === 'boost') return PINYIN_RACER_ASSETS.facilities.tone;
    return PINYIN_RACER_ASSETS.facilities.gate;
  }

  function renderWordCannonStage() {
    const wc = state.wordCannon;
    const focusTarget = focusWordCannonTarget();
    const doneCount = wc.activeTargetId === focusTarget?.id ? wc.currentTyped.length : 0;
    const currentMap = currentWordCannonMap();
    const currentStageIndex = Math.floor(wc.completedWords.length / Math.max(1, wc.stageGoal)) + 1;
    const currentStageGoal = Math.ceil(wc.roundGoal / Math.max(1, wc.stageGoal));
    if (els.cannonProgress) els.cannonProgress.textContent = `${wc.completedWords.length} / ${wc.roundGoal}`;
    if (els.cannonCombo) {
      els.cannonCombo.textContent = wc.combo > 1
        ? `combo ${wc.combo}`
        : `stage ${Math.min(currentStageIndex, currentStageGoal)}/${currentStageGoal}`;
    }
    const task = wc.currentTask || focusTarget?.wordData || null;
    const segment = wc.segment || PINYIN_RACER_SEGMENTS[wc.segmentIndex % PINYIN_RACER_SEGMENTS.length];
    if (els.cannonPromptChinese) els.cannonPromptChinese.textContent = task?.char || '看汉字接拼音';
    if (els.cannonStage) {
      els.cannonStage.dataset.locked = wc.activeTargetId ? 'true' : 'false';
      els.cannonStage.dataset.feedbackTick = String(wc.feedbackTick || 0);
      els.cannonStage.dataset.boostTick = String(wc.shotTick || 0);
      els.cannonStage.dataset.sprint = wc.sprintUntil > wc.elapsedMs ? 'true' : 'false';
      els.cannonStage.dataset.hint = wc.hintUntil > wc.elapsedMs ? 'true' : 'false';
      els.cannonStage.dataset.mapId = currentMap.id;
      els.cannonStage.dataset.artDirection = currentMap.artDirection || 'legacy';
      els.cannonStage.dataset.segment = segment.id;
      els.cannonStage.dataset.taskType = segment.taskType;
      els.cannonStage.dataset.route = wc.activeTargetId ? (focusTarget?.route || segment.correctRoute) : segment.recoveryRoute;
      els.cannonStage.style.setProperty('--pinyin-car-x', `${wc.player.x}%`);
      els.cannonStage.style.setProperty('--pinyin-car-y', `${wc.player.y}%`);
      els.cannonStage.style.setProperty('--pinyin-car-progress', `${wc.carProgress || 0}px`);
      els.cannonStage.style.setProperty('--cannon-aim-x', `${focusTarget?.x || 50}%`);
      els.cannonStage.style.setProperty('--cannon-angle', `${((wc.player.x - 50) * 0.28).toFixed(2)}deg`);
      els.cannonStage.style.setProperty('--cannon-stage-image', `url("${currentMap.asset}")`);
    }
    const aimRing = document.getElementById('cannonAimRing');
    if (aimRing) {
      aimRing.innerHTML = `
        <img class="cannon-crosshair" src="${wc.activeTargetId ? WORD_CANNON_ASSETS.crosshair.locked : WORD_CANNON_ASSETS.crosshair.idle}" alt="" aria-hidden="true">
        <span class="cannon-aim-sweep"></span>
        <span class="cannon-aim-dot"></span>
      `;
    }
    if (els.cannonBase) {
      const carAsset = wc.roundComplete
        ? PINYIN_RACER_ASSETS.cars.finish
        : wc.drift
          ? (wc.drift < 0 ? PINYIN_RACER_ASSETS.cars.driftLeft : PINYIN_RACER_ASSETS.cars.driftRight)
        : wc.activeTargetId
          ? PINYIN_RACER_ASSETS.cars.boost
          : PINYIN_RACER_ASSETS.cars.idle;
      const racerState = wc.roundComplete
        ? 'finish'
        : wc.drift
          ? (wc.drift < 0 ? 'drift-left' : 'drift-right')
          : wc.activeTargetId
            ? 'boost'
            : 'idle';
      els.cannonBase.innerHTML = `
        <div class="pinyin-race-car" data-racer-state="${racerState}" data-racer-lane="${wc.playerLane}" aria-hidden="true">
          <img class="pinyin-race-car-img" src="${carAsset}" alt="">
          <img class="pinyin-race-speed-trail" src="${PINYIN_RACER_ASSETS.fx.longTrail}" alt="">
        </div>
      `;
    }
    if (els.cannonCurrentWord) {
      els.cannonCurrentWord.innerHTML = `${renderPinyinRacerTask(focusTarget)}<em class="race-task-type">${segment.landmark}</em>`;
    }
    if (els.cannonRouteLayer) {
      els.cannonRouteLayer.innerHTML = PINYIN_RACER_SEGMENTS.map((item, index) => `
        <span class="route-segment ${item.shape} ${index === wc.segmentIndex % PINYIN_RACER_SEGMENTS.length ? 'is-current' : ''}" data-segment-id="${item.id}">
          <b class="race-landmark">${item.landmark}</b>
          <i class="route-path route-${item.correctRoute}"></i>
        </span>
      `).join('') + `
        <img class="race-checkpoint-arch" src="${PINYIN_RACER_ASSETS.checkpointArch}" alt="" aria-hidden="true">
      `;
    }
    if (els.cannonTargetLayer) {
      els.cannonTargetLayer.innerHTML = wordCannonTargetsSorted().map(target => {
        const locked = Math.hypot(target.x - wc.player.x, target.y - wc.player.y) < 18;
        const warning = target.y >= PINYIN_RACER_CATCH_Y - 12 ? ' is-warning' : '';
        const hint = wc.hintUntil > wc.elapsedMs && target.correct;
        return `
            <article class="cannon-target cannon-card-${target.cardType || 'gate'}${locked ? ' is-locked' : ''}${warning}${hint ? ' is-hint-option' : ''}" data-cannon-target-id="${target.id}" data-cannon-theme="${target.theme}" data-cannon-lane="${target.laneIndex}" data-cannon-target-index="${target.targetIndex ?? target.laneIndex}" style="left:${target.x.toFixed(2)}%;top:${(target.y + (target.visualOffset || 0)).toFixed(2)}%">
            <img class="cannon-target-frame" src="${pinyinRacerFacilityAsset(target)}" alt="" aria-hidden="true">
            <span class="cannon-target-facility" aria-hidden="true">${target.cardType === 'supply' ? '◆' : target.cardType === 'finish' ? '★' : target.cardType === 'sign' ? '⌁' : target.cardType === 'boost' ? '➤' : '●'}</span>
            <div class="cannon-target-copy">
              <b class="cannon-target-word">${target.wordData.word}</b>
              <small>${hint ? '再找这个' : target.cardType === 'supply' ? '图片补给' : target.cardType === 'finish' ? '终点拼读门' : target.cardType === 'sign' ? '声调路牌' : target.cardType === 'boost' ? '韵母加速' : '声母门'}</small>
            </div>
          </article>
        `;
      }).join('');
    }
    renderCannonKeyboard();
  }

  function getCannonPoint(node, fallbackX = 0.5, fallbackY = 0.5) {
    if (!els.cannonStage) return null;
    const stageRect = els.cannonStage.getBoundingClientRect();
    if (!node) {
      return {
        x: stageRect.width * fallbackX,
        y: stageRect.height * fallbackY
      };
    }
    const rect = node.getBoundingClientRect();
    return {
      x: rect.left - stageRect.left + rect.width * fallbackX,
      y: rect.top - stageRect.top + rect.height * fallbackY
    };
  }

  function getCannonTargetNode(targetId) {
    if (!els.cannonTargetLayer) return null;
    return els.cannonTargetLayer.querySelector(`.cannon-target[data-cannon-target-id="${targetId}"]`);
  }

  function spawnCannonShot(targetId) {
    if (!els.cannonStage || !els.cannonFxLayer) return;
    const targetNode = getCannonTargetNode(targetId);
    const targetPoint = getCannonPoint(targetNode, 0.5, 0.52);
    const startPoint = getCannonPoint(null, 0.5, 0.86);
    if (!targetPoint || !startPoint) return;
    const dx = targetPoint.x - startPoint.x;
    const dy = targetPoint.y - startPoint.y;
    const length = Math.max(24, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const trail = document.createElement('img');
    trail.className = 'cannon-shot-trail';
    trail.src = PINYIN_RACER_ASSETS.fx.shortTrail;
    trail.alt = '';
    trail.setAttribute('aria-hidden', 'true');
    trail.style.left = `${startPoint.x}px`;
    trail.style.top = `${startPoint.y}px`;
    trail.style.width = `${Math.max(18, length)}px`;
    trail.style.setProperty('--shot-angle', `${angle}deg`);
    els.cannonFxLayer.appendChild(trail);
    window.setTimeout(() => trail.remove(), 360);
  }

  function spawnCannonShockwave(x, y) {
    if (!els.cannonFxLayer) return;
    const shockwave = document.createElement('span');
    shockwave.className = 'cannon-shockwave';
    shockwave.style.left = `${x}px`;
    shockwave.style.top = `${y}px`;
    els.cannonFxLayer.appendChild(shockwave);
    window.setTimeout(() => shockwave.remove(), 620);
  }

  function spawnCannonShards(x, y, count = 10) {
    if (!els.cannonFxLayer) return;
    for (let index = 0; index < count; index += 1) {
      const shard = document.createElement('span');
      const angle = -150 + (300 / Math.max(1, count - 1)) * index;
      const distance = 26 + (index % 4) * 9;
      const dx = Math.cos(angle * Math.PI / 180) * distance;
      const dy = Math.sin(angle * Math.PI / 180) * distance;
      shard.className = 'cannon-shard';
      shard.style.left = `${x}px`;
      shard.style.top = `${y}px`;
      shard.style.setProperty('--shard-dx', `${dx.toFixed(1)}px`);
      shard.style.setProperty('--shard-dy', `${dy.toFixed(1)}px`);
      shard.style.setProperty('--shard-rot', `${(angle + index * 17).toFixed(1)}deg`);
      shard.style.setProperty('--shard-delay', `${(index % 3) * 18}ms`);
      els.cannonFxLayer.appendChild(shard);
      window.setTimeout(() => shard.remove(), 720);
    }
  }

  function spawnCannonImpact(targetId, label = '') {
    if (!els.cannonFxLayer) return;
    const targetNode = getCannonTargetNode(targetId);
    const targetPoint = getCannonPoint(targetNode, 0.5, 0.5);
    if (!targetPoint) return;
    const impact = document.createElement('span');
    impact.className = 'cannon-impact';
    impact.style.left = `${targetPoint.x}px`;
    impact.style.top = `${targetPoint.y}px`;
    impact.innerHTML = `
      <img class="cannon-impact-flash" src="${PINYIN_RACER_ASSETS.rewards.star}" alt="" aria-hidden="true">
      <img class="cannon-impact-cluster" src="${PINYIN_RACER_ASSETS.fx.nitroBurst}" alt="" aria-hidden="true">
      ${label ? `<b>${label}</b>` : ''}
    `;
    els.cannonFxLayer.appendChild(impact);
    spawnCannonShockwave(targetPoint.x, targetPoint.y);
    spawnCannonShards(targetPoint.x, targetPoint.y);
    window.setTimeout(() => impact.remove(), 520);
  }

  function updateWordCannon(deltaMs = WORD_CANNON_TICK_MS) {
    const wc = state.wordCannon;
    if (wc.roundComplete) return;
    wc.elapsedMs += deltaMs;
    wc.carProgress = Math.min(46, (wc.carProgress || 0) + deltaMs * 0.055);
    wc.targets.forEach(target => {
      target.y += target.speed * (deltaMs / 1000);
    });
    const catchWave = wc.targets.find(target => target.y >= PINYIN_RACER_CATCH_Y) || null;
    if (catchWave) {
      const eligibleTargets = wc.targets.filter(target => target.y >= PINYIN_RACER_CATCH_Y);
      const caught = eligibleTargets.reduce((nearest, target) => {
        const distance = Math.hypot(target.x - wc.player.x, target.y - wc.player.y);
        return !nearest || distance < nearest.distance ? { target, distance } : nearest;
      }, null);
      const caughtTarget = caught?.distance <= 19 ? caught.target : null;
      const correct = !!caughtTarget?.correct;
      wc.activeTargetId = caughtTarget?.id || null;
      wc.feedbackTick += 1;
      if (correct) {
        const finishedWord = caughtTarget.pinyin;
        wc.completedWords.push(finishedWord);
        wc.learning.tasksResolved += 1;
        wc.learning.correctChoice += 1;
        if (!wc.taskHadRetry) wc.learning.firstTryCorrect += 1;
        wc.completedReview.push({ char: caughtTarget?.char || '', pinyin: finishedWord });
        wc.score += Math.max(1, finishedWord.length);
        wc.combo += 1;
        wc.sprintUntil = wc.elapsedMs + 420;
        wc.segmentIndex = (wc.segmentIndex + 1) % PINYIN_RACER_SEGMENTS.length;
        state.combo = wc.combo;
        spawnCannonImpact(caughtTarget.id, `+${Math.max(1, finishedWord.length)}`);
        sfx.impact('basic');
        if (els.cannonFeedback) els.cannonFeedback.textContent = `接到 ${caughtTarget?.char || ''} 的拼音 ${finishedWord}，连击 ${wc.combo}`;
      } else {
        wc.combo = 0;
        wc.misses += 1;
        wc.learning.retryCount += 1;
        wc.learning.wrongChoices += 1;
        wc.taskHadRetry = true;
        wc.retryTask = {
          ...(wc.currentTask || caughtTarget?.wordData || {}),
          word: caughtTarget?.pinyin || wc.currentTask?.pinyin || '',
          pinyin: caughtTarget?.pinyin || wc.currentTask?.pinyin || ''
        };
        wc.hintUntil = wc.elapsedMs + 5000;
        sfx.wrong();
        if (els.cannonFeedback) els.cannonFeedback.textContent = caughtTarget
          ? `${caughtTarget.word} 不是这个字的拼音，再找 ${caughtTarget.pinyin}。`
          : '还没靠近拼音卡，继续开过去。';
      }
      wc.targets = [];
      wc.currentTyped = '';
      state.input = '';
      wc.shotTick += correct ? 1 : 0;
      wc.feedbackTick += 1;
      if (correct && wc.completedWords.length >= wc.roundGoal) {
        wc.roundComplete = true;
        renderWordCannonStage();
        finishRound('word-cannon', {
          kicker: 'Pinyin',
          title: '任务完成',
          copy: '这一圈赛道已经跑完，小车接到了整轮拼音卡。',
          stats: [
            { label: '接到拼音', value: `${wc.completedWords.length}/${wc.roundGoal}` },
            { label: '得分', value: String(wc.score) },
            { label: '错过', value: String(wc.misses) }
          ]
        });
        return;
      }
      window.setTimeout(() => speakCurrentCannonWord(true), 120);
    }
    ensureWordCannonTargets();
  }

  function wordCannonSnapshot() {
    return {
      activeTargetId: state.wordCannon.activeTargetId,
      currentTyped: state.wordCannon.currentTyped,
      targets: state.wordCannon.targets.map(target => ({
        id: target.id,
        word: target.wordData.word,
        pinyin: target.wordData.pinyin || target.wordData.word,
        char: target.wordData.char || '',
        translation: target.wordData.translation || '',
        correct: !!target.correct,
        laneIndex: target.laneIndex,
        targetIndex: target.targetIndex ?? target.laneIndex,
        cardType: target.cardType || 'gate',
        x: Number(target.x.toFixed(2)),
        y: Number(target.y.toFixed(2))
      })),
      completedWords: state.wordCannon.completedWords.slice(),
      completedReview: state.wordCannon.completedReview.slice(),
      combo: state.wordCannon.combo,
      misses: state.wordCannon.misses,
      score: state.wordCannon.score,
      roundGoal: state.wordCannon.roundGoal,
      stageGoal: state.wordCannon.stageGoal,
      difficulty: { ...wordDifficultyTuning().cannon },
        playerLane: state.wordCannon.playerLane,
        player: { ...state.wordCannon.player },
        hintActive: state.wordCannon.hintUntil > state.wordCannon.elapsedMs,
        currentTask: state.wordCannon.currentTask ? { ...state.wordCannon.currentTask } : null,
        mapIndex: state.wordCannon.mapIndex,
        mapLocked: state.wordCannon.mapLocked,
        mapTitle: currentWordCannonMap().title,
        mapAsset: currentWordCannonMap().asset,
        learning: wordCannonLearningSnapshot()
      };
    }

  function tickWordCannon() {
    if (state.activeGame !== 'word-cannon') return;
    updateWordCannon(WORD_CANNON_TICK_MS);
    renderWordCannonStage();
  }

  function stopWordCannon() {
    if (state.wordCannon.timer) window.clearInterval(state.wordCannon.timer);
    state.wordCannon.timer = null;
    els.cannonFxLayer?.replaceChildren();
  }

  function startWordCannon() {
    const wc = state.wordCannon;
    stopWordCannon();
    state.words = wordsForDifficulty();
    wc.targets = [];
    wc.activeTargetId = null;
    wc.currentTyped = '';
    wc.completedWords = [];
    wc.completedReview = [];
    wc.score = 0;
    wc.combo = 0;
    wc.misses = 0;
    wc.spawnCursor = 0;
    wc.targetId = 0;
    wc.elapsedMs = 0;
    wc.shotTick = 0;
    wc.feedbackTick = 0;
    wc.announcedKey = '';
    wc.playerLane = 1;
    wc.player = { x: 50, y: 80 };
    wc.drift = 0;
    wc.sprintUntil = 0;
    wc.hintUntil = 0;
    wc.retryTask = null;
    wc.currentTask = null;
    wc.taskHadRetry = false;
    wc.learning = {
      tasksPresented: 0,
      tasksResolved: 0,
      correctChoice: 0,
      firstTryCorrect: 0,
      retryCount: 0,
      wrongChoices: 0,
      voiceAnnounced: 0
    };
    wc.roundGoal = wordDifficultyTuning().cannon.roundGoal;
    wc.stageGoal = wordDifficultyTuning().cannon.stageGoal;
    wc.mapIndex = 0;
    wc.mapLocked = false;
    wc.segmentIndex = 0;
    wc.segment = PINYIN_RACER_SEGMENTS[0];
    wc.carProgress = 0;
    wc.roundComplete = false;
    state.wordIndex = 0;
    state.input = '';
    if (els.cannonFeedback) els.cannonFeedback.textContent = WORD_CANNON_DEFAULT_FEEDBACK;
    ensureWordCannonTargets();
    renderWordCannonStage();
    wc.timer = window.setInterval(tickWordCannon, WORD_CANNON_TICK_MS);
    speakCurrentCannonWord(true);
  }

  function speakCurrentCannonWord(force = false) {
    const focusTarget = focusWordCannonTarget();
    const task = state.wordCannon.currentTask || focusTarget?.wordData || null;
    const announcedKey = task ? `${task.char}:${task.pinyin}` : '';
    if (!task || (!force && state.wordCannon.announcedKey === announcedKey)) return Promise.resolve();
    state.wordCannon.announcedKey = announcedKey;
    state.wordCannon.learning.voiceAnnounced += 1;
    const source = task.sourceHanzi || {};
    return speakHanziTask([
      { text: task.char || task.translation, lang: 'zh-CN' },
      { text: source.pinyin || task.pinyin || task.word, lang: 'zh-CN' }
    ]);
  }

  function moveWordCannonCar(direction) {
    const wc = state.wordCannon;
    if (state.activeGame !== 'word-cannon' || wc.roundComplete) return;
    const nextX = clampNumber(wc.player.x + direction * 10, 17, 83);
    if (nextX === wc.player.x) {
      sfx.wrong();
      return;
    }
    wc.player.x = nextX;
    wc.playerLane = nextX < 40 ? 0 : nextX > 60 ? 2 : 1;
    wc.drift = direction;
    wc.feedbackTick += 1;
    if (els.cannonFeedback) els.cannonFeedback.textContent = direction < 0 ? '向左换道，准备接拼音卡。' : '向右换道，准备接拼音卡。';
    sfx.lock();
    renderWordCannonStage();
    window.setTimeout(() => {
      if (state.activeGame !== 'word-cannon') return;
      wc.drift = 0;
      renderWordCannonStage();
    }, 180);
  }

  function moveWordCannonToLane(laneIndex) {
    const wc = state.wordCannon;
    if (state.activeGame !== 'word-cannon' || wc.roundComplete) return;
    const targetLane = clampNumber(Number(laneIndex) || 0, 0, WORD_CANNON_LANES.length - 1);
    const direction = targetLane > wc.playerLane ? 1 : -1;
    wc.player.x = WORD_CANNON_LANES[targetLane];
    wc.playerLane = targetLane;
    wc.drift = direction;
    wc.feedbackTick += 1;
    if (els.cannonFeedback) els.cannonFeedback.textContent = targetLane === 0
      ? '换到左车道。'
      : targetLane === 2
        ? '换到右车道。'
        : '回到中间车道。';
    sfx.lock();
    renderWordCannonStage();
    window.setTimeout(() => {
      if (state.activeGame !== 'word-cannon') return;
      wc.drift = 0;
      renderWordCannonStage();
    }, 180);
  }

  function wordCannonLaneFromPointer(event) {
    if (!els.cannonStage) return state.wordCannon.playerLane;
    const rect = els.cannonStage.getBoundingClientRect();
    const x = ((event.clientX || 0) - rect.left) / Math.max(1, rect.width);
    if (x < 0.4) return 0;
    if (x > 0.6) return 2;
    return 1;
  }

  function moveWordCannonPlayer(direction) {
    const wc = state.wordCannon;
    if (state.activeGame !== 'word-cannon' || wc.roundComplete) return;
    const step = 8;
    if (direction === 'left' || direction === 'right') {
      moveWordCannonCar(direction === 'left' ? -1 : 1);
      return;
    }
    wc.player.y = clampNumber(wc.player.y + (direction === 'up' ? -step : step), 58, 88);
    wc.feedbackTick += 1;
    if (els.cannonFeedback) els.cannonFeedback.textContent = direction === 'up' ? '向前开，靠近拼音卡。' : '向后调整位置。';
    renderWordCannonStage();
  }

  function moveWordCannonToPoint(event) {
    if (!els.cannonStage) return;
    const rect = els.cannonStage.getBoundingClientRect();
    const wc = state.wordCannon;
    wc.player.x = clampNumber(((event.clientX - rect.left) / Math.max(1, rect.width)) * 100, 17, 83);
    wc.player.y = clampNumber(((event.clientY - rect.top) / Math.max(1, rect.height)) * 100, 58, 88);
    wc.playerLane = wc.player.x < 40 ? 0 : wc.player.x > 60 ? 2 : 1;
    wc.feedbackTick += 1;
    renderWordCannonStage();
  }

  function selectWordCannonMap(mapIndex) {
    const wc = state.wordCannon;
    const nextMapIndex = clampNumber(Number(mapIndex) || 0, 0, WORD_CANNON_MAPS.length - 1);
    wc.mapIndex = nextMapIndex;
    wc.mapLocked = true;
    wc.segmentIndex = 0;
    wc.targets = [];
    wc.currentTask = null;
    ensureWordCannonTargets();
    renderWordCannonStage();
  }

  function inputWordCannonLetter(letter) {
    const wc = state.wordCannon;
    if (state.activeGame !== 'word-cannon' || wc.roundComplete) return;
    const key = String(letter || '').toLowerCase();
    if (key === 'left' || key === 'arrowleft' || key === 'a') moveWordCannonPlayer('left');
    if (key === 'right' || key === 'arrowright' || key === 'd') moveWordCannonPlayer('right');
    if (key === 'up' || key === 'arrowup' || key === 'w') moveWordCannonPlayer('up');
    if (key === 'down' || key === 'arrowdown' || key === 's') moveWordCannonPlayer('down');
  }

  function currentSnakeTarget() {
    const source = state.hanziAll.length ? state.hanziAll : state.hanzi;
    return source[state.snake.targetIndex % Math.max(1, source.length)] || FALLBACK_HANZI[0];
  }

  function splitPinyinChunks(value) {
    const pinyin = normalizePinyin(typeof value === 'string' ? value : value?.pinyin);
    if (!pinyin) return ['pin'];
    const initial = PINYIN_INITIALS.find(prefix => pinyin.startsWith(prefix) && pinyin.length > prefix.length);
    if (!initial) return [pinyin];
    return [initial, pinyin.slice(initial.length)].filter(Boolean);
  }

  function refreshSnakePieces() {
    state.snake.pieces = splitPinyinChunks(currentSnakeTarget());
    state.snake.pieceIndex = 0;
  }

  function expectedSnakePiece() {
    if (!state.snake.pieces.length) refreshSnakePieces();
    return state.snake.pieces[state.snake.pieceIndex] || state.snake.pieces[0] || 'pin';
  }

  function snakeChunkPool(expected) {
    const source = state.hanziAll.length ? state.hanziAll : state.hanzi;
    const sourceChunks = source.flatMap(item => splitPinyinChunks(item));
    return [...new Set([...sourceChunks, ...PINYIN_DISTRACTOR_CHUNKS])]
      .filter(chunk => chunk && chunk !== expected);
  }

  function makeSnakeFoods() {
    const expected = expectedSnakePiece();
    const pool = snakeChunkPool(expected);
    const poolStart = (state.snake.targetIndex * 3 + state.snake.pieceIndex) % Math.max(1, pool.length);
    const distractors = [];
    for (let index = 0; distractors.length < 3 && index < pool.length + 3; index += 1) {
      const chunk = pool[(poolStart + index) % pool.length];
      if (chunk && !distractors.includes(chunk)) distractors.push(chunk);
    }
    const far = Math.max(2, state.snake.size - 3);
    const positions = [
      { x: far, y: 2 },
      { x: 2, y: 2 },
      { x: far, y: far },
      { x: 2, y: far }
    ];
    const expectedPosition = (state.snake.targetIndex + state.snake.pieceIndex) % positions.length;
    let distractorIndex = 0;
    state.snake.foods = positions.map((position, index) => {
      const label = index === expectedPosition ? expected : distractors[distractorIndex++];
      return {
        label,
        correct: label === expected,
        ...position
      };
    });
  }

  function startPinyinSnake() {
    state.snake.size = 12;
    const centerY = Math.floor(state.snake.size / 2);
    state.snake.body = [{ x: 5, y: centerY }, { x: 4, y: centerY }, { x: 3, y: centerY }];
    state.snake.dir = { x: 1, y: 0 };
    state.snake.score = 0;
    state.snake.targetIndex = 0;
    state.snake.combo = 0;
    state.snake.moves = 0;
    state.snake.lastResult = 'ready';
    state.snake.feedbackTick = 0;
    state.snake.currentFoodState = 'target';
    state.snake.hintUses = 2;
    state.snake.hintActiveUntil = 0;
    state.snake.hintTick = 0;
    state.snake.roundGoal = PINYIN_SNAKE_ROUND_GOAL;
    state.snake.roundComplete = false;
    state.snake.paused = false;
    state.snake.speedMode = SNAKE_SPEED_PRESETS[state.snake.speedMode] ? state.snake.speedMode : 'slow';
    state.snake.speedMs = SNAKE_SPEED_PRESETS[state.snake.speedMode];
    els.snakeFeedback.textContent = SNAKE_DEFAULT_FEEDBACK;
    refreshSnakePieces();
    makeSnakeFoods();
    renderPinyinSnake();
    stopSnake();
    state.snake.timer = window.setInterval(stepSnake, state.snake.speedMs);
  }

  function stopSnake() {
    if (state.snake.timer) window.clearInterval(state.snake.timer);
    state.snake.timer = null;
  }

  function toggleSnakePause() {
    if (state.activeGame !== 'pinyin-snake' || state.snake.roundComplete) return;
    state.snake.paused = !state.snake.paused;
    if (state.snake.paused) {
      stopSnake();
      els.snakeFeedback.textContent = '已暂停，准备好后继续。';
    } else {
      state.snake.timer = window.setInterval(stepSnake, state.snake.speedMs);
      els.snakeFeedback.textContent = `继续练习：先吃 ${expectedSnakePiece()}。`;
    }
    renderPinyinSnake();
  }

  function setSnakeSpeed(mode) {
    if (!SNAKE_SPEED_PRESETS[mode]) return;
    state.snake.speedMode = mode;
    state.snake.speedMs = SNAKE_SPEED_PRESETS[mode];
    if (!state.snake.paused && state.activeGame === 'pinyin-snake') {
      stopSnake();
      state.snake.timer = window.setInterval(stepSnake, state.snake.speedMs);
    }
    renderPinyinSnake();
  }

  function useSnakeHint() {
    const snake = state.snake;
    if (state.activeGame !== 'pinyin-snake' || snake.roundComplete || snake.hintUses <= 0) return;
    snake.hintUses -= 1;
    snake.hintActiveUntil = Date.now() + 1800;
    snake.hintTick += 1;
    const hintTick = snake.hintTick;
    snake.currentFoodState = 'hint';
    const target = currentSnakeTarget();
    els.snakeFeedback.textContent = `提示：先吃 ${expectedSnakePiece()}，再拼成 ${normalizePinyin(target?.pinyin)}。`;
    renderPinyinSnake();
    speakHanziTask([
      { text: target?.char || '', lang: 'zh-CN' },
      { text: target?.pinyin || '', lang: 'zh-CN' }
    ]);
    window.setTimeout(() => {
      if (state.activeGame !== 'pinyin-snake') return;
      if (snake.hintTick !== hintTick) return;
      snake.hintActiveUntil = 0;
      snake.currentFoodState = 'target';
      renderPinyinSnake();
    }, 1850);
  }

  function snakeDirectionName(dir) {
    if (dir.x > 0) return 'right';
    if (dir.x < 0) return 'left';
    if (dir.y > 0) return 'down';
    return 'up';
  }

  function snakeRotation(dirName) {
    return ({ right: 0, down: 90, left: 180, up: -90 })[dirName] || 0;
  }

  function snakePartVector(from, to) {
    return {
      x: Math.sign(to.x - from.x),
      y: Math.sign(to.y - from.y)
    };
  }

  function snakeAssetForPart(index) {
    const body = state.snake.body;
    const part = body[index];
    const isHead = index === 0;
    const isTail = index === body.length - 1;
    if (isHead) {
      const dirName = snakeDirectionName(state.snake.dir);
      return { src: PINYIN_SNAKE_ASSETS.head, name: 'head', dirName, rotate: snakeRotation(dirName) };
    }
    if (isTail) {
      const towardBody = snakePartVector(part, body[index - 1]);
      const dirName = snakeDirectionName(towardBody);
      return { src: PINYIN_SNAKE_ASSETS.tail, name: 'tail', dirName, rotate: snakeRotation(dirName) };
    }
    const towardHead = snakePartVector(part, body[index - 1]);
    const towardTail = snakePartVector(part, body[index + 1]);
    const isHorizontal = towardHead.y === 0 && towardTail.y === 0;
    const isVertical = towardHead.x === 0 && towardTail.x === 0;
    if (isHorizontal) {
      return { src: PINYIN_SNAKE_ASSETS.bodyHorizontal, name: 'body snake-body', dirName: 'right', rotate: 0 };
    }
    if (isVertical) {
      return { src: PINYIN_SNAKE_ASSETS.bodyVertical, name: 'body snake-body', dirName: 'down', rotate: 0 };
    }
    return { src: PINYIN_SNAKE_ASSETS.corner, name: 'body snake-body corner', dirName: 'right', rotate: 0 };
  }

  function renderPinyinSnake() {
    const target = currentSnakeTarget();
    const pinyin = normalizePinyin(target?.pinyin);
    const expected = expectedSnakePiece();
    const resultClass = state.snake.lastResult ? ` is-${state.snake.lastResult}` : '';
    els.snakeBoard.style.setProperty('--snake-size', String(state.snake.size));
    els.pinyinSnake.dataset.snakeState = state.snake.lastResult || 'ready';
    els.pinyinSnake.dataset.feedbackTick = String(state.snake.feedbackTick || 0);
    els.pinyinSnake.dataset.hintTick = String(state.snake.hintTick || 0);
    els.snakePrompt.textContent = pinyin;
    els.snakeScore.textContent = `${state.snake.score}/${state.snake.roundGoal}★`;
    if (els.snakeLengthStat) els.snakeLengthStat.textContent = String(state.snake.body.length);
    if (els.snakeStarStat) els.snakeStarStat.textContent = String(state.snake.score);
    els.snakeTaskWord.textContent = target?.char || '字';
    els.snakeTaskHint.textContent = `拼成 ${pinyin}，完成后点亮一颗星。`;
    if (els.snakeTaskEmoji) {
      els.snakeTaskEmoji.textContent = target?.emoji || '🔤';
      els.snakeTaskEmoji.setAttribute('aria-label', `${target?.char || ''}语义图提示`);
    }
    if (els.snakeTaskExample) els.snakeTaskExample.textContent = cleanHanziExample(target) || `认识 ${target?.char || '这个字'}。`;
    els.snakeStatusBadge.className = `snake-status-badge${resultClass}`;
    els.snakeStatusBadge.textContent = state.snake.lastResult === 'correct'
      ? `连对 ${Math.max(1, state.snake.combo)} 次`
      : state.snake.lastResult === 'wrong'
        ? `目标 ${expected}`
        : `目标 ${expected}`;
    if (els.snakePauseButton) {
      els.snakePauseButton.textContent = state.snake.paused ? '继续' : '暂停';
      els.snakePauseButton.setAttribute('aria-pressed', String(state.snake.paused));
    }
    if (els.snakeSpeedSwitch) {
      els.snakeSpeedSwitch.querySelectorAll('[data-snake-speed]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.snakeSpeed === state.snake.speedMode));
      });
    }
    if (els.snakeHintUses) els.snakeHintUses.textContent = String(state.snake.hintUses);
    if (els.snakeHintButton) {
      els.snakeHintButton.disabled = state.snake.hintUses <= 0;
      els.snakeHintButton.classList.toggle('is-active', state.snake.hintActiveUntil > Date.now());
      els.snakeHintButton.setAttribute('aria-label', state.snake.hintUses > 0 ? `显示拼音提示，剩余${state.snake.hintUses}次` : '本局提示已用完');
    }
    els.snakePieces.innerHTML = state.snake.pieces.map((piece, index) => {
      const className = index < state.snake.pieceIndex
        ? 'snake-piece is-done'
        : index === state.snake.pieceIndex
          ? 'snake-piece is-current'
          : 'snake-piece';
      return `<span class="${className}">${piece}</span>`;
    }).join('');
    const cells = [];
    for (let y = 0; y < state.snake.size; y += 1) {
      for (let x = 0; x < state.snake.size; x += 1) {
        const snakeIndex = state.snake.body.findIndex(part => part.x === x && part.y === y);
        const food = state.snake.foods.find(item => item.x === x && item.y === y);
        const isHead = snakeIndex === 0;
        const isTail = snakeIndex === state.snake.body.length - 1;
        const snakeAsset = snakeIndex >= 0 ? snakeAssetForPart(snakeIndex) : null;
        const snakeClass = snakeIndex >= 0
          ? ` is-snake ${isHead ? 'is-head snake-head' : isTail ? 'is-tail snake-body' : `is-${snakeAsset.name}`}`
          : '';
        const dirClass = isHead
          ? ` dir-${snakeAsset.dirName}`
          : '';
        const foodAsset = food ? PINYIN_SNAKE_ASSETS.foods[(state.snake.foods.indexOf(food)) % PINYIN_SNAKE_ASSETS.foods.length] : '';
        const foodStateClass = food
          ? (food.correct
            ? state.snake.lastResult === 'correct'
              ? ' is-resolved-correct'
              : state.snake.lastResult === 'wrong'
                ? ' is-resolved-wrong'
                : ' is-target-food'
            : '')
          : '';
        const foodColorIndex = food ? state.snake.foods.indexOf(food) % 4 : 0;
        const foodHintActive = food?.correct && state.snake.hintActiveUntil > Date.now();
        const foodContent = food
          ? `<span class="snake-food-card snake-food-dot${food.correct ? ' is-target' : ''}${foodStateClass}${foodHintActive ? ' is-hint-target' : ''}" data-food-state="${food.correct ? state.snake.currentFoodState : 'distractor'}" data-food-hint="${foodHintActive ? 'active' : 'none'}" data-food-label="${food.label}" data-food-color="${foodColorIndex}" aria-label="拼音 ${food.label}">
              <img class="snake-food-asset" src="${foodAsset}" alt="" aria-hidden="true">
              <span class="snake-food-label">${food.label}</span>
              ${food.correct ? '<em class="snake-food-target-mark">目标</em>' : ''}
            </span>`
          : '';
        const snakeContent = snakeAsset
          ? `<img class="snake-asset snake-${snakeAsset.name.split(' ')[0]}" src="${snakeAsset.src}" alt="" style="--snake-rotate:${snakeAsset.rotate}deg">`
          : '';
        cells.push(`<span class="snake-cell${snakeClass}${dirClass}${food ? ` is-food${food.correct ? ' is-target-food' : ''}` : ''}${foodStateClass}"${isHead ? ` data-pos="${x},${y}"` : ''}>${foodContent}${snakeContent}</span>`);
      }
    }
    els.snakeBoard.innerHTML = cells.join('');
  }

  function stepSnake() {
    if (state.activeGame !== 'pinyin-snake' || state.snake.roundComplete || state.snake.paused) return;
    const head = state.snake.body[0];
    const next = {
      x: (head.x + state.snake.dir.x + state.snake.size) % state.snake.size,
      y: (head.y + state.snake.dir.y + state.snake.size) % state.snake.size
    };
    state.snake.moves += 1;
    state.snake.body.unshift(next);
    const foodIndex = state.snake.foods.findIndex(food => food.x === next.x && food.y === next.y);
    if (foodIndex >= 0) {
      const food = state.snake.foods[foodIndex];
      const target = currentSnakeTarget();
      if (food.correct) {
        const completed = state.snake.pieceIndex >= state.snake.pieces.length - 1;
        state.snake.lastResult = 'correct';
        state.snake.feedbackTick += 1;
        state.snake.currentFoodState = 'correct';
        if (completed) {
          const finishedPinyin = normalizePinyin(target?.pinyin);
          state.snake.score += 1;
          state.snake.combo += 1;
          state.snake.targetIndex += 1;
          els.snakeFeedback.textContent = `拼成 ${finishedPinyin}，${target.char} 加一颗星`;
          sfx.done();
          if (state.snake.score >= state.snake.roundGoal) {
            state.snake.roundComplete = true;
            renderPinyinSnake();
            finishRound('pinyin-snake', {
              kicker: 'Pinyin',
              title: '拼音完成',
              copy: '这一轮拼音块已经集齐，继续下一局也会更顺手。',
              stats: [
                { label: '点亮星星', value: `${state.snake.score}/${state.snake.roundGoal}` },
                { label: '连对次数', value: String(state.snake.combo) },
                { label: '移动步数', value: String(state.snake.moves) }
              ]
            });
            return;
          }
          refreshSnakePieces();
        } else {
          state.snake.pieceIndex += 1;
          els.snakeFeedback.textContent = `吃到 ${food.label}，继续吃 ${expectedSnakePiece()}`;
          sfx.tick();
        }
      } else {
        state.snake.combo = 0;
        state.snake.hintUses = Math.max(0, state.snake.hintUses - 1);
        state.snake.body = state.snake.body.slice(0, Math.max(3, state.snake.body.length - 1));
        state.snake.lastResult = 'wrong';
        state.snake.feedbackTick += 1;
        state.snake.currentFoodState = 'wrong';
        els.snakeFeedback.textContent = `先吃 ${expectedSnakePiece()}，再吃其他块`;
        sfx.wrong();
      }
      makeSnakeFoods();
    } else {
      state.snake.body.pop();
    }
    renderPinyinSnake();
  }

  function canTurnSnake(nextDir) {
    return !(state.snake.body.length > 1
      && nextDir.x === -state.snake.dir.x
      && nextDir.y === -state.snake.dir.y);
  }

  function moveSnakeDirection(directionName) {
    if (state.activeGame !== 'pinyin-snake'
      || state.snake.roundComplete
      || state.snake.paused) return;
    const dirMap = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 }
    };
    const nextDir = dirMap[directionName];
    if (!nextDir || !canTurnSnake(nextDir)) return;
    state.snake.dir = nextDir;
    stepSnake();
  }

  function startHanziJumper() {
    stopHanziJumper();
    state.jumper.targetIndex = 0;
    state.jumper.lane = 2;
    state.jumper.playerX = 50;
    state.jumper.playerY = 78;
    state.jumper.climb = 0;
    state.jumper.jumpTick = 0;
    state.jumper.moveTick = 0;
    state.jumper.lastResult = '';
    state.jumper.score = 0;
    state.jumper.combo = 0;
    state.jumper.bestCombo = 0;
    state.jumper.timeLeft = 60;
    state.jumper.goal = 8;
    state.jumper.misses = 0;
    state.jumper.announcedIndex = -1;
    state.jumper.feedbackTick = 0;
    state.jumper.roundComplete = false;
    els.jumperFeedback.textContent = HANZI_DEFAULT_FEEDBACK;
    renderHanziJumper();
    state.jumper.timer = window.setInterval(tickHanziRunner, 1000);
  }

  function stopHanziJumper() {
    if (state.jumper.timer) window.clearInterval(state.jumper.timer);
    state.jumper.timer = null;
  }

  function tickHanziRunner() {
    if (state.activeGame !== 'hanzi-jumper' || state.jumper.roundComplete) return;
    state.jumper.timeLeft = Math.max(0, state.jumper.timeLeft - 1);
    renderHanziRunnerHud();
    if (state.jumper.timeLeft === 0) {
      stopHanziJumper();
      state.jumper.roundComplete = true;
      state.jumper.lastResult = 'finish';
      state.jumper.feedbackTick += 1;
      els.jumperFeedback.textContent = `本局 ${state.jumper.score} 颗星，最高连击 ${state.jumper.bestCombo}`;
      sfx.done();
      renderHanziJumper();
      finishRound('hanzi-jumper', {
        kicker: 'Hanzi',
        title: state.jumper.score >= state.jumper.goal ? '目标达成' : '时间到',
        copy: state.jumper.score >= state.jumper.goal
          ? '这一轮星星目标已经达成，继续玩也会越来越稳。'
          : '时间到了，换一局继续把连击接起来。',
        stats: [
          { label: '星星', value: `${state.jumper.score}/${state.jumper.goal}` },
          { label: '最高连击', value: String(state.jumper.bestCombo) },
          { label: '漏接', value: String(state.jumper.misses) }
        ]
      });
    }
  }

  function renderHanziRunnerHud() {
    const stage = els.jumperStage;
    const time = stage.querySelector('[data-runner-time]');
    const combo = stage.querySelector('[data-runner-combo]');
    const stars = stage.querySelector('[data-runner-stars]');
    const comboFill = stage.querySelector('[data-combo-fill]');
    if (time) time.textContent = `${state.jumper.timeLeft}s`;
    if (combo) combo.textContent = `连击 ${state.jumper.combo}`;
    if (stars) stars.textContent = `${state.jumper.score}/${state.jumper.goal}`;
    if (comboFill) comboFill.style.width = `${Math.min(100, state.jumper.combo * 34)}%`;
  }

  function announceHanziTarget(target) {
    if (!target || state.jumper.announcedIndex === state.jumper.targetIndex) return;
    state.jumper.announcedIndex = state.jumper.targetIndex;
    speakCurrentHanziTarget(target);
  }

  function speakCurrentHanziTarget(target = state.hanzi[state.jumper.targetIndex % state.hanzi.length]) {
    if (!target) {
      return Promise.resolve();
    }
    return speakHanziTask([
      { text: target.char, lang: 'zh-CN' },
      { text: target.pinyin, lang: 'zh-CN' },
      { text: target.example, lang: 'zh-CN' }
    ]);
  }

  function getHanziBubbles(target) {
    const options = getHanziMatchOptions(target).slice(0, 5);
    const offset = options.length ? state.jumper.targetIndex % options.length : 0;
    const orderedOptions = options.map((_, index) => options[(index + offset) % options.length]);
    const layout = [
      { left: 12, top: 48, lane: 0, platformBottom: 10, asset: HANZI_JUMPER_ASSETS.platforms[0], delay: 0 },
      { left: 31, top: 43, lane: 1, platformBottom: 17, asset: HANZI_JUMPER_ASSETS.platforms[4], delay: 0.28 },
      { left: 50, top: 36, lane: 2, platformBottom: 24, asset: HANZI_JUMPER_ASSETS.platforms[1], delay: 0.56 },
      { left: 69, top: 43, lane: 3, platformBottom: 17, asset: HANZI_JUMPER_ASSETS.platforms[3], delay: 0.84 },
      { left: 88, top: 48, lane: 4, platformBottom: 10, asset: HANZI_JUMPER_ASSETS.platforms[0], delay: 1.12 }
    ];
    return orderedOptions.map((item, index) => ({
      item,
      left: layout[index]?.left || 50,
      top: layout[index]?.top || 42,
      lane: layout[index]?.lane ?? 1,
      platformBottom: layout[index]?.platformBottom ?? 22,
      asset: layout[index]?.asset || HANZI_JUMPER_ASSETS.platforms[0],
      delay: layout[index]?.delay || 0
    }));
  }

  function renderHanziJumper() {
    const target = state.hanzi[state.jumper.targetIndex % state.hanzi.length];
    const bubbles = getHanziBubbles(target);
    const currentLane = bubbles.find(bubble => bubble.lane === state.jumper.lane) || bubbles[Math.floor(bubbles.length / 2)] || bubbles[0];
    const currentLaneLeft = currentLane?.left || 50;
    const currentLaneBottom = currentLane?.platformBottom || 22;
    els.jumperPrompt.textContent = normalizePinyin(target?.pinyin) || '找汉字';
    els.jumperScore.textContent = state.jumper.score;
    state.jumper.playerX = currentLaneLeft;
    announceHanziTarget(target);
    els.hanziJumper.dataset.jumperState = state.jumper.lastResult || 'ready';
    els.hanziJumper.dataset.feedbackTick = String(state.jumper.feedbackTick || 0);
    els.jumperStage.innerHTML = `
      <div class="jump-tower bubble-field hanzi-playground-field runner-mode is-${state.jumper.lastResult || 'ready'}" aria-hidden="false" data-move="${state.jumper.moveTick}" data-catch="${state.jumper.jumpTick}" data-jumper-state="${state.jumper.lastResult || 'ready'}" data-feedback-tick="${state.jumper.feedbackTick || 0}">
        <img class="jumper-asset jumper-tower-bg" src="${HANZI_JUMPER_ASSETS.background}" alt="" aria-hidden="true">
        <span class="runner-bg runner-bg-far" aria-hidden="true"></span>
        <span class="runner-bg runner-bg-near" aria-hidden="true"></span>
        <img class="runner-cloud runner-cloud-large" src="${HANZI_JUMPER_ASSET_BASE}cloud_large.png" alt="" aria-hidden="true">
        <img class="runner-cloud runner-cloud-small" src="${HANZI_JUMPER_ASSET_BASE}cloud_small.png" alt="" aria-hidden="true">
        <span class="bubble-stream" aria-hidden="true"></span>
        <div class="runner-stats" aria-label="本局状态">
          <span data-runner-time>${state.jumper.timeLeft}s</span>
          <span data-runner-combo>连击 ${state.jumper.combo}</span>
          <span data-runner-stars>${state.jumper.score}/${state.jumper.goal}</span>
        </div>
        <div class="runner-combo-bar" aria-hidden="true">
          <span data-combo-fill style="width:${Math.min(100, state.jumper.combo * 34)}%"></span>
        </div>
        <div class="runner-feedback-badge is-${state.jumper.lastResult || 'ready'}" data-runner-feedback>${state.jumper.lastResult === 'correct' ? `连击 ${state.jumper.combo}` : state.jumper.lastResult === 'wrong' ? `目标 ${target?.char || ''}` : state.jumper.lastResult === 'finish' ? `最高 ${state.jumper.bestCombo}` : `目标 ${target?.char || ''}`}</div>
        <section class="hanzi-task-card" aria-label="当前汉字提示">
          <img class="hanzi-task-image" src="${HANZI_IMAGE_BASE}${encodeURIComponent(target?.char || '')}.webp" alt="" aria-hidden="true" onerror="this.hidden=true">
          <div class="hanzi-task-copy">
            <span>${normalizePinyin(target?.pinyin)}</span>
            <strong>${maskedHanziExample(target)}</strong>
          </div>
        </section>
        <div class="match-prompt hanzi-match-mode">
          <img class="jumper-asset match-prompt-asset" src="${HANZI_JUMPER_ASSETS.target}" alt="" aria-hidden="true">
          <span>语音提示</span>
          <strong>${normalizePinyin(target?.pinyin)}</strong>
          <small>${maskedHanziExample(target)}</small>
        </div>
        <div class="runner-track" aria-hidden="false">
          ${bubbles.map(bubble => {
            const current = bubble.item.char === target?.char ? ' is-answer-bubble' : '';
            const active = bubble.lane === state.jumper.lane ? ' is-in-lane' : '';
            const resultState = state.jumper.lastResult === 'correct' && bubble.item.char === target?.char
              ? ' is-caught'
              : state.jumper.lastResult === 'wrong' && bubble.lane === state.jumper.lane
                ? ' is-missed'
                : '';
            return `<button class="hanzi-bubble${current}${active}${resultState}" type="button" data-jumper-char="${bubble.item.char}" data-bubble-left="${bubble.left}" data-bubble-lane="${bubble.lane}" data-bubble-top="${bubble.top}" style="left:${bubble.left}%; top:${bubble.top}%; --float-delay:${bubble.delay}s"><span>${bubble.item.char}</span></button>`;
          }).join('')}
          <div class="jump-platform-row" aria-hidden="true">
            ${bubbles.map((bubble, index) => `<span class="jump-platform ${bubble.lane === state.jumper.lane ? 'is-active' : ''}" style="left:${bubble.left}%; bottom:${bubble.platformBottom}%; --platform-delay:${index * 0.18}s"><img src="${bubble.asset}" alt="" aria-hidden="true"></span>`).join('')}
          </div>
        </div>
        <span class="jumper-player bubble-catcher ${state.jumper.jumpTick ? 'is-catching' : ''} ${state.jumper.moveTick ? 'is-moving' : ''}" data-jump="${state.jumper.jumpTick}" data-move="${state.jumper.moveTick}" style="left:${state.jumper.playerX}%; bottom:calc(${currentLaneBottom}% + 12px)">
          <img class="jumper-player-art" src="${state.jumper.jumpTick ? PET_JUMPER_ASSETS.catch : PET_JUMPER_ASSETS.idle}" alt="" aria-hidden="true">
          <span class="catcher-face" aria-hidden="true"></span>
          <span class="catcher-basket" aria-hidden="true"></span>
        </span>
        ${state.jumper.lastResult === 'correct' ? `<img class="jumper-reward-star" src="${HANZI_JUMPER_ASSETS.reward}" alt="" aria-hidden="true">` : ''}
        <span class="catch-zone" aria-hidden="true"></span>
      </div>
      <div class="jumper-side-hint">60 秒短局，接对涨连击。</div>
    `;
  }

  function catchHanziBubble(char, left) {
    if (state.jumper.roundComplete) return;
    const target = state.hanzi[state.jumper.targetIndex % state.hanzi.length];
    state.jumper.playerX = clampNumber(left, 12, 88);
    state.jumper.playerY = 78;
    state.jumper.jumpTick += 1;
    if (char === target.char) {
      state.jumper.score += 1;
      state.jumper.climb += 1;
      state.jumper.combo += 1;
      state.jumper.bestCombo = Math.max(state.jumper.bestCombo, state.jumper.combo);
      if (state.jumper.combo > 0 && state.jumper.combo % 3 === 0) {
        state.jumper.timeLeft = Math.min(60, state.jumper.timeLeft + 2);
      }
      state.jumper.targetIndex += 1;
      state.jumper.lane = 2;
      state.jumper.lastResult = 'correct';
      state.jumper.feedbackTick += 1;
      els.jumperFeedback.textContent = state.jumper.combo % 3 === 0
        ? `三连击！时间 +2，继续接 ${target.char}`
        : `接住 ${target.char}，连击 ${state.jumper.combo}`;
      sfx.done();
      if (state.jumper.score >= state.jumper.goal) {
        state.jumper.roundComplete = true;
        stopHanziJumper();
        els.jumperFeedback.textContent = `目标达成！本局拿到 ${state.jumper.score} 颗星`;
        renderHanziJumper();
        window.setTimeout(() => {
          if (state.activeGame !== 'hanzi-jumper') return;
          state.jumper.lastResult = 'finish';
          state.jumper.feedbackTick += 1;
          finishRound('hanzi-jumper', {
            kicker: 'Hanzi',
            title: '目标达成',
            copy: '这一轮星星目标已经提前完成，继续下一局吧。',
            stats: [
              { label: '星星', value: `${state.jumper.score}/${state.jumper.goal}` },
              { label: '最高连击', value: String(state.jumper.bestCombo) },
              { label: '漏接', value: String(state.jumper.misses) }
            ]
          });
        }, 420);
      }
    } else {
      state.jumper.combo = 0;
      state.jumper.misses += 1;
      state.jumper.lastResult = 'wrong';
      state.jumper.feedbackTick += 1;
      els.jumperFeedback.textContent = `躲开它，这次接 ${target.char}`;
      sfx.wrong();
    }
    renderHanziJumper();
  }

  function moveJumper(direction) {
    if (state.activeGame !== 'hanzi-jumper' || state.jumper.roundComplete) return;
    const target = state.hanzi[state.jumper.targetIndex % state.hanzi.length];
    const maxLane = Math.max(0, getHanziBubbles(target).length - 1);
    state.jumper.lane = clampNumber(state.jumper.lane + direction, 0, maxLane);
    state.jumper.moveTick += 1;
    state.jumper.lastResult = 'ready';
    sfx.move();
    renderHanziJumper();
  }

  function catchNearestBubble() {
    if (state.activeGame !== 'hanzi-jumper' || state.jumper.roundComplete) return;
    const bubbles = [...els.jumperStage.querySelectorAll('.hanzi-bubble')];
    const nearest = bubbles.find(bubble => {
      return Number(bubble.dataset.bubbleLane) === state.jumper.lane;
    });
    if (nearest) {
      catchHanziBubble(
        nearest.dataset.jumperChar,
        parseFloat(nearest.dataset.bubbleLeft) || state.jumper.playerX
      );
    } else {
      els.jumperFeedback.textContent = '先移动到气泡下面，再按空格接住。';
      renderHanziJumper();
    }
  }

  function updateSoundToggle() {
    els.soundToggle.classList.toggle('is-muted', !state.soundEnabled);
    els.soundToggle.setAttribute('aria-pressed', String(state.soundEnabled));
  }

  document.addEventListener('click', event => {
    const gameButton = event.target.closest('[data-game]');
    if (gameButton) {
      openGame(gameButton.dataset.game);
      return;
    }
    const keyButton = event.target.closest('[data-key]');
    if (keyButton) {
      if (state.activeGame === 'word-cannon') {
        inputWordCannonLetter(keyButton.dataset.key);
      } else {
        inputWordLetter(keyButton.dataset.key);
      }
      return;
    }
    const snakeAction = event.target.closest('[data-snake-action]');
    if (snakeAction && state.activeGame === 'pinyin-snake') {
      if (snakeAction.dataset.snakeAction === 'hint') useSnakeHint();
      else toggleSnakePause();
      return;
    }
    const snakeControl = event.target.closest('[data-snake-control]');
    if (snakeControl && state.activeGame === 'pinyin-snake') {
      moveSnakeDirection(snakeControl.dataset.snakeControl);
      return;
    }
    const snakeSpeed = event.target.closest('[data-snake-speed]');
    if (snakeSpeed && state.activeGame === 'pinyin-snake') {
      setSnakeSpeed(snakeSpeed.dataset.snakeSpeed);
      return;
    }
    const bubble = event.target.closest('[data-jumper-char]');
    if (bubble) {
      catchHanziBubble(
        bubble.dataset.jumperChar,
        parseFloat(bubble.dataset.bubbleLeft) || state.jumper.playerX
      );
      return;
    }
    const roundAction = event.target.closest('[data-round-action]');
    if (roundAction?.dataset.roundAction === 'replay') {
      replayActiveRound();
      return;
    }
    const difficultyButton = event.target.closest('[data-word-difficulty]');
    if (difficultyButton) {
      setWordDifficulty(difficultyButton.dataset.wordDifficulty, {
        restart: state.activeGame === 'word-shooter' || state.activeGame === 'word-cannon'
      });
      restoreActiveGameInputFocus();
      return;
    }
    const wordPackButton = event.target.closest('[data-word-pack]');
    if (wordPackButton) {
      setWordPack(wordPackButton.dataset.wordPack, {
        restart: state.activeGame === 'word-shooter'
      });
      restoreActiveGameInputFocus();
      return;
    }
    const hangarShip = event.target.closest('[data-hangar-ship]');
    if (hangarShip) {
      selectWordShooterShip(hangarShip.dataset.hangarShip);
      return;
    }
    const hangarWeapon = event.target.closest('[data-hangar-weapon]');
    if (hangarWeapon) {
      equipWordShooterWeapon(hangarWeapon.dataset.hangarWeapon);
      return;
    }
    const hangarUpgrade = event.target.closest('[data-hangar-upgrade]');
    if (hangarUpgrade) {
      upgradeWordShooterShip(hangarUpgrade.dataset.hangarUpgrade);
      return;
    }
    const hanziPackButton = event.target.closest('[data-hanzi-pack]');
    if (hanziPackButton) {
      setHanziPack(hanziPackButton.dataset.hanziPack, {
        restart: state.activeGame === 'word-cannon' || state.activeGame === 'pinyin-snake'
      });
      restoreActiveGameInputFocus();
      return;
    }
    if (event.target.closest('#wordSettingsReset')) {
      resetWordSettings({
        restart: state.activeGame === 'word-shooter'
      });
      return;
    }
    if (event.target.closest('#cannonSettingsReset')) {
      resetCannonSettings({
        restart: state.activeGame === 'word-cannon'
      });
      return;
    }
    if (state.activeGame === 'word-cannon' && event.target.closest('#cannonStage')) {
      moveWordCannonToPoint(event);
      return;
    }
    const cannonMap = event.target.closest('[data-cannon-map]');
    if (cannonMap && state.activeGame === 'word-cannon') {
      selectWordCannonMap(cannonMap.dataset.cannonMap);
      restoreActiveGameInputFocus();
      return;
    }
    if (roundAction?.dataset.roundAction === 'home') {
      showHome();
    }
  });

  function wordShooterMovementDirection(key) {
    return {
      arrowup: 'up',
      w: 'up',
      arrowdown: 'down',
      s: 'down',
      arrowleft: 'left',
      a: 'left',
      arrowright: 'right',
      d: 'right'
    }[key] || '';
  }

  function shouldTreatWordShooterLetterAsTyping(key) {
    return Boolean(key && /^[wasd]$/.test(key) && canWordShooterTypeLetter(key));
  }

  document.addEventListener('keydown', event => {
    const key = String(event.key || '').toLowerCase();
    const letterKey = letterFromKeyboardEvent(event);
    const movementDirection = wordShooterMovementDirection(key);
    if (state.activeGame === 'word-shooter' && movementDirection && !(letterKey && shouldTreatWordShooterLetterAsTyping(key))) {
      event.preventDefault();
      state.wordShooter.moveInput[movementDirection] = true;
    } else if (state.activeGame === 'word-cannon' && ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's'].includes(key)) {
      event.preventDefault();
      inputWordCannonLetter(key);
    } else if (state.activeGame === 'word-shooter' && letterKey) {
      event.preventDefault();
      inputWordLetter(letterKey);
    } else if (state.activeGame === 'word-cannon' && letterKey) {
      event.preventDefault();
      inputWordCannonLetter(letterKey);
    } else if (state.activeGame === 'pinyin-snake' && key === 'p') {
      event.preventDefault();
      toggleSnakePause();
    } else if (state.activeGame === 'pinyin-snake' && ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      event.preventDefault();
      moveSnakeDirection(key.replace('arrow', ''));
    } else if (state.activeGame === 'pinyin-snake' && ['w', 'a', 's', 'd'].includes(key)) {
      event.preventDefault();
      moveSnakeDirection(({ w: 'up', a: 'left', s: 'down', d: 'right' })[key]);
    } else if (state.activeGame === 'hanzi-jumper' && ['arrowleft', 'arrowright', 'a', 'd'].includes(key)) {
      event.preventDefault();
      moveJumper(key === 'arrowleft' || key === 'a' ? -1 : 1);
    } else if (state.activeGame === 'hanzi-jumper' && ['arrowup', 'arrowdown', 'enter', ' '].includes(key)) {
      event.preventDefault();
      catchNearestBubble();
    } else if (key === 'escape') {
      showHome();
    }
  });

  document.addEventListener('keyup', event => {
    if (state.activeGame !== 'word-shooter') return;
    const direction = wordShooterMovementDirection(String(event.key || '').toLowerCase());
    if (direction) {
      event.preventDefault();
      state.wordShooter.moveInput[direction] = false;
    }
  });

  window.addEventListener('blur', () => {
    setWordShooterMoveInput({});
  });

  window.addEventListener('focus', restoreActiveGameInputFocus);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) restoreActiveGameInputFocus();
  });

  els.backHomeButton.addEventListener('click', showHome);
  els.soundToggle.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    updateSoundToggle();
  });

  async function init() {
    state.content = await readJson(GAME_CONTENT_URL, { games: [], homeNotes: [] });
    savedSettings = readSavedSettings();
    initializeFallbackData();
    applySavedSettings();
    renderHomeCards();
    renderWordDifficultySwitch();
    renderWordShooterHangar();
    updateSoundToggle();
    showHome();
    const requestedGame = initialGameFromQuery();
    if (requestedGame) openGame(requestedGame);
  }

  window.LearningArcadePrototype = {
    openGame,
    showHome,
    speakSequence,
    speakCurrentWord,
    wordShooter: () => wordShooterSnapshot(),
    readWordShooterProgression: () => wordShooterProgressionSnapshot(),
    getWordShooterLoadout: () => getWordShooterLoadout(),
    selectWordShooterShip,
    equipWordShooterWeapon,
    upgradeWordShooterShip,
    debugSpawnWordShooterHazard: type => {
      const hazard = spawnWordShooterHazard(type, { force: true });
      renderTypingArena();
      return wordShooterSnapshot();
    },
    debugClearWordShooterHazard: type => {
      const hazard = state.wordShooter.hazards.find(item => !type || item.type === type);
      const cleared = hazard ? removeWordShooterHazard(hazard.id, 'debug-clear') : false;
      renderTypingArena();
      return cleared;
    },
    debugActivateWordShooterBoss: () => {
      activateWordShooterBoss();
      renderTypingArena();
      return wordShooterSnapshot();
    },
    debugDamageWordShooterBoss: amount => {
      damageWordShooterBoss(amount);
      renderTypingArena();
      return wordShooterSnapshot();
    },
    debugTriggerWordShooterBossAttack: () => {
      triggerWordShooterBossAttack();
      renderTypingArena();
      return wordShooterSnapshot();
    },
    debugHitWordShooterHazard,
    debugSpawnWordShooterPickup: (type = 'triple-beam') => {
      const focusEnemy = focusWordShooterEnemy() || { x: 58, y: 52 };
      spawnWordShooterPickup(type, focusEnemy.x, focusEnemy.y);
      renderTypingArena();
      return wordShooterSnapshot();
    },
    debugGrantWordShooterWeapon: (type = 'triple-beam', durationMs) => {
      grantWordShooterWeapon(type, durationMs);
      return wordShooterSnapshot();
    },
    tickWordShooterFrame,
    setWordShooterMoveInput,
    setWordShooterEnemyFireEnabled: enabled => {
      state.wordShooter.enemyFireEnabled = Boolean(enabled);
      if (!enabled) state.wordShooter.enemyBullets = [];
      return wordShooterSnapshot();
    },
    debugHitWordShooterPlayer: () => {
      resolveWordShooterPlayerHit();
      renderTypingArena();
      return wordShooterSnapshot();
    },
    debugExpireWordShooterInvulnerability: () => {
      state.wordShooter.invulnerableUntil = 0;
      return wordShooterSnapshot();
    },
    setWordDifficulty: level => {
      setWordDifficulty(level, { restart: false });
      return {
        wordDifficulty: state.wordDifficulty,
        words: state.words.length
      };
    },
    setWordPack: packId => setWordPack(packId, { restart: false }).then(() => ({
      wordPack: state.wordPack,
      words: state.words.length
    })),
    resetWordSettings: () => {
      resetWordSettings({ restart: false });
      return {
        wordPack: state.wordPack,
        wordDifficulty: state.wordDifficulty,
        words: state.words.length
      };
    },
    wordPack: () => ({
      current: state.wordPack,
      currentTitle: currentWordPackMeta().title,
      count: wordPackCount(state.wordPack),
      total: state.allWords.length,
      packs: state.wordPacks.map(pack => ({
        ...pack,
        count: wordPackCount(pack.id)
      }))
    }),
    wordDifficulty: () => ({
      current: state.wordDifficulty,
      currentLabel: difficultyMeta().label,
      count: state.words.length,
      total: wordsForPack().length,
      levelCounts: {
        basic: wordsForDifficulty('basic').length,
        intermediate: wordsForDifficulty('intermediate').length,
        full: wordsForDifficulty('full').length
      },
      lastCue: state.difficultyCue ? { ...state.difficultyCue } : null,
      sampleWords: state.words.slice(0, 5).map(word => ({
        word: word.word,
        level: word.level,
        sourcePackGroup: word.sourcePackGroup
      }))
    }),
    wordCannon: () => wordCannonSnapshot(),
    selectWordCannonMap,
    debugAdvanceWordCannon: (count = 1) => {
      state.wordCannon.completedWords = Array.from({ length: Math.max(0, Number(count) || 0) }, (_, index) => `debug-${index}`);
      renderWordCannonStage();
      return wordCannonSnapshot();
    },
    tickWordCannonFrame: (stepMs = WORD_CANNON_TICK_MS, frames = 1) => {
      for (let index = 0; index < Math.max(1, frames); index += 1) {
        updateWordCannon(stepMs);
      }
      renderWordCannonStage();
      return wordCannonSnapshot();
    },
    pinyinSnake: () => state.snake,
    hanziPool: () => ({
      count: (state.hanziAll.length ? state.hanziAll : state.hanzi).length,
      sample: (state.hanziAll.length ? state.hanziAll : state.hanzi).slice(0, 8).map(item => ({
        char: item.char,
        pinyin: item.pinyin,
        normalized: normalizePinyin(item.pinyin)
      }))
    }),
    hanziPack: () => ({
      current: state.hanziPack,
      currentTitle: currentHanziPackMeta().title,
      count: hanziItemsForPack(state.hanziPack).length,
      total: state.hanziAll.length,
      packs: state.hanziPacks.map(pack => ({
        ...pack,
        count: hanziItemsForPack(pack.id).length
      }))
    }),
    hanziJumper: () => state.jumper,
    speakCurrentHanziTarget,
    getState: () => ({
      activeGame: state.activeGame,
      word: currentWord()?.word || '',
      wordIndex: state.wordIndex,
      activeEnemyId: state.wordShooter.activeEnemyId,
      activeCannonTargetId: state.wordCannon.activeTargetId,
      weaponId: getWordShooterWeapon().id,
      snakeScore: state.snake.score,
      cannonScore: state.wordCannon.score,
      jumperScore: state.jumper.score
    })
  };

  init();
})();
