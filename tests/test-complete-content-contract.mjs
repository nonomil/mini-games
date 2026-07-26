import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const exists = (file) => fs.existsSync(path.join(root, file));

const manifest = readJson('data/manifest.json');
assert.equal(manifest.contentMode, 'complete', '小游戏项目必须声明完整内容模式');
assert.ok(manifest.content?.maps?.length >= 2, '完整目录必须声明至少两套地图内容');
assert.ok(manifest.content?.vocab?.length >= 3, '完整目录必须声明全量词库包');
assert.ok(manifest.content?.vocab?.every((pack) => pack.mode === 'complete'), '词库包不得带阶段解锁模式');

const maps = readJson('data/maps-manifest.json');
assert.equal(maps.mode, 'complete');
assert.ok(maps.classicScenes?.length >= 10, '经典探险场景必须完整导入');
assert.ok(maps.storyTracks?.length >= 3, '像素故事地图必须包含三大世界');
assert.ok(maps.classicScenes.every((scene) => exists(scene.data)), '经典场景数据必须存在');
assert.ok(maps.storyTracks.every((track) => track.nodeCount >= 5), '故事地图必须包含章节节点');

const content = readJson('data/complete-content-manifest.json');
assert.equal(content.mode, 'complete');
assert.ok(content.vocab.totalCards >= 3000, '完整词库运行卡片必须超过单词远征阶段规模');
assert.ok(content.vocab.packs.every((pack) => exists(pack.path)), '每个完整词库运行文件必须发布');
assert.ok(content.games.every((game) => game.mode === 'complete'), '小游戏入口不能使用 staged 模式');

const allVocab = content.vocab.packs.find((pack) => pack.id === 'word-memory-all');
assert.ok(allVocab, '必须发布单词地图使用的全量词卡');
assert.ok(allVocab.cardCount >= 3000, '全量词卡不能退化为阶段词卡');

const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
assert.doesNotMatch(source, /stage|unlock|staged/i, '小游戏大厅不得复制单词远征阶段锁定逻辑');

console.log(`PASS complete content contract: ${content.vocab.totalCards} cards`);
