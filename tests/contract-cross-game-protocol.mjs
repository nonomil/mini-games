import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const exists = (file) => fs.existsSync(path.join(root, file));

const schema = readJson('host/game-manifest.schema.json');
const protocol = read('host/mini-game-host-protocol.md');
const bridge = read('bridge.js');
const shim = read('host/petbank-host-shim.js');
const manifestFiles = [
  'host/manifests/typing-defense.game-manifest.json',
  'host/manifests/word-shooter.game-manifest.json',
  'host/manifests/pinyin-racer.game-manifest.json'
];

assert.equal(schema.properties.schemaVersion.const, 1, '清单 schema 必须是 v1 草案');
assert.equal(schema.properties.protocolVersion.const, 1, '清单 schema 必须声明协议版本');
assert.match(protocol, /ready/);
assert.match(protocol, /init/);
assert.match(protocol, /card-result/);
assert.match(protocol, /complete/);
assert.match(protocol, /stop/);
assert.match(protocol, /error/);
for (const field of ['protocolVersion', 'sessionId', 'gameId', 'cardId']) {
  assert.match(protocol, new RegExp(`\\b${field}\\b`), `协议文档必须定义 ${field}`);
}
for (const legacyType of ['petbank\\.bridge\\.v1\\.completed', 'petbank\\.bridge\\.v1\\.reward-result']) {
  assert.match(bridge, new RegExp(legacyType), `bridge 必须保留 ${legacyType}`);
}
for (const shimContract of ['MINIGAMES_COMPLETE_CONTENT', 'minigames_ported_', 'GameRewardReceipts', 'MiniGamesHost']) {
  assert.match(shim, new RegExp(shimContract), `shim 必须保留 ${shimContract}`);
}
assert.match(read('games/typing-defense/web/game.js'), /petbank-typing-defense/);
assert.match(read('games/learning-arcade/game.js'), /petbank-learning-arcade/);
assert.match(read('games/word-memory-map/game-data.js'), /petbank-word-memory-map/);

const manifests = manifestFiles.map((file) => {
  assert.ok(exists(file), `${file} 必须存在`);
  return readJson(file);
});

for (const manifest of manifests) {
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.protocolVersion, 1);
  assert.match(manifest.gameId, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(manifest.title);
  assert.ok(manifest.entry);
  assert.ok(exists(manifest.entry), `${manifest.gameId} entry 必须存在`);
  assert.ok(manifest.domains?.length, `${manifest.gameId} 必须声明 domain`);
  assert.ok(manifest.capabilities?.includes('standalone'), `${manifest.gameId} 必须保留独立模式`);
  assert.ok(manifest.capabilities?.includes('host'), `${manifest.gameId} 必须声明宿主模式`);
  assert.deepEqual(manifest.cardSchema.required, ['cardId']);
  assert.deepEqual(manifest.cardSchema.optional, [
    'word', 'translation', 'image', 'audio', 'example', 'domain', 'contentType'
  ]);
  assert.equal(manifest.cardSchema.unknownFields, 'ignore');
  assert.equal(manifest.cardSchema.missingOptional, 'null');
  assert.equal(manifest.cardSchema.preserveCardId, true);
}

const typingDefense = manifests.find((manifest) => manifest.gameId === 'typing-defense');
assert.equal(typingDefense.legacy.source, 'petbank-typing-defense');
assert.equal(typingDefense.legacy.messageKind, 'result');

const wordShooter = manifests.find((manifest) => manifest.gameId === 'word-shooter');
assert.equal(wordShooter.runtime.hostId, 'learning-arcade');
assert.equal(wordShooter.runtime.mode, 'word-shooter');
assert.equal(wordShooter.legacy.source, 'petbank-learning-arcade');

const pinyinRacer = manifests.find((manifest) => manifest.gameId === 'pinyin-racer');
assert.equal(pinyinRacer.runtime.hostId, 'learning-arcade');
assert.equal(pinyinRacer.runtime.mode, 'word-cannon');
assert.equal(pinyinRacer.legacy.source, 'petbank-learning-arcade');

console.log(`PASS cross-game protocol contract: ${manifests.length} manifests`);
