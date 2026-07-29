import assert from "node:assert/strict";
import {
  buildCorrectFeedback,
  buildErrorFeedback,
  buildGiveUpFeedback,
  buildHintFeedback,
  speakTextSafely
} from "./feedback-runtime.js";

const first = buildErrorFeedback({
  errorTag: "wrong-first-letter",
  errorIndex: 0,
  answer: "cat",
  typed: "x",
  wrongCount: 1
});
assert.equal(first.title, "首字母不对");
assert.match(first.message, /第 1 个字母不对/);
assert.match(first.message, /答案：cat/);
assert.equal(first.retryLabel, "重试本题");

const middle = buildErrorFeedback({
  errorTag: "wrong-middle-letter",
  errorIndex: 2,
  answer: "plant",
  typed: "plx",
  wrongCount: 1
});
assert.equal(middle.title, "中间字母不对");
assert.match(middle.message, /第 3 个字母不对/);
assert.equal(middle.expectedLetter, "a");

const ending = buildErrorFeedback({
  errorTag: "wrong-ending",
  errorIndex: 2,
  answer: "cat",
  typed: "cax",
  wrongCount: 2
});
assert.equal(ending.title, "结尾字母不对");
assert.match(ending.message, /再试一次/);

const hint = buildHintFeedback({ answer: "cat", typed: "c", hintUsed: 1 });
assert.equal(hint.kind, "hint");
assert.match(hint.message, /下一位.*A/i);
assert.equal(hint.hintUsed, 1);

const guided = buildCorrectFeedback({ result: "guided-correct", answer: "cat" });
assert.equal(guided.title, "提示后答对");
assert.match(guided.message, /提示/);

const skipped = buildGiveUpFeedback({ reason: "gave-up", answer: "cat" });
assert.equal(skipped.errorTag, "gave-up");
assert.match(skipped.message, /已换题/);

const timeout = buildGiveUpFeedback({ reason: "timeout", answer: "cat" });
assert.equal(timeout.errorTag, "slow-completion");
assert.match(timeout.message, /时间到/);

assert.deepEqual(speakTextSafely("cat", {
  speechSynthesis: null,
  SpeechSynthesisUtterance: null
}), { supported: false, spoken: false });

let spokenText = "";
class FakeUtterance {
  constructor(text) {
    spokenText = text;
  }
}
const speechResult = speakTextSafely("cat", {
  speechSynthesis: { speak() {} },
  SpeechSynthesisUtterance: FakeUtterance
});
assert.deepEqual(speechResult, { supported: true, spoken: true });
assert.equal(spokenText, "cat");

const brokenSpeech = speakTextSafely("cat", {
  speechSynthesis: { speak() { throw new Error("blocked"); } },
  SpeechSynthesisUtterance: FakeUtterance
});
assert.deepEqual(brokenSpeech, { supported: true, spoken: false });

console.log("feedback-runtime tests passed");
