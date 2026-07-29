import assert from "node:assert/strict";
import {
  normalizeHostInit,
  normalizeLocalTask,
  selectRuntimeCards,
  toTypingTask
} from "./card-runtime.js";
import { EVENT_TYPES, createLearningStore } from "./learning-loop.js";

const hostInit = {
  type: "init",
  protocolVersion: 1,
  sessionId: "core-session-1",
  gameId: "typing-defense",
  cardId: null,
  payload: {
    cards: [
      {
        cardId: "core-english-1-attack",
        word: "attack",
        translation: "攻击",
        image: null,
        audio: null,
        example: "The superhero will attack the villain.",
        domain: "english",
        contentType: "word"
      }
    ]
  }
};

const normalizedHost = normalizeHostInit(hostInit);
assert.equal(normalizedHost.accepted, true);
assert.equal(normalizedHost.mode, "host");
assert.deepEqual(normalizedHost.cards[0], {
  cardId: "core-english-1-attack",
  word: "attack",
  translation: "攻击",
  image: null,
  audio: null,
  example: "The superhero will attack the villain.",
  domain: "english",
  contentType: "word"
});
assert.equal(toTypingTask(normalizedHost.cards[0]).id, "core-english-1-attack");
assert.equal(toTypingTask(normalizedHost.cards[0]).target, "attack");

const rejectedHost = normalizeHostInit({
  ...hostInit,
  payload: { cards: [{ word: "attack" }] }
});
assert.equal(rejectedHost.accepted, false);
assert.equal(rejectedHost.cards.length, 0);

const local = normalizeLocalTask(
  { id: "local-cat", target: "cat", translation: "小猫", hint: "小猫 cat" },
  { vocabId: "kindergarten", defaultDomain: "english", defaultContentType: "word" }
);
assert.equal(local.cardId, "local-cat");
assert.equal(local.domain, "english");
assert.equal(local.contentType, "word");

const standalone = selectRuntimeCards({ hostCards: [], localCards: [local] });
assert.equal(standalone.mode, "standalone");
assert.equal(standalone.cards[0].cardId, "local-cat");

const hostPriority = selectRuntimeCards({ hostCards: normalizedHost.cards, localCards: [local] });
assert.equal(hostPriority.mode, "host");
assert.deepEqual(hostPriority.cards, normalizedHost.cards);

const storage = {
  data: "",
  getItem() { return this.data || null; },
  setItem(_key, value) { this.data = value; }
};
const learning = createLearningStore(storage, () => 1_700_000_000_000);
learning.startSession({ mode: hostPriority.mode, vocabId: "host" });
learning.present(normalizedHost.cards[0], {
  sessionId: "typing-session",
  presentationId: "host-presentation"
});
learning.recordResult("host-presentation", EVENT_TYPES.INDEPENDENT_CORRECT, { score: 9999 });
const persisted = learning.snapshot();
assert.equal(persisted.cards["core-english-1-attack"].independentCorrect, 1);
assert.equal("mastery" in persisted.cards["core-english-1-attack"], false);
assert.equal(storage.data.includes("9999"), false);

console.log("card-runtime tests passed");
