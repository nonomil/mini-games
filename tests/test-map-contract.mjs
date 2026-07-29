import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data/maps-manifest.json'), 'utf8'));
const allowedNodeTypes = new Set([
  'entry',
  'npc',
  'learn',
  'encounter',
  'activity',
  'resource',
  'checkpoint',
  'portal'
]);
const expectedMapIds = ['forest-farm', 'space-farm', 'alien-farm'];

assert.equal(manifest.explorationSchemaVersion, 1, '探索地图必须声明契约版本');
assert.deepEqual(
  manifest.explorationMaps?.map((map) => map.id),
  expectedMapIds,
  '必须配置森林、太空、外星三张主探索地图'
);

for (const map of manifest.explorationMaps) {
  assert.equal(map.mode, 'complete', `${map.id} 必须保持完整内容模式`);
  assert.equal(map.freeEntry, true, `${map.id} 必须允许自由进入`);
  assert.match(map.routeId, new RegExp(`^${map.id}-`), `${map.id} 必须有稳定 routeId`);
  assert.ok(map.theme && map.resourceType && map.activityIds?.length, `${map.id} 必须声明主题、资源和活动`);
  assert.ok(fs.existsSync(path.join(root, map.background)), `${map.id} 的背景必须存在`);
  assert.ok(Array.isArray(map.nodes) && map.nodes.length >= 6, `${map.id} 必须有可玩的路线节点`);

  const nodeIds = new Set();
  for (const node of map.nodes) {
    assert.equal(node.mapId, map.id, `${map.id} 节点必须回指 mapId`);
    assert.equal(node.routeId, map.routeId, `${map.id} 节点必须回指 routeId`);
    assert.ok(node.nodeId && !nodeIds.has(node.nodeId), `${map.id} 节点 nodeId 必须唯一`);
    nodeIds.add(node.nodeId);
    assert.ok(allowedNodeTypes.has(node.nodeType), `${map.id}/${node.nodeId} 使用了未知 nodeType`);
    assert.ok(Number.isFinite(node.position?.x) && Number.isFinite(node.position?.y), `${map.id}/${node.nodeId} 必须有坐标`);
    assert.ok(node.position.x >= 0 && node.position.x <= 1, `${map.id}/${node.nodeId} x 坐标必须归一化`);
    assert.ok(node.position.y >= 0 && node.position.y <= 1, `${map.id}/${node.nodeId} y 坐标必须归一化`);
    assert.ok(node.cardPolicy && Array.isArray(node.cardPolicy.sources), `${map.id}/${node.nodeId} 必须有 cardPolicy`);
    assert.ok(node.completionPolicy && Number.isInteger(node.completionPolicy.requiredCompleted), `${map.id}/${node.nodeId} 必须有 completionPolicy`);
    if (node.nodeType === 'activity') {
      assert.ok(map.activityIds.includes(node.activityId), `${map.id}/${node.nodeId} 的 activityId 必须已注册`);
    }
  }
}

console.log(`PASS map contract: ${manifest.explorationMaps.length} maps`);
await import('./test-forest-vertical-slice.mjs');
