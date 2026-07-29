import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { PINYIN_CARD_DATA } from '../games/pinyin-star-scout/pinyin-data.js';
import { createConfiguredPinyinTrack } from '../games/pinyin-star-scout/pinyin-track-config.js';
import { advanceTrack } from '../games/pinyin-star-scout/pinyin-track.js';
import {
  createPinyinCanvasRenderer,
  getPinyinRaceRenderModel,
  getPinyinRaceCompetition
} from '../games/pinyin-star-scout/pinyin-renderer.js';
import {
  buildPinyinRaceSnapshot,
  getPinyinRaceLearningState,
  getPinyinRaceStepDistance
} from '../games/pinyin-star-scout/pinyin-race-ui.js';
import {
  PINYIN_FINISH_FEEDBACK_MS,
  PINYIN_START_COUNTDOWN_MS,
  getPinyinRacePhase
} from '../games/pinyin-star-scout/pinyin-race-phase.js';

const pinyinEntryScript = readFileSync(new URL('../games/pinyin-star-scout/game.js', import.meta.url), 'utf8');
assert.match(pinyinEntryScript, /raceCanvas/, 'legacy feedback effects must anchor to the racing canvas');

const track = createConfiguredPinyinTrack('learning-loop');
const card = PINYIN_CARD_DATA[0];
const snapshot = {
  status: 'running',
  track,
  vehicle: { distance: 0, lane: 1 },
  targets: [{ cardId: card.cardId, distance: 110, lane: 1, label: card.pinyinDisplay }],
  metrics: { speed: { current: 120 } }
};

const model = getPinyinRaceRenderModel(snapshot, {
  now: 640,
  width: 640,
  height: 360,
  sampleCount: 12,
  viewDistance: 520
});

assert.equal(model.roadSegments.length, 11, 'race frame must expose contiguous road polygons');
assert.equal(model.vehicle.lane, 1);
assert.ok(model.vehicle.bob > 0, 'moving vehicle must have a visible suspension bob');
assert.ok(model.vehicle.lean > 0, 'vehicle pose must react to current motion');
assert.ok(model.targets[0].y < model.vehicle.y, 'target card must project ahead of the vehicle');
assert.ok(model.stripePhase > 0 && model.stripePhase < 1, 'road stripe phase must scroll continuously');
assert.equal(model.horizonY, 0.33, 'race frame must keep a stable horizon for perspective');
assert.ok(model.roadSegments.some((segment) => segment.featureVisible), 'landmarks must enter the road as distinct signs');
assert.ok(
  model.roadSegments.filter((segment) => segment.stripeVisible).length < model.roadSegments.length / 2,
  'lane markings must be short dashes instead of continuous lines'
);
assert.equal(model.telemetry.status, 'racing', 'running frames must expose a racing telemetry state');
assert.equal(model.telemetry.speed, 120);
assert.equal(model.telemetry.lap, 1);
const competition = getPinyinRaceCompetition(snapshot, { now: 640 });
assert.equal(competition.rivals.length, 2, 'race frame must include two deterministic rival cars');
assert.ok(competition.rivals.every((rival) => Number.isInteger(rival.lane)), 'rivals must stay in lanes');
assert.ok(competition.rivals.every((rival) => rival.progress >= 0 && rival.progress <= 1));
assert.ok(competition.playerProgress >= 0 && competition.playerProgress <= 1);
assert.ok(competition.rivals.some((rival) => rival.distance > snapshot.track.cameraDistance), 'at least one rival must be visible ahead');
assert.equal(model.rivals.length, 2);
assert.equal(model.competition.rivals.length, 2);

const reducedMotionStart = getPinyinRaceRenderModel({
  ...snapshot,
  raceStartedAt: -PINYIN_START_COUNTDOWN_MS,
  reducedMotion: true
}, { now: 640, sampleCount: 12, viewDistance: 520 });
const reducedMotionLater = getPinyinRaceRenderModel({
  ...snapshot,
  raceStartedAt: -PINYIN_START_COUNTDOWN_MS,
  reducedMotion: true
}, { now: 1_640, sampleCount: 12, viewDistance: 520 });
assert.equal(reducedMotionStart.speed, 0, 'reduced motion must not advertise moving speed');
assert.equal(reducedMotionStart.stripePhase, reducedMotionLater.stripePhase, 'reduced motion must freeze road stripes');
assert.deepEqual(
  reducedMotionStart.rivals.map((rival) => Math.round(rival.distance)),
  reducedMotionLater.rivals.map((rival) => Math.round(rival.distance)),
  'reduced motion must freeze rival drift'
);

const countdownSnapshot = {
  ...snapshot,
  raceStartedAt: 0
};
assert.equal(
  getPinyinRacePhase({ now: 200, startedAt: countdownSnapshot.raceStartedAt }).label,
  '3',
  'race start must show the first countdown beat'
);
assert.equal(
  getPinyinRacePhase({ now: 1_500, startedAt: countdownSnapshot.raceStartedAt }).label,
  '1',
  'race countdown must progress through numbered beats'
);
const goPhase = getPinyinRacePhase({
  now: PINYIN_START_COUNTDOWN_MS - 100,
  startedAt: countdownSnapshot.raceStartedAt
});
assert.equal(goPhase.label, 'GO!');
assert.equal(goPhase.active, true, 'GO phase must release the car');
const countdownModel = getPinyinRaceRenderModel(countdownSnapshot, {
  now: 200,
  sampleCount: 12,
  viewDistance: 520
});
assert.equal(countdownModel.racePhase.phase, 'countdown');
assert.equal(countdownModel.telemetry.status, 'countdown');
assert.equal(countdownModel.telemetry.speed, 0, 'countdown must hold the visible speed at zero');

const pausedPhase = getPinyinRacePhase({
  now: 4_000,
  startedAt: countdownSnapshot.raceStartedAt,
  learningClock: { mode: 'paused', reason: 'review' }
});
assert.equal(pausedPhase.phase, 'paused');
assert.equal(pausedPhase.label, '复习暂停');

const finishPhase = getPinyinRacePhase({
  now: 1_000 + PINYIN_FINISH_FEEDBACK_MS / 2,
  startedAt: countdownSnapshot.raceStartedAt,
  finishAt: 1_000
});
assert.equal(finishPhase.phase, 'finish');
assert.equal(finishPhase.label, '冲线!');
assert.ok(finishPhase.progress > 0 && finishPhase.progress < 1);

const finishPulseModel = getPinyinRaceRenderModel({
  ...snapshot,
  raceStartedAt: -PINYIN_START_COUNTDOWN_MS,
  finishAt: 1_000
}, {
  now: 1_000 + PINYIN_FINISH_FEEDBACK_MS / 2,
  sampleCount: 12,
  viewDistance: 520
});
assert.equal(finishPulseModel.racePhase.phase, 'finish');
assert.equal(finishPulseModel.telemetry.status, 'finish');

const slowedModel = getPinyinRaceRenderModel({
  ...snapshot,
  status: 'running',
  learningClock: { mode: 'slowed', reason: 'playback', multiplier: 0.5 },
  metrics: { speed: { current: 60 } },
  lap: 2
}, { now: 640, sampleCount: 12, viewDistance: 520 });
assert.equal(slowedModel.telemetry.status, 'slowed');
assert.equal(slowedModel.telemetry.lap, 2);

const pausedModel = getPinyinRaceRenderModel({
  ...snapshot,
  status: 'paused',
  learningClock: { mode: 'paused', reason: 'review', multiplier: 0 }
}, { now: 640, sampleCount: 12, viewDistance: 520 });
assert.equal(pausedModel.telemetry.status, 'paused');
assert.equal(pausedModel.telemetry.label, '复习暂停');

const finishTrack = advanceTrack(track, track.totalLength - 90);
const finishModel = getPinyinRaceRenderModel({ ...snapshot, track: finishTrack }, {
  now: 640,
  sampleCount: 12,
  viewDistance: 520
});
assert.equal(finishModel.finishApproach, true, 'finish gate must activate only near the end of the track');

const drawCalls = [];
const context = new Proxy({}, {
  get(_target, key) {
    if (key === 'measureText') return () => ({ width: 24 });
    if (key === 'fillStyle' || key === 'strokeStyle' || key === 'lineWidth' || key === 'font') {
      return undefined;
    }
    return (...args) => drawCalls.push([key, ...args]);
  },
  set(_target, key, value) {
    drawCalls.push([key, value]);
    return true;
  }
});

const renderer = createPinyinCanvasRenderer({ context, width: 640, height: 360 });
const frame = renderer.render(snapshot, { now: 640 });

assert.equal(frame.roadSegments, 17, 'renderer must draw the complete projected road');
assert.ok(frame.hasVehicle, 'renderer must draw a car body');
assert.ok(frame.hasRoadsideMotion, 'renderer must draw roadside motion cues');
assert.ok(frame.hasTelemetry, 'renderer must draw race telemetry');
assert.equal(frame.telemetry.status, 'racing');
assert.ok(drawCalls.some(([name]) => name === 'fillText'), 'renderer must keep target text readable');
assert.ok(frame.hasRivals, 'renderer must draw rival cars');
assert.ok(frame.hasCompetitionProgress, 'renderer must draw the competition progress strip');

const countdownFrame = renderer.render(countdownSnapshot, { now: 200 });
assert.equal(countdownFrame.racePhase.phase, 'countdown');
assert.ok(countdownFrame.hasRacePhase, 'renderer must draw the start phase overlay');

const finishFrame = renderer.render({
  ...snapshot,
  raceStartedAt: -PINYIN_START_COUNTDOWN_MS,
  finishAt: 1_000
}, { now: 1_000 + PINYIN_FINISH_FEEDBACK_MS / 2 });
assert.equal(finishFrame.racePhase.phase, 'finish');
assert.ok(finishFrame.hasRacePhase, 'renderer must draw the finish feedback overlay');

const synced = buildPinyinRaceSnapshot({
  track,
  scoutState: {
    score: 8,
    targetIndex: 2,
    foods: [
      { label: 'sh', x: 9, y: 2, correct: true },
      { label: 'an', x: 2, y: 9, correct: false }
    ]
  },
  lane: 2,
  speed: 148,
  lap: 3
});
assert.equal(synced.vehicle.lane, 2, 'race bridge must preserve the selected lane');
assert.equal(synced.targets[0].label, 'sh');
assert.equal(synced.targets[1].label, 'an');
assert.equal(synced.metrics.speed.current, 148);
assert.equal(synced.lap, 3);
assert.equal(synced.targets[0].distance, 116, 'food cards must be projected ahead of the car');

const pausedLearning = getPinyinRaceLearningState({
  awaitingRoute: true,
  routePhase: 'review',
  learning: {
    runtime: {
      status: 'running',
      learningClock: { mode: 'running', reason: null, multiplier: 1 }
    }
  }
});
assert.equal(pausedLearning.mode, 'paused', 'route review must pause the race canvas');
assert.equal(pausedLearning.reason, 'review', 'route review must expose its pause reason');
assert.equal(getPinyinRaceStepDistance({ elapsedMs: 1000, speed: 148, learningState: pausedLearning }), 0);

const slowedLearning = getPinyinRaceLearningState({
  learning: {
    runtime: {
      status: 'running',
      learningClock: { mode: 'slowed', reason: 'playback', multiplier: 0.5 }
    }
  }
});
assert.equal(slowedLearning.mode, 'slowed');
assert.equal(slowedLearning.reason, 'playback');
assert.equal(getPinyinRaceStepDistance({ elapsedMs: 1000, speed: 148, learningState: slowedLearning }), 74);

const slowedSnapshot = buildPinyinRaceSnapshot({
  track,
  scoutState: {
    learning: {
      runtime: {
        status: 'running',
        learningClock: { mode: 'slowed', reason: 'playback', multiplier: 0.5 }
      }
    }
  },
  lane: 1,
  speed: 148
});
assert.equal(slowedSnapshot.learningClock.mode, 'slowed');
assert.equal(slowedSnapshot.learningClock.multiplier, 0.5);
assert.equal(slowedSnapshot.metrics.speed.current, 74, 'slow playback must reduce the visible race speed');

console.log('PASS pinyin race visual contracts');
