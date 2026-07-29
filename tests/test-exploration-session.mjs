import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'games/explore-map/exploration-session.js'), 'utf8');
const context = {};
vm.runInNewContext(source, context, { filename: 'exploration-session.js' });
const sessionApi = context.ExplorationSession;
assert.ok(sessionApi, '探索会话模块必须暴露 ExplorationSession');

const storage = {
  values: new Map(),
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; },
  setItem(key, value) { this.values.set(key, value); },
  removeItem(key) { this.values.delete(key); }
};

const session = sessionApi.createSession({
  sessionId: 'explore-session-test',
  profileId: 'profile-child-1',
  mapId: 'forest-farm',
  routeId: 'forest-main-route-v1',
  currentNodeId: 'forest-learn-01',
  currentTaskId: 'forest-learn-words',
  completedNodeIds: ['forest-entry'],
  learningSessionIds: ['card-session-1'],
  unclaimedReceiptIds: ['receipt-1']
});

assert.deepEqual(Array.from(session.completedNodeIds), ['forest-entry']);
assert.deepEqual(Array.from(session.learningSessionIds), ['card-session-1']);
assert.deepEqual(Array.from(session.unclaimedReceiptIds), ['receipt-1']);
sessionApi.saveSession(session, storage);
assert.deepEqual(JSON.parse(JSON.stringify(sessionApi.loadSession(storage))), JSON.parse(JSON.stringify(session)), '会话保存后必须可恢复');

const updated = sessionApi.updateSession({
  currentNodeId: 'forest-creek-02',
  completedNodeIds: ['forest-entry', 'forest-learn-01'],
  remainingCardIds: ['card-2', 'card-3']
}, storage);
assert.equal(updated.currentNodeId, 'forest-creek-02');
assert.deepEqual(Array.from(updated.remainingCardIds), ['card-2', 'card-3']);

const returnContext = sessionApi.createReturnContext(updated, { activityId: 'word-memory-map' });
assert.deepEqual(JSON.parse(JSON.stringify(returnContext)), {
  activityId: 'word-memory-map',
  mapId: 'forest-farm',
  routeId: 'forest-main-route-v1',
  nodeId: 'forest-creek-02',
  taskId: 'forest-learn-words',
  completedNodeIds: ['forest-entry', 'forest-learn-01'],
  learningSessionIds: ['card-session-1'],
  unclaimedReceiptIds: ['receipt-1'],
  remainingCardIds: ['card-2', 'card-3']
});

const encoded = sessionApi.encodeReturnContext(returnContext);
assert.deepEqual(JSON.parse(JSON.stringify(sessionApi.decodeReturnContext(encoded))), JSON.parse(JSON.stringify(returnContext)), 'returnContext 必须可安全编解码');

storage.setItem(sessionApi.STORAGE_KEY, '{broken json');
assert.equal(sessionApi.loadSession(storage), null, '损坏会话不能阻塞地图启动');

console.log('PASS exploration session contract');
