import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readBuffer = (file) => fs.readFileSync(path.join(root, file));
const wordMapStyles = read('games/word-memory-map/styles.css');
const wordMapGame = read('games/word-memory-map/game.js');
const wordMapData = read('games/word-memory-map/game-data.js');

assert.match(read('host/petbank-host-shim.js'), /MINIGAMES_COMPLETE_CONTENT/);
assert.match(read('vendor/js/card-arena-ui.js'), /MINIGAMES_COMPLETE_CONTENT[\s\S]*return true/,
  '卡牌训练营必须在完整模式下跳过逐关锁定');
assert.match(read('vendor/js/pixel-story-map.js'), /MINIGAMES_COMPLETE_CONTENT[\s\S]*return true/,
  '故事地图必须在完整模式下显示全部节点');
assert.match(read('vendor/js/exploration.js'), /function isFullContentMode[\s\S]*MINIGAMES_COMPLETE_CONTENT/,
  '经典探险地图必须在完整模式下跳过等级和积分锁定');
assert.match(read('vendor/js/card-arena-ui.js'), /MINIGAMES_COMPLETE_CONTENT[\s\S]*DAILY_LIMIT/,
  '独立小游戏不能继承主站每日对战次数限制');
assert.match(read('games/word-memory-map/styles.css'), /\.hero-select-grid\[hidden\][\s\S]*display:\s*none/,
  '单词探险分步弹窗必须隐藏非当前步骤的选择区域');
assert.match(read('games/word-memory-map/styles.css'), /@media\s*\(max-width:\s*720px\)[\s\S]*?\.world-option-grid[\s\S]*?grid-template-columns:\s*repeat\(2/,
  '单词探险移动端地图选择必须使用两列布局');
assert.match(wordMapGame, /function selectOnboardingWorld[\s\S]*?els\.categorySelect\.value\s*=\s*state\.selectedCategory/,
  '选择地图后分类下拉必须同步到该地图词池');
assert.match(wordMapStyles, /\.hero-unit\.is-moving \.hero-sprite\s*\{[^}]*animation:\s*hero-walk-step[^;]*;/s,
  '角色移动时必须保留多帧行走动画');
const heroWalkKeyframes = wordMapStyles.match(/@keyframes hero-walk-step\s*\{[\s\S]*?\n\}/)?.[0] || '';
assert.doesNotMatch(heroWalkKeyframes, /scale\(/,
  '角色多帧行走动画不能通过缩放改变锚点');
assert.match(wordMapStyles, /\.hero-unit\.is-moving \.hero-shadow-image\s*\{[^}]*animation:\s*none;/s,
  '角色移动时脚下阴影不能独立缩放抖动');
assert.match(wordMapStyles, /\.hero-carry-orb\s*\{[^}]*animation:\s*none;/s,
  '主角手里的炸弹不能独立上下抖动');
assert.match(wordMapData, /boy_down_walk_a\.png/,
  '角色行走必须保留第一帧素材');
assert.match(wordMapData, /boy_down_walk_b\.png/,
  '角色行走必须保留第二帧素材');
assert.match(wordMapGame, /const frameSources\s*=\s*heroSprites\[family\]\.walk/,
  '角色行走必须直接播放数据层定义的完整动作序列');
assert.match(wordMapData, /const HERO_WALK_FRAME_COUNT\s*=\s*4/,
  '角色行走必须使用左右脚和两张落地帧组成的四帧循环');
assert.match(wordMapData, /boy_down_walk_contact\.png/,
  '向下行走必须包含身体锚点稳定的落地帧');
assert.match(wordMapData, /boy_up_walk_contact\.png/,
  '向上行走必须包含身体锚点稳定的落地帧');
assert.notDeepEqual(
  readBuffer('games/word-memory-map/assets/generated/hero-boy-assets/boy_down_walk_a.png'),
  readBuffer('games/word-memory-map/assets/generated/hero-boy-assets/boy_down_walk_b.png'),
  '向下行走的两帧素材不能是同一张图片'
);
assert.notDeepEqual(
  readBuffer('games/word-memory-map/assets/generated/hero-boy-assets/boy_up_walk_a.png'),
  readBuffer('games/word-memory-map/assets/generated/hero-boy-assets/boy_up_walk_b.png'),
  '向上行走的两帧素材不能是同一张图片'
);
assert.match(read('games/word-memory-map/game-data.js'), /farm:\s*'\.\/assets\/generated\/world-bg-single\/farm-panorama\.png'/,
  '农场预览图必须对应实际加载的 farm-panorama 地图');
assert.match(read('games/word-memory-map/game-data.js'), /grassland:\s*'\.\/assets\/generated\/world-bg-single\/farm-panorama\.png'/,
  '草原预览图必须对应实际加载的 farm-panorama 地图');
assert.match(read('games/word-memory-map/game-data.js'), /sky:\s*'\.\/assets\/generated\/world-bg-single\/farm-panorama\.png'/,
  '天空预览图必须对应实际加载的 farm-panorama 地图');
assert.match(read('games/word-memory-map/game-data.js'), /alien:\s*'\.\/assets\/generated\/world-bg-single\/space-panorama\.png'/,
  '外星球预览图必须对应实际加载的 space-panorama 地图');
assert.match(read('games/word-memory-map/assets/generated/world-bg-tiles/alien-single-manifest.json'), /"image":\s*"\.\/assets\/generated\/world-bg-single\/space-panorama\.png"/,
  '外星球 manifest 必须使用外星场景背景');

console.log('PASS complete mode runtime contract');
