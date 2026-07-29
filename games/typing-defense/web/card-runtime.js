export const TYPING_DEFENSE_GAME_ID = "typing-defense";

export const STANDARD_CARD_FIELDS = Object.freeze([
  "cardId",
  "word",
  "translation",
  "image",
  "audio",
  "example",
  "domain",
  "contentType"
]);

function nullable(value) {
  if (value === undefined || value === null || value === "") return null;
  return value;
}

function cardIdFrom(input, fallbackCardId = "") {
  const candidate = input?.cardId ?? input?.id ?? fallbackCardId;
  if (candidate === undefined || candidate === null || String(candidate) === "") return "";
  return String(candidate);
}

export function normalizeStandardCard(input, options = {}) {
  const raw = input && typeof input === "object" ? input : {};
  const cardId = cardIdFrom(raw, options.fallbackCardId);
  if (!cardId) return null;
  return {
    cardId,
    word: nullable(raw.word ?? raw.target ?? raw.char),
    translation: nullable(raw.translation ?? raw.chinese),
    image: nullable(raw.image),
    audio: nullable(raw.audio),
    example: nullable(raw.example ?? raw.phrase),
    domain: nullable(raw.domain ?? options.defaultDomain),
    contentType: nullable(raw.contentType ?? options.defaultContentType)
  };
}

export function normalizeHostInit(message, options = {}) {
  const validMessage = message
    && message.type === "init"
    && Number(message.protocolVersion) === 1
    && message.gameId === TYPING_DEFENSE_GAME_ID;
  if (!validMessage) return { accepted: false, mode: "standalone", reason: "invalid-init", cards: [] };

  const payload = message.payload && typeof message.payload === "object" ? message.payload : {};
  const payloadCards = Array.isArray(payload.cards)
    ? payload.cards
    : payload.card && typeof payload.card === "object"
      ? [payload.card]
      : [];
  const cards = payloadCards
    .map((card, index) => normalizeStandardCard(card, {
      defaultDomain: options.defaultDomain || "english",
      defaultContentType: options.defaultContentType || "word",
      fallbackCardId: payloadCards.length === 1 && index === 0 ? message.cardId : ""
    }))
    .filter(Boolean);

  return {
    accepted: cards.length > 0,
    mode: cards.length > 0 ? "host" : "standalone",
    reason: cards.length > 0 ? "accepted" : "missing-card-id",
    sessionId: String(message.sessionId || ""),
    cards
  };
}

export function normalizeLocalTask(task, options = {}) {
  const raw = task && typeof task === "object" ? task : {};
  const word = raw.word ?? raw.target ?? raw.char ?? "";
  const fallbackCardId = `${options.vocabId || "local"}:${options.defaultDomain || "english"}:${options.defaultContentType || "word"}:${String(word).trim().toLowerCase()}`;
  const card = normalizeStandardCard(raw, {
    defaultDomain: options.defaultDomain || "english",
    defaultContentType: options.defaultContentType || "word",
    fallbackCardId
  });
  if (!card) return null;
  return {
    ...raw,
    ...card,
    id: card.cardId,
    target: String(card.word || "").trim().toLowerCase()
  };
}

export function toTypingTask(card, options = {}) {
  if (!card?.cardId || !card.word) return null;
  const word = String(card.word).trim();
  const translation = String(card.translation || "").trim();
  return {
    ...card,
    id: card.cardId,
    cardId: card.cardId,
    target: word.toLowerCase(),
    hint: translation ? `${translation} ${word}` : word,
    bankKey: options.bankKey || "words",
    taskType: options.taskType || options.bankKey || "words"
  };
}

export function selectRuntimeCards({ hostCards = [], localCards = [] } = {}) {
  if (Array.isArray(hostCards) && hostCards.length > 0) {
    return { mode: "host", cards: [...hostCards] };
  }
  return { mode: "standalone", cards: Array.isArray(localCards) ? [...localCards] : [] };
}
