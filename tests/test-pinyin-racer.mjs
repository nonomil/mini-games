import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  PINYIN_DOMAIN,
  PINYIN_ERROR_TAGS,
  PINYIN_QUESTION_TYPES,
  createPinyinCard,
  createPinyinQuestion,
  evaluatePinyinQuestion,
  normalizePinyin,
  splitPinyin,
  toneOfPinyin
} from '../games/pinyin-star-scout/pinyin-domain.js';
import { PINYIN_CARD_DATA } from '../games/pinyin-star-scout/pinyin-data.js';
import {
  advanceTrack,
  collidesOnTrack,
  createTrack,
  getPinyinTrackCamera,
  getSegmentStartDistance,
  projectTrackObject,
  chooseTrackBranch,
  visibleTrackSamples
} from '../games/pinyin-star-scout/pinyin-track.js';
import {
  PINYIN_TRACK_SEGMENT_TYPES,
  createConfiguredPinyinTrack
} from '../games/pinyin-star-scout/pinyin-track-config.js';
import {
  createPinyinCanvasRenderer,
  getPinyinCanvasViewport
} from '../games/pinyin-star-scout/pinyin-renderer.js';
import { createPinyinRacerRuntime } from '../games/pinyin-star-scout/pinyin-runtime.js';
import {
  PINYIN_LEARNING_MODES,
  PINYIN_LEARNING_REASONS,
  advanceLearningClock,
  createLearningClock,
  setLearningClock
} from '../games/pinyin-star-scout/pinyin-learning.js';

const pinyinEntryHtml = readFileSync(new URL('../games/pinyin-star-scout/index.html', import.meta.url), 'utf8');
const pinyinEntryScript = readFileSync(new URL('../games/pinyin-star-scout/game.js', import.meta.url), 'utf8');

assert.match(pinyinEntryHtml, /id="hintButton"/, 'standalone entry must expose an explicit hint control');
assert.match(pinyinEntryHtml, /id="hintStatus"/, 'standalone entry must expose hint cost status');
assert.match(pinyinEntryHtml, /id="routePanel"/, 'standalone entry must expose a route decision surface');
assert.match(pinyinEntryHtml, /type="module"[^>]*src="\.\/game\.js/, 'standalone entry must load the runtime-aware module entry');
assert.match(pinyinEntryHtml, /id="targetPinyin"[^>]*>拼音待探索</, 'standalone entry must not reveal the initial pinyin answer');
assert.doesNotMatch(pinyinEntryHtml, /id="targetPinyin"[^>]*>shan</, 'standalone entry must not hard-code the initial pinyin answer');
assert.match(pinyinEntryScript, /pinyinRevealed:\s*false/, 'standalone entry must track hidden-answer state');
assert.match(pinyinEntryScript, /state\.pinyinRevealed\s*=\s*true/, 'hint action must reveal the pinyin explicitly');
assert.match(pinyinEntryScript, /state\.hintUsed\s*=\s*true/, 'hint action must be one-shot per round');
assert.match(pinyinEntryScript, /state\.roundStars\s*=\s*Math\.max\(0, state\.roundStars - state\.hintPenalty\)/, 'hint action must have a visible star cost');
assert.match(pinyinEntryScript, /pinyinRevealed:\s*state\.pinyinRevealed/, 'standalone snapshot must preserve hint reveal state');
assert.match(pinyinEntryScript, /hintPenalty:\s*state\.hintPenalty/, 'standalone snapshot must preserve hint penalty');
assert.match(pinyinEntryScript, /createPinyinScoutSession/, 'standalone entry must consume the shared pinyin session bridge');
assert.match(pinyinEntryScript, /chooseRoute\(/, 'standalone entry must submit a route choice to the session bridge');
assert.match(pinyinEntryScript, /submitReviewAnswer\(/, 'standalone entry must expose the runtime review loop');
assert.match(pinyinEntryScript, /PINYIN_LEARNING_REASONS\.PLAYBACK/, 'voice playback must identify the learning clock reason');
assert.match(pinyinEntryScript, /learningSession\?\.slow\(PINYIN_LEARNING_REASONS\.PLAYBACK/, 'voice playback must slow the learning clock');
assert.doesNotMatch(pinyinEntryScript, /els\.targetPinyin\.textContent\s*=\s*normalizePinyin\(target\.pinyin\)/, 'default render must not write the full pinyin unconditionally');

const mountain = PINYIN_CARD_DATA.find((card) => card.cardId === 'pinyin:starter:mountain');
assert.ok(mountain, 'fixture data must include the mountain card');
const water = PINYIN_CARD_DATA.find((card) => card.cardId === 'pinyin:starter:water');
assert.ok(water, 'fixture data must include the water card');

assert.equal(PINYIN_DOMAIN, 'pinyin');
assert.equal(normalizePinyin('shān'), 'shan');
assert.equal(normalizePinyin('lǜ'), 'lv', 'pinyin key keeps u-umlaut distinct');
assert.equal(toneOfPinyin('shān'), 1);
assert.equal(toneOfPinyin('shan4'), 4);
assert.deepEqual(splitPinyin('shān'), { initial: 'sh', final: 'an' });
assert.deepEqual(splitPinyin('ài'), { initial: '', final: 'ai' });

assert.deepEqual(
  Object.keys(mountain),
  ['cardId', 'domain', 'char', 'pinyinDisplay', 'pinyinKey', 'initial', 'final', 'tone', 'audio', 'example']
);
assert.equal(mountain.domain, PINYIN_DOMAIN);
assert.equal(mountain.char, '山');
assert.equal(mountain.pinyinDisplay, 'shān');
assert.equal(mountain.pinyinKey, 'shan');
assert.equal(mountain.initial, 'sh');
assert.equal(mountain.final, 'an');
assert.equal(mountain.tone, 1);
assert.throws(
  () => createPinyinCard({
    cardId: 'english:mountain',
    domain: 'english',
    char: '山',
    pinyinDisplay: 'shān',
    audio: 'mountain.mp3',
    example: '山'
  }),
  /domain/
);
const frozenForeignCard = Object.freeze({ ...mountain, domain: 'english' });
assert.throws(
  () => createPinyinQuestion({
    card: frozenForeignCard,
    type: PINYIN_QUESTION_TYPES.CHARACTER_CHOICE
  }),
  /domain/,
  'question creation must not bypass pinyin domain validation for frozen cards'
);

const initialQuestion = createPinyinQuestion({
  card: mountain,
  type: PINYIN_QUESTION_TYPES.INITIAL_CHOICE,
  options: ['s', 'sh', 'ch']
});
assert.equal(initialQuestion.domain, PINYIN_DOMAIN);
assert.equal(initialQuestion.responseMode, 'choice');
assert.deepEqual(initialQuestion.options, ['s', 'sh', 'ch']);

const inputQuestion = createPinyinQuestion({
  card: mountain,
  type: PINYIN_QUESTION_TYPES.PINYIN_INPUT
});
assert.equal(inputQuestion.responseMode, 'typing');

const questionTypes = Object.values(PINYIN_QUESTION_TYPES);
assert.deepEqual(questionTypes, [
  'listen-pinyin-choice',
  'character-pinyin-choice',
  'initial-choice',
  'final-choice',
  'tone-choice',
  'pinyin-input'
]);

assert.deepEqual(
  evaluatePinyinQuestion(initialQuestion, 'sh'),
  {
    correct: true,
    cardId: mountain.cardId,
    domain: PINYIN_DOMAIN,
    questionType: PINYIN_QUESTION_TYPES.INITIAL_CHOICE,
    errorTag: null
  }
);
assert.equal(
  evaluatePinyinQuestion(initialQuestion, 's').errorTag,
  PINYIN_ERROR_TAGS.WRONG_INITIAL
);
assert.equal(
  evaluatePinyinQuestion(
    createPinyinQuestion({ card: mountain, type: PINYIN_QUESTION_TYPES.FINAL_CHOICE }),
    'ou'
  ).errorTag,
  PINYIN_ERROR_TAGS.WRONG_FINAL
);
assert.equal(
  evaluatePinyinQuestion(
    createPinyinQuestion({ card: mountain, type: PINYIN_QUESTION_TYPES.TONE_CHOICE }),
    3
  ).errorTag,
  PINYIN_ERROR_TAGS.WRONG_TONE
);
assert.equal(
  evaluatePinyinQuestion(
    createPinyinQuestion({ card: mountain, type: PINYIN_QUESTION_TYPES.CHARACTER_CHOICE }),
    '水'
  ).errorTag,
  PINYIN_ERROR_TAGS.WRONG_CHARACTER
);
assert.equal(
  evaluatePinyinQuestion(inputQuestion, '').errorTag,
  PINYIN_ERROR_TAGS.MISSED_CARD
);
assert.equal(evaluatePinyinQuestion(inputQuestion, 'shān').correct, true);

const learningClock = createLearningClock();
const readingClock = setLearningClock(learningClock, {
  mode: PINYIN_LEARNING_MODES.PAUSED,
  reason: PINYIN_LEARNING_REASONS.READING
});
assert.equal(readingClock.mode, 'paused');
assert.equal(readingClock.reason, 'reading');
assert.equal(advanceLearningClock(readingClock, { wallMs: 100 }).simulationMs, 0);
const playbackClock = setLearningClock(learningClock, {
  mode: PINYIN_LEARNING_MODES.SLOWED,
  reason: PINYIN_LEARNING_REASONS.PLAYBACK,
  multiplier: 0.5
});
assert.equal(advanceLearningClock(playbackClock, { wallMs: 100 }).simulationMs, 50);

const baseTrack = createTrack({
  id: 'starter-straight',
  seed: 7,
  segments: [
    { id: 'start', type: 'straight', length: 160, curvature: 0, laneCount: 3, roadWidth: 180 },
    { id: 'bend', type: 'curve-right', length: 120, curvature: 0.4, laneCount: 3, roadWidth: 180 }
  ]
});
assert.equal(baseTrack.totalLength, 280);
assert.equal(baseTrack.cameraDistance, 0);
assert.equal(advanceTrack(baseTrack, 40).cameraDistance, 40);
assert.equal(advanceTrack(baseTrack, 400).cameraDistance, 280, 'track distance clamps at finish');
assert.ok(visibleTrackSamples(baseTrack, { sampleCount: 5 }).every((sample) => sample.width > 0));
assert.notEqual(
  projectTrackObject(baseTrack, { distance: 210, lateral: 0 }).x,
  projectTrackObject(baseTrack, { distance: 210, lateral: 1 }).x
);

const complexTrack = createConfiguredPinyinTrack('learning-loop');
const complexTypes = new Set(complexTrack.segments.flatMap((segment) => [
  segment.type,
  ...(segment.branches || []).map((branch) => branch.type)
]));
for (const type of Object.values(PINYIN_TRACK_SEGMENT_TYPES)) {
  assert.ok(complexTypes.has(type), `configured route must include ${type}`);
}
assert.ok(complexTrack.totalLength > 900, 'complex route must contain multiple code-driven segments');
const sBendStart = getSegmentStartDistance(complexTrack, 'phoneme-s-bend');
const sBendEntry = projectTrackObject(complexTrack, { distance: sBendStart + 1 });
const sBendQuarter = projectTrackObject(complexTrack, { distance: sBendStart + 40 });
const sBendThreeQuarter = projectTrackObject(complexTrack, { distance: sBendStart + 120 });
assert.ok(sBendQuarter.x > sBendEntry.x, 'S bend must turn right before reversing');
assert.ok(sBendThreeQuarter.x < sBendQuarter.x, 'S bend must reverse direction on the same segment');
const forkDistance = getSegmentStartDistance(complexTrack, 'initial-final-fork');
const forkCamera = getPinyinTrackCamera(complexTrack, { distance: forkDistance + 20 });
assert.equal(forkCamera.segmentType, PINYIN_TRACK_SEGMENT_TYPES.FORK);
assert.equal(forkCamera.isFork, true);
const innerRoute = chooseTrackBranch(complexTrack, 'initial-final-fork', 'inner');
const wideRoute = chooseTrackBranch(complexTrack, 'initial-final-fork', 'wide');
assert.equal(innerRoute.routeChoices['initial-final-fork'], 'inner');
assert.notEqual(innerRoute.totalLength, wideRoute.totalLength, 'branch choice must change the active route length');
const resumedWideRoute = advanceTrack(wideRoute, 30);
const branchRestoredRuntime = createPinyinRacerRuntime({
  snapshot: { track: resumedWideRoute },
  cards: [mountain],
  track: complexTrack
});
assert.equal(branchRestoredRuntime.getSnapshot().track.routeChoices['initial-final-fork'], 'wide');
assert.equal(branchRestoredRuntime.getSnapshot().track.cameraDistance, 30);
assert.throws(
  () => chooseTrackBranch(complexTrack, 'initial-final-fork', 'missing'),
  /branch/
);
const bridgeCamera = getPinyinTrackCamera(complexTrack, {
  distance: getSegmentStartDistance(complexTrack, 'tone-bridge') + 40
});
assert.equal(bridgeCamera.isBridge, true);
assert.ok(bridgeCamera.height > 0, 'bridge must expose a raised track height');
const tunnelCamera = getPinyinTrackCamera(complexTrack, {
  distance: getSegmentStartDistance(complexTrack, 'listening-tunnel') + 40
});
assert.equal(tunnelCamera.isTunnel, true);
assert.equal(tunnelCamera.landmark, '听音隧道');
const complexSamples = visibleTrackSamples(complexTrack, { sampleCount: 40, viewDistance: complexTrack.totalLength });
assert.ok(complexSamples.some((sample) => sample.type === PINYIN_TRACK_SEGMENT_TYPES.TUNNEL));
assert.ok(complexSamples.some((sample) => sample.landmark === '声调桥'));
assert.ok(
  collidesOnTrack(
    complexTrack,
    { distance: 220, lane: 1 },
    { distance: 228, lane: 1 },
    { distanceWindow: 12 }
  ).collided,
  'same-lane objects within the distance window must collide'
);
assert.equal(
  collidesOnTrack(
    complexTrack,
    { distance: 220, lane: 1 },
    { distance: 228, lane: 2 },
    { distanceWindow: 12 }
  ).collided,
  false,
  'different lanes must not collide when distance overlaps'
);
const continuousCurveTrack = createTrack({
  id: 'continuous-curve',
  segments: [
    { id: 'curve', type: 'curve-right', length: 100, curvature: 0.6, laneCount: 3, roadWidth: 180 },
    { id: 'after-curve', type: 'straight', length: 100, laneCount: 3, roadWidth: 180 }
  ]
});
const curveEnd = projectTrackObject(continuousCurveTrack, { distance: 100 });
const afterCurve = projectTrackObject(continuousCurveTrack, { distance: 100.1 });
assert.ok(
  Math.abs(afterCurve.x - curveEnd.x) < 0.01,
  'track centerline remains continuous when a curved segment connects to a straight segment'
);

const straightTrack = createTrack({
  id: 'straight-only',
  segments: [{ id: 'straight', type: 'straight', length: 300, curvature: 0, laneCount: 3, roadWidth: 180 }]
});
const straightStart = projectTrackObject(straightTrack, { distance: 160, lateral: 0 });
const straightAfterAdvance = projectTrackObject(advanceTrack(straightTrack, 40), { distance: 160, lateral: 0 });
assert.equal(straightStart.x, straightAfterAdvance.x, 'straight track keeps the vehicle lane centered');
assert.ok(straightAfterAdvance.y > straightStart.y, 'target cards approach the vehicle along the straight');

assert.deepEqual(
  getPinyinCanvasViewport({ width: 360, height: 800 }),
  { width: 360, height: 203, aspectRatio: 16 / 9 },
  'mobile viewport keeps a stable 16:9 track'
);
assert.deepEqual(
  getPinyinCanvasViewport({ width: 1200, height: 600, maxWidth: 960 }),
  { width: 960, height: 540, aspectRatio: 16 / 9 },
  'desktop viewport is capped to a stable track width'
);

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
const renderer = createPinyinCanvasRenderer({ context, width: 320, height: 200 });
assert.deepEqual(renderer.resize({ width: 360, height: 800 }), { width: 360, height: 203, aspectRatio: 16 / 9 });
assert.deepEqual(renderer.getViewport(), { width: 360, height: 203, aspectRatio: 16 / 9 });
renderer.render({
  track: complexTrack,
  vehicle: { distance: 50, lateral: 0 },
  targets: [{ distance: 110, lateral: -1, label: 'shān' }]
});
assert.ok(drawCalls.some(([name]) => name === 'fill'), 'renderer must draw road and vehicle paths');
assert.ok(drawCalls.some(([name]) => name === 'fillText'), 'renderer must draw target labels');
const complexFrame = renderer.render({
  track: complexTrack,
  vehicle: { distance: forkDistance + 20, lane: 1 },
  targets: [{ distance: tunnelCamera.distance, lane: 1, label: '听音隧道' }],
  viewDistance: complexTrack.totalLength,
  sampleCount: 40
});
assert.ok(complexFrame.visibleSegments.includes(PINYIN_TRACK_SEGMENT_TYPES.FORK));
assert.ok(complexFrame.visibleSegments.includes(PINYIN_TRACK_SEGMENT_TYPES.TUNNEL));
assert.ok(complexFrame.landmarks.includes('声调桥'));

const routeDecisionRuntime = createPinyinRacerRuntime({
  sessionId: 'route-decision-session',
  cards: [mountain, water],
  track: complexTrack,
  questionType: PINYIN_QUESTION_TYPES.FINAL_CHOICE,
  speed: 0
});
routeDecisionRuntime.mount();
assert.deepEqual(
  routeDecisionRuntime.getRouteDecision(),
  { segmentId: null, expectedBranchId: null, selectedBranchId: null, accepted: false, consequence: null },
  'route decision should start empty'
);
const routeDecisionResult = routeDecisionRuntime.chooseLearningRoute({
  segmentId: 'initial-final-fork',
  branchId: 'inner',
  response: 'an'
});
assert.equal(routeDecisionResult.correct, true);
assert.equal(routeDecisionResult.routeDecision.accepted, true);
assert.equal(routeDecisionResult.routeDecision.selectedBranchId, 'inner');
assert.equal(routeDecisionResult.routeDecision.consequence, 'shortcut');
assert.equal(routeDecisionRuntime.getSnapshot().track.routeChoices['initial-final-fork'], 'inner');

const wrongRouteRuntime = createPinyinRacerRuntime({
  sessionId: 'wrong-route-session',
  cards: [mountain],
  track: complexTrack,
  questionType: PINYIN_QUESTION_TYPES.FINAL_CHOICE,
  speed: 0
});
wrongRouteRuntime.mount();
const wrongRouteResult = wrongRouteRuntime.chooseLearningRoute({
  segmentId: 'initial-final-fork',
  branchId: 'inner',
  response: 'ou'
});
assert.equal(wrongRouteResult.correct, false);
assert.equal(wrongRouteResult.errorTag, PINYIN_ERROR_TAGS.WRONG_FINAL);
assert.equal(wrongRouteRuntime.getSnapshot().track.routeChoices['initial-final-fork'], 'inner');
assert.equal(wrongRouteRuntime.getSnapshot().learningClock.reason, PINYIN_LEARNING_REASONS.REVIEW);
assert.equal(wrongRouteRuntime.getSnapshot().reviewQueue[0].cardId, mountain.cardId);
assert.equal(wrongRouteRuntime.getSnapshot().routeDecision.accepted, false);

const reviewedRouteResult = wrongRouteRuntime.submitReviewAnswer('an', {
  routeDecision: {
    segmentId: 'initial-final-fork',
    branchId: 'wide'
  }
});
assert.equal(reviewedRouteResult.correct, true);
assert.equal(reviewedRouteResult.routeDecision.accepted, true);
assert.equal(wrongRouteRuntime.getSnapshot().track.routeChoices['initial-final-fork'], 'wide');
assert.equal(wrongRouteRuntime.getSnapshot().routeDecision.consequence, 'recovery');

const hintBefore = routeDecisionRuntime.getSnapshot();
routeDecisionRuntime.useHint({ mode: 'paused' });
const hintAfter = routeDecisionRuntime.getSnapshot();
assert.equal(hintAfter.hint.uses, hintBefore.hint.uses + 1);
assert.equal(hintAfter.hint.revealed, true);
assert.equal(hintAfter.hint.penalty, 1);
const routeSnapshot = routeDecisionRuntime.getSnapshot();
const restoredRouteRuntime = createPinyinRacerRuntime({
  snapshot: routeSnapshot,
  cards: [mountain, water],
  track: complexTrack,
  questionType: PINYIN_QUESTION_TYPES.FINAL_CHOICE,
  speed: 0
});
assert.deepEqual(restoredRouteRuntime.getRouteDecision(), routeSnapshot.routeDecision);
assert.deepEqual(restoredRouteRuntime.getSnapshot().hint, routeSnapshot.hint);

const runtime = createPinyinRacerRuntime({
  sessionId: 'session-1',
  cards: [mountain],
  track: baseTrack,
  questionType: PINYIN_QUESTION_TYPES.INITIAL_CHOICE
});
const mountedSnapshot = runtime.mount();
assert.equal(mountedSnapshot.sessionId, 'session-1');
assert.equal(mountedSnapshot.targets[0].cardId, mountain.cardId);
const events = [];
const unsubscribe = runtime.onCardResult((event) => events.push(event));
const targetBeforeAdvance = projectTrackObject(mountedSnapshot.track, mountedSnapshot.targets[0]);
runtime.advance(25);
assert.equal(runtime.getSnapshot().track.cameraDistance, 25);
const targetAfterAdvance = projectTrackObject(runtime.getSnapshot().track, runtime.getSnapshot().targets[0]);
assert.ok(targetAfterAdvance.y > targetBeforeAdvance.y, 'runtime advances target cards on the track');
runtime.pause();
assert.equal(runtime.getSnapshot().status, 'paused');
runtime.advance(25);
assert.equal(runtime.getSnapshot().track.cameraDistance, 25, 'paused runtime does not advance the track');
runtime.resume();
runtime.advance(25);
assert.equal(runtime.getSnapshot().track.cameraDistance, 50);
const result = runtime.submitAnswer('sh');
assert.equal(result.correct, true);
assert.equal(events.length, 1);
assert.equal(events[0].domain, PINYIN_DOMAIN);
assert.equal(runtime.getSnapshot().currentCardId, null);
unsubscribe();
runtime.stop();
assert.equal(runtime.getSnapshot().status, 'stopped');

const restored = createPinyinRacerRuntime({
  snapshot: runtime.getSnapshot(),
  cards: [mountain],
  track: baseTrack
});
assert.equal(restored.getSnapshot().sessionId, 'session-1');
assert.equal(restored.getSnapshot().status, 'stopped');

const pausedRuntime = createPinyinRacerRuntime({ sessionId: 'paused-session', cards: [mountain], track: straightTrack });
pausedRuntime.mount();
pausedRuntime.advance(30);
pausedRuntime.pause();
const pausedSnapshot = pausedRuntime.getSnapshot();
const restoredPaused = createPinyinRacerRuntime({ snapshot: pausedSnapshot, cards: [mountain], track: straightTrack });
assert.equal(restoredPaused.getSnapshot().status, 'paused');
assert.equal(restoredPaused.getSnapshot().track.cameraDistance, 30);
restoredPaused.mount();
restoredPaused.advance(30);
assert.equal(restoredPaused.getSnapshot().track.cameraDistance, 30, 'restored pause state remains paused');
restoredPaused.resume();
restoredPaused.advance(30);
assert.equal(restoredPaused.getSnapshot().track.cameraDistance, 60);

const collisionRuntime = createPinyinRacerRuntime({
  snapshot: {
    vehicle: { distance: 220, lane: 1 },
    targets: [{ distance: 228, lane: 1, cardId: mountain.cardId, label: mountain.pinyinDisplay }]
  },
  cards: [mountain],
  track: complexTrack
});
collisionRuntime.mount();
assert.equal(collisionRuntime.checkCollision().collided, true);

const reviewEvents = [];
const reviewRuntime = createPinyinRacerRuntime({
  sessionId: 'review-session',
  cards: [mountain],
  track: baseTrack,
  questionType: PINYIN_QUESTION_TYPES.INITIAL_CHOICE
});
reviewRuntime.onCardResult((event) => reviewEvents.push(event));
reviewRuntime.mount();
const reviewOriginalPosition = reviewRuntime.getSnapshot().targets[0];
reviewRuntime.setVehiclePosition({
  distance: reviewOriginalPosition.distance,
  lane: reviewOriginalPosition.lane
});
const collisionEvent = reviewRuntime.recordCollision(reviewOriginalPosition, { speed: 80 });
assert.equal(collisionEvent.kind, 'collision');
assert.equal(collisionEvent.accepted, true);
assert.equal(reviewRuntime.getSnapshot().metrics.collision.count, 1);
assert.equal(reviewRuntime.getSnapshot().metrics.correctness.attempts, 0);
reviewRuntime.resumeLearning();
reviewRuntime.pauseFor(PINYIN_LEARNING_REASONS.READING);
const pausedLearningSnapshot = reviewRuntime.getSnapshot();
reviewRuntime.advance(40);
assert.equal(reviewRuntime.getSnapshot().track.cameraDistance, pausedLearningSnapshot.track.cameraDistance);
assert.equal(reviewRuntime.getSnapshot().learningClock.simulationMs, pausedLearningSnapshot.learningClock.simulationMs);
reviewRuntime.slowFor(PINYIN_LEARNING_REASONS.PLAYBACK, 0.5);
const slowStartDistance = reviewRuntime.getSnapshot().track.cameraDistance;
reviewRuntime.advance(40);
assert.equal(reviewRuntime.getSnapshot().track.cameraDistance, slowStartDistance + 20);
reviewRuntime.useHint({ mode: 'paused' });
assert.equal(reviewRuntime.getSnapshot().learningClock.reason, PINYIN_LEARNING_REASONS.HINT);
reviewRuntime.resumeLearning();
const wrongAnswer = reviewRuntime.submitAnswer('s', {
  reactionMs: 240,
  responseWindowMs: 480,
  speed: 42,
  hintUsed: true
});
assert.equal(wrongAnswer.kind, 'card-result');
assert.equal(wrongAnswer.outcome, 'wrong');
assert.equal(wrongAnswer.errorTag, PINYIN_ERROR_TAGS.WRONG_INITIAL);
assert.equal(wrongAnswer.position.distance, reviewOriginalPosition.distance);
assert.equal(reviewRuntime.getSnapshot().learningClock.reason, PINYIN_LEARNING_REASONS.REVIEW);
assert.equal(reviewRuntime.getSnapshot().reviewQueue[0].cardId, mountain.cardId);
assert.equal(reviewRuntime.getSnapshot().reviewQueue[0].position.distance, reviewOriginalPosition.distance);
assert.equal(reviewEvents.length, 1);
const duplicateAnswer = reviewRuntime.submitAnswer('s');
assert.equal(duplicateAnswer.accepted, false);
assert.equal(duplicateAnswer.duplicate, true);
assert.equal(reviewEvents.length, 1, 'duplicate card result must not notify card-result listeners');
const reviewSnapshot = reviewRuntime.getSnapshot();
const restoredReviewRuntime = createPinyinRacerRuntime({
  snapshot: reviewSnapshot,
  cards: [mountain],
  track: baseTrack,
  questionType: PINYIN_QUESTION_TYPES.INITIAL_CHOICE
});
assert.equal(restoredReviewRuntime.getSnapshot().learningClock.reason, PINYIN_LEARNING_REASONS.REVIEW);
assert.equal(restoredReviewRuntime.getSnapshot().reviewQueue.length, 1);
restoredReviewRuntime.setTargetPosition(mountain.cardId, { distance: reviewOriginalPosition.distance + 90 });
const reviewAnswer = restoredReviewRuntime.submitReviewAnswer('sh', { reactionMs: 180, responseWindowMs: 300 });
assert.equal(reviewAnswer.kind, 'review-result');
assert.equal(reviewAnswer.correct, true);
assert.equal(restoredReviewRuntime.getSnapshot().reviewQueue.length, 0);
assert.equal(restoredReviewRuntime.getSnapshot().currentCardId, null);
assert.equal(
  restoredReviewRuntime.getSnapshot().targets[0].distance,
  reviewOriginalPosition.distance,
  'review success must restore the card to its original track position'
);
const reviewMetrics = restoredReviewRuntime.getSnapshot().metrics;
assert.equal(reviewMetrics.correctness.attempts, 1);
assert.equal(reviewMetrics.correctness.wrong, 1);
assert.equal(reviewMetrics.review.attempts, 1);
assert.equal(reviewMetrics.review.correct, 1);
assert.equal(reviewMetrics.hint.used, 2);
assert.equal(reviewMetrics.reactionMs.last, 180);
assert.equal(reviewMetrics.responseWindowMs.last, 300);
assert.equal(restoredReviewRuntime.getSnapshot().profile, undefined);
assert.equal(restoredReviewRuntime.getSnapshot().fsrs, undefined);

const missedRuntime = createPinyinRacerRuntime({ cards: [mountain], track: baseTrack });
missedRuntime.mount();
const missedAnswer = missedRuntime.submitAnswer(null, { responseWindowMs: 620 });
assert.equal(missedAnswer.outcome, 'missed');
assert.equal(missedAnswer.errorTag, PINYIN_ERROR_TAGS.MISSED_CARD);
assert.equal(missedRuntime.getSnapshot().metrics.correctness.missed, 1);
assert.equal(missedRuntime.getSnapshot().reviewQueue[0].source, 'missed-card');

let animationFrame = null;
let cancelledFrame = null;
const animatedRuntime = createPinyinRacerRuntime({
  sessionId: 'animation-session',
  cards: [mountain],
  track: straightTrack,
  requestFrame: (callback) => {
    animationFrame = callback;
    return 9;
  },
  cancelFrame: (frameId) => {
    cancelledFrame = frameId;
  },
  speed: 100
});
animatedRuntime.mount();
assert.equal(typeof animationFrame, 'function');
animationFrame(1000);
animationFrame(1100);
assert.equal(animatedRuntime.getSnapshot().track.cameraDistance, 10, 'raf advances a fixed-speed straight run');
animatedRuntime.pause();
assert.equal(cancelledFrame, 9, 'pause cancels the scheduled frame');
const pausedAnimationDistance = animatedRuntime.getSnapshot().track.cameraDistance;
animatedRuntime.resume();
animationFrame(1200);
assert.equal(animatedRuntime.getSnapshot().track.cameraDistance, pausedAnimationDistance, 'resume waits for a fresh frame timestamp');
animationFrame(1300);
assert.equal(animatedRuntime.getSnapshot().track.cameraDistance, pausedAnimationDistance + 10);
animatedRuntime.stop();

assert.throws(
  () => createPinyinRacerRuntime({ cards: [frozenForeignCard] }),
  /domain/,
  'runtime must reject cards outside the pinyin domain'
);

console.log('PASS pinyin racer domain, track, renderer, and snapshot contracts');
