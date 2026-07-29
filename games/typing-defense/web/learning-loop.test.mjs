import assert from "node:assert/strict";
import {
  EVENT_TYPES,
  classifyTypingError,
  createLearningStore
} from "./learning-loop.js";

function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    }
  };
}

const clock = { now: 1_700_000_000_000 };
const storage = createMemoryStorage();
const store = createLearningStore(storage, () => clock.now);
const card = { id: "kg-word-cat", target: "cat", translation: "小猫" };

assert.deepEqual(classifyTypingError("cat", "x"), {
  errorTag: "wrong-first-letter",
  errorIndex: 0
});
assert.deepEqual(classifyTypingError("cat", "cax"), {
  errorTag: "wrong-ending",
  errorIndex: 2
});
assert.deepEqual(classifyTypingError("plant", "plx"), {
  errorTag: "wrong-middle-letter",
  errorIndex: 2
});

const session = store.startSession({ mode: "words", vocabId: "kindergarten" });
const presentation = store.present(card, {
  sessionId: session.sessionId,
  presentationId: "presentation-1",
  promptMode: "meaning-to-word"
});
assert.equal(presentation.event.type, EVENT_TYPES.PRESENTED);
const independent = store.recordResult("presentation-1", EVENT_TYPES.INDEPENDENT_CORRECT, {
  elapsedMs: 1200
});
assert.equal(independent.result, "independent-correct");
assert.equal(store.recordResult("presentation-1", EVENT_TYPES.GUIDED_CORRECT).duplicate, true);

const guidedCard = { id: "kg-word-dog", target: "dog", translation: "小狗" };
store.present(guidedCard, {
  sessionId: session.sessionId,
  presentationId: "presentation-2",
  promptMode: "meaning-to-word"
});
store.recordWrong("presentation-2", classifyTypingError(guidedCard.target, "x"));
assert.equal(store.recordCorrect("presentation-2").result, "guided-correct");

const hintedCard = { id: "kg-word-fish", target: "fish", translation: "鱼" };
store.present(hintedCard, {
  sessionId: session.sessionId,
  presentationId: "presentation-4",
  promptMode: "meaning-to-word"
});
assert.equal(store.recordHint("presentation-4", { hintLevel: 1 }).event.type, "hint");
assert.equal(store.recordCorrect("presentation-4").result, "guided-correct");

const skipped = store.present(card, {
  sessionId: session.sessionId,
  presentationId: "presentation-3",
  promptMode: "meaning-to-word"
});
assert.equal(skipped.event.type, EVENT_TYPES.PRESENTED);
store.recordResult("presentation-3", EVENT_TYPES.GAVE_UP, { errorTag: "gave-up" });

const snapshot = store.snapshot();
assert.equal(snapshot.cards["kg-word-cat"].presented, 2);
assert.equal(snapshot.cards["kg-word-cat"].wrong, 0);
assert.equal(snapshot.cards["kg-word-cat"].independentCorrect, 1);
assert.equal(snapshot.cards["kg-word-cat"].gaveUp, 1);
assert.equal(snapshot.cards["kg-word-dog"].wrong, 1);
assert.equal(snapshot.cards["kg-word-dog"].guidedCorrect, 1);
assert.equal(snapshot.cards["kg-word-fish"].guidedCorrect, 1);
assert.equal(snapshot.session.presentations["presentation-4"].hintUsed, 1);
assert.equal(snapshot.session.cardResults.length, 4);
assert.equal(snapshot.session.mistakeCardIds.includes("kg-word-cat"), true);
assert.equal(snapshot.session.mistakeCardIds.includes("kg-word-dog"), true);
assert.equal(snapshot.cards["kg-word-cat"].nextReviewAt > clock.now, true);
assert.equal(snapshot.cards["kg-word-cat"].errorTags.includes("gave-up"), true);

const persisted = JSON.parse(store.serialize());
assert.equal(persisted.version, 1);
assert.equal(persisted.cards["kg-word-cat"].lastResult, "gave-up");
const restored = createLearningStore(storage, () => clock.now);
assert.equal(restored.snapshot().cards["kg-word-dog"].guidedCorrect, 1);
assert.equal(restored.snapshot().session.cardResults.length, 4);

console.log("learning-loop tests passed");
