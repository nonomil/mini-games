import { buildChoices, EXPRESSION_CARDS } from './tennis-content.js';

export const PHASES = Object.freeze({
  READY: 'ready',
  SERVE: 'serve',
  CHOOSE: 'choose',
  RALLY: 'rally',
  FEEDBACK: 'feedback',
  COMPLETE: 'complete'
});

const MIN_ROUND_SIZE = 6;
const MAX_ROUND_SIZE = 8;

const clone = (value) => JSON.parse(JSON.stringify(value));

function requirePhase(state, phase) {
  if (state.phase !== phase) {
    throw new Error(`Action requires phase ${phase}, got ${state.phase}`);
  }
}

export function createTennisSession({
  cards = EXPRESSION_CARDS,
  roundSize = 7,
  sessionId = `tennis-${Date.now()}`,
  mode = 'standard',
  sourceSessionId = null,
  reviewCardIds = [],
  roundCards = null
} = {}) {
  if (!Array.isArray(cards) || cards.length < MAX_ROUND_SIZE) {
    throw new Error('Tennis session needs at least eight expression cards');
  }
  if (!Number.isInteger(roundSize) || roundSize < MIN_ROUND_SIZE || roundSize > MAX_ROUND_SIZE) {
    throw new Error(`Tennis round size must be between ${MIN_ROUND_SIZE} and ${MAX_ROUND_SIZE}`);
  }

  const pointCards = Array.isArray(roundCards) ? roundCards : cards.slice(0, roundSize);
  if (pointCards.length < roundSize) {
    throw new Error(`Tennis session needs ${roundSize} point cards`);
  }
  const state = {
    sessionId: String(sessionId),
    gameId: 'tennis-english',
    domain: 'english-expression',
    responseMode: 'choice-return',
    mode,
    sourceSessionId,
    reviewCardIds: [...reviewCardIds],
    phase: PHASES.READY,
    roundIndex: 0,
    roundSize,
    score: { player: 0, opponent: 0 },
    current: null,
    result: null,
    results: []
  };

  function getState() {
    return clone(state);
  }

  function start() {
    if (state.phase === PHASES.READY) state.phase = PHASES.SERVE;
    return getState();
  }

  function serve() {
    requirePhase(state, PHASES.SERVE);
    const target = pointCards[state.roundIndex];
    const promptMode = state.roundIndex % 2 === 0 ? 'definition-en' : 'context';
    state.current = {
      cardId: target.cardId,
      targetCardId: target.cardId,
      promptMode,
      prompt: promptMode === 'context' ? target.example : target.definitionEn,
      promptZh: target.definitionZh,
      example: target.example,
      choices: buildChoices(cards, target),
      hintUsed: 0,
      audioReplayCount: 0,
      selectedCardId: null,
      startedAt: Date.now()
    };
    state.result = null;
    state.phase = PHASES.CHOOSE;
    return getState();
  }

  function useHint() {
    requirePhase(state, PHASES.CHOOSE);
    state.current.hintUsed += 1;
    return getState();
  }

  function replayAudio() {
    if (state.phase !== PHASES.CHOOSE && state.phase !== PHASES.FEEDBACK) {
      throw new Error(`Audio replay is unavailable in phase ${state.phase}`);
    }
    state.current.audioReplayCount += 1;
    return getState();
  }

  function selectCard(cardId) {
    requirePhase(state, PHASES.CHOOSE);
    if (!state.current.choices.some((choice) => choice.cardId === cardId)) {
      throw new Error(`Card ${cardId} is not a choice for this point`);
    }
    state.current.selectedCardId = cardId;
    state.phase = PHASES.RALLY;
    return getState();
  }

  function returnBall() {
    requirePhase(state, PHASES.RALLY);
    const target = cards.find((card) => card.cardId === state.current.targetCardId);
    const selectedCardId = state.current.selectedCardId;
    const correct = selectedCardId === target.cardId;
    const feedback = correct
      ? null
      : target.wrongAnswerFeedback[selectedCardId] || {
        errorType: 'wrong-context',
        explanationZh: '这个表达在当前句子里不自然，请再读一次语境。',
        explanationEn: 'This expression is not natural in the current context. Read the sentence once more.'
      };
    const result = {
      cardId: target.cardId,
      selectedCardId,
      correct,
      independent: correct && state.current.hintUsed === 0,
      learningEvidence: correct
        ? (state.current.hintUsed === 0 ? 'independent-correct' : 'hint-correct')
        : 'wrong',
      wrongTag: feedback?.errorType || null,
      feedback,
      hintUsed: state.current.hintUsed,
      audioReplayCount: state.current.audioReplayCount,
      promptMode: state.current.promptMode,
      completedAt: Date.now()
    };
    state.result = result;
    state.results.push(result);
    if (correct) state.score.player += 1;
    else state.score.opponent += 1;
    state.phase = PHASES.FEEDBACK;
    return getState();
  }

  function nextPoint() {
    if (state.phase === PHASES.COMPLETE) return getState();
    requirePhase(state, PHASES.FEEDBACK);
    if (state.roundIndex + 1 >= state.roundSize) {
      state.current = null;
      state.phase = PHASES.COMPLETE;
      return getState();
    }
    state.roundIndex += 1;
    state.current = null;
    state.result = null;
    state.phase = PHASES.SERVE;
    return getState();
  }

  function getReviewSet() {
    const reviewByCardId = new Map();
    for (const result of state.results) {
      if (result.correct) continue;
      const card = cards.find((candidate) => candidate.cardId === result.cardId);
      if (!card) continue;
      const existing = reviewByCardId.get(card.cardId);
      if (existing) {
        existing.mistakeCount += 1;
        existing.wrongTag = result.wrongTag;
        existing.feedback = clone(result.feedback);
        continue;
      }
      reviewByCardId.set(card.cardId, {
        ...clone(card),
        wrongTag: result.wrongTag,
        feedback: clone(result.feedback),
        mistakeCount: 1
      });
    }
    return clone([...reviewByCardId.values()]);
  }

  function startReview() {
    requirePhase(state, PHASES.COMPLETE);
    const reviewSet = getReviewSet();
    if (reviewSet.length === 0) return null;
    const reviewRoundSize = Math.max(MIN_ROUND_SIZE, Math.min(MAX_ROUND_SIZE, reviewSet.length));
    const reviewPointCards = Array.from({ length: reviewRoundSize }, (_, index) =>
      reviewSet[index % reviewSet.length]
    );
    return createTennisSession({
      cards,
      roundCards: reviewPointCards,
      roundSize: reviewRoundSize,
      sessionId: `${state.sessionId}:review`,
      mode: 'review',
      sourceSessionId: state.sessionId,
      reviewCardIds: reviewSet.map((card) => card.cardId)
    });
  }

  function restart() {
    requirePhase(state, PHASES.COMPLETE);
    return createTennisSession({
      cards,
      roundSize,
      sessionId: `${state.sessionId}:replay:${Date.now()}`,
      mode: 'standard'
    });
  }

  return {
    getState,
    start,
    serve,
    useHint,
    replayAudio,
    selectCard,
    returnBall,
    nextPoint,
    getReviewSet,
    startReview,
    restart
  };
}
