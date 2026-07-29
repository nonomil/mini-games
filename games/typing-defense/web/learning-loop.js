export const LEARNING_STORAGE_KEY = "petbank.typing-defense.learning.v1";

export const EVENT_TYPES = Object.freeze({
  PRESENTED: "presented",
  HINT: "hint",
  INDEPENDENT_CORRECT: "independent-correct",
  GUIDED_CORRECT: "guided-correct",
  WRONG: "wrong",
  GAVE_UP: "gave-up"
});

const TERMINAL_EVENTS = new Set([
  EVENT_TYPES.INDEPENDENT_CORRECT,
  EVENT_TYPES.GUIDED_CORRECT,
  EVENT_TYPES.GAVE_UP
]);

const REVIEW_DELAYS = {
  [EVENT_TYPES.INDEPENDENT_CORRECT]: 24 * 60 * 60 * 1000,
  [EVENT_TYPES.GUIDED_CORRECT]: 4 * 60 * 60 * 1000,
  [EVENT_TYPES.GAVE_UP]: 15 * 60 * 1000,
  [EVENT_TYPES.WRONG]: 15 * 60 * 1000
};

function emptyData() {
  return {
    version: 1,
    updatedAt: 0,
    cards: {},
    session: null
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function createSessionId(now) {
  return `typing-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function cardIdFor(card, vocabId = "unknown") {
  const directId = String(card?.cardId || card?.id || card?.sourceCardId || "").trim();
  if (directId) return directId;
  const target = String(card?.target || card?.answer || "").trim().toLowerCase();
  const bank = String(card?.bankKey || card?.taskType || "words").trim();
  return `${vocabId}:${bank}:${target || "unknown"}`;
}

function createCardRecord(cardId, card) {
  return {
    cardId,
    target: String(card?.target || card?.answer || ""),
    translation: String(card?.translation || ""),
    presented: 0,
    independentCorrect: 0,
    guidedCorrect: 0,
    wrong: 0,
    gaveUp: 0,
    errorTags: [],
    wrongIndexes: [],
    lastResult: "",
    lastPresentedAt: 0,
    lastCompletedAt: 0,
    nextReviewAt: 0,
    streak: 0,
    lastPromptMode: ""
  };
}

function ensureCard(data, cardId, card) {
  if (!data.cards[cardId]) data.cards[cardId] = createCardRecord(cardId, card);
  const record = data.cards[cardId];
  if (!record.target) record.target = String(card?.target || card?.answer || "");
  if (!record.translation) record.translation = String(card?.translation || "");
  return record;
}

function loadData(storage) {
  if (!storage) return emptyData();
  try {
    const raw = storage.getItem(LEARNING_STORAGE_KEY);
    if (!raw) return emptyData();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || typeof parsed.cards !== "object") return emptyData();
    return {
      ...emptyData(),
      ...parsed,
      cards: parsed.cards || {}
    };
  } catch {
    return emptyData();
  }
}

function saveData(storage, data, now) {
  data.updatedAt = now();
  if (!storage) return;
  try {
    storage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Private browsing or a blocked origin must not stop the game.
  }
}

export function classifyTypingError(answer, typed) {
  const expected = String(answer || "").toLowerCase();
  const actual = String(typed || "").toLowerCase();
  const limit = Math.max(expected.length, actual.length);
  let errorIndex = 0;
  while (errorIndex < limit && expected[errorIndex] === actual[errorIndex]) errorIndex += 1;
  const lastIndex = Math.max(0, expected.length - 1);
  const errorTag = errorIndex === 0
    ? "wrong-first-letter"
    : errorIndex >= lastIndex
      ? "wrong-ending"
      : "wrong-middle-letter";
  return { errorTag, errorIndex };
}

function addUnique(list, value, limit = 8) {
  if (!value || list.includes(value)) return;
  list.push(value);
  if (list.length > limit) list.splice(0, list.length - limit);
}

export function createLearningStore(storage, now = () => Date.now()) {
  const data = loadData(storage);

  function persist() {
    saveData(storage, data, now);
  }

  function addMistake(cardId) {
    if (!data.session) return;
    if (!data.session.mistakeCardIds.includes(cardId)) data.session.mistakeCardIds.push(cardId);
  }

  function startSession(meta = {}) {
    const startedAt = now();
    data.session = {
      sessionId: String(meta.sessionId || createSessionId(startedAt)),
      startedAt,
      endedAt: 0,
      mode: String(meta.mode || "words"),
      vocabId: String(meta.vocabId || ""),
      cardResults: [],
      mistakeCardIds: [],
      presentations: {}
    };
    persist();
    return clone(data.session);
  }

  function present(card, meta = {}) {
    if (!data.session || (meta.sessionId && data.session.sessionId !== meta.sessionId)) {
      startSession({
        sessionId: meta.sessionId,
        mode: meta.mode,
        vocabId: meta.vocabId
      });
    }
    const cardId = cardIdFor(card, meta.vocabId || data.session.vocabId);
    const presentationId = String(meta.presentationId || `${data.session.sessionId}:${cardId}:${data.session.cardResults.length}`);
    const existing = data.session.presentations[presentationId];
    if (existing) return { duplicate: true, presentation: clone(existing), event: { type: EVENT_TYPES.PRESENTED, cardId, presentationId } };

    const presentedAt = now();
    const presentation = {
      presentationId,
      cardId,
      presentedAt,
      completedAt: 0,
      promptMode: String(meta.promptMode || "meaning-to-word"),
      wrongCount: 0,
      hintUsed: safeNumber(meta.hintUsed),
      errorTags: [],
      result: ""
    };
    data.session.presentations[presentationId] = presentation;
    const record = ensureCard(data, cardId, card);
    record.presented += 1;
    record.lastPresentedAt = presentedAt;
    record.lastPromptMode = presentation.promptMode;
    persist();
    return {
      duplicate: false,
      presentation: clone(presentation),
      event: { type: EVENT_TYPES.PRESENTED, cardId, presentationId, at: presentedAt }
    };
  }

  function recordWrong(presentationId, detail = {}) {
    const presentation = data.session?.presentations?.[presentationId];
    if (!presentation || presentation.result) return { ignored: true, duplicate: Boolean(presentation?.result) };
    const record = data.cards[presentation.cardId] || ensureCard(data, presentation.cardId, {});
    const errorTag = String(detail.errorTag || "wrong-middle-letter");
    const errorIndex = Math.max(0, safeNumber(detail.errorIndex));
    presentation.wrongCount += 1;
    addUnique(presentation.errorTags, errorTag);
    record.wrong += 1;
    addUnique(record.errorTags, errorTag);
    addUnique(record.wrongIndexes, errorIndex, 12);
    record.nextReviewAt = now() + REVIEW_DELAYS[EVENT_TYPES.WRONG];
    addMistake(presentation.cardId);
    persist();
    return {
      ignored: false,
      event: {
        type: EVENT_TYPES.WRONG,
        cardId: presentation.cardId,
        presentationId,
        errorTag,
        errorIndex,
        at: now()
      }
    };
  }

  function recordHint(presentationId, meta = {}) {
    const presentation = data.session?.presentations?.[presentationId];
    if (!presentation || presentation.result) return { ignored: true, duplicate: Boolean(presentation?.result) };
    const amount = Math.max(1, Math.floor(safeNumber(meta.amount, 1)));
    presentation.hintUsed += amount;
    if (meta.hintLevel !== undefined) presentation.hintLevel = Math.max(0, safeNumber(meta.hintLevel));
    if (meta.hintText) presentation.lastHintText = String(meta.hintText);
    persist();
    return {
      ignored: false,
      event: {
        type: EVENT_TYPES.HINT,
        cardId: presentation.cardId,
        presentationId,
        hintUsed: presentation.hintUsed,
        at: now()
      }
    };
  }

  function recordResult(presentationId, requestedType, meta = {}) {
    const presentation = data.session?.presentations?.[presentationId];
    if (!presentation) return { ignored: true, missing: true };
    if (presentation.result) return { duplicate: true, result: presentation.result, presentation: clone(presentation) };
    if (!TERMINAL_EVENTS.has(requestedType)) return { ignored: true, invalid: true };

    const result = requestedType === EVENT_TYPES.INDEPENDENT_CORRECT && (presentation.wrongCount > 0 || presentation.hintUsed > 0)
      ? EVENT_TYPES.GUIDED_CORRECT
      : requestedType;
    const completedAt = now();
    const record = data.cards[presentation.cardId] || ensureCard(data, presentation.cardId, {});
    if (meta.errorTag) {
      addUnique(presentation.errorTags, String(meta.errorTag));
      addUnique(record.errorTags, String(meta.errorTag));
    }
    presentation.result = result;
    presentation.completedAt = completedAt;
    presentation.elapsedMs = Math.max(0, safeNumber(meta.elapsedMs, completedAt - presentation.presentedAt));
    record.lastResult = result;
    record.lastCompletedAt = completedAt;
    if (result === EVENT_TYPES.INDEPENDENT_CORRECT) {
      record.independentCorrect += 1;
      record.streak += 1;
    } else if (result === EVENT_TYPES.GUIDED_CORRECT) {
      record.guidedCorrect += 1;
      record.streak = 0;
      addMistake(presentation.cardId);
    } else {
      record.gaveUp += 1;
      record.streak = 0;
      addMistake(presentation.cardId);
    }
    record.nextReviewAt = completedAt + REVIEW_DELAYS[result];
    data.session.cardResults.push({
      presentationId,
      cardId: presentation.cardId,
      result,
      elapsedMs: presentation.elapsedMs,
      errorTags: [...presentation.errorTags],
      at: completedAt
    });
    persist();
    return {
      duplicate: false,
      result,
      event: {
        type: result,
        cardId: presentation.cardId,
        presentationId,
        elapsedMs: presentation.elapsedMs,
        errorTags: [...presentation.errorTags],
        at: completedAt
      }
    };
  }

  function recordCorrect(presentationId, meta = {}) {
    const presentation = data.session?.presentations?.[presentationId];
    if (!presentation) return { ignored: true, missing: true };
    const guided = Boolean(meta.hintUsed || presentation.hintUsed || presentation.wrongCount > 0 || presentation.promptMode === "guided");
    return recordResult(
      presentationId,
      guided ? EVENT_TYPES.GUIDED_CORRECT : EVENT_TYPES.INDEPENDENT_CORRECT,
      meta
    );
  }

  function finishSession(meta = {}) {
    if (!data.session) return null;
    data.session.endedAt = now();
    data.session.outcome = String(meta.outcome || "");
    persist();
    return clone(data.session);
  }

  function snapshot() {
    return clone(data);
  }

  function reviewQueue(at = now()) {
    return Object.values(data.cards)
      .filter((card) => card.nextReviewAt > 0 && card.nextReviewAt <= at)
      .sort((left, right) => left.nextReviewAt - right.nextReviewAt)
      .map((card) => clone(card));
  }

  return {
    startSession,
    present,
    recordHint,
    recordWrong,
    recordResult,
    recordCorrect,
    finishSession,
    snapshot,
    reviewQueue,
    serialize() {
      return JSON.stringify(data);
    }
  };
}

if (typeof window !== "undefined") {
  window.__typingDefenseLearning = {
    EVENT_TYPES,
    LEARNING_STORAGE_KEY,
    classifyTypingError,
    createLearningStore
  };
}
