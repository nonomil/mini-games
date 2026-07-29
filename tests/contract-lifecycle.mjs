import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { V1_FIXTURE } from './fixtures/contract-v1-fixture.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const assertFixtureMessage = (actual, expected) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected);

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

class TestCustomEvent {
  constructor(type, init = {}) {
    this.type = type;
    this.detail = init.detail;
  }
}

function createBridgeSandbox({ hash = '#petbankLaunch=legacy-launch&petbankProfile=profile-1&petbankSession=session-1&petbankGameId=word-shooter', sessionStorage = new MemoryStorage() } = {}) {
  const sent = [];
  const listeners = new Map();
  const timers = new Map();
  const clearedTimers = [];
  let nextTimerId = 1;
  const opener = {
    postMessage(data, targetOrigin) {
      sent.push({ data, targetOrigin });
    }
  };
  const window = {
    location: {
      hash,
      origin: 'https://games.test',
      href: 'https://games.test/games/word-shooter/index.html'
    },
    opener,
    parent: null,
    sessionStorage,
    addEventListener(type, listener) {
      const current = listeners.get(type) || [];
      current.push(listener);
      listeners.set(type, current);
    },
    removeEventListener(type, listener) {
      const current = listeners.get(type) || [];
      listeners.set(type, current.filter((candidate) => candidate !== listener));
    },
    setTimeout(callback, delay) {
      const id = nextTimerId++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) {
      if (timers.delete(id)) clearedTimers.push(id);
    },
    dispatchEvent(event) {
      (listeners.get(event.type) || []).forEach((listener) => listener(event));
      return true;
    },
    CustomEvent: TestCustomEvent
  };
  window.parent = window;
  window.window = window;
  const sandbox = {
    console,
    document: { referrer: 'https://host.test/launch' },
    window,
    CustomEvent: TestCustomEvent,
    sessionStorage,
    setTimeout: window.setTimeout,
    clearTimeout: window.clearTimeout,
    URL,
    URLSearchParams,
    Date,
    Map,
    Set
  };
  vm.runInNewContext(read('bridge.js'), sandbox);
  return {
    bridge: window.MiniGamesBridge,
    window,
    opener,
    sessionStorage,
    sent,
    timers,
    clearedTimers,
    listenerCount(type) {
      return (listeners.get(type) || []).length;
    },
    runTimers() {
      const pending = Array.from(timers.entries());
      pending.forEach(([id, timer]) => {
        timers.delete(id);
        timer.callback();
      });
    },
    dispatchMessage(data, origin = 'https://host.test') {
      window.dispatchEvent({ type: 'message', origin, source: opener, data });
    },
    dispatchMessageFrom(data, source = opener, origin = 'https://host.test') {
      window.dispatchEvent({ type: 'message', origin, source, data });
    }
  };
}

function initializeSession(harness) {
  assert.equal(harness.bridge.ready({ sessionId: 'session-1', gameId: 'word-shooter' }), true);
  harness.dispatchMessage({
    type: 'init',
    protocolVersion: 1,
    sessionId: 'session-1',
    gameId: 'word-shooter',
    cardId: 'card-1',
    payload: {
      card: {
        cardId: 'card-1',
        word: 'attack',
        translation: '攻击'
      }
    }
  });
assert.equal(harness.bridge.getProtocolState().phase, 'initialized');
}

const lifecycle = createBridgeSandbox();
initializeSession(lifecycle);
assert.equal(lifecycle.bridge.error({
  code: 'wrong-answer',
  message: 'answer is incorrect',
  payload: { attempt: 1 }
}), true);
const errorMessage = lifecycle.sent.find(({ data }) => data.type === 'error').data;
assert.equal(errorMessage.protocolVersion, 1);
assert.equal(errorMessage.sessionId, 'session-1');
assert.equal(errorMessage.gameId, 'word-shooter');
assert.equal(errorMessage.cardId, null);
assert.equal(errorMessage.payload.code, 'wrong-answer');
assert.equal(errorMessage.payload.message, 'answer is incorrect');
assert.equal(errorMessage.payload.attempt, 1);
assert.equal(lifecycle.bridge.reportCardResult({ cardId: 'card-1', payload: { correct: true } }), true);
assert.equal(lifecycle.bridge.reportCardResult({ payload: { correct: true } }), false,
  '缺少 cardId 的 card-result 必须拒绝');
assert.equal(lifecycle.bridge.reportCardResult({ cardId: 'card-1', payload: { correct: true } }), false,
  '同一 sessionId + cardId 只能接受一次 card-result');
assert.equal(lifecycle.sent.filter(({ data }) => data.type === 'card-result').length, 1);
assert.equal(lifecycle.bridge.complete({ payload: { score: 10 } }), true);
assert.equal(lifecycle.bridge.complete({ payload: { score: 10 } }), false,
  'complete 只能发送一次');
assert.equal(lifecycle.sent.filter(({ data }) => data.type === 'complete').length, 1);

const explicitSession = createBridgeSandbox({ hash: '#petbankLaunch=legacy-launch&petbankProfile=profile-1&petbankGameId=word-shooter' });
assert.equal(explicitSession.bridge.ready({ sessionId: 'new-session', gameId: 'word-shooter' }), true,
  '新协议 sessionId 必须优先使用显式 session，不得继承旧 launchId');

const stopped = createBridgeSandbox();
initializeSession(stopped);
let cleanupCalls = 0;
stopped.bridge.registerCleanup(() => { cleanupCalls += 1; });
assert.equal(stopped.bridge.armTimeout(1000), true);
assert.equal(stopped.listenerCount('message'), 1);
assert.equal(stopped.bridge.stop(), true);
assert.equal(cleanupCalls, 1, 'stop 必须运行 bridge cleanup');
assert.equal(stopped.timers.size, 0, 'stop 必须清理 timeout');
assert.equal(stopped.clearedTimers.length, 1, 'stop 必须调用 clearTimeout');
assert.equal(stopped.listenerCount('message'), 0, 'stop 必须移除 message listener');
assert.equal(stopped.bridge.reportCardResult({ payload: { correct: true } }), false,
  'stop 后不得继续提交 card-result');
assert.equal(stopped.bridge.complete(), false, 'stop 后不得提交 complete');
assert.equal(stopped.bridge.error({ code: 'late-error' }), false, 'stop 后不得提交 error');
assert.equal(stopped.bridge.stop(), false, 'stop 只能处理一次');
const stoppedRefresh = createBridgeSandbox({ sessionStorage: stopped.sessionStorage });
assert.equal(stoppedRefresh.bridge.getProtocolState().stopped, true, '刷新必须恢复 stop 终态');
assert.equal(stoppedRefresh.listenerCount('message'), 0, '恢复 stop 终态不得重新挂载 message listener');

const legacy = createBridgeSandbox();
assert.equal(legacy.bridge.reportActivity({
  activityId: 'typing-defense',
  completionId: 'legacy-completion-1',
  score: 8,
  stars: 2
}), true);
assert.equal(legacy.sent.at(-1).data.type, 'petbank.bridge.v1.completed');
assert.equal(legacy.bridge.reportActivity({
  activityId: 'typing-defense',
  completionId: 'legacy-completion-1',
  score: 8,
  stars: 2
}), false, '旧 bridge completion 也必须保持重复抑制');

const secure = createBridgeSandbox();
secure.dispatchMessage({
  type: 'init',
  protocolVersion: 1,
  sessionId: 'session-1',
  gameId: 'word-shooter',
  cardId: 'card-1',
  payload: {}
}, 'https://evil.test');
assert.equal(secure.bridge.getProtocolState().phase, 'idle', '未知 origin 不得接受 init');
secure.dispatchMessage({
  type: 'init',
  protocolVersion: 1,
  sessionId: 'other-session',
  gameId: 'word-shooter',
  cardId: 'card-1',
  payload: {}
});
assert.equal(secure.bridge.getProtocolState().phase, 'idle', '错误 session 不得接受 init');
secure.dispatchMessage({
  type: 'init',
  protocolVersion: 1,
  sessionId: 'session-1',
  gameId: 'word-shooter',
  cardId: 'card-1',
  payload: { card: { cardId: 'card-1' } }
}, 'https://games.test');
assert.equal(secure.bridge.getProtocolState().phase, 'idle', 'referrer origin 之外的 origin 不得接受 init');
secure.dispatchMessageFrom({
  type: 'init',
  protocolVersion: 1,
  sessionId: 'session-1',
  gameId: 'word-shooter',
  cardId: 'card-1',
  payload: { card: { cardId: 'card-1' } }
}, {}, 'https://host.test');
assert.equal(secure.bridge.getProtocolState().phase, 'idle', '未知 source 不得接受 init');
secure.dispatchMessage({
  type: 'init',
  protocolVersion: 1,
  sessionId: 'session-1',
  gameId: 'word-shooter',
  cardId: 'card-1',
  payload: { card: { cardId: 'different-card' } }
});
assert.equal(secure.bridge.getProtocolState().phase, 'idle', 'card payload 身份不一致不得接受 init');
secure.dispatchMessage({
  type: 'init',
  protocolVersion: 1,
  sessionId: 'session-1',
  gameId: 'different-game',
  cardId: 'card-1',
  payload: { card: { cardId: 'card-1' } }
});
assert.equal(secure.bridge.getProtocolState().phase, 'idle', '错误 gameId 不得接受 init');
const typed = createBridgeSandbox({ hash: '#petbankLaunch=legacy-launch&petbankProfile=profile-1' });
typed.dispatchMessage({
  type: 'init',
  protocolVersion: 1,
  sessionId: 'session-1',
  gameId: 'word-shooter',
  cardId: 1,
  payload: { card: { cardId: 1 } }
});
assert.equal(typed.bridge.getProtocolState().phase, 'idle', '非字符串 cardId 不得接受 init');

const cards = createBridgeSandbox();
initializeSession(cards);
assert.equal(cards.bridge.reportCardResult({ cardId: 'unknown-card', payload: { correct: true } }), false,
  '未知 cardId 必须拒绝');
cards.dispatchMessage({
  type: 'init',
  protocolVersion: 1,
  sessionId: 'session-1',
  gameId: 'word-shooter',
  cardId: 'card-2',
  payload: { card: { cardId: 'card-2', word: 'break' } }
});
assert.equal(cards.bridge.getProtocolState().cardId, 'card-2');
assert.equal(cards.bridge.reportCardResult({ cardId: 'card-1', payload: { correct: true } }), false,
  '过期 cardId 必须拒绝');
assert.equal(cards.bridge.reportCardResult({ cardId: 'card-2', payload: { correct: true } }), true);

const recoveryStorage = new MemoryStorage();
const recoveryHash = '#petbankLaunch=legacy-launch&petbankProfile=profile-1';
const beforeRefresh = createBridgeSandbox({ hash: recoveryHash, sessionStorage: recoveryStorage });
initializeSession(beforeRefresh);
assert.equal(beforeRefresh.bridge.reportCardResult({ cardId: 'card-1', payload: { correct: true } }), true);
const afterRefresh = createBridgeSandbox({ hash: recoveryHash, sessionStorage: recoveryStorage });
assert.equal(afterRefresh.bridge.getProtocolState().sessionId, 'session-1', '刷新必须恢复 sessionId');
assert.equal(afterRefresh.bridge.getProtocolState().cardId, 'card-1', '刷新必须恢复 cardId');
assert.equal(afterRefresh.bridge.getProtocolState().resultCount, 1, '刷新必须恢复幂等结果记录');
initializeSession(afterRefresh);
assert.equal(afterRefresh.bridge.reportCardResult({ cardId: 'card-1', payload: { correct: true } }), false,
  '刷新后同卡结果不得重复提交');
assert.equal(afterRefresh.bridge.complete({ payload: { score: 10 } }), true);
const afterCompleteRefresh = createBridgeSandbox({ sessionStorage: recoveryStorage });
assert.equal(afterCompleteRefresh.bridge.complete(), false, '刷新后 complete 仍必须幂等');
assert.equal(afterCompleteRefresh.bridge.ready({ sessionId: 'session-1', gameId: 'word-shooter' }), false,
  '已完成 session 刷新后不得重新 ready');

const timeout = createBridgeSandbox();
initializeSession(timeout);
assert.equal(timeout.bridge.armTimeout(1000), true);
assert.equal(timeout.bridge.armTimeout(1000), false, '同一 session 只能设置一个活动 timeout');
timeout.runTimers();
const timeoutError = timeout.sent.find(({ data }) => data.type === 'error').data;
assert.equal(timeoutError.payload.code, 'timeout');
assert.equal(timeout.bridge.getProtocolState().timedOut, true);
assert.equal(timeout.bridge.reportCardResult({ cardId: 'card-1', payload: { correct: true } }), false,
  'timeout 后不得提交结果');
assert.equal(timeout.bridge.complete(), false, 'timeout 后不得 complete');

const hostSandbox = {
  console,
  localStorage: new MemoryStorage(),
  setTimeout,
  clearTimeout
};
hostSandbox.window = hostSandbox;
vm.runInNewContext(read('host/petbank-host-shim.js'), hostSandbox);
let hostCleanupCalls = 0;
hostSandbox.MiniGamesHost.registerCleanup(() => { hostCleanupCalls += 1; });
assert.equal(hostSandbox.MiniGamesHost.cleanup(), 1);
assert.equal(hostCleanupCalls, 1);
assert.equal(hostSandbox.MiniGamesHost.cleanup(), 0);

const fixtureHash = `#petbankLaunch=${V1_FIXTURE.legacy.launchId}`
  + `&petbankProfile=${V1_FIXTURE.legacy.profileRef}`
  + `&petbankSession=${V1_FIXTURE.identity.sessionId}`
  + `&petbankGameId=${V1_FIXTURE.identity.gameId}`;
const fixtureHarness = createBridgeSandbox({ hash: fixtureHash });
assert.equal(fixtureHarness.bridge.ready(V1_FIXTURE.api.ready), true);
assertFixtureMessage(fixtureHarness.sent.at(-1).data, V1_FIXTURE.messages.ready);
fixtureHarness.dispatchMessage(V1_FIXTURE.messages.init);
assert.equal(fixtureHarness.bridge.getProtocolState().phase, 'initialized');
assert.equal(fixtureHarness.bridge.reportCardResult(V1_FIXTURE.api.cardResult), true);
assertFixtureMessage(fixtureHarness.sent.at(-1).data, V1_FIXTURE.messages.cardResult);
assert.equal(fixtureHarness.bridge.error(V1_FIXTURE.api.error), true);
assertFixtureMessage(fixtureHarness.sent.at(-1).data, V1_FIXTURE.messages.error);
assert.equal(fixtureHarness.bridge.complete(V1_FIXTURE.api.complete), true);
assertFixtureMessage(fixtureHarness.sent.at(-1).data, V1_FIXTURE.messages.complete);
assert.equal(fixtureHarness.bridge.stop(), true);
assertFixtureMessage(fixtureHarness.sent.at(-1).data, V1_FIXTURE.messages.stop);

const fixtureRecoveryStorage = new MemoryStorage();
const fixtureBeforeRefresh = createBridgeSandbox({
  hash: `#petbankLaunch=${V1_FIXTURE.legacy.launchId}&petbankProfile=${V1_FIXTURE.legacy.profileRef}`,
  sessionStorage: fixtureRecoveryStorage
});
assert.equal(fixtureBeforeRefresh.bridge.ready(V1_FIXTURE.api.ready), true);
fixtureBeforeRefresh.dispatchMessage(V1_FIXTURE.messages.init);
assert.equal(fixtureBeforeRefresh.bridge.reportCardResult(V1_FIXTURE.api.cardResult), true);
assert.deepEqual(JSON.parse(fixtureRecoveryStorage.getItem(V1_FIXTURE.recovery.storageKey)), V1_FIXTURE.recovery.state);
const fixtureAfterRefresh = createBridgeSandbox({
  hash: `#petbankLaunch=${V1_FIXTURE.legacy.launchId}&petbankProfile=${V1_FIXTURE.legacy.profileRef}`,
  sessionStorage: fixtureRecoveryStorage
});
assert.equal(fixtureAfterRefresh.bridge.getProtocolState().sessionId, V1_FIXTURE.identity.sessionId);
assert.equal(fixtureAfterRefresh.bridge.getProtocolState().cardId, V1_FIXTURE.card.cardId);
assert.equal(fixtureAfterRefresh.bridge.getProtocolState().resultCount, 1);

const fixtureTimeout = createBridgeSandbox({ hash: fixtureHash });
assert.equal(fixtureTimeout.bridge.ready(V1_FIXTURE.api.ready), true);
fixtureTimeout.dispatchMessage(V1_FIXTURE.messages.init);
assert.equal(fixtureTimeout.bridge.armTimeout(V1_FIXTURE.timeout.milliseconds, V1_FIXTURE.timeout.input), true);
assert.equal(fixtureTimeout.bridge.armTimeout(V1_FIXTURE.timeout.milliseconds, V1_FIXTURE.timeout.input), false);
fixtureTimeout.runTimers();
assertFixtureMessage(fixtureTimeout.sent.at(-1).data, V1_FIXTURE.messages.timeoutError);
assert.equal(fixtureTimeout.bridge.complete(), false);

const fixtureStopCleanup = createBridgeSandbox({ hash: fixtureHash });
assert.equal(fixtureStopCleanup.bridge.ready(V1_FIXTURE.api.ready), true);
fixtureStopCleanup.dispatchMessage(V1_FIXTURE.messages.init);
let fixtureCleanupCalls = 0;
fixtureStopCleanup.bridge.registerCleanup(() => { fixtureCleanupCalls += 1; });
assert.equal(fixtureStopCleanup.bridge.armTimeout(V1_FIXTURE.timeout.milliseconds), true);
assert.equal(fixtureStopCleanup.bridge.stop(), true);
assert.equal(fixtureCleanupCalls, 1);
assert.equal(fixtureStopCleanup.timers.size, 0);
assert.equal(fixtureStopCleanup.listenerCount('message'), 0);

const fixtureLegacy = createBridgeSandbox({
  hash: `#petbankLaunch=${V1_FIXTURE.legacy.launchId}&petbankProfile=${V1_FIXTURE.legacy.profileRef}`
});
assert.equal(fixtureLegacy.bridge.reportActivity(V1_FIXTURE.legacy.activity), true);
assertFixtureMessage(fixtureLegacy.sent.at(-1).data, V1_FIXTURE.legacy.completed);

console.log('PASS lifecycle contract');
