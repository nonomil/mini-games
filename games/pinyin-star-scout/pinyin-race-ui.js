import { advanceTrack } from './pinyin-track.js';
import { createConfiguredPinyinTrack } from './pinyin-track-config.js';
import { createPinyinCanvasRenderer } from './pinyin-renderer.js';
import { getPinyinRacePhase } from './pinyin-race-phase.js';

const TRACK_ROUTE_ID = 'learning-loop';
const DEFAULT_SPEED = 148;
const LEARNING_MODES = new Set(['running', 'paused', 'slowed']);

function clampLane(value) {
  return Math.max(0, Math.min(2, Math.round(Number(value) || 0)));
}

function laneForFood(food, index) {
  if (Number.isInteger(Number(food?.lane))) return clampLane(food.lane);
  if (Number.isFinite(Number(food?.x))) return clampLane(Math.floor(Number(food.x) / 4));
  return index % 3;
}

function runtimeLearningSnapshot(scoutState = {}) {
  return scoutState.learning?.runtime || scoutState.learning || {};
}

export function getPinyinRaceLearningState(scoutState = {}) {
  const runtime = runtimeLearningSnapshot(scoutState);
  const clock = runtime.learningClock || {};
  const routePaused = scoutState.awaitingRoute === true
    || ['answer', 'branch', 'review'].includes(String(scoutState.routePhase || ''));
  const mode = routePaused
    ? 'paused'
    : LEARNING_MODES.has(String(clock.mode))
      ? String(clock.mode)
      : runtime.status === 'paused'
        ? 'paused'
        : 'running';
  const multiplier = mode === 'paused'
    ? 0
    : mode === 'slowed'
      ? Math.min(1, Math.max(0.05, Number(clock.multiplier) || 0.5))
      : 1;
  const reason = routePaused
    ? String(clock.reason || (scoutState.routePhase === 'review' ? 'review' : 'reading'))
    : clock.reason ? String(clock.reason) : null;
  return { mode, reason, multiplier };
}

export function getPinyinRaceStepDistance({ elapsedMs = 0, speed = DEFAULT_SPEED, learningState } = {}) {
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  const baseSpeed = Math.max(0, Number(speed) || 0);
  const multiplier = Math.max(0, Number(learningState?.multiplier ?? 1) || 0);
  return baseSpeed * elapsed / 1000 * multiplier;
}

export function buildPinyinRaceSnapshot({
  track,
  scoutState = {},
  lane = 1,
  speed = DEFAULT_SPEED,
  lap = 1,
  raceStartedAt = null,
  finishAt = null,
  reducedMotion = false
} = {}) {
  if (!track) throw new TypeError('A pinyin track is required for the race bridge');
  const learningClock = getPinyinRaceLearningState(scoutState);
  const cameraDistance = Number(track.cameraDistance) || 0;
  const foods = Array.isArray(scoutState.foods) ? scoutState.foods : [];
  const targets = foods.map((food, index) => ({
    cardId: `pinyin:race:${Number(scoutState.targetIndex) || 0}:${index}`,
    distance: Math.min(track.totalLength, cameraDistance + 116 + index * 68),
    lane: laneForFood(food, index),
    label: String(food?.label || '')
  }));
  return {
    status: learningClock.mode === 'paused' ? 'paused' : scoutState.status || 'running',
    learningClock,
    score: Number(scoutState.score) || 0,
    lap: Math.max(1, Math.floor(Number(lap) || 1)),
    raceStartedAt: raceStartedAt === null || raceStartedAt === undefined
      ? null
      : Number.isFinite(Number(raceStartedAt)) ? Number(raceStartedAt) : null,
    finishAt: finishAt === null || finishAt === undefined
      ? null
      : Number.isFinite(Number(finishAt)) ? Number(finishAt) : null,
    reducedMotion: reducedMotion === true,
    track,
    vehicle: { distance: cameraDistance, lane: clampLane(lane) },
    targets,
    metrics: { speed: { current: Math.max(0, Number(speed) || 0) * learningClock.multiplier } },
    sampleCount: 24,
    viewDistance: 660
  };
}

function initPinyinRaceCanvas() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  const canvas = document.getElementById('raceCanvas');
  if (!canvas) return null;
  const stage = canvas.closest('.board-stage');
  const context = canvas.getContext('2d');
  if (!context) return null;

  const renderer = createPinyinCanvasRenderer({ canvas, context, width: 640, height: 360 });
  let track = createConfiguredPinyinTrack(TRACK_ROUTE_ID);
  let lap = 1;
  let lane = 1;
  let scoutState = window.PinyinStarScout?.getState?.() || {};
  let lastFrameAt = null;
  let frameId = null;
  let paused = false;
  let lastNow = 0;
  let raceStartedAt = 0;
  let finishAt = null;
  let raceClockPausedAt = null;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

  function readScoutState() {
    const nextState = window.PinyinStarScout?.getState?.();
    if (nextState && typeof nextState === 'object') scoutState = nextState;
  }

  function render(now = lastNow) {
    readScoutState();
    const learningClock = getPinyinRaceLearningState(scoutState);
    const snapshot = buildPinyinRaceSnapshot({
      track,
      scoutState,
      lane,
      lap,
      raceStartedAt,
      finishAt,
      reducedMotion
    });
    if (paused) {
      snapshot.status = 'paused';
      snapshot.learningClock = { mode: 'paused', reason: 'manual', multiplier: 0 };
      snapshot.metrics.speed.current = 0;
    }
    renderer.render(snapshot, { now });
    canvas.dataset.cameraDistance = String(Math.round(track.cameraDistance));
    canvas.dataset.lane = String(lane);
    canvas.dataset.learningMode = learningClock.mode;
    canvas.dataset.learningReason = learningClock.reason || '';
    canvas.dataset.speedMultiplier = String(learningClock.multiplier);
    canvas.dataset.paused = String(paused || learningClock.mode === 'paused');
  }

  function syncRaceClock(now, learningClock) {
    const isPaused = paused || learningClock.mode === 'paused';
    if (isPaused && raceClockPausedAt === null) {
      raceClockPausedAt = now;
    } else if (!isPaused && raceClockPausedAt !== null) {
      raceStartedAt += Math.max(0, now - raceClockPausedAt);
      raceClockPausedAt = null;
    }
  }

  function resetLap(now) {
    lap += 1;
    track = createConfiguredPinyinTrack(TRACK_ROUTE_ID);
    finishAt = now;
    lastFrameAt = null;
  }

  function step(timestamp) {
    frameId = null;
    readScoutState();
    const now = Number(timestamp);
    lastNow = Number.isFinite(now) ? now : lastNow + 16;
    if (lastFrameAt === null) lastFrameAt = lastNow;
    const elapsed = Math.min(70, Math.max(0, lastNow - lastFrameAt));
    lastFrameAt = lastNow;
    const learningClock = getPinyinRaceLearningState(scoutState);
    syncRaceClock(lastNow, learningClock);
    const racePhase = getPinyinRacePhase({
      now: lastNow,
      startedAt: raceStartedAt,
      finishAt,
      manualPaused: paused,
      learningClock
    });
    if (!paused && !reducedMotion && learningClock.mode !== 'paused' && racePhase.phase === 'racing') {
      track = advanceTrack(track, getPinyinRaceStepDistance({
        elapsedMs: elapsed,
        speed: DEFAULT_SPEED,
        learningState: learningClock
      }));
      if (track.cameraDistance >= track.totalLength) resetLap(lastNow);
    }
    render(lastNow);
    frameId = window.requestAnimationFrame(step);
  }

  function setLane(nextLane) {
    lane = clampLane(nextLane);
    render(lastNow);
    return lane;
  }

  function moveLane(delta) {
    return setLane(lane + Number(delta || 0));
  }

  function pause() {
    paused = true;
    raceClockPausedAt = lastNow;
    lastFrameAt = null;
    canvas.dataset.paused = 'true';
  }

  function resume() {
    paused = false;
    lastFrameAt = null;
    canvas.dataset.paused = 'false';
    render(lastNow);
  }

  function resize() {
    const width = stage?.clientWidth || canvas.clientWidth || 640;
    renderer.resize({ width });
    render(lastNow);
  }

  const onKeyDown = (event) => {
    const key = String(event.key || '').toLowerCase();
    if (key === 'arrowleft' || key === 'a' || key === 'j') {
      event.preventDefault();
      moveLane(-1);
    } else if (key === 'arrowright' || key === 'd' || key === 'l') {
      event.preventDefault();
      moveLane(1);
    }
  };

  const leftButton = document.getElementById('laneLeftButton');
  const rightButton = document.getElementById('laneRightButton');
  const onLeftClick = () => moveLane(-1);
  const onRightClick = () => moveLane(1);

  document.addEventListener('keydown', onKeyDown);
  leftButton?.addEventListener('click', onLeftClick);
  rightButton?.addEventListener('click', onRightClick);
  window.addEventListener('pinyin-scout-state', (event) => {
    if (event.detail && typeof event.detail === 'object') scoutState = event.detail;
    render(lastNow);
  });
  window.addEventListener('resize', resize);
  if (typeof ResizeObserver === 'function' && stage) {
    new ResizeObserver(resize).observe(stage);
  }

  render(0);
  resize();
  frameId = window.requestAnimationFrame(step);
  window.PinyinRaceCanvas = Object.freeze({
    getSnapshot: () => buildPinyinRaceSnapshot({
      track,
      scoutState,
      lane,
      lap,
      raceStartedAt,
      finishAt,
      reducedMotion
    }),
    getLane: () => lane,
    setLane,
    moveLane,
    pause,
    resume,
    destroy: () => {
      if (frameId !== null) window.cancelAnimationFrame(frameId);
      document.removeEventListener('keydown', onKeyDown);
      leftButton?.removeEventListener('click', onLeftClick);
      rightButton?.removeEventListener('click', onRightClick);
      window.removeEventListener('resize', resize);
    }
  });
  return window.PinyinRaceCanvas;
}

initPinyinRaceCanvas();
