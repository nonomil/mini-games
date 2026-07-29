import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const manifest = JSON.parse(read('data/manifest.json'));

assert.equal(manifest.schemaVersion, 1);
assert.equal(manifest.projectId, 'mini-games');
assert.equal(manifest.devProjectUrl, 'http://127.0.0.1:7003/');
assert.equal(manifest.projectUrl, 'https://nonomil.github.io/mini-games/');
assert.ok(Array.isArray(manifest.games) && manifest.games.length >= 10);
assert.match(read('index.html'), /<title>小游戏项目<\/title>/);
assert.match(read('index.html'), /data-featured-grid/);
assert.match(read('index.html'), /rel="icon"[^>]+dog_idle\.webp/);
assert.equal((read('index.html').match(/data-playground-category="(all|explore|typing|math|literacy|cards)"/g) || []).length, 6);
assert.match(read('index.html'), /data-sidebar-category="explore"/);
assert.match(read('index.html'), /data-sidebar-category="typing"/);
assert.match(read('index.html'), /data-sidebar-category="math"/);
assert.match(read('app.js'), /target="_blank"/);
assert.match(read('app.js'), /title: '数学冒险'/);
assert.match(read('app.js'), /加法篇、乘法篇、每日随机 PK/);
assert.match(read('bridge.js'), /petbank\.bridge\.v1\.completed/);
assert.match(read('bridge.js'), /petbank\.bridge\.v1\.reward-result/);
assert.doesNotMatch(read('app.js'), /petbank_points/);

for (const game of manifest.games) {
  assert.ok(exists(game.path), `${game.id} entry should exist`);
  assert.ok(
    exists(path.join(game.path, 'game.js')) || exists(path.join(game.path, 'index.html')),
    `${game.id} runtime should have an entry script or HTML shell`
  );
}

const gameIds = new Set(manifest.games.map((game) => game.id));
for (const id of [
  'learning-arcade', 'typing-defense', 'word-memory-map', 'forest-map',
  'explore-map', 'math-pk', 'hanzi', 'card-collection', 'card-arena'
]) {
  assert.ok(gameIds.has(id), `${id} should be in the complete game library`);
}
const mathGame = manifest.games.find((game) => game.id === 'math-pk');
assert.equal(mathGame.title, '数学冒险');
assert.equal(mathGame.kicker, '加法篇 · 乘法篇');
assert.match(mathGame.description, /每日随机 PK/);
assert.ok(exists('data/pets.json'));
assert.ok(exists('data/arena-stages.json'));
assert.ok(exists('data/stories/forest.json'));
assert.ok(exists('assets/cards/composed-v2'));
assert.ok(exists('assets/scenes/forest.webp'));
assert.ok(exists('host/petbank-host-shim.js'));
assert.ok(exists('vendor/css/playground.css'));
assert.ok(exists('vendor/js/exploration.js'));
assert.match(read('games/math-pk/game.js'), /MathAdventureGame\.render\(['"]math-pk-container['"]\)/);
assert.match(read('games/hanzi/index.html'), /HanziGame\.renderUI\(['"]hanzi-container['"]\)/);
assert.match(read('games/forest-map/index.html'), /ExplorationSystem\.loadScenes\(\)/);
assert.match(read('games/forest-map/index.html'), /DOMContentLoaded', async function/);
assert.match(read('games/forest-map/index.html'), /data-minigames-full-content="true"/);
assert.match(read('games/explore-map/index.html'), /data-minigames-full-content="true"/);
assert.match(read('vendor/js/exploration.js'), /isFullContentMode/);
assert.match(read('vendor/js/pixel-story-map.js'), /完整内容已开放/);
assert.equal(manifest.content.maps.find((map) => map.id === 'pixel-worlds-story')?.count, 80);
assert.match(read('games/word-memory-map/game-data.js'), /FULL_CONTENT_MODE/);
assert.match(read('bridge.js'), /legacy|postMessage|completion/i);
assert.match(read('host/petbank-host-shim.js'), /minigames_ported_/);
assert.match(read('vendor/js/exploration.js'), /resolvePetBankAssetUrl\(scene\.image\)/);

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  get length() {
    return this.values.size;
  }

  key(index) {
    return Array.from(this.values.keys())[index] || null;
  }

  getItem(key) {
    return this.values.has(String(key)) ? this.values.get(String(key)) : null;
  }

  setItem(key, value) {
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(String(key));
  }
}

const nativeStorage = new MemoryStorage();
nativeStorage.setItem('petbank_points', 'main-site');
nativeStorage.setItem('main_site_setting', 'main-site');
const storageSandbox = { console, localStorage: nativeStorage };
storageSandbox.window = storageSandbox;
vm.runInNewContext(read('host/petbank-host-shim.js'), storageSandbox);
storageSandbox.localStorage.setItem('petbank_points', 'mini-games');
storageSandbox.localStorage.setItem('minigames_score', '8');
storageSandbox.localStorage.petbank_score = '9';
assert.equal(nativeStorage.getItem('petbank_points'), 'main-site');
assert.equal(nativeStorage.getItem('main_site_setting'), 'main-site');
assert.equal(nativeStorage.getItem('minigames_ported_petbank_points'), 'mini-games');
assert.equal(storageSandbox.localStorage.getItem('petbank_points'), 'mini-games');
assert.equal(storageSandbox.localStorage.getItem('minigames_score'), '8');
assert.equal(nativeStorage.getItem('minigames_ported_petbank_score'), '9');
assert.equal(storageSandbox.localStorage.petbank_score, '9');
assert.deepEqual(Object.keys(storageSandbox.localStorage).sort(), ['minigames_score', 'petbank_points', 'petbank_score'].sort());
storageSandbox.localStorage.clear();
assert.equal(nativeStorage.getItem('petbank_points'), 'main-site');
assert.equal(nativeStorage.getItem('main_site_setting'), 'main-site');
assert.equal(nativeStorage.getItem('minigames_ported_petbank_points'), null);
assert.equal(nativeStorage.getItem('minigames_score'), null);

const hanzi = read('games/hanzi-bubble-runner/game.js');
const pinyin = read('games/pinyin-star-scout/game.js');
assert.match(hanzi, /minigames_hanzi_bubble_runner_best/);
assert.match(hanzi, /projectId:\s*["']mini-games["']/);
assert.match(pinyin, /projectId:\s*["']mini-games["']/);
assert.doesNotMatch(hanzi, /IMAGE_ROOT[^\n]*assets\/ui/);
assert.doesNotMatch(hanzi, /\.\.\/\.\.\/assets\/ui/);
assert.doesNotMatch(hanzi, /\.\.\/\.\.\/assets\/banchong2/);
assert.match(pinyin, /assets\/voice\/map\.json/);
assert.ok(exists('assets/generated/reference/adventure-clean-background-v3.png'));
assert.ok(exists('assets/pet/bianmu.webp'));
assert.ok(exists('games/pinyin-star-scout/assets/voice/map.json'));
assert.ok(fs.readdirSync(path.join(root, 'games/pinyin-star-scout/assets/voice')).filter((name) => name.endsWith('.mp3')).length >= 12);

console.log(`mini games contract passed: ${manifest.games.length} games`);
