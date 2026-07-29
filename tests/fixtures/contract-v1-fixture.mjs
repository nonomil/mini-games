const identity = {
  sessionId: 'fixture-session-001',
  gameId: 'word-shooter'
};

const card = {
  cardId: 'fixture-card-attack',
  word: 'attack',
  translation: '攻击',
  image: null,
  audio: null,
  example: 'The superhero will attack the villain.',
  domain: 'english',
  contentType: 'word'
};

const messages = {
  ready: {
    type: 'ready',
    protocolVersion: 1,
    sessionId: identity.sessionId,
    gameId: identity.gameId,
    cardId: null,
    payload: {}
  },
  init: {
    type: 'init',
    protocolVersion: 1,
    sessionId: identity.sessionId,
    gameId: identity.gameId,
    cardId: card.cardId,
    payload: { card }
  },
  cardResult: {
    type: 'card-result',
    protocolVersion: 1,
    sessionId: identity.sessionId,
    gameId: identity.gameId,
    cardId: card.cardId,
    payload: { correct: true }
  },
  complete: {
    type: 'complete',
    protocolVersion: 1,
    sessionId: identity.sessionId,
    gameId: identity.gameId,
    cardId: null,
    payload: { score: 10, stars: 1 }
  },
  stop: {
    type: 'stop',
    protocolVersion: 1,
    sessionId: identity.sessionId,
    gameId: identity.gameId,
    cardId: null,
    payload: {}
  },
  error: {
    type: 'error',
    protocolVersion: 1,
    sessionId: identity.sessionId,
    gameId: identity.gameId,
    cardId: null,
    payload: {
      code: 'wrong-answer',
      message: 'answer is incorrect',
      attempt: 1
    }
  },
  timeoutError: {
    type: 'error',
    protocolVersion: 1,
    sessionId: identity.sessionId,
    gameId: identity.gameId,
    cardId: null,
    payload: {
      code: 'timeout',
      message: 'fixture session timeout'
    }
  }
};

const legacy = {
  launchId: 'fixture-launch-001',
  profileRef: 'fixture-profile-001',
  activity: {
    activityId: 'typing-defense',
    completionId: 'fixture-completion-001',
    sessionId: identity.sessionId,
    score: 8,
    stars: 2,
    occurredAt: '2026-07-27T00:00:00.000Z'
  },
  completed: {
    type: 'petbank.bridge.v1.completed',
    version: 1,
    projectId: 'mini-games',
    launchId: 'fixture-launch-001',
    profileRef: 'fixture-profile-001',
    activityId: 'typing-defense',
    completionId: 'fixture-completion-001',
    score: 8,
    stars: 2,
    occurredAt: '2026-07-27T00:00:00.000Z'
  },
  sourceResult: {
    source: 'petbank-typing-defense',
    kind: 'result',
    version: 1,
    sessionId: identity.sessionId,
    seq: 1,
    payload: {
      won: true,
      score: 8,
      earnedStars: 2
    }
  },
  rewardResult: {
    type: 'petbank.bridge.v1.reward-result',
    version: 1,
    projectId: 'mini-games',
    launchId: 'fixture-launch-001',
    profileRef: 'fixture-profile-001',
    activityId: 'typing-defense',
    completionId: 'fixture-completion-001',
    reward: { stars: 2 }
  }
};

export const V1_FIXTURE = Object.freeze({
  protocolVersion: 1,
  identity,
  card,
  messages,
  api: {
    ready: { ...identity },
    cardResult: { cardId: card.cardId, payload: { correct: true } },
    error: {
      code: 'wrong-answer',
      message: 'answer is incorrect',
      payload: { attempt: 1 }
    },
    complete: { payload: { score: 10, stars: 1 } }
  },
  recovery: {
    storageKey: 'minigames_protocol_v1',
    state: {
      version: 1,
      phase: 'result',
      sessionId: identity.sessionId,
      gameId: identity.gameId,
      cardId: card.cardId,
      resultKeys: [`${identity.sessionId}:${card.cardId}`],
      expiredCardIds: [],
      completed: false,
      stopped: false,
      timedOut: false
    }
  },
  timeout: {
    milliseconds: 1000,
    input: { message: 'fixture session timeout' }
  },
  legacy
});
