import {
  normalizeHostInit,
  normalizeStandardCard
} from "./card-runtime.js";

export const CORE_V1_PROTOCOL_VERSION = 1;
export const CORE_V1_MESSAGE_TYPES = Object.freeze([
  "ready",
  "init",
  "card-result",
  "complete",
  "stop",
  "error"
]);

const GAME_ID = "typing-defense";
const TERMINAL_PHASES = new Set(["complete", "stopped"]);

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireString(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value.trim();
}

function normalizeLocalCards(cards) {
  if (!Array.isArray(cards)) return [];
  return cards
    .map((card) => normalizeStandardCard(card, {
      defaultDomain: "english",
      defaultContentType: "word",
      fallbackCardId: card?.id
    }))
    .filter(Boolean);
}

export function createCreeperCoreV1Fixture({
  sessionId,
  gameId = GAME_ID,
  localCards = [],
  emit = null
} = {}) {
  const stableSessionId = requireString(sessionId, "sessionId");
  const stableGameId = requireString(gameId, "gameId");
  if (stableGameId !== GAME_ID) throw new Error(`gameId must be ${GAME_ID}`);

  const state = {
    phase: "created",
    mode: "standalone",
    cards: normalizeLocalCards(localCards),
    submittedCardIds: new Set(),
    cleanups: new Set(),
    messages: []
  };

  function getState() {
    return {
      phase: state.phase,
      mode: state.mode,
      cardIds: state.cards.map((card) => card.cardId),
      submittedCardIds: [...state.submittedCardIds],
      messageCount: state.messages.length
    };
  }

  function record(message) {
    const nextMessage = clone(message);
    state.messages.push(nextMessage);
    if (typeof emit === "function") emit(clone(nextMessage));
    return nextMessage;
  }

  function send(type, cardId, payload) {
    return record({
      type,
      protocolVersion: CORE_V1_PROTOCOL_VERSION,
      sessionId: stableSessionId,
      gameId: stableGameId,
      cardId,
      payload
    });
  }

  function ready() {
    if (state.phase !== "created") return null;
    state.phase = "ready";
    return send("ready", null, {});
  }

  function acceptInit(message) {
    if (state.phase !== "ready") return null;
    const normalized = normalizeHostInit(message, {
      defaultDomain: "english",
      defaultContentType: "word"
    });
    if (!normalized.accepted || normalized.sessionId !== stableSessionId) return null;

    state.mode = "host";
    state.cards = normalized.cards;
    state.phase = "initialized";
    const payload = message.payload && typeof message.payload === "object"
      ? { ...message.payload }
      : {};
    if (Array.isArray(payload.cards)) {
      payload.cards = normalized.cards;
    } else {
      payload.card = normalized.cards[0];
    }
    return record({
      type: "init",
      protocolVersion: CORE_V1_PROTOCOL_VERSION,
      sessionId: stableSessionId,
      gameId: stableGameId,
      cardId: message.cardId ?? null,
      payload
    });
  }

  function cardResult(result = {}) {
    if (TERMINAL_PHASES.has(state.phase)) return null;
    const cardId = typeof result.cardId === "string" ? result.cardId.trim() : "";
    if (!cardId || state.submittedCardIds.has(cardId)) return null;
    const card = state.cards.find((candidate) => candidate.cardId === cardId);
    if (!card) return null;

    state.submittedCardIds.add(cardId);
    return send("card-result", cardId, {
      cardId,
      correct: Boolean(result.correct),
      learningEvidence: result.learningEvidence || (result.correct ? "independent-correct" : "wrong"),
      wrongTag: result.wrongTag || null,
      promptMode: result.promptMode || "direct-word-input",
      domain: card.domain,
      contentType: card.contentType
    });
  }

  function complete(payload = {}) {
    if (TERMINAL_PHASES.has(state.phase) || state.phase === "created") return null;
    state.phase = "complete";
    return send("complete", null, {
      score: payload.score ?? null,
      resultCount: Number.isInteger(payload.resultCount)
        ? payload.resultCount
        : state.submittedCardIds.size
    });
  }

  function stop(payload = {}) {
    if (TERMINAL_PHASES.has(state.phase)) return null;
    state.phase = "stopped";
    const cleanups = [...state.cleanups];
    state.cleanups.clear();
    for (const cleanup of cleanups) {
      try {
        cleanup();
      } catch {
        // One cleanup failure must not suppress the stop envelope.
      }
    }
    return send("stop", null, { reason: payload.reason || "user" });
  }

  function error(payload = {}) {
    if (TERMINAL_PHASES.has(state.phase) || state.phase === "created") return null;
    const code = requireString(payload.code, "code");
    const message = requireString(payload.message, "message");
    return send("error", null, {
      ...payload,
      code,
      message
    });
  }

  function registerCleanup(cleanup) {
    if (TERMINAL_PHASES.has(state.phase) || typeof cleanup !== "function") return false;
    state.cleanups.add(cleanup);
    return true;
  }

  return {
    fixtureOnly: true,
    ready,
    acceptInit,
    cardResult,
    complete,
    stop,
    error,
    registerCleanup,
    getState,
    get messages() {
      return clone(state.messages);
    }
  };
}
