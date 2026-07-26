import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const miniRoot = path.resolve(__dirname, '..');
const petRoot = process.env.PETBANK_ROOT
  ? path.resolve(process.env.PETBANK_ROOT)
  : path.resolve(miniRoot, '..', '宠物积分系统');

if (!fs.existsSync(petRoot)) {
  throw new Error('[import-from-petbank] pet bank root not found: ' + petRoot);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  const normalizedDest = dest.replace(/\\/g, '/');
  if (normalizedDest.includes('/vendor/css/') && path.extname(src).toLowerCase() === '.css') {
    const content = fs.readFileSync(src, 'utf8')
      .replaceAll("url('../assets/", "url('../../assets/")
      .replaceAll('url("../assets/', 'url("../../assets/');
    fs.writeFileSync(dest, content, 'utf8');
    return;
  }
  fs.copyFileSync(src, dest);
}

function pathMatches(rel, entry) {
  const normalized = rel.replace(/\\/g, '/');
  const target = String(entry || '').replace(/\\/g, '/');
  return normalized === target || normalized.startsWith(target.endsWith('/') ? target : target + '/');
}

function includeWhenAnyDescendantMatches(rel, exactFiles, prefixes) {
  const normalized = rel.replace(/\\/g, '/');
  if (exactFiles.has(normalized)) return true;
  for (const filePath of exactFiles) {
    if (filePath === normalized || filePath.startsWith(normalized + '/')) return true;
  }
  return prefixes.some((prefix) => {
    const target = String(prefix || '').replace(/\\/g, '/').replace(/\/+$/g, '');
    if (!target) return false;
    if (normalized === target || normalized.startsWith(target + '/')) return true;
    // allow walking into parent directories of an allowed prefix
    if (target.startsWith(normalized + '/')) return true;
    return false;
  });
}

function copyDirWithFilter(sourceRoot, destRoot, includeFn, options = {}) {
  const skipNames = new Set(options.skipNames || ['.git', 'node_modules', 'tmp', 'browser-screenshots', 'tmp-screenshots']);
  let fileCount = 0;
  let bytes = 0;

  function walk(rel = '') {
    const sourceDir = path.join(sourceRoot, rel);
    let entries;
    try { entries = fs.readdirSync(sourceDir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      if (skipNames.has(entry.name)) continue;
      const childRel = rel ? path.posix.join(rel.replace(/\\/g, '/'), entry.name) : entry.name;
      const sourcePath = path.join(sourceRoot, childRel);
      if (entry.isDirectory()) {
        if (!includeFn(childRel.replace(/\\/g, '/'), true)) continue;
        walk(childRel);
        continue;
      }
      if (!entry.isFile()) continue;
      const normalized = childRel.replace(/\\/g, '/');
      if (!includeFn(normalized, false)) continue;
      if (options.fileFilter && !options.fileFilter(normalized, sourcePath)) continue;
      const destPath = path.join(destRoot, childRel);
      copyFile(sourcePath, destPath);
      fileCount += 1;
      bytes += fs.statSync(sourcePath).size;
    }
  }

  walk('');
  return { fileCount, bytes };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function importLearningArcade() {
  const manifest = readJson(path.join(petRoot, 'scripts/runtime-asset-manifests/learning-arcade.json'));
  const exact = new Set(manifest.runtimeFiles || []);
  const prefixes = manifest.runtimePrefixes || [];
  const excluded = manifest.excludedPrefixes || [];
  const source = path.join(petRoot, manifest.packageRoot || 'prj/学习机玩法原型');
  const dest = path.join(miniRoot, 'games/learning-arcade');
  fs.rmSync(dest, { recursive: true, force: true });
  const result = copyDirWithFilter(source, dest, (rel) => {
    if (excluded.some((prefix) => pathMatches(rel, prefix))) return false;
    return includeWhenAnyDescendantMatches(rel, exact, prefixes);
  });
  return { id: 'learning-arcade', ...result, dest: path.relative(miniRoot, dest) };
}

function importTypingDefense() {
  const manifest = readJson(path.join(petRoot, 'scripts/runtime-asset-manifests/typing-defense.json'));
  const exact = new Set(manifest.runtimeFiles || []);
  const prefixes = manifest.runtimePrefixes || [];
  const excluded = manifest.excludedPrefixes || [];
  const source = path.join(petRoot, manifest.packageRoot || 'prj/消灭苦力怕打字游戏');
  const dest = path.join(miniRoot, 'games/typing-defense');
  fs.rmSync(dest, { recursive: true, force: true });
  const result = copyDirWithFilter(source, dest, (rel) => {
    if (excluded.some((prefix) => pathMatches(rel, prefix))) return false;
    return includeWhenAnyDescendantMatches(rel, exact, prefixes);
  });
  return { id: 'typing-defense', ...result, dest: path.relative(miniRoot, dest) };
}

function importWordMemoryMap() {
  const source = path.join(petRoot, 'prj/单词记忆射击场原型');
  const dest = path.join(miniRoot, 'games/word-memory-map');
  fs.rmSync(dest, { recursive: true, force: true });
  const exactFiles = new Set([
    'index.html',
    'styles.css',
    'game.js',
    'game-data.js',
    'game-storage.js',
    'game-utils.js',
    'assets/word-memory-cards.json',
    'assets/word-memory-cards.js',
    'assets/word-memory-core-cards.json',
    'assets/word-memory-core-cards.js',
    'assets/word-memory-extension-cards.json',
    'assets/word-memory-extension-cards.js',
    'assets/stage-background.png',
    'assets/generated/reference/topdown-clean-bg-chatgpt.webp',
    'assets/generated/world-bg-single/farm-gpt-panorama.png'
  ]);
  const allowedPrefixes = [
    'assets/voice',
    'assets/generated/hero-boy-assets',
    'assets/generated/topdown-farm-assets',
    'assets/generated/level-theme-assets',
    'assets/generated/world-bg-tiles',
    'assets/generated/world-bg-single',
    'assets/背景图片',
    'assets/背景图片-海洋',
    'assets/背景图--太空',
    'assets/MineCraft宠物图片/poses',
    'assets/主角图'
  ];
  const result = copyDirWithFilter(source, dest, (rel) => {
    if (rel.startsWith('assets/MineCraft宠物图片/poses/') && path.extname(rel).toLowerCase() === '.png') {
      return false;
    }
    return includeWhenAnyDescendantMatches(rel, exactFiles, allowedPrefixes);
  });

  // Default this project to full content mode: all vocab packs and all maps.
  const indexPath = path.join(dest, 'index.html');
  if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');
    if (!html.includes('data-minigames-full-content="true"')) {
      html = html.replace('<body>', '<body data-minigames-full-content="true">');
    }
    if (!html.includes('minigames-full-vocab-boot')) {
      html = html.replace(
        '<script src="./game-data.js',
        `<script id="minigames-full-vocab-boot">
(function () {
  try {
    var params = new URLSearchParams(window.location.search || '');
    if (!params.get('vocab')) {
      params.set('vocab', 'all');
      var next = window.location.pathname + '?' + params.toString() + window.location.hash;
      window.history.replaceState(null, '', next);
    }
  } catch (error) {
    console.warn('[word-memory-map] full vocab boot failed', error);
  }
}());
</script>
  <script src="./game-data.js`
      );
    }
    fs.writeFileSync(indexPath, html, 'utf8');
  }

  const gameDataPath = path.join(dest, 'game-data.js');
  if (fs.existsSync(gameDataPath)) {
    let gameData = fs.readFileSync(gameDataPath, 'utf8').replace(/\r\n/g, '\n');
    gameData = gameData.replace(
      '  const ENABLE_AUTOMATION_WORLD_CONTROLS = DEBUG_WORLD_CONTROLS || AUTO_START_PLAY_SESSION || DEBUG_AUTO_START;',
      '  const FULL_CONTENT_MODE = Boolean(window.MINIGAMES_COMPLETE_CONTENT) || Boolean(document && document.body && document.body.dataset.minigamesFullContent === \'true\');\n  const ENABLE_AUTOMATION_WORLD_CONTROLS = DEBUG_WORLD_CONTROLS || AUTO_START_PLAY_SESSION || DEBUG_AUTO_START || FULL_CONTENT_MODE;'
    );
    gameData = gameData.replace(
      '    AUTO_START_PLAY_SESSION,\n    ENABLE_AUTOMATION_WORLD_CONTROLS,',
      '    AUTO_START_PLAY_SESSION,\n    FULL_CONTENT_MODE,\n    ENABLE_AUTOMATION_WORLD_CONTROLS,'
    );
    fs.writeFileSync(gameDataPath, gameData, 'utf8');
  }

  const gamePath = path.join(dest, 'game.js');
  if (fs.existsSync(gamePath)) {
    let game = fs.readFileSync(gamePath, 'utf8').replace(/\r\n/g, '\n');
    game = game.replace(
      '    AUTO_START_PLAY_SESSION,\n    ENABLE_AUTOMATION_WORLD_CONTROLS,',
      '    AUTO_START_PLAY_SESSION,\n    FULL_CONTENT_MODE,\n    ENABLE_AUTOMATION_WORLD_CONTROLS,'
    );
    game = game.replace(
      '    return level.order <= state.highestUnlockedLevel;',
      '    return FULL_CONTENT_MODE || level.order <= state.highestUnlockedLevel;'
    );
    fs.writeFileSync(gamePath, game, 'utf8');
  }
  return { id: 'word-memory-map', ...result, dest: path.relative(miniRoot, dest) };
}

function importSharedData() {
  const copies = [
    ['data/math-cmath.json', 'data/math-cmath.json'],
    ['data/hanzi-hsk.json', 'data/hanzi-hsk.json'],
    ['data/hanzi-questions.json', 'data/hanzi-questions.json'],
    ['data/scenes.json', 'data/scenes.json'],
    ['css/playground.css', 'vendor/css/playground.css'],
    ['css/hanzi-game.css', 'vendor/css/hanzi-game.css'],
    ['css/leaderboard.css', 'vendor/css/leaderboard.css'],
    ['css/pixel-story.css', 'vendor/css/pixel-story.css'],
    ['js/math-pk.js', 'vendor/js/math-pk.js'],
    ['js/hanzi-game.js', 'vendor/js/hanzi-game.js'],
    ['js/hanzi-progress.js', 'vendor/js/hanzi-progress.js'],
    ['js/leaderboard.js', 'vendor/js/leaderboard.js'],
    ['js/pixel-story-page.js', 'vendor/js/pixel-story-page.js'],
    ['js/pixel-story-map.js', 'vendor/js/pixel-story-map.js'],
    ['js/pixel-story-engine.js', 'vendor/js/pixel-story-engine.js'],
    ['js/exploration.js', 'vendor/js/exploration.js'],
    ['js/exploration-chapter.js', 'vendor/js/exploration-chapter.js'],
    ['js/exploration-detail.js', 'vendor/js/exploration-detail.js'],
    ['js/exploration-progress.js', 'vendor/js/exploration-progress.js'],
    ['js/exploration-copy.js', 'vendor/js/exploration-copy.js'],
    ['js/battle-engine.js', 'vendor/js/battle-engine.js'],
    ['js/battle-fx.js', 'vendor/js/battle-fx.js']
  ];
  let fileCount = 0;
  let bytes = 0;
  for (const [from, to] of copies) {
    const src = path.join(petRoot, from);
    if (!fs.existsSync(src)) {
      console.warn('[import-from-petbank] missing', from);
      continue;
    }
    const dest = path.join(miniRoot, to);
    copyFile(src, dest);
    fileCount += 1;
    bytes += fs.statSync(src).size;
  }
  return { id: 'shared-modules', fileCount, bytes };
}

function importVocabRuntime() {
  const source = path.join(petRoot, 'data/vocab');
  const dest = path.join(miniRoot, 'data/vocab');
  const excludedDirectories = new Set(['_archive', 'external', 'html']);
  const excludedFiles = new Set(['_junior_phrase_curate_cache.json', '_missing_translations.txt', '_placeholders_used.txt', '_translate_cache.json']);
  const result = copyDirWithFilter(source, dest, (rel, isDirectory) => {
    const parts = rel.replace(/\\/g, '/').split('/');
    if (parts.some((part) => excludedDirectories.has(part))) return false;
    if (!isDirectory && excludedFiles.has(parts.at(-1))) return false;
    return true;
  });
  return { id: 'vocab-runtime', ...result, dest: path.relative(miniRoot, dest) };
}

function importCompleteAdventureRuntime() {
  const copies = [
    ['data/pets.json', 'data/pets.json'],
    ['data/pets-runtime-index.json', 'data/pets-runtime-index.json'],
    ['data/items.json', 'data/items.json'],
    ['data/skills.json', 'data/skills.json'],
    ['data/arena-stages.json', 'data/arena-stages.json'],
    ['data/pokedex-lore-draft.json', 'data/pokedex-lore-draft.json'],
    ['data/scenes.json', 'data/scenes.json'],
    ['js/asset-loader.js', 'vendor/js/asset-loader.js'],
    ['js/pet.js', 'vendor/js/pet.js'],
    ['js/inventory.js', 'vendor/js/inventory.js'],
    ['js/travel-memory.js', 'vendor/js/travel-memory.js'],
    ['js/card-collection.js', 'vendor/js/card-collection.js'],
    ['js/card-arena.js', 'vendor/js/card-arena.js'],
    ['js/card-arena-ui.js', 'vendor/js/card-arena-ui.js'],
    ['css/style.css', 'vendor/css/style.css'],
    ['css/travel-memory.css', 'vendor/css/travel-memory.css'],
    ['css/card-collection.css', 'vendor/css/card-collection.css'],
    ['css/arena.css', 'vendor/css/arena.css']
  ];
  let fileCount = 0;
  let bytes = 0;
  for (const [from, to] of copies) {
    const src = path.join(petRoot, from);
    if (!fs.existsSync(src)) {
      console.warn('[import-from-petbank] missing', from);
      continue;
    }
    const dest = path.join(miniRoot, to);
    copyFile(src, dest);
    fileCount += 1;
    bytes += fs.statSync(src).size;
  }

  const storySource = path.join(petRoot, 'data/stories');
  const storyDest = path.join(miniRoot, 'data/stories');
  const storyResult = copyDirWithFilter(storySource, storyDest, () => true);
  fileCount += storyResult.fileCount;
  bytes += storyResult.bytes;

  const assetPrefixes = [
    'arena', 'background', 'battle-fx', 'banchong', 'banchong2', 'cards',
    'characters', 'decor', 'home-bg', 'monsters', 'pets', 'pokedex-halls',
    'scenes', 'ui/points-exchange', 'voice'
  ];
  const assetResult = copyDirWithFilter(
    path.join(petRoot, 'assets'),
    path.join(miniRoot, 'assets'),
    (rel) => includeWhenAnyDescendantMatches(rel, new Set(), assetPrefixes)
  );
  fileCount += assetResult.fileCount;
  bytes += assetResult.bytes;

  // Typing defense uses this one shared fallback; the full learning-center
  // image cache is not part of the standalone game runtime.
  fs.rmSync(path.join(miniRoot, 'assets/learn/english-vocab'), { recursive: true, force: true });
  const standaloneAssets = ['home-bg.webp', 'learn/english-vocab/minecraft-card.webp'];
  for (const rel of standaloneAssets) {
    const src = path.join(petRoot, 'assets', rel);
    if (!fs.existsSync(src)) continue;
    copyFile(src, path.join(miniRoot, 'assets', rel));
    fileCount += 1;
    bytes += fs.statSync(src).size;
  }

  return { id: 'complete-adventure-runtime', fileCount, bytes };
}

function importPixelStoryRuntime() {
  const manifest = readJson(path.join(petRoot, 'scripts/runtime-asset-manifests/pixel-worlds-story.json'));
  const dataFiles = [
    'data/story-packs/05-pixel-worlds-story/manifest.json',
    'data/story-packs/05-pixel-worlds-story/audio-index.json',
    ...(manifest.data || [])
  ];
  // include levels and audio indexes fully
  const packRoot = path.join(petRoot, 'data/story-packs/05-pixel-worlds-story');
  const packDest = path.join(miniRoot, 'data/story-packs/05-pixel-worlds-story');
  fs.rmSync(packDest, { recursive: true, force: true });
  let fileCount = 0;
  let bytes = 0;
  const packResult = copyDirWithFilter(packRoot, packDest, (rel) => {
    if (rel.startsWith('audio-manifest')) return false;
    return true;
  });
  fileCount += packResult.fileCount;
  bytes += packResult.bytes;

  const assetRoot = path.join(petRoot, 'assets/story/pixel-worlds-v1');
  const assetDest = path.join(miniRoot, 'assets/story/pixel-worlds-v1');
  fs.rmSync(assetDest, { recursive: true, force: true });
  const prefixes = (manifest.runtimePrefixes || []).map((p) => p.replace(/^assets\/story\/pixel-worlds-v1\//, '').replace(/\/$/, ''));
  const assetResult = copyDirWithFilter(assetRoot, assetDest, (rel) => {
    // skip wav originals; keep ogg + non-audio runtime art
    if (rel.startsWith('audio/') && rel.toLowerCase().endsWith('.wav')) return false;
    if (rel.startsWith('audio/')) return true;
    return prefixes.some((prefix) => pathMatches(rel, prefix) || pathMatches(rel, prefix + '/'));
  }, {
    fileFilter(rel) {
      if (rel.startsWith('audio/') && rel.toLowerCase().endsWith('.wav')) return false;
      return true;
    }
  });
  fileCount += assetResult.fileCount;
  bytes += assetResult.bytes;

  // also copy a few playground card images for hub polish if present
  const uiCards = [
    'assets/ui/pg-card-mathpk.webp',
    'assets/ui/pg-card-hanzi.webp',
    'assets/ui/pg-card-typing-defense.webp',
    'assets/ui/pg-card-word-shooter.webp',
    'assets/ui/pg-card-word-cannon.webp',
    'assets/ui/pg-card-pinyin-snake.webp',
    'assets/ui/pg-card-word-memory.webp',
    'assets/ui/pg-card-arena.webp',
    'assets/ui/playground-bg.webp'
  ];
  for (const rel of uiCards) {
    const src = path.join(petRoot, rel);
    if (!fs.existsSync(src)) continue;
    copyFile(src, path.join(miniRoot, rel));
    fileCount += 1;
    bytes += fs.statSync(src).size;
  }

  return { id: 'pixel-story-runtime', fileCount, bytes };
}

function patchStandaloneCompleteMode() {
  const patches = [
    {
      file: 'vendor/js/card-arena-ui.js',
      replacements: [
        [
          'function getProgress() {\n        try {',
          'function getProgress() {\n        if (window.MINIGAMES_COMPLETE_CONTENT) return { cleared: [], current: 999 };\n        try {'
        ],
        [
          'function isUnlocked(id) {\n        const p = getProgress();',
          'function isUnlocked(id) {\n        if (window.MINIGAMES_COMPLETE_CONTENT) return true;\n        const p = getProgress();'
        ],
        [
          'function _payArenaEntry() {\n        const DAILY_LIMIT = 3;',
          'function _payArenaEntry() {\n        if (window.MINIGAMES_COMPLETE_CONTENT) return true;\n        const DAILY_LIMIT = 3;'
        ],
        [
          '        const usedToday = _arenaBattleUsedToday();\n        const remainToday = Math.max(0, 3 - usedToday);',
          '        const completeMode = Boolean(window.MINIGAMES_COMPLETE_CONTENT);\n        const usedToday = _arenaBattleUsedToday();\n        const remainToday = Math.max(0, 3 - usedToday);'
        ],
        [
          '<span style="font-size:12px;color:#8A7240;font-weight:bold;">🏕️ 每日 3 场免费 · 🎫额外券可续战</span>',
          '<span style="font-size:12px;color:#8A7240;font-weight:bold;">${completeMode ? \'🎮 完整模式不限次数 · 🎫额外券可用于其他玩法\' : \'🏕️ 每日 3 场免费 · 🎫额外券可续战\'}</span>'
        ],
        [
          '<span style="font-size:12px;color:#8A7240;font-weight:bold;">今日剩余 ${remainToday}/3 · 持有额外券 ${ticketCount}</span>',
          '<span style="font-size:12px;color:#8A7240;font-weight:bold;">${completeMode ? \'可自由挑战全部关卡\' : `今日剩余 ${remainToday}/3`} · 持有额外券 ${ticketCount}</span>'
        ],
        [
          '<div class="stage-reward">🃏 首通新卡：${(st.reward&&st.reward.dropCard)?_speciesName(st.reward.dropCard):\'—\'} · 🎫 每日3场免费</div>',
          '<div class="stage-reward">🃏 首通新卡：${(st.reward&&st.reward.dropCard)?_speciesName(st.reward.dropCard):\'—\'} · ${completeMode ? \'完整模式不限次数\' : \'🎫 每日3场免费\'}</div>'
        ]
      ]
    },
    {
      file: 'vendor/js/pixel-story-map.js',
      replacements: [
        [
          'function isNodeUnlocked(nodes, index, completed) {\n        if (index === 0) return true;',
          'function isNodeUnlocked(nodes, index, completed) {\n        if (root.MINIGAMES_COMPLETE_CONTENT) return true;\n        if (index === 0) return true;'
        ],
        [
          'var visibleNodes = pageNodes.filter(function (node) {\n            return isNodeUnlocked(nodes, nodes.indexOf(node), completed);\n        });',
          'var visibleNodes = root.MINIGAMES_COMPLETE_CONTENT\n            ? pageNodes\n            : pageNodes.filter(function (node) {\n                return isNodeUnlocked(nodes, nodes.indexOf(node), completed);\n            });'
        ],
        [
          "html += '<span class=\"pixel-story-node-state\">' + (isCompleted ? '已完成' : '现在出发') + '</span></button>';",
          "html += '<span class=\"pixel-story-node-state\">' + (isCompleted ? '已完成' : (root.MINIGAMES_COMPLETE_CONTENT ? '自由出发' : '现在出发')) + '</span></button>';"
        ],
        [
          "html += '<div class=\"pixel-story-map-legend\"><span><i></i>本页航线</span><small>完成当前节点后，下一站才会出现</small></div>';",
          "html += '<div class=\"pixel-story-map-legend\"><span><i></i>本页航线</span><small>' + (root.MINIGAMES_COMPLETE_CONTENT ? '完整内容已开放，可自由选择节点' : '完成当前节点后，下一站才会出现') + '</small></div>';"
        ]
      ]
    },
    {
      file: 'vendor/js/exploration.js',
      replacements: [
        [
          '    function isSceneUnlocked(scene) {',
          '    function isFullContentMode() {\n        return Boolean(window.MINIGAMES_COMPLETE_CONTENT) || Boolean(document && document.body && document.body.dataset.minigamesFullContent === \'true\');\n    }\n\n    function isSceneUnlocked(scene) {\n        if (isFullContentMode()) return true;'
        ]
      ]
    },
    {
      file: 'games/word-memory-map/styles.css',
      replacements: [
        [
          '.world-option-grid {\n  display: grid;',
          '.hero-select-grid[hidden],\n.world-option-grid[hidden] {\n  display: none;\n}\n\n.world-option-grid {\n  display: grid;'
        ]
      ]
    },
    {
      file: 'games/word-memory-map/game-data.js',
      replacements: [
        [
          "    farm: './assets/generated/world-bg-tiles/farm-9grid/farm_tile_r2_c2.png',",
          "    farm: './assets/generated/world-bg-single/farm-panorama.png',"
        ],
        [
          "    grassland: './assets/generated/world-bg-tiles/farm-gpt-9grid/farm_tile_r2_c2.png',",
          "    grassland: './assets/generated/world-bg-single/farm-panorama.png',"
        ],
        [
          "    sky: './assets/generated/world-bg-tiles/farm-gpt-9grid/farm_tile_r2_c2.png',",
          "    sky: './assets/generated/world-bg-single/farm-panorama.png',"
        ],
        [
          "    alien: './assets/generated/world-bg-tiles/space-gpt-9grid/space_tile_r2_c2.png'",
          "    alien: './assets/generated/world-bg-single/space-panorama.png'"
        ]
      ]
    },
    {
      file: 'games/word-memory-map/assets/generated/world-bg-tiles/alien-single-manifest.json',
      replacements: [
        [
          '"image": "./assets/generated/world-bg-single/farm-panorama.png"',
          '"image": "./assets/generated/world-bg-single/space-panorama.png"'
        ]
      ]
    }
  ];
  let bytes = 0;
  for (const patch of patches) {
    const filePath = path.join(miniRoot, patch.file);
    let source = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    for (const [from, to] of patch.replacements) {
      if (!source.includes(from)) throw new Error(`[import-from-petbank] standalone patch target missing: ${patch.file}`);
      source = source.replace(from, to);
    }
    fs.writeFileSync(filePath, source, 'utf8');
    bytes += Buffer.byteLength(source);
  }
  return { id: 'standalone-complete-mode', fileCount: patches.length, bytes };
}

function writeShells() {
  const shells = {
    'games/math-pk/index.html': `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>数学 PK · 小游戏项目</title>
  <link rel="stylesheet" href="../../vendor/css/playground.css">
  <link rel="stylesheet" href="../../vendor/css/leaderboard.css">
  <style>body{margin:0;background:#f6f8fa}#math-pk-container{min-height:100vh}.shell-bar{display:flex;gap:12px;align-items:center;padding:12px 16px;background:#fff;border-bottom:1px solid #dbe4eb} .shell-bar a{color:#237f7c;text-decoration:none;font-weight:700}</style>
</head>
<body>
  <div class="shell-bar"><a href="../../index.html#games">← 返回游戏库</a><strong>数学 PK</strong><span>完整关卡与题库，独立运行</span></div>
  <div id="math-pk-container"></div>
  <script src="../../host/petbank-host-shim.js"></script>
  <script src="../../bridge.js"></script>
  <script src="../../vendor/js/leaderboard.js"></script>
  <script src="../../vendor/js/math-pk.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', async function () {
      if (window.MathPKGame && typeof MathPKGame.renderUI === 'function') MathPKGame.renderUI('math-pk-container');
      else console.warn('[math-pk] no known boot method', Object.keys(window.MathPKGame || {}));
    });
  </script>
</body>
</html>`,
    'games/hanzi/index.html': `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>汉字游戏 · 小游戏项目</title>
  <link rel="stylesheet" href="../../vendor/css/hanzi-game.css">
  <link rel="stylesheet" href="../../vendor/css/playground.css">
  <style>body{margin:0;background:#f6f8fa}#hanzi-container{min-height:100vh}.shell-bar{display:flex;gap:12px;align-items:center;padding:12px 16px;background:#fff;border-bottom:1px solid #dbe4eb} .shell-bar a{color:#237f7c;text-decoration:none;font-weight:700}</style>
</head>
<body>
  <div class="shell-bar"><a href="../../index.html#games">← 返回游戏库</a><strong>汉字游戏</strong><span>完整汉字题库，独立运行</span></div>
  <div id="hanzi-container"></div>
  <script src="../../host/petbank-host-shim.js"></script>
  <script src="../../bridge.js"></script>
  <script src="../../vendor/js/hanzi-progress.js"></script>
  <script src="../../vendor/js/leaderboard.js"></script>
  <script src="../../vendor/js/hanzi-game.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      if (window.HanziGame && typeof HanziGame.renderUI === 'function') HanziGame.renderUI('hanzi-container');
      else console.warn('[hanzi] no known boot method', Object.keys(window.HanziGame || {}));
    });
  </script>
</body>
</html>`,
    'games/explore-map/index.html': `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>三世界故事地图 · 小游戏项目</title>
  <link rel="stylesheet" href="../../vendor/css/pixel-story.css">
  <style>
    body{margin:0;background:#0f1b24;color:#f4f7fb;font-family:Microsoft YaHei,sans-serif}
    .shell-bar{display:flex;gap:12px;align-items:center;padding:12px 16px;background:rgba(255,255,255,.06);border-bottom:1px solid rgba(255,255,255,.08)}
    .shell-bar a{color:#8ef0d8;text-decoration:none;font-weight:700}
    #page-explore{min-height:calc(100vh - 52px)}
    .explore-loading-state{padding:48px 24px;text-align:center}
  </style>
</head>
<body data-minigames-full-content="true">
  <div class="shell-bar"><a href="../../index.html#games">← 返回游戏库</a><strong>三世界故事地图</strong><span>完整章节与地图资源</span></div>
  <div class="page active" id="page-explore">
    <section class="explore-loading-state" id="exploreLoadingState" aria-live="polite">正在打开故事地图…</section>
    <section id="pixelStoryMapHost" aria-label="三世界故事地图">
      <div class="pixel-story-shell" id="pixelStoryShell" data-mode="story" data-view="map">
        <div class="pixel-story-map-slot" id="pixelStoryMapContainer"></div>
      </div>
    </section>
    <section id="pixelStoryChapterHost" aria-label="故事章节" hidden></section>
  </div>
  <script src="../../host/petbank-host-shim.js"></script>
  <script src="../../bridge.js"></script>
  <script src="../../vendor/js/pixel-story-engine.js"></script>
  <script src="../../vendor/js/pixel-story-map.js"></script>
  <script src="../../vendor/js/pixel-story-page.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', async function () {
      try {
        if (window.PixelStoryPage && typeof PixelStoryPage.showMap === 'function') {
          await PixelStoryPage.showMap();
        } else if (window.PixelStoryMap && typeof PixelStoryMap.render === 'function') {
          await PixelStoryMap.render('pixelStoryMapContainer');
        } else {
          document.getElementById('exploreLoadingState').textContent = '故事地图模块未就绪';
        }
      } catch (error) {
        console.warn('[explore-map] boot failed', error);
        document.getElementById('exploreLoadingState').textContent = '故事地图加载失败：' + (error && error.message ? error.message : error);
      }
    });
  </script>
</body>
</html>`,
    'games/forest-map/index.html': `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>森林冒险地图 · 小游戏项目</title>
  <link rel="stylesheet" href="../../vendor/css/playground.css">
  <link rel="stylesheet" href="../../vendor/css/style.css">
  <style>
    body{margin:0;background:#f4f7f2;font-family:Microsoft YaHei,sans-serif;color:#20354b}
    .shell-bar{display:flex;gap:12px;align-items:center;padding:12px 16px;background:#fff;border-bottom:1px solid #dbe4eb}
    .shell-bar a{color:#237f7c;text-decoration:none;font-weight:700}
    .forest-map-page{padding:20px}
    .forest-map-page-header{display:flex;justify-content:space-between;gap:16px;align-items:end;margin-bottom:18px}
    .forest-map-page-kicker{margin:0 0 6px;color:#6e7d8d;font-size:12px;font-weight:700;letter-spacing:1px}
    .map-board-shell{background:#fff;border:1px solid #dbe4eb;border-radius:24px;padding:16px;box-shadow:0 18px 42px rgba(44,70,90,.08)}
    .map-board{position:relative;min-height:640px}
  </style>
</head>
<body data-minigames-full-content="true">
  <div class="shell-bar"><a href="../../index.html#games">← 返回游戏库</a><strong>森林冒险</strong><span>完整 12 场景螺旋地图</span></div>
  <section class="forest-map-page" aria-labelledby="forestMapPageTitle">
    <header class="forest-map-page-header">
      <div>
        <p class="forest-map-page-kicker">经典探索路线 · 非像素地图</p>
        <h1 id="forestMapPageTitle">森林冒险</h1>
        <p>完整 12 个自然场景路线。进度保存在本项目本地。</p>
      </div>
    </header>
    <div class="map-board-shell forest-map-page-shell">
      <div class="map-board-surface">
        <div class="map-board" id="forestMapSceneGrid" aria-label="经典森林冒险场景路线"></div>
      </div>
    </div>
  </section>
  <div id="explorationStageRoot" hidden></div>
  <script src="../../host/petbank-host-shim.js"></script>
  <script src="../../bridge.js"></script>
  <script src="../../vendor/js/battle-engine.js"></script>
  <script src="../../vendor/js/battle-fx.js"></script>
  <script src="../../vendor/js/exploration-copy.js"></script>
  <script src="../../vendor/js/exploration-progress.js"></script>
  <script src="../../vendor/js/exploration-detail.js"></script>
  <script src="../../vendor/js/exploration.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', async function () {
      try {
        if (window.ExplorationSystem && typeof ExplorationSystem.loadScenes === 'function') {
          await ExplorationSystem.loadScenes();
        }
        if (window.ExplorationSystem && typeof ExplorationSystem.renderSceneGridMap === 'function') {
          ExplorationSystem.renderSceneGridMap('forestMapSceneGrid');
        } else if (window.ExplorationSystem && typeof ExplorationSystem.renderExplorePage === 'function') {
          ExplorationSystem.renderExplorePage();
        } else {
          document.getElementById('forestMapSceneGrid').innerHTML = '<p style="padding:24px">森林地图模块未就绪</p>';
        }
      } catch (error) {
        console.warn('[forest-map] boot failed', error);
        document.getElementById('forestMapSceneGrid').innerHTML = '<p style="padding:24px">森林地图加载失败：' + (error && error.message ? error.message : error) + '</p>';
      }
    });
  </script>
</body>
</html>`,
    'games/learning-arcade/README.md': '# 学习机小游戏\n\n从宠物积分系统 `prj/学习机玩法原型` 导入的完整 runtime。支持飞机大战、拼音赛车、贪吃蛇。\n',
    'games/typing-defense/README.md': '# 消灭苦力怕\n\n从宠物积分系统 `prj/消灭苦力怕打字游戏` 导入的完整 runtime。\n',
    'games/word-memory-map/README.md': '# 单词跑酷 / 像素探险\n\n从宠物积分系统导入的完整地图与词库。小游戏项目默认 `vocab=all`，提供全部词库与地图，而不是单词远征的分阶段子集。\n'
    ,
    'games/card-collection/index.html': `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>宠物卡牌图鉴 · 小游戏项目</title>
  <link rel="stylesheet" href="../../vendor/css/style.css">
  <link rel="stylesheet" href="../../vendor/css/travel-memory.css">
  <link rel="stylesheet" href="../../vendor/css/card-collection.css">
</head>
<body class="mini-games-card-shell">
  <div class="shell-bar"><a href="../../index.html#games">← 返回游戏库</a><strong>宠物卡牌图鉴</strong><span>完整 261 种宠物与全部卡册</span></div>
  <main id="card-collection-container"></main>
  <script src="../../host/petbank-host-shim.js"></script>
  <script src="../../vendor/js/asset-loader.js"></script>
  <script src="../../vendor/js/pet.js"></script>
  <script src="../../vendor/js/inventory.js"></script>
  <script src="../../vendor/js/travel-memory.js"></script>
  <script src="../../vendor/js/card-collection.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', async function () {
      try {
        if (window.PetSystem && typeof PetSystem.load === 'function') PetSystem.load();
        if (window.PetSystem && typeof PetSystem.loadPetDB === 'function') await PetSystem.loadPetDB();
        if (window.InventorySystem && typeof InventorySystem.loadItemsData === 'function') await InventorySystem.loadItemsData();
        if (window.InventorySystem && typeof InventorySystem.load === 'function') InventorySystem.load();
        if (window.CardCollection && typeof CardCollection.init === 'function') CardCollection.init();
        if (window.CardCollection && typeof CardCollection.renderUI === 'function') CardCollection.renderUI('card-collection-container');
      } catch (error) {
        console.warn('[card-collection] boot failed', error);
        document.getElementById('card-collection-container').innerHTML = '<p style="padding:24px">宠物图鉴加载失败：' + (error && error.message ? error.message : error) + '</p>';
      }
    });
  </script>
</body>
</html>`
    ,
    'games/card-arena/index.html': `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>卡牌训练营 · 小游戏项目</title>
  <link rel="stylesheet" href="../../vendor/css/style.css">
  <link rel="stylesheet" href="../../vendor/css/card-collection.css">
  <link rel="stylesheet" href="../../vendor/css/arena.css">
  <style>body{margin:0;background:#f7f7f2}.shell-bar{display:flex;gap:12px;align-items:center;padding:12px 16px;background:#fff;border-bottom:1px solid #dbe4eb}.shell-bar a{color:#237f7c;text-decoration:none;font-weight:700}.arena-page{padding:20px;max-width:1120px;margin:auto}.arena-modal{display:none;position:fixed;inset:0;z-index:20;background:rgba(20,30,40,.55);padding:18px;overflow:auto}.arena-modal.show{display:block}.arena-modal-inner{max-width:980px;margin:2vh auto;background:#fff;border-radius:18px;padding:20px;min-height:90vh}.arena-modal-close{float:right;border:0;background:transparent;font-size:24px;cursor:pointer}.arena-stages-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.arena-team-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}.arena-battle-stage{min-height:70vh}@media(max-width:680px){.arena-stages-grid{grid-template-columns:1fr}}</style>
</head>
<body class="mini-games-card-arena-shell">
  <div class="shell-bar"><a href="../../index.html#games">← 返回游戏库</a><strong>卡牌训练营</strong><span>完整 10 关、自由练习与本地双人对战</span></div>
  <main class="arena-page">
    <h1>卡牌训练营</h1>
    <p>从完整宠物图鉴中组队，挑战五大区域的全部训练关卡。</p>
    <button type="button" class="btn-primary" onclick="CardArenaUI.openStages()">打开训练地图</button>
  </main>
  <section class="arena-modal" id="arenaStagesModal" aria-label="训练地图"><div class="arena-modal-inner"><button class="arena-modal-close" type="button" onclick="CardArenaUI.closeStages()">×</button><h2>训练地图</h2><div class="arena-stages-grid" id="arenaStagesGrid"></div></div></section>
  <section class="arena-modal" id="arenaTeamModal" aria-label="选择队伍"><div class="arena-modal-inner"><button class="arena-modal-close" type="button" onclick="CardArenaUI.closeTeamModal()">×</button><h2>选择出战伙伴</h2><div class="arena-team-grid" id="arenaTeamGrid"></div><p id="arenaTeamCount">已选 0 / 2</p><button class="btn-primary" id="arenaTeamConfirm" type="button" onclick="CardArenaUI.confirmTeam()" disabled>确认队伍</button></div></section>
  <section class="arena-modal" id="arenaBattleModal" aria-label="卡牌对战"><div class="arena-battle-stage" id="arenaStage"></div></section>
  <script src="../../host/petbank-host-shim.js"></script>
  <script src="../../vendor/js/asset-loader.js"></script>
  <script src="../../vendor/js/pet.js"></script>
  <script src="../../vendor/js/inventory.js"></script>
  <script src="../../vendor/js/travel-memory.js"></script>
  <script src="../../vendor/js/card-collection.js"></script>
  <script src="../../vendor/js/battle-engine.js"></script>
  <script src="../../vendor/js/card-arena.js"></script>
  <script src="../../vendor/js/card-arena-ui.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', async function () {
      try {
        PetSystem.load();
        await PetSystem.loadPetDB();
        await InventorySystem.loadItemsData();
        InventorySystem.load();
        CardCollection.init();
        const starterIds = PetSystem.getAllSpecies().slice(0, 2).map((pet) => pet.id);
        if (CardCollection.getCollectedIds().length < 2) starterIds.forEach((id) => CardCollection.addCard(id));
        CardArenaUI.openStages();
      } catch (error) {
        console.warn('[card-arena] boot failed', error);
        document.querySelector('.arena-page').insertAdjacentHTML('beforeend', '<p>卡牌训练营加载失败：' + (error && error.message ? error.message : error) + '</p>');
      }
    });
  </script>
</body>
</html>`
  };

  for (const [rel, content] of Object.entries(shells)) {
    const dest = path.join(miniRoot, rel);
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, content, 'utf8');
  }
  return { id: 'shells', fileCount: Object.keys(shells).length, bytes: 0 };
}

function writeCompleteContentManifests() {
  const rootManifestPath = path.join(miniRoot, 'data/manifest.json');
  const rootManifest = readJson(rootManifestPath);
  const games = (rootManifest.games || []).map((game) => ({ ...game, mode: 'complete' }));
  const scenes = readJson(path.join(miniRoot, 'data/scenes.json')).scenes || [];
  const storyManifest = readJson(path.join(miniRoot, 'data/story-packs/05-pixel-worlds-story/manifest.json'));
  const storyTracks = [...(storyManifest.worlds || []), ...(storyManifest.bonusTracks || [])].map((track) => ({
    id: track.id,
    title: track.title,
    subtitle: track.subtitle || '',
    nodeCount: Array.isArray(track.nodes) ? track.nodes.length : 0,
    dataRoot: 'data/story-packs/05-pixel-worlds-story/levels'
  }));
  const classicScenes = scenes.map((scene) => ({
    id: scene.id,
    title: scene.name,
    data: 'data/scenes.json',
    image: scene.image,
    monsterCount: Array.isArray(scene.monsters) ? scene.monsters.length : 0
  }));
  const maps = {
    schemaVersion: 1,
    mode: 'complete',
    classicScenes,
    storyTracks,
    totals: {
      classicScenes: classicScenes.length,
      storyNodes: storyTracks.reduce((sum, track) => sum + track.nodeCount, 0)
    }
  };
  fs.writeFileSync(path.join(miniRoot, 'data/maps-manifest.json'), JSON.stringify(maps, null, 2) + '\n', 'utf8');

  const vocabPacks = [
    ['word-memory-all', 'data/vocab/word-memory-combined/views/all.json', 3322],
    ['core-english', 'data/vocab/core-english/views/core.json', 322],
    ['extension-english', 'data/vocab/extension-english/views/extension.json', 512],
    ['minecraft-english-all', 'data/vocab/english-minecraft/views/all.json', 2168]
  ].filter(([, file]) => fs.existsSync(path.join(miniRoot, file))).map(([id, file, fallbackCount]) => {
    const view = readJson(path.join(miniRoot, file));
    return { id, path: file, cardCount: Array.isArray(view.cards) ? view.cards.length : fallbackCount, mode: 'complete' };
  });
  const content = {
    schemaVersion: 1,
    mode: 'complete',
    sourceProject: '宠物积分系统',
    games,
    maps: {
      manifest: 'data/maps-manifest.json',
      classicScenes: classicScenes.length,
      storyTracks: storyTracks.length,
      storyNodes: maps.totals.storyNodes
    },
    vocab: {
      totalCards: vocabPacks.reduce((sum, pack) => sum + pack.cardCount, 0),
      packs: vocabPacks
    }
  };
  rootManifest.contentMode = 'complete';
  rootManifest.games = games;
  rootManifest.content = {
    maps: [
      { id: 'classic-adventure', title: '经典探险地图', mode: 'complete', count: classicScenes.length },
      { id: 'pixel-worlds-story', title: '三世界故事地图', mode: 'complete', count: maps.totals.storyNodes }
    ],
    vocab: vocabPacks.map((pack) => ({ id: pack.id, mode: 'complete', cardCount: pack.cardCount }))
  };
  fs.writeFileSync(rootManifestPath, JSON.stringify(rootManifest, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(miniRoot, 'data/complete-content-manifest.json'), JSON.stringify(content, null, 2) + '\n', 'utf8');
  return {
    id: 'complete-content-manifests',
    fileCount: 3,
    bytes: [rootManifestPath, path.join(miniRoot, 'data/maps-manifest.json'), path.join(miniRoot, 'data/complete-content-manifest.json')]
      .reduce((sum, file) => sum + fs.statSync(file).size, 0)
  };
}

const results = [];
results.push(importLearningArcade());
results.push(importTypingDefense());
results.push(importWordMemoryMap());
results.push(importSharedData());
results.push(importVocabRuntime());
results.push(importCompleteAdventureRuntime());
results.push(importPixelStoryRuntime());
results.push(patchStandaloneCompleteMode());
results.push(writeShells());
results.push(writeCompleteContentManifests());

const summary = {
  petRoot,
  miniRoot,
  results,
  totalFiles: results.reduce((sum, item) => sum + (item.fileCount || 0), 0),
  totalBytes: results.reduce((sum, item) => sum + (item.bytes || 0), 0)
};
console.log(JSON.stringify(summary, null, 2));
fs.writeFileSync(path.join(miniRoot, 'data/import-report.json'), JSON.stringify(summary, null, 2), 'utf8');
