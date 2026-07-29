(function () {
  'use strict';

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const launchId = String(params.get('petbankLaunch') || '').trim();
  const profileRef = String(params.get('petbankProfile') || '').trim();
  const hostOrigin = (() => {
    try { return document.referrer ? new URL(document.referrer).origin : ''; } catch (error) { return ''; }
  })();
  const PROTOCOL_VERSION = 1;
  const PROTOCOL_TYPES = new Set(['ready', 'init', 'card-result', 'complete', 'stop', 'error']);
  const PROTOCOL_STORAGE_KEY = 'minigames_protocol_v1';
  const pending = new Map();
  const legacyReported = new Set();
  const protocolStorage = (() => {
    try {
      return window.sessionStorage && typeof window.sessionStorage.getItem === 'function'
        ? window.sessionStorage
        : null;
    } catch (_) {
      return null;
    }
  })();

  function cleanId(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function readProtocolRecovery() {
    if (!protocolStorage) return null;
    try {
      const value = JSON.parse(protocolStorage.getItem(PROTOCOL_STORAGE_KEY) || 'null');
      if (!value || value.version !== PROTOCOL_VERSION || !cleanId(value.sessionId) || !cleanId(value.gameId)) return null;
      const hashSessionId = cleanId(params.get('petbankSession'));
      const hashGameId = cleanId(params.get('petbankGameId'));
      if ((hashSessionId && hashSessionId !== value.sessionId) || (hashGameId && hashGameId !== value.gameId)) return null;
      return {
        phase: String(value.phase || 'idle'),
        sessionId: value.sessionId,
        gameId: value.gameId,
        cardId: cleanId(value.cardId) || null,
        resultKeys: Array.isArray(value.resultKeys) ? value.resultKeys.filter((item) => typeof item === 'string') : [],
        expiredCardIds: Array.isArray(value.expiredCardIds) ? value.expiredCardIds.filter((item) => typeof item === 'string') : [],
        completed: Boolean(value.completed),
        stopped: Boolean(value.stopped),
        timedOut: Boolean(value.timedOut)
      };
    } catch (_) {
      return null;
    }
  }

  const recoveredProtocolState = readProtocolRecovery();
  let protocolTimeoutId = null;
  const protocolState = {
    phase: recoveredProtocolState?.phase || 'idle',
    sessionId: cleanId(params.get('petbankSession')) || recoveredProtocolState?.sessionId || '',
    gameId: cleanId(params.get('petbankGameId')) || recoveredProtocolState?.gameId || '',
    cardId: cleanId(params.get('petbankCardId')) || recoveredProtocolState?.cardId || null,
    resultKeys: new Set(recoveredProtocolState?.resultKeys || []),
    expiredCardIds: new Set(recoveredProtocolState?.expiredCardIds || []),
    completed: Boolean(recoveredProtocolState?.completed),
    stopped: Boolean(recoveredProtocolState?.stopped),
    timedOut: Boolean(recoveredProtocolState?.timedOut),
    readySent: false
  };
  const protocolCleanups = new Set();

  function getLaunchInfo() {
    return { launchId, profileRef, hostOrigin, active: Boolean(launchId && profileRef && hostOrigin && window.opener) };
  }

  function gameUrl(path) {
    const url = new URL(path, window.location.href);
    if (launchId && profileRef) url.hash = `petbankLaunch=${encodeURIComponent(launchId)}&petbankProfile=${encodeURIComponent(profileRef)}`;
    return url.toString();
  }

  function sendToParent(data) {
    if (!window.opener || !hostOrigin) return false;
    try {
      window.opener.postMessage(data, hostOrigin);
      return true;
    } catch (error) {
      console.warn('[mini-games-bridge] parent message failed', error);
      return false;
    }
  }

  function protocolTarget() {
    const target = window.parent && window.parent !== window ? window.parent : window.opener;
    const targetOrigin = hostOrigin || String(window.location.origin || '').trim();
    if (!target || !targetOrigin || targetOrigin === 'null') return null;
    return { target, targetOrigin };
  }

  function sendProtocol(data) {
    const target = protocolTarget();
    if (!target) return false;
    try {
      target.target.postMessage(data, target.targetOrigin);
      return true;
    } catch (error) {
      console.warn('[mini-games-bridge] protocol message failed', error);
      return false;
    }
  }

  function resolveProtocolIdentity(input = {}) {
    const sessionId = cleanId(input.sessionId || protocolState.sessionId);
    const gameId = cleanId(input.gameId || protocolState.gameId);
    if (!sessionId || !gameId) return null;
    if (protocolState.sessionId && protocolState.sessionId !== sessionId) return null;
    if (protocolState.gameId && protocolState.gameId !== gameId) return null;
    return { sessionId, gameId };
  }

  function protocolMessage(type, identity, cardId = null, payload = {}) {
    return {
      type,
      protocolVersion: PROTOCOL_VERSION,
      sessionId: identity.sessionId,
      gameId: identity.gameId,
      cardId,
      payload: payload && typeof payload === 'object' ? payload : {}
    };
  }

  function persistProtocolState() {
    if (!protocolStorage) return;
    try {
      protocolStorage.setItem(PROTOCOL_STORAGE_KEY, JSON.stringify({
        version: PROTOCOL_VERSION,
        phase: protocolState.phase,
        sessionId: protocolState.sessionId,
        gameId: protocolState.gameId,
        cardId: protocolState.cardId,
        resultKeys: Array.from(protocolState.resultKeys),
        expiredCardIds: Array.from(protocolState.expiredCardIds),
        completed: protocolState.completed,
        stopped: protocolState.stopped,
        timedOut: protocolState.timedOut
      }));
    } catch (error) {
      console.warn('[mini-games-bridge] protocol recovery persistence failed', error);
    }
  }

  function dispatchProtocolEvent(type, detail) {
    if (typeof window.dispatchEvent !== 'function') return;
    try {
      const event = typeof window.CustomEvent === 'function'
        ? new window.CustomEvent(type, { detail })
        : new CustomEvent(type, { detail });
      window.dispatchEvent(event);
    } catch (error) {
      console.warn('[mini-games-bridge] protocol event failed', error);
    }
  }

  function isAllowedProtocolOrigin(event) {
    const expectedOrigin = hostOrigin || String(window.location.origin || '').trim();
    return Boolean(expectedOrigin && event.origin === expectedOrigin);
  }

  function isProtocolPeer(event) {
    const peers = [window.parent, window.opener].filter((peer) => peer && peer !== window);
    return peers.length > 0 && peers.includes(event.source);
  }

  function isProtocolEnvelope(data, expectedType) {
    return Boolean(
      data &&
      PROTOCOL_TYPES.has(data.type) &&
      (!expectedType || data.type === expectedType) &&
      data.protocolVersion === PROTOCOL_VERSION &&
      cleanId(data.sessionId) &&
      cleanId(data.gameId) &&
      ((data.type === 'init' || data.type === 'card-result')
        ? cleanId(data.cardId)
        : data.cardId === null)
    );
  }

  function registerCleanup(cleanup) {
    if (typeof cleanup !== 'function') return () => {};
    if (protocolState.stopped) {
      try { cleanup(); } catch (error) { console.warn('[mini-games-bridge] cleanup failed', error); }
      return () => {};
    }
    protocolCleanups.add(cleanup);
    return () => protocolCleanups.delete(cleanup);
  }

  function runProtocolCleanups() {
    const cleanups = Array.from(protocolCleanups);
    protocolCleanups.clear();
    cleanups.forEach((cleanup) => {
      try { cleanup(); } catch (error) { console.warn('[mini-games-bridge] cleanup failed', error); }
    });
    if (window.MiniGamesHost && typeof window.MiniGamesHost.cleanup === 'function') {
      window.MiniGamesHost.cleanup();
    }
  }

  function ready(input = {}) {
    if (protocolState.stopped || protocolState.timedOut || protocolState.completed || protocolState.readySent) return false;
    const identity = resolveProtocolIdentity(input);
    if (!identity) return false;
    const sent = sendProtocol(protocolMessage('ready', identity));
    if (!sent) return false;
    protocolState.sessionId = identity.sessionId;
    protocolState.gameId = identity.gameId;
    protocolState.phase = 'ready';
    protocolState.readySent = true;
    persistProtocolState();
    return true;
  }

  function acceptInit(data) {
    if (protocolState.stopped || !isProtocolEnvelope(data, 'init')) return false;
    const identity = resolveProtocolIdentity(data);
    const cardId = cleanId(data.cardId);
    if (!identity || !cardId) return false;
    const card = data.payload && data.payload.card;
    if (!card || typeof card !== 'object' || cleanId(card.cardId) !== cardId) return false;
    if (protocolState.completed || protocolState.timedOut) return false;
    if (protocolState.cardId && protocolState.cardId !== cardId) {
      protocolState.expiredCardIds.add(protocolState.cardId);
    }
    if (protocolState.expiredCardIds.has(cardId)) return false;
    protocolState.sessionId = identity.sessionId;
    protocolState.gameId = identity.gameId;
    protocolState.cardId = cardId;
    protocolState.phase = 'initialized';
    persistProtocolState();
    dispatchProtocolEvent('mini-games:init', data);
    return true;
  }

  function handleProtocolMessage(data) {
    if (data?.type === 'init') return acceptInit(data);
    if (data?.type === 'stop') {
      if (!isProtocolEnvelope(data, 'stop') || data.cardId !== null) return false;
      const identity = resolveProtocolIdentity(data);
      if (!identity) return false;
      return stop({ ...identity, notify: false });
    }
    if (data?.type === 'error' && isProtocolEnvelope(data, 'error')) {
      const identity = resolveProtocolIdentity(data);
      if (!identity || protocolState.stopped || protocolState.timedOut) return false;
      dispatchProtocolEvent('mini-games:error', data);
      return true;
    }
    return false;
  }

  function reportCardResult(input = {}) {
    if (protocolState.stopped || protocolState.timedOut || protocolState.completed) return false;
    const identity = resolveProtocolIdentity(input);
    const cardId = cleanId(input.cardId);
    if (!identity || !cardId || cardId !== protocolState.cardId || protocolState.expiredCardIds.has(cardId)) return false;
    const resultKey = `${identity.sessionId}:${cardId}`;
    if (protocolState.resultKeys.has(resultKey)) return false;
    const message = protocolMessage('card-result', identity, cardId, input.payload);
    if (!sendProtocol(message)) return false;
    protocolState.resultKeys.add(resultKey);
    protocolState.phase = 'result';
    persistProtocolState();
    dispatchProtocolEvent('mini-games:card-result', message);
    return true;
  }

  function reportError(input = {}) {
    if (protocolState.stopped || protocolState.timedOut) return false;
    const identity = resolveProtocolIdentity(input);
    if (!identity) return false;
    const payload = input.payload && typeof input.payload === 'object'
      ? { ...input.payload }
      : {};
    payload.code = cleanId(input.code) || cleanId(payload.code) || 'unknown-error';
    payload.message = String(input.message || payload.message || '').trim();
    const message = protocolMessage('error', identity, null, payload);
    if (!sendProtocol(message)) return false;
    protocolState.phase = 'error';
    persistProtocolState();
    dispatchProtocolEvent('mini-games:error', message);
    return true;
  }

  function complete(input = {}) {
    if (protocolState.stopped || protocolState.timedOut || protocolState.completed) return false;
    const identity = resolveProtocolIdentity(input);
    if (!identity || protocolState.phase === 'idle') return false;
    if (!sendProtocol(protocolMessage('complete', identity, null, input.payload))) return false;
    protocolState.completed = true;
    protocolState.phase = 'completed';
    persistProtocolState();
    dispatchProtocolEvent('mini-games:complete', protocolMessage('complete', identity, null, input.payload));
    return true;
  }

  function armTimeout(milliseconds, input = {}) {
    if (protocolState.stopped || protocolState.timedOut || protocolState.completed || protocolTimeoutId !== null) return false;
    const delay = Number(milliseconds);
    if (typeof setTimeout !== 'function' || !Number.isFinite(delay) || delay < 0) return false;
    let unregister = () => {};
    const timerId = setTimeout(() => {
      protocolTimeoutId = null;
      unregister();
      if (protocolState.stopped || protocolState.timedOut || protocolState.completed) return;
      const timeoutPayload = input.payload && typeof input.payload === 'object'
        ? { ...input.payload, code: 'timeout' }
        : { code: 'timeout', message: String(input.message || 'session timeout') };
      reportError({ ...input, payload: timeoutPayload });
      protocolState.timedOut = true;
      protocolState.phase = 'error';
      persistProtocolState();
    }, delay);
    protocolTimeoutId = timerId;
    unregister = registerCleanup(() => {
      if (typeof clearTimeout === 'function') clearTimeout(timerId);
      if (protocolTimeoutId === timerId) protocolTimeoutId = null;
    });
    return true;
  }

  function stop(input = {}) {
    if (protocolState.stopped) return false;
    const identity = resolveProtocolIdentity(input);
    const shouldNotify = input.notify !== false;
    if (identity && shouldNotify) sendProtocol(protocolMessage('stop', identity));
    protocolState.stopped = true;
    protocolState.phase = 'stopped';
    if (typeof window.removeEventListener === 'function') window.removeEventListener('message', handleWindowMessage);
    runProtocolCleanups();
    persistProtocolState();
    dispatchProtocolEvent('mini-games:stop', protocolState);
    return true;
  }

  function getProtocolState() {
    return {
      phase: protocolState.phase,
      sessionId: protocolState.sessionId,
      gameId: protocolState.gameId,
      cardId: protocolState.cardId,
      resultCount: protocolState.resultKeys.size,
      completed: protocolState.completed,
      stopped: protocolState.stopped,
      timedOut: protocolState.timedOut,
      expiredCardCount: protocolState.expiredCardIds.size
    };
  }

  function reportActivity(input) {
    const activityId = String(input?.activityId || '').trim();
    if (protocolState.stopped || protocolState.timedOut || protocolState.completed || !activityId || !launchId || !profileRef) return false;
    const sessionId = String(input?.sessionId || '').trim();
    const completionId = String(input?.completionId || `${activityId}:${sessionId || Date.now()}`).trim();
    const reportKey = `${activityId}:${completionId}`;
    if (legacyReported.has(reportKey)) return false;
    legacyReported.add(reportKey);
    return sendToParent({
      type: 'petbank.bridge.v1.completed',
      version: 1,
      projectId: 'mini-games',
      launchId,
      profileRef,
      activityId,
      completionId,
      score: Number(input?.score) || 0,
      stars: Number(input?.stars || input?.earnedStars) || 0,
      occurredAt: input?.occurredAt || new Date().toISOString()
    });
  }

  function legacyCompletion(data) {
    if (!data || data.kind !== 'result') return null;
    const payload = data.payload && typeof data.payload === 'object' ? data.payload : {};
    if (data.source === 'petbank-typing-defense') {
      return payload.won ? { activityId: 'typing-defense', completionId: `typing-defense:${data.sessionId || data.seq}`, sessionId: data.sessionId, score: payload.score, stars: payload.earnedStars } : null;
    }
    if (data.source === 'petbank-learning-arcade') {
      return { activityId: 'learning-arcade', completionId: `learning-arcade:${data.sessionId || data.seq}:${payload.gameId || 'round'}`, sessionId: data.sessionId, score: payload.score, stars: payload.earnedStars };
    }
    if (data.source === 'petbank-word-memory-map') {
      return { activityId: 'word-memory-map', completionId: `word-memory-map:${data.sessionId || data.seq}`, sessionId: data.sessionId, score: payload.score, stars: payload.earnedStars };
    }
    return null;
  }

  function handleWindowMessage(event) {
    const data = event.data || {};
    if (isAllowedProtocolOrigin(event) && isProtocolPeer(event) && isProtocolEnvelope(data)) {
      handleProtocolMessage(data);
    }
    if (event.origin === window.location.origin) {
      const legacy = legacyCompletion(data);
      if (legacy) reportActivity(legacy);
    }
    if (event.origin === window.location.origin && data.type === 'petbank.bridge.v1.completed') {
      if (data.version !== 1 || data.projectId !== 'mini-games' || data.launchId !== launchId || data.profileRef !== profileRef || !data.activityId || !data.completionId) return;
      pending.set(launchId, { source: event.source, activityId: data.activityId, completionId: data.completionId });
      sendToParent(data);
      return;
    }
    if (event.origin === hostOrigin && data.type === 'petbank.bridge.v1.reward-result') {
      if (data.version !== 1 || data.projectId !== 'mini-games' || data.launchId !== launchId || data.profileRef !== profileRef) return;
      const target = pending.get(launchId);
      if (!target?.source) return;
      target.source.postMessage(data, window.location.origin);
      pending.delete(launchId);
      window.dispatchEvent(new CustomEvent('mini-games:reward', { detail: data }));
    }
  }

  if (!protocolState.stopped) window.addEventListener('message', handleWindowMessage);

  window.MiniGamesBridge = {
    getLaunchInfo,
    gameUrl,
    reportActivity,
    ready,
    reportCardResult,
    error: reportError,
    complete,
    stop,
    armTimeout,
    registerCleanup,
    getProtocolState
  };
}());
