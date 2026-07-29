import { PINYIN_CARD_DATA } from './pinyin-data.js';

export const PINYIN_PREINTEGRATION_VERSION = 1;
export const PINYIN_PREINTEGRATION_CONTENT_TYPE = 'pinyin';
export const PINYIN_PREINTEGRATION_MESSAGE_TYPES = Object.freeze([
  'ready',
  'init',
  'card-result',
  'complete',
  'stop',
  'error'
]);

function freezeFixture(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) freezeFixture(child);
  return value;
}

function envelope(type, identity, cardId, payload) {
  return {
    type,
    protocolVersion: PINYIN_PREINTEGRATION_VERSION,
    sessionId: identity.sessionId,
    gameId: identity.gameId,
    cardId,
    payload
  };
}

export function createPinyinPreintegrationFixture({
  sessionId = 'pinyin-preintegration-session',
  card = PINYIN_CARD_DATA[0],
  returnContext = {}
} = {}) {
  if (!card) throw new TypeError('A pinyin card is required for the preintegration fixture');
  const identity = {
    sessionId: String(sessionId),
    gameId: 'pinyin-racer'
  };
  const hostCard = {
    cardId: card.cardId,
    word: card.char,
    translation: card.pinyinDisplay,
    image: null,
    audio: card.audio,
    example: card.example,
    domain: 'pinyin',
    contentType: PINYIN_PREINTEGRATION_CONTENT_TYPE,
    char: card.char,
    pinyinDisplay: card.pinyinDisplay,
    pinyinKey: card.pinyinKey,
    initial: card.initial,
    final: card.final,
    tone: card.tone
  };
  const context = {
    returnTo: 'learning-arcade',
    hostId: 'learning-arcade',
    mode: 'word-cannon',
    sourceGame: identity.gameId,
    ...returnContext,
    sessionId: identity.sessionId,
    gameId: identity.gameId,
    cardId: hostCard.cardId
  };
  const snapshot = {
    version: PINYIN_PREINTEGRATION_VERSION,
    domain: 'pinyin',
    sessionId: identity.sessionId,
    gameId: identity.gameId,
    status: 'ready',
    currentCardIndex: 0,
    currentCardId: hostCard.cardId,
    questionType: 'character-pinyin-choice',
    track: {
      version: 1,
      id: 'pinyin-preintegration-straight',
      cameraDistance: 0
    },
    returnContext: context
  };
  const messages = {
    ready: envelope('ready', identity, null, { returnContext: context }),
    init: envelope('init', identity, hostCard.cardId, {
      card: hostCard,
      returnContext: context,
      snapshot
    }),
    cardResult: envelope('card-result', identity, hostCard.cardId, {
      cardId: hostCard.cardId,
      correct: true,
      domain: 'pinyin',
      contentType: PINYIN_PREINTEGRATION_CONTENT_TYPE,
      responseMode: 'choice',
      returnContext: context
    }),
    complete: envelope('complete', identity, null, {
      resultCount: 1,
      returnContext: context
    }),
    stop: envelope('stop', identity, null, { returnContext: context }),
    error: envelope('error', identity, null, {
      code: 'wrong-answer',
      message: 'pinyin answer is incorrect',
      returnContext: context
    })
  };

  return freezeFixture({
    fixtureOnly: true,
    coreProtocolVersion: PINYIN_PREINTEGRATION_VERSION,
    messageTypes: PINYIN_PREINTEGRATION_MESSAGE_TYPES,
    identity,
    card: hostCard,
    returnContext: context,
    messages,
    snapshot,
    ownership: {
      sharedEntry: 'games/learning-arcade/game.js',
      owner: 'SHOOTER',
      confirmation: 'main-control',
      status: 'fixture-only'
    }
  });
}
