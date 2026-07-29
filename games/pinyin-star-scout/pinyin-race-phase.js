export const PINYIN_RACE_PHASES = Object.freeze({
  COUNTDOWN: 'countdown',
  RACING: 'racing',
  PAUSED: 'paused',
  FINISH: 'finish'
});

export const PINYIN_START_COUNTDOWN_MS = 3000;
export const PINYIN_FINISH_FEEDBACK_MS = 1500;

const COUNTDOWN_BEAT_MS = 700;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function finiteOr(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function pausedLabel(reason) {
  return reason === 'review' ? '复习暂停' : '赛道暂停';
}

export function getPinyinRacePhase({
  now = 0,
  startedAt = null,
  finishAt = null,
  manualPaused = false,
  learningClock = {}
} = {}) {
  const currentTime = Math.max(0, finiteOr(now));
  const reason = String(learningClock.reason || '');
  if (manualPaused || learningClock.mode === 'paused') {
    return {
      phase: PINYIN_RACE_PHASES.PAUSED,
      label: pausedLabel(reason),
      countdown: null,
      progress: 0,
      active: false,
      elapsedMs: 0
    };
  }

  const finishTime = finishAt === null || finishAt === undefined ? NaN : Number(finishAt);
  const finishElapsed = currentTime - finishTime;
  if (Number.isFinite(finishTime) && finishElapsed >= 0 && finishElapsed < PINYIN_FINISH_FEEDBACK_MS) {
    return {
      phase: PINYIN_RACE_PHASES.FINISH,
      label: '冲线!',
      countdown: null,
      progress: clamp(finishElapsed / PINYIN_FINISH_FEEDBACK_MS, 0, 1),
      active: false,
      elapsedMs: finishElapsed
    };
  }

  const startTime = startedAt === null || startedAt === undefined ? NaN : Number(startedAt);
  const raceElapsed = currentTime - startTime;
  if (Number.isFinite(startTime) && raceElapsed >= 0 && raceElapsed < PINYIN_START_COUNTDOWN_MS) {
    const beat = Math.min(3, Math.floor(raceElapsed / COUNTDOWN_BEAT_MS));
    const countdown = beat < 3 ? 3 - beat : 0;
    return {
      phase: PINYIN_RACE_PHASES.COUNTDOWN,
      label: countdown ? String(countdown) : 'GO!',
      countdown,
      progress: clamp(raceElapsed / PINYIN_START_COUNTDOWN_MS, 0, 1),
      active: countdown === 0,
      elapsedMs: raceElapsed
    };
  }

  return {
    phase: PINYIN_RACE_PHASES.RACING,
    label: '冲刺中',
    countdown: null,
    progress: 1,
    active: true,
    elapsedMs: Math.max(0, raceElapsed)
  };
}
