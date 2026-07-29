import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/maps-manifest.json'), 'utf8'));
const sessionSource = fs.readFileSync(path.join(root, 'games/explore-map/exploration-session.js'), 'utf8');
const routeSource = fs.readFileSync(path.join(root, 'games/explore-map/forest-route.js'), 'utf8');
const exploreHtml = fs.readFileSync(path.join(root, 'games/explore-map/index.html'), 'utf8');
const wordMapHtml = fs.readFileSync(path.join(root, 'games/word-memory-map/index.html'), 'utf8');
const wordMapGame = fs.readFileSync(path.join(root, 'games/word-memory-map/game.js'), 'utf8');
const wordMapStyles = fs.readFileSync(path.join(root, 'games/word-memory-map/styles.css'), 'utf8');
const context = { URL, URLSearchParams };
vm.runInNewContext(sessionSource, context, { filename: 'exploration-session.js' });
vm.runInNewContext(routeSource, context, { filename: 'forest-route.js' });

const routeApi = context.ForestRoute;
assert.ok(routeApi, '森林垂直切片必须暴露 ForestRoute');
assert.match(exploreHtml, /id="forestRouteHost"/, '探索地图页面必须挂载森林路线');
assert.match(exploreHtml, /forest-route\.js/, '探索地图页面必须加载森林路线控制器');
assert.equal((exploreHtml.match(/forest-route\.js/g) || []).length, 1, '森林路线控制器只能加载一次');
assert.match(wordMapHtml, /id="returnToExploreButton"/, '单词活动必须提供返回探索地图入口');
assert.match(wordMapGame, /function returnToExploreMap/, '单词活动必须实现上下文返回');
assert.match(exploreHtml, /#page-explore\s*\{[\s\S]*?min-width:\s*0[\s\S]*?max-width:\s*100%[\s\S]*?overflow-x:\s*hidden/, '探索地图页面根容器必须限制横向溢出');
assert.match(exploreHtml, /#pixelStoryMapHost\s*\{[\s\S]*?min-width:\s*0[\s\S]*?max-width:\s*100%[\s\S]*?overflow-x:\s*hidden/, '故事地图宿主必须允许在窄视口收缩');
assert.match(exploreHtml, /#page-explore\s+\.pixel-story-shell\s*\{[\s\S]*?box-sizing:\s*border-box[\s\S]*?max-width:\s*100%/, '故事壳必须把内边距计入最大宽度');
assert.match(wordMapStyles, /\.finish-modal\s*\{[\s\S]*?overflow-y:\s*auto/, '完成页容器必须允许在短视口滚动');
assert.match(wordMapStyles, /\.finish-card\s*\{[\s\S]*?max-height:\s*calc\(100vh - 24px\)[\s\S]*?overflow-y:\s*auto/, '完成卡必须限制高度并允许访问底部返回按钮');

const initial = routeApi.createState(manifest);
assert.equal(initial.mapId, 'forest-farm');
assert.equal(initial.routeId, 'forest-farm-main-v1');
assert.equal(initial.currentNodeId, 'forest-entry', '首次进入森林必须落在入口节点');
assert.deepEqual(JSON.parse(JSON.stringify(routeApi.visibleNodes(manifest, initial))), [
  'entry', 'npc', 'learn', 'encounter', 'activity', 'resource', 'checkpoint', 'portal'
]);

const selected = routeApi.selectNode(manifest, initial, 'forest-explorer-03');
assert.equal(selected.currentNodeId, 'forest-explorer-03', '选择活动节点必须更新当前节点');
assert.equal(selected.currentTaskId, 'forest-word-explorer');

const launch = routeApi.buildActivityLaunch(manifest, selected, {
  baseUrl: 'http://localhost/games/explore-map/',
  activityBaseUrl: '../word-memory-map/?vocab=all'
});
assert.equal(launch.activityId, 'word-memory-map');
assert.equal(launch.returnContext.mapId, 'forest-farm');
assert.equal(launch.returnContext.routeId, 'forest-farm-main-v1');
assert.equal(launch.returnContext.nodeId, 'forest-explorer-03');
assert.equal(launch.returnContext.taskId, 'forest-word-explorer');
assert.deepEqual(JSON.parse(JSON.stringify(launch.returnContext.completedNodeIds)), []);
assert.equal(launch.returnContext.returnUrl, 'http://localhost/games/explore-map/?mapId=forest-farm');
assert.match(launch.url, /word-memory-map/);
assert.match(launch.url, /returnContext=/);

const restored = routeApi.restoreState(manifest, launch.returnContext);
assert.equal(restored.currentNodeId, 'forest-explorer-03', '活动返回必须恢复原节点');
assert.equal(restored.currentTaskId, 'forest-word-explorer');
assert.deepEqual(JSON.parse(JSON.stringify(restored.completedNodeIds)), []);

console.log('PASS forest vertical slice contract');
