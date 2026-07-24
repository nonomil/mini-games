(function () {
  'use strict';

  const VOCAB_QUERY = new URLSearchParams(window.location.search).get('vocab');
  const VOCAB_MODE = VOCAB_QUERY === 'all' ? 'all' : (VOCAB_QUERY === 'extension' ? 'extension' : 'core');
  const DATA_URL = VOCAB_MODE === 'extension'
    ? './assets/word-memory-extension-cards.json'
    : (VOCAB_MODE === 'core' ? './assets/word-memory-core-cards.json' : './assets/word-memory-cards.json');
  const VOICE_MAP_URL = './assets/voice/map.json';
  const WORLD_PACK_REGISTRY = {
    farm: {
      label: '农场',
      manifestUrl: './assets/generated/world-bg-tiles/farm-single-manifest.json',
      theme: 'farm',
      category: 'animals'
    },
    farm_gpt: {
      label: '农场 GPT',
      manifestUrl: './assets/generated/world-bg-tiles/farm-gpt-9grid-manifest.json',
      theme: 'farm',
      category: 'animals'
    },
    forest: {
      label: '森林',
      manifestUrl: './assets/generated/world-bg-tiles/forest-9grid-manifest.json',
      theme: 'forest',
      category: 'nature'
    },
    grassland: {
      label: '草原',
      manifestUrl: './assets/generated/world-bg-tiles/grassland-single-manifest.json',
      theme: 'grassland',
      category: 'food'
    },
    ocean: {
      label: '海洋',
      manifestUrl: './assets/generated/world-bg-tiles/ocean-9grid-manifest.json',
      theme: 'ocean',
      category: 'environment'
    },
    sky: {
      label: '天空',
      manifestUrl: './assets/generated/world-bg-tiles/sky-single-manifest.json',
      theme: 'sky',
      category: 'nature'
    },
    space: {
      label: '太空',
      manifestUrl: './assets/generated/world-bg-tiles/space-9grid-manifest.json',
      theme: 'space',
      category: 'minecraft'
    },
    alien: {
      label: '外星球',
      manifestUrl: './assets/generated/world-bg-tiles/alien-single-manifest.json',
      theme: 'alien',
      category: 'minecraft'
    }
  };
  const VOICE_ASSET_BASE = './assets/voice';
  const TTS_ENDPOINT = typeof window.WORD_MEMORY_TTS_ENDPOINT === 'string'
    ? window.WORD_MEMORY_TTS_ENDPOINT.trim()
    : ((window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost')
      ? 'http://127.0.0.1:9885/tts'
      : '');
  const TTS_DEFAULT_VOICE = typeof window.WORD_MEMORY_TTS_VOICE === 'string'
    ? window.WORD_MEMORY_TTS_VOICE.trim()
    : 'child';
  const TTS_DEFAULT_ENGINE = typeof window.WORD_MEMORY_TTS_ENGINE === 'string'
    ? window.WORD_MEMORY_TTS_ENGINE.trim()
    : 'auto';
  const DEBUG_QUERY = new URLSearchParams(window.location.search);
  const DEBUG_AUTO_START = DEBUG_QUERY.get('autostart') === '1';
  const DEBUG_WORLD_CONTROLS = false;
  const AUTO_START_PLAY_SESSION = !!window.navigator?.webdriver;
  const ENABLE_AUTOMATION_WORLD_CONTROLS = DEBUG_WORLD_CONTROLS || AUTO_START_PLAY_SESSION || DEBUG_AUTO_START;
  window.__wordMemoryReady = false;
  const TTS_REQUEST_TIMEOUT_MS = typeof window.WORD_MEMORY_TTS_TIMEOUT_MS === 'number'
    && Number.isFinite(window.WORD_MEMORY_TTS_TIMEOUT_MS)
    && window.WORD_MEMORY_TTS_TIMEOUT_MS > 0
    ? window.WORD_MEMORY_TTS_TIMEOUT_MS
    : 2400;
  const LOOPBACK_TTS_ENDPOINT = (() => {
    if (!TTS_ENDPOINT) {
      return false;
    }
    try {
      const url = new URL(TTS_ENDPOINT, window.location.href);
      return ['127.0.0.1', 'localhost'].includes(url.hostname);
    } catch (error) {
      return /^(https?:\/\/)?(127\.0\.0\.1|localhost)(:\d+)?\//i.test(TTS_ENDPOINT);
    }
  })();
  const ASSET_BASE = './assets/generated/topdown-farm-assets';
  const BOY_ASSET_BASE = './assets/generated/hero-boy-assets';
  const ENEMY_FALLBACK_POOL = [
    `${ASSET_BASE}/enemy_pig.png`,
    `${ASSET_BASE}/enemy_sheep.png`,
    `${ASSET_BASE}/enemy_chicken.png`,
    `${ASSET_BASE}/enemy_chick.png`,
    `${ASSET_BASE}/enemy_boar.png`,
    `${ASSET_BASE}/enemy_mouse.png`
  ];
  const WORLD_THEME_ENEMY_FALLBACKS = {
    farm: ENEMY_FALLBACK_POOL,
    forest: [
      './assets/generated/level-theme-assets/forest/mushroom-sprite.png',
      './assets/generated/level-theme-assets/forest/vine-sprout.png',
      './assets/generated/level-theme-assets/forest/pinecone-roll.png'
    ],
    grassland: [
      './assets/generated/level-theme-assets/grassland/tumble-puff.png',
      './assets/generated/level-theme-assets/grassland/cactus-hop.png',
      './assets/generated/level-theme-assets/grassland/dandelion-float.png'
    ],
    ocean: [
      './assets/generated/level-theme-assets/ocean/coral-crab.png',
      './assets/generated/level-theme-assets/ocean/shell-bubble.png',
      './assets/generated/level-theme-assets/ocean/seagrass-jelly.png'
    ],
    space: [
      './assets/generated/level-theme-assets/space/meteor-jelly.png',
      './assets/generated/level-theme-assets/space/stardust-orb.png',
      './assets/generated/level-theme-assets/space/satellite-bot.png'
    ]
  };
  const WORLD_PREVIEW_IMAGES = {
    farm: './assets/generated/world-bg-tiles/farm-9grid/farm_tile_r2_c2.png',
    farm_gpt: './assets/generated/world-bg-tiles/farm-gpt-9grid/farm_tile_r2_c2.png',
    forest: './assets/generated/world-bg-tiles/forest-gpt-9grid/forest_tile_r2_c2.png',
    grassland: './assets/generated/world-bg-tiles/farm-gpt-9grid/farm_tile_r2_c2.png',
    ocean: './assets/generated/world-bg-tiles/ocean-gpt-9grid/ocean_tile_r2_c2.png',
    sky: './assets/generated/world-bg-tiles/farm-gpt-9grid/farm_tile_r2_c2.png',
    space: './assets/generated/world-bg-tiles/space-gpt-9grid/space_tile_r2_c2.png',
    alien: './assets/generated/world-bg-tiles/space-gpt-9grid/space_tile_r2_c2.png'
  };
  const ROUND_SIZE = 3;
  const SESSION_WORD_TARGET = 50;
  const CHECKPOINT_WORDS = 10;
  const WORLD_COLS = 3;
  const WORLD_ROWS = 3;
  const WORLD_TILE_COUNT = WORLD_COLS * WORLD_ROWS;
  const BASE_WORLD_SCREEN_WIDTH = 160;
  const BASE_WORLD_SCREEN_HEIGHT = 90;
  const WORLD_SCALE = 1.75;
  const scaleDistance = (value) => Math.round(value * WORLD_SCALE * 100) / 100;
  const scaleWorldPoint = (point) => ({
    x: scaleDistance(point.x),
    y: scaleDistance(point.y)
  });
  const WORLD_SCREEN_WIDTH = Math.round(BASE_WORLD_SCREEN_WIDTH * WORLD_SCALE);
  const WORLD_SCREEN_HEIGHT = Math.round(BASE_WORLD_SCREEN_HEIGHT * WORLD_SCALE);
  const WORLD_WIDTH = WORLD_COLS * WORLD_SCREEN_WIDTH;
  const WORLD_HEIGHT = WORLD_ROWS * WORLD_SCREEN_HEIGHT;
  const PICKUP_RADIUS = scaleDistance(7.2);
  const MOVE_SPEED = 0.04;
  const THROW_SPEED = 0.079;
  const TARGETED_THROW_SPEED_MULTIPLIER = 2.45;
  const THROW_MAX_MS = 920;
  const THROW_HOMING_MAX_MS = 1600;
  const THROW_HIT_RADIUS = scaleDistance(7.4);
  const THROW_ARM_MS = 150;
  const HERO_WALK_FRAME_MS = 180;
  const HERO_WALK_FRAME_COUNT = 3;
  const HERO_ATTACK_POSE_MS = 420;
  const HERO_START_DUST_MS = 96;
  const HERO_STEP_DUST_MS = HERO_WALK_FRAME_MS * 2;
  const MAX_SHIELD = 3;
  const HERO_HIT_INVINCIBLE_MS = 920;
  const HERO_KNOCKBACK_DISTANCE = scaleDistance(9.2);
  const ENEMY_CHASE_SPEED = 0.0031;
  const ENEMY_ATTACK_RADIUS = scaleDistance(6.8);
  const ENEMY_ATTACK_COOLDOWN_MS = 1680;
  const ENEMY_IMAGE_FALLBACK_MS = 1800;
  const SUPPORT_PICKUP_RADIUS = scaleDistance(7.4);
  const SUPPORT_DROP_EVERY_SCORE = 2;
  const SUPPORT_SLOW_MS = 9000;
  const SUPPORT_AUTO_AIM_SHOTS = 2;
  const SUPPORT_SPEED_MS = 8200;
  const SUPPORT_HINT_CHARGES = 2;
  const SUPPORT_COMBO_BONUS = 1;
  const LEVEL_PROGRESS_KEY = 'word-memory-highest-level';
  const REWARD_PROGRESS_KEY = 'word-memory-reward-bank';
  const REVIEW_PROGRESS_KEY = 'word-memory-review-queue';
  const HERO_SELECTION_KEY = 'word-memory-selected-hero';
  const HOST_BRIDGE_SOURCE = 'petbank-word-memory-map';
  const HOST_BRIDGE_SESSION_ID = `word-memory-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  let hostBridgeSeq = 0;
  const MAP_BOUNDS = {
    minX: scaleDistance(10),
    maxX: WORLD_WIDTH - scaleDistance(10),
    minY: scaleDistance(9),
    maxY: WORLD_HEIGHT - scaleDistance(9)
  };
  const PLAYER_START = scaleWorldPoint({ x: 34, y: 62 });
  const TARGET_SLOTS = [
    { x: 84, y: 25 },
    { x: 116, y: 28 },
    { x: 128, y: 46 },
    { x: 98, y: 58 },
    { x: 76, y: 63 },
    { x: 118, y: 66 }
  ].map(scaleWorldPoint);
  const ORB_SLOTS = [
    { x: 26, y: 24 },
    { x: 44, y: 20 },
    { x: 54, y: 41 },
    { x: 30, y: 57 },
    { x: 50, y: 63 },
    { x: 42, y: 76 }
  ].map(scaleWorldPoint);
  const FARM_ASSETS = {
    heroLegacy: `${ASSET_BASE}/guardian_golem.png`,
    heroDirectional: {
      down: {
        idle: `${ASSET_BASE}/guardian_down_idle.png`,
        walk: [
          `${ASSET_BASE}/guardian_down_walk_a.png`,
          `${ASSET_BASE}/guardian_down_walk_b.png`
        ]
      },
      up: {
        idle: `${ASSET_BASE}/guardian_up_idle.png`,
        walk: [
          `${ASSET_BASE}/guardian_up_walk_a.png`,
          `${ASSET_BASE}/guardian_up_walk_b.png`
        ]
      },
      side: {
        idle: `${ASSET_BASE}/guardian_side_idle.png`,
        walk: [
          `${ASSET_BASE}/guardian_side_walk_a.png`,
          `${ASSET_BASE}/guardian_side_walk_b.png`
        ]
      },
      right: {
        idle: `${ASSET_BASE}/guardian_right_idle.png`,
        walk: [
          `${ASSET_BASE}/guardian_right_walk_a.png`,
          `${ASSET_BASE}/guardian_right_walk_b.png`
        ]
      },
      cast: {
        left: `${ASSET_BASE}/guardian_cast.png`,
        right: `${ASSET_BASE}/guardian_cast_right.png`
      },
      happy: `${ASSET_BASE}/guardian_happy.png`
    },
    labels: [
      `${ASSET_BASE}/label_capsule_wide_a.png`,
      `${ASSET_BASE}/label_capsule_wide_b.png`,
      `${ASSET_BASE}/label_capsule_wide_c.png`,
      `${ASSET_BASE}/label_capsule_wide_d.png`
    ],
    shadows: {
      hero: `${ASSET_BASE}/shadow_wider.png`,
      orb: `${ASSET_BASE}/shadow_small.png`
    },
    props: {
      sign: `${ASSET_BASE}/signpost_wood.png`,
      bush: `${ASSET_BASE}/bush_green.png`,
      flowerMixed: `${ASSET_BASE}/flower_patch_mixed.png`,
      flowerSun: `${ASSET_BASE}/flower_patch_sun.png`,
      fenceWood: `${ASSET_BASE}/fence_wood.png`,
      fenceWhite: `${ASSET_BASE}/fence_white.png`,
      crate: `${ASSET_BASE}/crate_wood.png`
    },
    bursts: [
      `${ASSET_BASE}/hit_burst_star.png`,
      `${ASSET_BASE}/hit_burst_spike.png`,
      `${ASSET_BASE}/hit_burst_flash.png`,
      `${ASSET_BASE}/hit_burst_badge.png`
    ],
    dusts: [
      `${ASSET_BASE}/dust_puff_soft.png`,
      `${ASSET_BASE}/dust_puff_pop.png`,
      `${ASSET_BASE}/dust_puff_cloud.png`
    ]
  };
  const HERO_REGISTRY = {
    boy: {
      id: 'boy',
      label: '小男孩',
      subtitle: '默认主角',
      preview: `${BOY_ASSET_BASE}/boy_down_idle.png`,
      sprites: {
        down: {
          idle: `${BOY_ASSET_BASE}/boy_down_idle.png`,
          walk: [
            `${BOY_ASSET_BASE}/boy_down_walk_a.png`,
            `${BOY_ASSET_BASE}/boy_down_walk_b.png`
          ]
        },
        up: {
          idle: `${BOY_ASSET_BASE}/boy_up_idle.png`,
          walk: [
            `${BOY_ASSET_BASE}/boy_up_walk_a.png`,
            `${BOY_ASSET_BASE}/boy_up_walk_b.png`
          ]
        },
        side: {
          idle: `${BOY_ASSET_BASE}/boy_side_idle.png`,
          walk: [
            `${BOY_ASSET_BASE}/boy_side_walk_a.png`,
            `${BOY_ASSET_BASE}/boy_side_walk_b.png`
          ]
        },
        right: {
          idle: `${BOY_ASSET_BASE}/boy_right_idle.png`,
          walk: [
            `${BOY_ASSET_BASE}/boy_right_walk_a.png`,
            `${BOY_ASSET_BASE}/boy_right_walk_b.png`
          ]
        },
        cast: {
          left: `${BOY_ASSET_BASE}/boy_cast.png`,
          right: `${BOY_ASSET_BASE}/boy_cast_right.png`
        },
        happy: `${BOY_ASSET_BASE}/boy_happy.png`
      }
    },
    guardian: {
      id: 'guardian',
      label: '铁傀儡',
      subtitle: '第二套角色',
      preview: `${ASSET_BASE}/guardian_down_idle.png`,
      sprites: FARM_ASSETS.heroDirectional
    }
  };
  const SUPPORT_ITEM_ROTATION = [
    {
      id: 'shield_leaf',
      label: '补盾叶',
      shortLabel: '补盾',
      icon: '+',
      iconSrc: `${ASSET_BASE}/support_shield_leaf.png`,
      accent: 'shield'
    },
    {
      id: 'slow_clock',
      label: '减速钟',
      shortLabel: '减速',
      icon: '~',
      iconSrc: `${ASSET_BASE}/support_slow_clock.png`,
      accent: 'slow'
    },
    {
      id: 'auto_star',
      label: '瞄准星',
      shortLabel: '自动瞄准',
      icon: '*',
      iconSrc: `${ASSET_BASE}/support_auto_star.png`,
      accent: 'auto'
    },
    {
      id: 'speed_boots',
      label: '加速鞋',
      shortLabel: '加速',
      icon: '>',
      iconSrc: `${ASSET_BASE}/support_speed_boots.png`,
      accent: 'speed'
    },
    {
      id: 'hint_card',
      label: '词卡提示',
      shortLabel: '提示',
      icon: '?',
      iconSrc: `${ASSET_BASE}/support_hint_card.png`,
      accent: 'hint'
    },
    {
      id: 'combo_badge',
      label: '连击加成',
      shortLabel: '连击',
      icon: 'x',
      iconSrc: `${ASSET_BASE}/support_combo_badge.png`,
      accent: 'combo'
    }
  ];
  const WORLD_THEME_SUPPORT_ICONS = {
    grassland: {
      speed_boots: './assets/generated/level-theme-assets/items/grassland-wind-speed.png'
    },
    ocean: {
      auto_star: './assets/generated/level-theme-assets/items/ocean-pearl-auto.png'
    },
    space: {
      combo_badge: './assets/generated/level-theme-assets/items/space-comet-combo.png'
    }
  };
  const DEFAULT_WORLD_TILES = [
    { id: 'tile-1', label: '农场入口', row: 0, col: 0, src: './assets/背景图片/01.png' },
    { id: 'tile-2', label: '河岸温室', row: 0, col: 1, src: './assets/背景图片/02.png' },
    { id: 'tile-3', label: '斜路菜地', row: 0, col: 2, src: './assets/背景图片/03.png' },
    { id: 'tile-4', label: '开阔草地', row: 1, col: 0, src: './assets/背景图片/04.png' },
    { id: 'tile-5', label: '溪桥农庄', row: 1, col: 1, src: './assets/背景图片/05.png' },
    { id: 'tile-6', label: '中央广场', row: 1, col: 2, src: './assets/背景图片/06.png' },
    { id: 'tile-7', label: '樱树湖岸', row: 2, col: 0, src: './assets/背景图片/07.png' },
    { id: 'tile-8', label: '南路草坡', row: 2, col: 1, src: './assets/背景图片/08.png' },
    { id: 'tile-9', label: '围栏岔口', row: 2, col: 2, src: './assets/背景图片/09.png' }
  ];
  const DEFAULT_WORLD_BACKDROP = {
    mode: 'tiles',
    image: '',
    labels: DEFAULT_WORLD_TILES.map(tile => tile.label)
  };

  function tilesFromLabels(labels, src) {
    const safeLabels = Array.isArray(labels) && labels.length
      ? labels
      : DEFAULT_WORLD_TILES.map(tile => tile.label);
    return Array.from({ length: WORLD_TILE_COUNT }, (_, index) => ({
      id: `tile-${index + 1}`,
      label: safeLabels[index] || `区域 ${index + 1}`,
      row: Math.floor(index / WORLD_COLS),
      col: index % WORLD_COLS,
      src: src || DEFAULT_WORLD_TILES[index]?.src || DEFAULT_WORLD_TILES[0].src
    }));
  }
  const CATEGORY_LABELS = {
    actions: '动作',
    animals: '动物',
    animal: '动物',
    block: '方块',
    body_parts: '身体',
    clothing: '衣物',
    color: '颜色',
    common_scenarios: '场景',
    directions: '方向',
    emotions: '情绪',
    environment: '环境',
    food: '食物',
    general: '通用',
    greeting: '问候',
    house: '家居',
    item: '物品',
    junior_high: '初中',
    math: '数学',
    minecraft: 'Minecraft',
    mob: '生物',
    monster: '怪物',
    nature: '自然',
    object: '物件',
    people: '人物',
    place: '地点',
    plant: '植物',
    quantities: '数量',
    school: '学校',
    shapes: '形状',
    tool: '工具',
    transport: '交通'
  };
  const LEVELS = [
    {
      id: 'level-1',
      order: 1,
      title: '农场热身',
      worldPack: 'farm_gpt',
      category: 'animals',
      wordCount: 3,
      shield: 3,
      enemySpeedScale: 0.78
    },
    {
      id: 'level-2',
      order: 2,
      title: '农场巡逻',
      worldPack: 'farm_gpt',
      category: 'animals',
      wordCount: 6,
      shield: 3,
      enemySpeedScale: 0.9
    },
    {
      id: 'level-3',
      order: 3,
      title: '森林小径',
      worldPack: 'forest',
      category: 'nature',
      wordCount: 9,
      shield: 3,
      enemySpeedScale: 1
    },
    {
      id: 'level-4',
      order: 4,
      title: '草原补给',
      worldPack: 'grassland',
      category: 'food',
      wordCount: 12,
      shield: 3,
      enemySpeedScale: 1.08
    },
    {
      id: 'level-5',
      order: 5,
      title: '海洋航线',
      worldPack: 'ocean',
      category: 'environment',
      wordCount: 15,
      shield: 2,
      enemySpeedScale: 1.16
    },
    {
      id: 'level-6',
      order: 6,
      title: '太空挑战',
      worldPack: 'space',
      category: 'minecraft',
      wordCount: 18,
      shield: 2,
      enemySpeedScale: 1.25
    }
  ];

  window.WordMemoryGameData = {
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
  };
})();
