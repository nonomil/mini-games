import {
  PINYIN_DOMAIN,
  PINYIN_ERROR_TAGS,
  PINYIN_QUESTION_TYPES,
  createPinyinCard,
  createPinyinQuestion,
  evaluatePinyinQuestion
} from './pinyin-domain.js';
import {
  advanceTrack,
  chooseTrackBranch,
  collidesOnTrack,
  createTrack,
  projectTrackObject
} from './pinyin-track.js';
import {
  PINYIN_LEARNING_MODES,
  PINYIN_LEARNING_REASONS,
  advanceLearningClock,
  createLearningClock,
  createPinyinLearningMetrics,
  enqueuePinyinReview,
  recordPinyinAnswerMetrics,
  recordPinyinCollisionMetrics,
  recordPinyinReviewMetrics,
  setLearningClock
} from './pinyin-learning.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function restoreTrack(snapshotTrack, fallbackTrack) {
  if (!snapshotTrack) return fallbackTrack;
  const base = createTrack({
    id: snapshotTrack.id || fallbackTrack.id,
    seed: snapshotTrack.seed ?? fallbackTrack.seed,
    segments: snapshotTrack.segments || fallbackTrack.segments,
    routeChoices: snapshotTrack.routeChoices || fallbackTrack.routeChoices
  });
  return advanceTrack(base, Number(snapshotTrack.cameraDistance) || 0);
}

const EMPTY_ROUTE_DECISION = Object.freeze({
  segmentId: null,
  expectedBranchId: null,
  selectedBranchId: null,
  accepted: false,
  consequence: null
});

const ROUTE_TASK_ALIASES = Object.freeze({
  'listen-choice': PINYIN_QUESTION_TYPES.LISTENING_CHOICE
});

function normalizeRouteDecision(value) {
  return {
    ...EMPTY_ROUTE_DECISION,
    ...(value && typeof value === 'object' ? value : {})
  };
}

function normalizeHintState(value) {
  return {
    uses: Math.max(0, Number(value?.uses) || 0),
    revealed: Boolean(value?.revealed),
    penalty: Math.max(0, Number(value?.penalty) || 0)
  };
}

function routeTaskMatches(segment, questionType) {
  if (!segment?.taskType) return true;
  const taskType = ROUTE_TASK_ALIASES[segment.taskType] || segment.taskType;
  return taskType === questionType;
}

function routeConsequence(segment, branchId) {
  const branch = segment?.branches?.find((candidate) => candidate.id === branchId);
  const surface = String(branch?.surface || '').toLowerCase();
  if (surface.includes('shortcut')) return 'shortcut';
  if (surface.includes('recovery')) return 'recovery';
  return branchId === segment?.defaultBranch ? 'preferred-route' : 'long-route';
}

function resolveRouteSelection(track, segmentId, branchId, questionType) {
  const segment = track.segments.find((candidate) => candidate.id === segmentId);
  if (!segment || !Array.isArray(segment.branches)) {
    throw new RangeError(`Route decision requires a fork segment: ${segmentId}`);
  }
  if (!routeTaskMatches(segment, questionType)) {
    throw new RangeError(`Route segment ${segmentId} expects ${segment.taskType}, got ${questionType}`);
  }
  const selectedBranch = segment.branches.find((candidate) => candidate.id === branchId);
  if (!selectedBranch) {
    throw new RangeError(`Unknown branch ${branchId} for ${segmentId}`);
  }
  return {
    segment,
    selectedBranch,
    nextTrack: chooseTrackBranch(track, segmentId, branchId)
  };
}

function defaultTargets(cards) {
  return cards.map((card, index) => ({
    cardId: card.cardId,
    distance: 110 + index * 150,
    lane: index % 3,
    label: card.pinyinDisplay
  }));
}

export function createPinyinRacerRuntime({
  sessionId = 'pinyin-local-session',
  cards = [],
  track = createTrack(),
  snapshot = null,
  renderer = null,
  questionType = PINYIN_QUESTION_TYPES.CHARACTER_CHOICE,
  speed = 120,
  requestFrame = globalThis.requestAnimationFrame?.bind(globalThis),
  cancelFrame = globalThis.cancelAnimationFrame?.bind(globalThis)
} = {}) {
  const cardList = cards.map((card) => createPinyinCard(card));
  const restored = snapshot || {};
  let state = {
    version: 1,
    domain: PINYIN_DOMAIN,
    sessionId: String(restored.sessionId || sessionId),
    status: restored.status || 'ready',
    currentCardIndex: Number.isInteger(restored.currentCardIndex) ? restored.currentCardIndex : 0,
    currentCardId: restored.currentCardId ?? cardList[0]?.cardId ?? null,
    questionType: restored.questionType || questionType,
    track: restoreTrack(restored.track, track),
    vehicle: restored.vehicle || { distance: 0, lane: 1 },
    targets: restored.targets || defaultTargets(cardList),
    answeredCount: Number(restored.answeredCount) || 0,
    learningClock: restored.learningClock || createLearningClock(),
    metrics: restored.metrics || createPinyinLearningMetrics(),
    routeDecision: normalizeRouteDecision(restored.routeDecision),
    hint: normalizeHintState(restored.hint),
    reviewQueue: restored.reviewQueue || [],
    submittedCardIds: restored.submittedCardIds || [],
    cardStartedSimulationMs: Number(restored.cardStartedSimulationMs) || 0,
    lastFeedback: restored.lastFeedback || null,
    restoredCardPosition: restored.restoredCardPosition || null
  };
  const listeners = new Set();
  const runSpeed = Number.isFinite(Number(speed)) ? Math.max(0, Number(speed)) : 120;
  let frameId = null;
  let lastFrameAt = null;

  function currentCard() {
    return cardList[state.currentCardIndex] || null;
  }

  function targetForCard(cardId) {
    return state.targets.find((target) => target.cardId === cardId) || null;
  }

  function captureCardPosition(cardId, targetOverride = null) {
    const target = targetOverride || targetForCard(cardId);
    const fallback = state.vehicle;
    const source = target || fallback;
    const point = projectTrackObject(state.track, source);
    const position = {
      cardId: cardId || null,
      trackId: state.track.id,
      routeChoices: { ...state.track.routeChoices },
      distance: Number(source.distance) || 0,
      segmentId: point.segmentId
    };
    if (source.lane !== undefined) position.lane = source.lane;
    if (source.lateral !== undefined) position.lateral = source.lateral;
    return position;
  }

  function restoreCardPosition(cardId) {
    const entry = state.reviewQueue.find((item) => item.cardId === cardId);
    if (!entry) return null;
    state.targets = state.targets.map((target) => {
      if (target.cardId !== cardId) return target;
      return {
        ...target,
        distance: entry.position.distance,
        ...(entry.position.lane === undefined ? {} : { lane: entry.position.lane }),
        ...(entry.position.lateral === undefined ? {} : { lateral: entry.position.lateral })
      };
    });
    state.restoredCardPosition = { ...entry.position };
    return clone(entry.position);
  }

  function getQuestion() {
    const card = currentCard();
    return card ? createPinyinQuestion({ card, type: state.questionType }) : null;
  }

  function getSnapshot() {
    return clone(state);
  }

  function render() {
    if (renderer?.render) renderer.render(getSnapshot());
  }

  function currentSpeed() {
    return runSpeed * state.learningClock.multiplier;
  }

  function setClock({ mode, reason, multiplier = 1 } = {}) {
    state.learningClock = setLearningClock(state.learningClock, { mode, reason, multiplier });
    if (mode === PINYIN_LEARNING_MODES.PAUSED) {
      state.status = 'paused';
      stopLoop();
    } else if (state.status === 'paused') {
      state.status = 'running';
      scheduleLoop();
    }
    render();
    return getSnapshot();
  }

  function stopLoop() {
    if (frameId !== null && typeof cancelFrame === 'function') cancelFrame(frameId);
    frameId = null;
    lastFrameAt = null;
  }

  function scheduleLoop() {
    if (frameId !== null || typeof requestFrame !== 'function') return;
    frameId = requestFrame(stepFrame);
  }

  function stepFrame(timestamp) {
    frameId = null;
    if (state.status !== 'running') return;
    const currentTime = Number(timestamp);
    if (lastFrameAt === null || !Number.isFinite(currentTime)) {
      lastFrameAt = Number.isFinite(currentTime) ? currentTime : 0;
    } else {
      const elapsed = Math.min(100, Math.max(0, currentTime - lastFrameAt));
      lastFrameAt = currentTime;
      advance(runSpeed * elapsed / 1000);
    }
    scheduleLoop();
  }

  function mount() {
    if (state.status === 'ready') state.status = 'running';
    render();
    if (state.status === 'running') scheduleLoop();
    return getSnapshot();
  }

  function pauseFor(reason = PINYIN_LEARNING_REASONS.MANUAL) {
    return setClock({ mode: PINYIN_LEARNING_MODES.PAUSED, reason });
  }

  function slowFor(reason = PINYIN_LEARNING_REASONS.PLAYBACK, multiplier = 0.5) {
    return setClock({ mode: PINYIN_LEARNING_MODES.SLOWED, reason, multiplier });
  }

  function resumeLearning() {
    return setClock({ mode: PINYIN_LEARNING_MODES.RUNNING, reason: null });
  }

  function pause(reason = PINYIN_LEARNING_REASONS.MANUAL) {
    return pauseFor(reason);
  }

  function resume() {
    return resumeLearning();
  }

  function useHint({ mode = PINYIN_LEARNING_MODES.PAUSED, multiplier = 0.5 } = {}) {
    state.hint = {
      ...state.hint,
      uses: state.hint.uses + 1,
      revealed: true,
      penalty: state.hint.penalty + 1
    };
    state.metrics = {
      ...state.metrics,
      hint: { used: state.metrics.hint.used + 1 }
    };
    return mode === PINYIN_LEARNING_MODES.SLOWED
      ? slowFor(PINYIN_LEARNING_REASONS.HINT, multiplier)
      : pauseFor(PINYIN_LEARNING_REASONS.HINT);
  }

  function getRouteDecision() {
    return clone(state.routeDecision);
  }

  function chooseLearningRoute({ segmentId, branchId, response } = {}) {
    const question = getQuestion();
    if (!question) return null;
    if (state.submittedCardIds.includes(question.cardId)) {
      return {
        ...duplicateResult(question.cardId),
        routeDecision: getRouteDecision()
      };
    }
    if (state.status !== 'running') {
      return {
        kind: 'route-decision',
        accepted: false,
        blocked: true,
        domain: PINYIN_DOMAIN,
        cardId: question.cardId,
        sessionId: state.sessionId,
        routeDecision: getRouteDecision()
      };
    }

    const routeSelection = resolveRouteSelection(state.track, segmentId, branchId, state.questionType);
    const result = evaluatePinyinQuestion(question, response);
    const event = submitAnswer(response);
    const accepted = Boolean(result.correct && event?.accepted);
    state.routeDecision = {
      segmentId: String(segmentId),
      expectedBranchId: String(routeSelection.segment.defaultBranch || ''),
      selectedBranchId: String(branchId),
      accepted,
      consequence: accepted ? routeConsequence(routeSelection.segment, branchId) : null
    };

    if (accepted) {
      state.track = routeSelection.nextTrack;
    }
    render();
    return {
      ...(event || {
        kind: 'route-decision',
        accepted: false,
        cardId: question.cardId,
        sessionId: state.sessionId
      }),
      routeDecision: getRouteDecision()
    };
  }

  function advance(distance, elapsedMs = null) {
    if (state.status !== 'running') return getSnapshot();
    const nominalDistance = Math.max(0, Number(distance) || 0);
    const nominalElapsed = elapsedMs === null
      ? runSpeed > 0 ? nominalDistance / runSpeed * 1000 : 0
      : Math.max(0, Number(elapsedMs) || 0);
    const effectiveDistance = nominalDistance * state.learningClock.multiplier;
    state.track = advanceTrack(state.track, effectiveDistance);
    state.vehicle = { ...state.vehicle, distance: state.track.cameraDistance };
    state.learningClock = advanceLearningClock(state.learningClock, { wallMs: nominalElapsed });
    state.metrics = {
      ...state.metrics,
      speed: {
        current: currentSpeed(),
        last: currentSpeed(),
        distance: state.metrics.speed.distance + effectiveDistance
      }
    };
    render();
    return getSnapshot();
  }

  function setVehiclePosition(position = {}) {
    state.vehicle = {
      ...state.vehicle,
      ...position,
      distance: Number.isFinite(Number(position.distance))
        ? Number(position.distance)
        : state.vehicle.distance
    };
    render();
    return getSnapshot();
  }

  function setTargetPosition(cardId, position = {}) {
    state.targets = state.targets.map((target) => target.cardId === cardId
      ? { ...target, ...position, cardId }
      : target);
    render();
    return getSnapshot();
  }

  function checkCollision(target = state.targets[0], options) {
    return target ? collidesOnTrack(state.track, state.vehicle, target, options) : {
      collided: false,
      distanceGap: Infinity,
      lateralGap: Infinity,
      sameLane: null
    };
  }

  function recordCollision(target = state.targets[0], metadata = {}) {
    const collision = checkCollision(target, metadata);
    const event = {
      kind: 'collision',
      accepted: collision.collided,
      domain: PINYIN_DOMAIN,
      cardId: target?.cardId || null,
      sessionId: state.sessionId,
      collision,
      position: captureCardPosition(target?.cardId || null, target),
      speed: metadata.speed ?? currentSpeed()
    };
    if (collision.collided) {
      state.metrics = recordPinyinCollisionMetrics(state.metrics);
      pauseFor(PINYIN_LEARNING_REASONS.COLLISION);
    }
    return event;
  }

  function answerMetadata(metadata = {}) {
    const responseWindowMs = metadata.responseWindowMs === undefined
      ? Math.max(0, state.learningClock.simulationMs - state.cardStartedSimulationMs)
      : Math.max(0, Number(metadata.responseWindowMs) || 0);
    return {
      reactionMs: metadata.reactionMs === undefined ? responseWindowMs : Math.max(0, Number(metadata.reactionMs) || 0),
      responseWindowMs,
      speed: metadata.speed === undefined ? currentSpeed() : Math.max(0, Number(metadata.speed) || 0),
      hintUsed: Boolean(metadata.hintUsed)
    };
  }

  function duplicateResult(cardId) {
    return {
      kind: 'card-result',
      accepted: false,
      duplicate: true,
      domain: PINYIN_DOMAIN,
      cardId,
      sessionId: state.sessionId
    };
  }

  function submitAnswer(response, metadata = {}) {
    const question = getQuestion();
    if (!question) return null;
    if (state.submittedCardIds.includes(question.cardId)) return duplicateResult(question.cardId);
    if (state.status !== 'running') {
      return { kind: 'card-result', accepted: false, blocked: true, domain: PINYIN_DOMAIN, cardId: question.cardId, sessionId: state.sessionId };
    }
    const position = captureCardPosition(question.cardId);
    const result = evaluatePinyinQuestion(question, response);
    const timing = answerMetadata(metadata);
    state.submittedCardIds = [...state.submittedCardIds, question.cardId];
    state.metrics = recordPinyinAnswerMetrics(state.metrics, { ...result, ...timing });
    const outcome = result.correct
      ? 'correct'
      : result.errorTag === PINYIN_ERROR_TAGS.MISSED_CARD ? 'missed' : 'wrong';
    const event = {
      ...result,
      kind: 'card-result',
      accepted: true,
      outcome,
      sessionId: state.sessionId,
      position,
      timing,
      hintUsed: timing.hintUsed
    };
    if (result.correct) {
      state.answeredCount += 1;
      state.currentCardIndex += 1;
      state.currentCardId = currentCard()?.cardId || null;
      state.cardStartedSimulationMs = state.learningClock.simulationMs;
      if (!state.currentCardId) {
        state.status = 'completed';
        stopLoop();
      }
    } else {
      state.reviewQueue = enqueuePinyinReview(state.reviewQueue, {
        cardId: question.cardId,
        source: result.errorTag === PINYIN_ERROR_TAGS.MISSED_CARD ? 'missed-card' : 'wrong-answer',
        errorTag: result.errorTag,
        position
      });
      state.metrics = {
        ...state.metrics,
        review: { ...state.metrics.review, queued: state.reviewQueue.length }
      };
      state.lastFeedback = {
        cardId: question.cardId,
        errorTag: result.errorTag,
        position
      };
      restoreCardPosition(question.cardId);
      pauseFor(PINYIN_LEARNING_REASONS.REVIEW);
    }
    for (const listener of listeners) listener(clone(event));
    render();
    return event;
  }

  function submitReviewAnswer(response, metadata = {}, cardId = state.reviewQueue[0]?.cardId) {
    const entry = state.reviewQueue.find((item) => item.cardId === cardId);
    const card = cardList.find((item) => item.cardId === cardId);
    if (!entry || !card) return null;
    const question = createPinyinQuestion({ card, type: state.questionType, source: 'review' });
    const result = evaluatePinyinQuestion(question, response);
    const routeSelection = result.correct && metadata.routeDecision
      ? resolveRouteSelection(
        state.track,
        metadata.routeDecision.segmentId,
        metadata.routeDecision.branchId,
        state.questionType
      )
      : null;
    const timing = answerMetadata(metadata);
    state.metrics = recordPinyinReviewMetrics(state.metrics, { ...result, ...timing });
    const event = {
      ...result,
      kind: 'review-result',
      accepted: true,
      review: true,
      outcome: result.correct ? 'correct' : 'wrong',
      sessionId: state.sessionId,
      position: { ...entry.position },
      timing
    };
    if (result.correct) {
      if (routeSelection) {
        state.track = routeSelection.nextTrack;
        state.routeDecision = {
          segmentId: String(metadata.routeDecision.segmentId),
          expectedBranchId: String(routeSelection.segment.defaultBranch || ''),
          selectedBranchId: String(metadata.routeDecision.branchId),
          accepted: true,
          consequence: routeConsequence(routeSelection.segment, metadata.routeDecision.branchId)
        };
      }
      restoreCardPosition(cardId);
      state.reviewQueue = state.reviewQueue.filter((item) => item.cardId !== cardId);
      state.metrics = {
        ...state.metrics,
        review: { ...state.metrics.review, queued: state.reviewQueue.length }
      };
      state.currentCardIndex = cardList.findIndex((item) => item.cardId === cardId) + 1;
      state.currentCardId = currentCard()?.cardId || null;
      state.cardStartedSimulationMs = state.learningClock.simulationMs;
      if (!state.currentCardId) {
        state.status = 'completed';
        stopLoop();
      } else {
        resumeLearning();
      }
    } else {
      state.reviewQueue = state.reviewQueue.map((item) => item.cardId === cardId
        ? { ...item, attempts: item.attempts + 1, lastErrorTag: result.errorTag }
        : item);
      state.lastFeedback = { cardId, errorTag: result.errorTag, position: entry.position };
      pauseFor(PINYIN_LEARNING_REASONS.REVIEW);
    }
    render();
    return {
      ...event,
      ...(routeSelection ? { routeDecision: getRouteDecision() } : {})
    };
  }

  function onCardResult(listener) {
    if (typeof listener !== 'function') throw new TypeError('Card result listener must be a function');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function stop() {
    stopLoop();
    state.status = 'stopped';
    render();
    return getSnapshot();
  }

  return Object.freeze({
    mount,
    pauseFor,
    slowFor,
    resumeLearning,
    pause,
    resume,
    useHint,
    getRouteDecision,
    chooseLearningRoute,
    stop,
    advance,
    setVehiclePosition,
    setTargetPosition,
    checkCollision,
    recordCollision,
    submitAnswer,
    submitReviewAnswer,
    restoreCardPosition,
    getSnapshot,
    onCardResult
  });
}
