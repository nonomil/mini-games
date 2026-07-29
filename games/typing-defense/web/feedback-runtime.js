const ERROR_COPY = Object.freeze({
  "wrong-first-letter": {
    title: "首字母不对",
    detail: "先看第一个字母，再慢一点输入。"
  },
  "wrong-middle-letter": {
    title: "中间字母不对",
    detail: "前面的字母保留，检查中间这一位。"
  },
  "wrong-ending": {
    title: "结尾字母不对",
    detail: "前面已经接近了，再检查最后一位。"
  }
});

function clean(value) {
  return String(value || "").trim();
}

export function buildErrorFeedback({
  errorTag = "wrong-middle-letter",
  errorIndex = 0,
  answer = "",
  typed = "",
  wrongCount = 1
} = {}) {
  const normalizedAnswer = clean(answer).toLowerCase();
  const normalizedTyped = clean(typed).toLowerCase();
  const copy = ERROR_COPY[errorTag] || ERROR_COPY["wrong-middle-letter"];
  const position = Math.max(1, Number(errorIndex) + 1);
  const expectedLetter = normalizedAnswer[position - 1] || "";
  const retryText = Number(wrongCount) > 1 ? "再试一次。" : "保留已对的前缀，慢一点再试。";
  return {
    kind: "error",
    tone: "danger",
    errorTag,
    title: copy.title,
    message: `${copy.detail} 第 ${position} 个字母不对。答案：${normalizedAnswer || "请再听一遍"} ${retryText}`,
    answer: normalizedAnswer,
    typed: normalizedTyped,
    expectedLetter,
    position,
    wrongCount: Math.max(1, Number(wrongCount) || 1),
    showAnswer: true,
    retryLabel: "重试本题",
    action: "retry",
    speakText: normalizedAnswer
  };
}

export function buildRetryFeedback({ answer = "", wrongCount = 0, hintUsed = 0 } = {}) {
  const normalizedAnswer = clean(answer).toLowerCase();
  const guided = Number(hintUsed) > 0 || Number(wrongCount) > 0;
  return {
    kind: "retry",
    tone: "calm",
    title: "重试本题",
    message: guided
      ? "原题保留，放慢一点再输入；这次答对会记为提示后答对。"
      : "原题保留，放慢一点再输入。",
    answer: normalizedAnswer,
    showAnswer: false,
    retryLabel: "重试本题",
    action: "retry",
    speakText: normalizedAnswer
  };
}

export function buildHintFeedback({ answer = "", typed = "", hintUsed = 1 } = {}) {
  const normalizedAnswer = clean(answer).toLowerCase();
  const normalizedTyped = clean(typed).toLowerCase();
  const nextIndex = Math.min(normalizedTyped.length, Math.max(0, normalizedAnswer.length - 1));
  const expectedLetter = normalizedAnswer[nextIndex] || "";
  return {
    kind: "hint",
    tone: "hint",
    title: "提示",
    message: expectedLetter
      ? `下一位是 ${expectedLetter.toUpperCase()}，继续输入。`
      : "看一看答案，再试一次。",
    answer: normalizedAnswer,
    expectedLetter,
    hintUsed: Math.max(1, Number(hintUsed) || 1),
    showAnswer: false,
    action: "none",
    speakText: normalizedAnswer
  };
}

export function buildCorrectFeedback({ result = "independent-correct", answer = "" } = {}) {
  const normalizedAnswer = clean(answer).toLowerCase();
  const guided = result === "guided-correct";
  return {
    kind: guided ? "guided-correct" : "correct",
    tone: "success",
    title: guided ? "提示后答对" : "答对啦",
    message: guided
      ? "这次用了提示，已经完成；这张卡还会继续复习。"
      : "独立输入正确，继续保持。",
    answer: normalizedAnswer,
    showAnswer: false,
    action: "none",
    speakText: normalizedAnswer
  };
}

export function buildGiveUpFeedback({ reason = "gave-up", answer = "" } = {}) {
  const normalizedAnswer = clean(answer).toLowerCase();
  const timedOut = reason === "timeout" || reason === "slow-completion";
  return {
    kind: timedOut ? "timeout" : "gave-up",
    tone: "warning",
    errorTag: timedOut ? "slow-completion" : "gave-up",
    title: timedOut ? "时间到" : "已换题",
    message: timedOut
      ? `时间到，答案是 ${normalizedAnswer || "请再听一遍"}，这张卡已加入复习。`
      : `已换题，答案是 ${normalizedAnswer || "请再听一遍"}，这张卡已加入复习。`,
    answer: normalizedAnswer,
    showAnswer: true,
    retryLabel: "重试本题",
    action: "none",
    speakText: normalizedAnswer
  };
}

export function speakTextSafely(text, options = {}) {
  const value = clean(text);
  const speechSynthesis = options.speechSynthesis
    ?? (typeof window !== "undefined" ? window.speechSynthesis : null);
  const SpeechSynthesisUtterance = options.SpeechSynthesisUtterance
    ?? (typeof window !== "undefined" ? window.SpeechSynthesisUtterance : null);
  if (!value || !speechSynthesis || typeof speechSynthesis.speak !== "function" || typeof SpeechSynthesisUtterance !== "function") {
    return { supported: false, spoken: false };
  }
  try {
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = options.lang || "en-US";
    utterance.rate = Number(options.rate) || 0.88;
    utterance.pitch = Number(options.pitch) || 1;
    speechSynthesis.speak(utterance);
    return { supported: true, spoken: true };
  } catch {
    return { supported: true, spoken: false };
  }
}
