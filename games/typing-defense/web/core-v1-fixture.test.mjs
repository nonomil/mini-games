import assert from "node:assert/strict";
import {
  CORE_V1_MESSAGE_TYPES,
  CORE_V1_PROTOCOL_VERSION,
  createCreeperCoreV1Fixture
} from "./core-v1-fixture.mjs";

const localCards = [
  {
    cardId: "local-cat",
    word: "cat",
    translation: "小猫",
    domain: "english",
    contentType: "word"
  }
];
const hostInit = {
  type: "init",
  protocolVersion: 1,
  sessionId: "creeper-host-session",
  gameId: "typing-defense",
  cardId: null,
  payload: {
    cards: [
      {
        cardId: "host-attack",
        word: "attack",
        translation: "攻击",
        domain: "english",
        contentType: "word"
      }
    ]
  }
};

assert.deepEqual(CORE_V1_MESSAGE_TYPES, [
  "ready",
  "init",
  "card-result",
  "complete",
  "stop",
  "error"
]);
assert.equal(CORE_V1_PROTOCOL_VERSION, 1);

const standalone = createCreeperCoreV1Fixture({
  sessionId: "creeper-local-session",
  localCards
});
assert.equal(standalone.fixtureOnly, true);
assert.equal(standalone.getState().mode, "standalone");
assert.deepEqual(standalone.getState().cardIds, ["local-cat"]);
const standaloneReady = standalone.ready();
assert.equal(standaloneReady.type, "ready");
assert.deepEqual(standaloneReady.payload, {}, "ready payload must remain CORE-neutral");
assert.equal(standalone.ready(), null, "ready must be idempotent");
assert.equal(standalone.cardResult({ cardId: "local-cat", correct: true }).type, "card-result");
assert.equal(standalone.cardResult({ cardId: "local-cat", correct: true }), null,
  "one card may emit at most one result");
assert.equal(standalone.complete({ score: 10 }).type, "complete");
assert.equal(standalone.complete({ score: 10 }), null, "complete must be idempotent");
assert.equal(standalone.getState().phase, "complete");

const host = createCreeperCoreV1Fixture({
  sessionId: "creeper-host-session",
  localCards
});
assert.equal(host.getState().mode, "standalone", "host mode is selected only after valid init");
assert.deepEqual(host.ready().payload, {});
assert.equal(host.acceptInit({ ...hostInit, sessionId: "other-session" }), null,
  "init from another session must be rejected");
assert.equal(host.getState().mode, "standalone");
const initMessage = host.acceptInit(hostInit);
assert.equal(initMessage.type, "init");
assert.equal(host.getState().mode, "host");
assert.deepEqual(host.getState().cardIds, ["host-attack"]);
assert.equal(host.acceptInit(hostInit), null, "init must not replace an active host session");
const hostResult = host.cardResult({
  cardId: "host-attack",
  correct: false,
  learningEvidence: "wrong",
  wrongTag: "wrong-middle-letter"
});
assert.equal(hostResult.type, "card-result");
assert.equal(hostResult.cardId, "host-attack");
assert.equal(hostResult.payload.domain, "english");
assert.equal(host.cardResult({ cardId: "local-cat", correct: true }), null,
  "host mode must reject local cards");
assert.equal(host.error({ code: "wrong-answer", message: "answer is incorrect" }).type, "error");
assert.equal(host.complete({ resultCount: 1 }).type, "complete");

const beforeReady = createCreeperCoreV1Fixture({ sessionId: "creeper-before-ready" });
assert.equal(beforeReady.error({ code: "not-ready", message: "fixture is not ready" }), null,
  "error must not precede ready");

const stopped = createCreeperCoreV1Fixture({
  sessionId: "creeper-stop-session",
  localCards
});
let cleanupCount = 0;
assert.equal(stopped.registerCleanup(() => { cleanupCount += 1; }), true);
assert.equal(stopped.registerCleanup(() => { throw new Error("cleanup failure"); }), true);
stopped.ready();
const stopMessage = stopped.stop({ reason: "user" });
assert.equal(stopMessage.type, "stop");
assert.equal(stopped.getState().phase, "stopped");
assert.equal(cleanupCount, 1, "stop must run registered cleanup once");
assert.equal(stopped.stop(), null, "stop must be idempotent");
assert.equal(cleanupCount, 1, "repeated stop must not rerun cleanup");
assert.equal(stopped.registerCleanup(() => { cleanupCount += 1; }), false,
  "stopped fixture must reject new cleanup");
assert.equal(stopped.cardResult({ cardId: "local-cat", correct: true }), null);
assert.equal(stopped.complete(), null);
assert.equal(stopped.error({ code: "late-error", message: "ignored" }), null);

for (const message of standalone.messages.concat(host.messages, stopped.messages)) {
  assert.deepEqual(Object.keys(message).sort(), [
    "cardId",
    "gameId",
    "payload",
    "protocolVersion",
    "sessionId",
    "type"
  ]);
  assert.equal(message.protocolVersion, 1);
  assert.equal(message.gameId, "typing-defense");
}

console.log("creeper CORE v1 fixture tests passed");
