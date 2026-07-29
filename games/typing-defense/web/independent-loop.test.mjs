import assert from "node:assert/strict";
import {
  buildIndependentReviewQueue,
  summarizeIndependentSession
} from "./independent-loop.js";

const tasks = [
  { cardId: "cat", target: "cat" },
  { cardId: "dog", target: "dog" },
  { cardId: "cat", target: "cat", source: "duplicate" },
  { cardId: "fox", target: "fox" }
];

const snapshot = {
  session: {
    mistakeCardIds: ["dog", "missing", "cat", "dog"],
    presentations: {
      p1: { hintUsed: 1 },
      p2: { hintUsed: 0 },
      p3: { hintUsed: 2 }
    },
    cardResults: [
      { result: "independent-correct" },
      { result: "guided-correct" },
      { result: "gave-up" }
    ]
  },
  cards: {
    dog: { cardId: "dog", target: "dog" },
    cat: { cardId: "cat", target: "cat" }
  }
};

assert.deepEqual(
  buildIndependentReviewQueue(tasks, snapshot).map((task) => task.cardId),
  ["dog", "cat"]
);
assert.deepEqual(
  buildIndependentReviewQueue(tasks, snapshot, { limit: 1 }).map((task) => task.cardId),
  ["dog"]
);
assert.deepEqual(buildIndependentReviewQueue(tasks, { session: null }), []);

assert.deepEqual(summarizeIndependentSession(snapshot), {
  presented: 3,
  completed: 3,
  independentCorrect: 1,
  guidedCorrect: 1,
  gaveUp: 1,
  hintCount: 3,
  firstAnswerRate: 33,
  mistakeCardIds: ["dog", "missing", "cat"]
});

console.log("independent-loop tests passed");
