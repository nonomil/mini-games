import { EXPRESSION_CARDS } from './tennis-content.js';

export const PROTOCOL_VERSION = 1;
export const PROTOCOL_TYPES = Object.freeze([
  'ready',
  'init',
  'card-result',
  'complete',
  'stop',
  'error'
]);

const GAME_ID = 'tennis-english';
const DOMAIN = 'english-expression';
const CONTENT_TYPE = 'expression';
const TERMINAL_PHASES = new Set(['complete', 'stopped']);
const LONG_TERM_FIELDS = new Set([
  'mastery',
  'reviewInterval',
  'stability',
  'retention',
  'dueAt',
  'profile'
]);

const clone = (value) => JSON.parse(JSON.stringify(value));

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function assertLearningNeutral(payload) {
  for (const field of LONG_TERM_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      throw new Error(`Protocol payload cannot write ${field}`);
    }
  }
}

export function normalizeExpressionCard(card) {
  const source = card || {};
  const cardId = requireString(source.cardId, 'cardId');
  if (source.domain && source.domain !== DOMAIN) throw new Error(`card ${cardId} must use domain ${DOMAIN}`);
  if (source.contentType && source.contentType !== CONTENT_TYPE) {
    throw new Error(`card ${cardId} must use contentType ${CONTENT_TYPE}`);
  }
  return {
    cardId,
    word: source.expression ?? null,
    translation: source.definitionZh ?? null,
    image: null,
    audio: source.audio ?? null,
    example: source.example ?? null,
    domain: DOMAIN,
    contentType: CONTENT_TYPE,
    expression: source.expression ?? null,
    definitionEn: source.definitionEn ?? null,
    definitionZh: source.definitionZh ?? null,
    level: source.level ?? null,
    confusionSet: [...(source.confusionSet || [])]
  };
}

function withReturnContext(payload, returnContext) {
  const nextPayload = { ...payload, returnContext: clone(returnContext) };
  assertLearningNeutral(nextPayload);
  return nextPayload;
}

export function createTennisProtocolFixture({
  sessionId,
  gameId = GAME_ID,
  returnContext = null,
  emit = null
} = {}) {
  const stableSessionId = requireString(sessionId, 'sessionId');
  const stableGameId = requireString(gameId, 'gameId');
  if (stableGameId !== GAME_ID) throw new Error(`gameId must be ${GAME_ID}`);

  const state = {
    phase: 'created',
    initializedCardId: null,
    submittedCardIds: new Set(),
    cleanups: new Set(),
    messages: []
  };

  function getState() {
    return {
      phase: state.phase,
      initializedCardId: state.initializedCardId,
      submittedCardIds: [...state.submittedCardIds],
      messageCount: state.messages.length
    };
  }

  function send(type, cardId, payload) {
    const message = {
      type,
      protocolVersion: PROTOCOL_VERSION,
      sessionId: stableSessionId,
      gameId: stableGameId,
      cardId,
      payload: withReturnContext(payload, returnContext)
    };
    state.messages.push(message);
    if (typeof emit === 'function') emit(clone(message));
    return clone(message);
  }

  function ready() {
    if (state.phase !== 'created') return null;
    state.phase = 'ready';
    return send('ready', null, {});
  }

  function init(card) {
    if (TERMINAL_PHASES.has(state.phase) || state.phase === 'created') return null;
    const normalizedCard = normalizeExpressionCard(card);
    state.phase = 'initialized';
    state.initializedCardId = normalizedCard.cardId;
    return send('init', normalizedCard.cardId, { card: normalizedCard });
  }

  function cardResult(result) {
    if (state.phase !== 'initialized') return null;
    const cardId = requireString(result?.cardId, 'cardId');
    if (cardId !== state.initializedCardId || state.submittedCardIds.has(cardId)) return null;
    const payload = {
      cardId,
      correct: Boolean(result.correct),
      learningEvidence: result.learningEvidence || (result.correct ? 'independent-correct' : 'wrong'),
      wrongTag: result.wrongTag || null,
      promptMode: result.promptMode || null,
      domain: DOMAIN,
      contentType: CONTENT_TYPE
    };
    state.submittedCardIds.add(cardId);
    return send('card-result', cardId, payload);
  }

  function complete(payload = {}) {
    if (TERMINAL_PHASES.has(state.phase) || state.phase === 'created') return null;
    const nextPayload = {
      score: payload.score || null,
      resultCount: Number.isInteger(payload.resultCount) ? payload.resultCount : state.submittedCardIds.size,
      domain: DOMAIN,
      contentType: CONTENT_TYPE
    };
    state.phase = 'complete';
    return send('complete', null, nextPayload);
  }

  function stop(payload = {}) {
    if (TERMINAL_PHASES.has(state.phase)) return null;
    state.phase = 'stopped';
    const cleanups = [...state.cleanups];
    state.cleanups.clear();
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch {
        // A cleanup failure must not prevent the stop envelope.
      }
    }
    return send('stop', null, { reason: payload.reason || 'user' });
  }

  function registerCleanup(cleanup) {
    if (TERMINAL_PHASES.has(state.phase) || typeof cleanup !== 'function') return false;
    state.cleanups.add(cleanup);
    return true;
  }

  function error(payload = {}) {
    if (TERMINAL_PHASES.has(state.phase)) return null;
    const code = requireString(payload.code, 'code');
    const message = requireString(payload.message, 'message');
    return send('error', null, { code, message });
  }

  return {
    ready,
    init,
    cardResult,
    complete,
    stop,
    error,
    registerCleanup,
    getState,
    get messages() {
      return clone(state.messages);
    },
    cardCatalog: EXPRESSION_CARDS.map(normalizeExpressionCard)
  };
}
