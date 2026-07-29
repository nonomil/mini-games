import {
  PINYIN_QUESTION_TYPES,
  createPinyinCard
} from './pinyin-domain.js';
import { createPinyinRacerRuntime } from './pinyin-runtime.js';
import { createTrack } from './pinyin-track.js';

const ROUTE_SEGMENT_ID = 'initial-final-fork';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeCards(cards) {
  return cards.map((card, index) => createPinyinCard({
    ...card,
    cardId: card?.cardId || `pinyin:star-scout:${index + 1}`,
    domain: 'pinyin',
    pinyinDisplay: card?.pinyinDisplay || card?.pinyin
  }));
}

export function createPinyinScoutSession({
  sessionId = 'pinyin-star-scout-session',
  cards = [],
  track = createTrack(),
  snapshot = null,
  questionType = PINYIN_QUESTION_TYPES.FINAL_CHOICE,
  speed = 0
} = {}) {
  const cardList = normalizeCards(cards);
  const restored = snapshot?.runtime || snapshot || null;
  const runtime = createPinyinRacerRuntime({
    sessionId,
    cards: cardList,
    track,
    snapshot: restored,
    questionType,
    speed
  });
  let pendingResponse = snapshot?.pendingResponse || null;
  let pendingRoute = snapshot?.pendingRoute || null;

  function getSnapshot() {
    return runtime.getSnapshot();
  }

  function getSessionSnapshot() {
    return {
      version: 1,
      runtime: getSnapshot(),
      pendingResponse,
      pendingRoute: pendingRoute ? { ...pendingRoute } : null
    };
  }

  function getCurrentCard() {
    const snapshotState = getSnapshot();
    return cardList.find((card) => card.cardId === snapshotState.currentCardId) || null;
  }

  function getAnswerOptions() {
    const current = getCurrentCard();
    if (!current) return [];
    const distractor = cardList.find((card) => card.final !== current.final)?.final || 'ou';
    return [
      { response: current.final, label: current.final, correct: true },
      { response: distractor, label: distractor, correct: false }
    ];
  }

  function mount() {
    return runtime.mount();
  }

  function chooseAnswer(response) {
    const current = getCurrentCard();
    if (!current) return { accepted: false, blocked: true, response: null };
    pendingResponse = String(response || '').trim().toLowerCase();
    return { accepted: Boolean(pendingResponse), response: pendingResponse };
  }

  function chooseRoute({ branchId, segmentId = ROUTE_SEGMENT_ID } = {}) {
    if (!pendingResponse) {
      return {
        kind: 'route-decision',
        accepted: false,
        blocked: true,
        routeDecision: runtime.getRouteDecision()
      };
    }
    pendingRoute = { segmentId: String(segmentId), branchId: String(branchId) };
    const result = runtime.chooseLearningRoute({
      segmentId: pendingRoute.segmentId,
      branchId: pendingRoute.branchId,
      response: pendingResponse
    });
    pendingResponse = null;
    if (result?.correct) pendingRoute = null;
    return result;
  }

  function submitReviewAnswer(response) {
    const decision = runtime.getRouteDecision();
    const routeDecision = pendingRoute || {
      segmentId: decision.segmentId,
      branchId: decision.selectedBranchId
    };
    const result = runtime.submitReviewAnswer(response, { routeDecision });
    if (result?.correct) pendingRoute = null;
    return result;
  }

  return Object.freeze({
    mount,
    chooseAnswer,
    chooseRoute,
    submitReviewAnswer,
    useHint: (options) => runtime.useHint(options),
    slow: (reason, multiplier) => runtime.slowFor(reason, multiplier),
    resume: () => runtime.resumeLearning(),
    pause: (reason) => runtime.pause(reason),
    stop: () => runtime.stop(),
    getCurrentCard,
    getAnswerOptions,
    getRouteDecision: () => runtime.getRouteDecision(),
    getSnapshot,
    getSessionSnapshot
  });
}
