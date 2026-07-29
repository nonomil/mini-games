export const PINYIN_LEARNING_MODES = Object.freeze({
  RUNNING: 'running',
  PAUSED: 'paused',
  SLOWED: 'slowed'
});

export const PINYIN_LEARNING_REASONS = Object.freeze({
  MANUAL: 'manual',
  READING: 'reading',
  PLAYBACK: 'playback',
  HINT: 'hint',
  REVIEW: 'review',
  COLLISION: 'collision'
});

function positiveNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function updateTimeBucket(bucket, value) {
  const amount = positiveNumber(value);
  return {
    last: amount,
    total: bucket.total + amount,
    count: bucket.count + (amount > 0 ? 1 : 0)
  };
}

export function createLearningClock() {
  return {
    mode: PINYIN_LEARNING_MODES.RUNNING,
    reason: null,
    multiplier: 1,
    wallMs: 0,
    simulationMs: 0
  };
}

export function setLearningClock(clock, { mode = PINYIN_LEARNING_MODES.RUNNING, reason = null, multiplier = 1 } = {}) {
  if (!Object.values(PINYIN_LEARNING_MODES).includes(mode)) {
    throw new TypeError(`Unknown pinyin learning clock mode: ${mode}`);
  }
  const safeMultiplier = mode === PINYIN_LEARNING_MODES.PAUSED
    ? 0
    : mode === PINYIN_LEARNING_MODES.SLOWED
      ? Math.min(1, Math.max(0.05, positiveNumber(multiplier, 0.5)))
      : 1;
  return {
    ...clock,
    mode,
    reason: reason ? String(reason) : null,
    multiplier: safeMultiplier
  };
}

export function advanceLearningClock(clock, { wallMs = 0 } = {}) {
  const elapsed = positiveNumber(wallMs);
  return {
    ...clock,
    wallMs: clock.wallMs + elapsed,
    simulationMs: clock.simulationMs + elapsed * clock.multiplier
  };
}

export function createPinyinLearningMetrics() {
  return {
    reactionMs: { last: 0, total: 0, count: 0 },
    responseWindowMs: { last: 0, total: 0, count: 0 },
    speed: { current: 0, last: 0, distance: 0 },
    correctness: { attempts: 0, correct: 0, wrong: 0, missed: 0 },
    hint: { used: 0 },
    review: { queued: 0, attempts: 0, correct: 0, wrong: 0 },
    collision: { count: 0 }
  };
}

export function recordPinyinAnswerMetrics(metrics, {
  correct = false,
  errorTag = null,
  reactionMs = 0,
  responseWindowMs = 0,
  speed = 0,
  hintUsed = false
} = {}) {
  const missed = errorTag === 'missed-card';
  return {
    ...metrics,
    reactionMs: updateTimeBucket(metrics.reactionMs, reactionMs),
    responseWindowMs: updateTimeBucket(metrics.responseWindowMs, responseWindowMs),
    speed: {
      current: positiveNumber(speed),
      last: positiveNumber(speed),
      distance: metrics.speed.distance
    },
    correctness: {
      attempts: metrics.correctness.attempts + 1,
      correct: metrics.correctness.correct + (correct ? 1 : 0),
      wrong: metrics.correctness.wrong + (!correct && !missed ? 1 : 0),
      missed: metrics.correctness.missed + (missed ? 1 : 0)
    },
    hint: {
      used: metrics.hint.used + (hintUsed ? 1 : 0)
    }
  };
}

export function recordPinyinReviewMetrics(metrics, {
  correct = false,
  reactionMs = 0,
  responseWindowMs = 0,
  speed = 0
} = {}) {
  return {
    ...metrics,
    reactionMs: updateTimeBucket(metrics.reactionMs, reactionMs),
    responseWindowMs: updateTimeBucket(metrics.responseWindowMs, responseWindowMs),
    speed: {
      current: positiveNumber(speed),
      last: positiveNumber(speed),
      distance: metrics.speed.distance
    },
    review: {
      ...metrics.review,
      attempts: metrics.review.attempts + 1,
      correct: metrics.review.correct + (correct ? 1 : 0),
      wrong: metrics.review.wrong + (correct ? 0 : 1)
    }
  };
}

export function recordPinyinCollisionMetrics(metrics) {
  return {
    ...metrics,
    collision: { count: metrics.collision.count + 1 }
  };
}

export function enqueuePinyinReview(queue, entry) {
  if (queue.some((item) => item.cardId === entry.cardId)) return queue;
  return [...queue, { ...entry, attempts: 0 }];
}
