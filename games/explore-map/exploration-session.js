(function (root, factory) {
  'use strict';

  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.ExplorationSession = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const SCHEMA_VERSION = 1;
  const STORAGE_KEY = 'mini-games-exploration-session-v1';

  function text(value) {
    return String(value == null ? '' : value).trim();
  }

  function uniqueIds(value) {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.map(text).filter(Boolean))];
  }

  function timestamp(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : Date.now();
  }

  function getStorage(storage) {
    if (storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function') {
      return storage;
    }
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch (error) {
      return null;
    }
  }

  function createSession(input = {}) {
    const source = input && typeof input === 'object' ? input : {};
    return {
      schemaVersion: SCHEMA_VERSION,
      sessionId: text(source.sessionId) || `explore-session-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      profileId: text(source.profileId),
      mapId: text(source.mapId),
      routeId: text(source.routeId),
      currentNodeId: text(source.currentNodeId),
      currentTaskId: text(source.currentTaskId || source.taskId),
      completedNodeIds: uniqueIds(source.completedNodeIds),
      learningSessionIds: uniqueIds(source.learningSessionIds),
      remainingCardIds: uniqueIds(source.remainingCardIds),
      unclaimedReceiptIds: uniqueIds(source.unclaimedReceiptIds),
      worldDiffs: Array.isArray(source.worldDiffs) ? source.worldDiffs.slice() : [],
      updatedAt: timestamp(source.updatedAt)
    };
  }

  function saveSession(session, storage) {
    const target = getStorage(storage);
    if (!target) return null;
    const normalized = createSession(session);
    try {
      target.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
    } catch (error) {
      return null;
    }
  }

  function loadSession(storage) {
    const target = getStorage(storage);
    if (!target) return null;
    try {
      const raw = target.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) return null;
      return createSession(parsed);
    } catch (error) {
      return null;
    }
  }

  function updateSession(patch, storage) {
    const current = loadSession(storage) || createSession();
    return saveSession({ ...current, ...(patch && typeof patch === 'object' ? patch : {}), updatedAt: Date.now() }, storage);
  }

  function clearSession(storage) {
    const target = getStorage(storage);
    if (!target || typeof target.removeItem !== 'function') return false;
    try {
      target.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      return false;
    }
  }

  function createReturnContext(session, activity = {}) {
    const source = createSession(session);
    const context = {
      activityId: text(activity.activityId),
      mapId: source.mapId,
      routeId: source.routeId,
      nodeId: source.currentNodeId,
      taskId: source.currentTaskId,
      completedNodeIds: source.completedNodeIds,
      learningSessionIds: source.learningSessionIds,
      unclaimedReceiptIds: source.unclaimedReceiptIds,
      remainingCardIds: source.remainingCardIds
    };
    if (text(activity.returnUrl)) context.returnUrl = text(activity.returnUrl);
    return context;
  }

  function encodeReturnContext(context) {
    return encodeURIComponent(JSON.stringify(context && typeof context === 'object' ? context : {}));
  }

  function decodeReturnContext(value) {
    if (!value) return null;
    try {
      const parsed = JSON.parse(decodeURIComponent(String(value)));
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        activityId: text(parsed.activityId),
        mapId: text(parsed.mapId),
        routeId: text(parsed.routeId),
        nodeId: text(parsed.nodeId || parsed.currentNodeId),
        taskId: text(parsed.taskId || parsed.currentTaskId),
        completedNodeIds: uniqueIds(parsed.completedNodeIds),
        learningSessionIds: uniqueIds(parsed.learningSessionIds),
        unclaimedReceiptIds: uniqueIds(parsed.unclaimedReceiptIds),
        remainingCardIds: uniqueIds(parsed.remainingCardIds)
        ,...(text(parsed.returnUrl) ? { returnUrl: text(parsed.returnUrl) } : {})
      };
    } catch (error) {
      return null;
    }
  }

  function addReturnContext(urlValue, context) {
    const base = typeof window !== 'undefined' && window.location ? window.location.href : 'http://localhost/';
    const url = new URL(String(urlValue || ''), base);
    url.searchParams.set('returnContext', encodeReturnContext(context));
    return url.toString();
  }

  return {
    SCHEMA_VERSION,
    STORAGE_KEY,
    createSession,
    saveSession,
    loadSession,
    updateSession,
    clearSession,
    createReturnContext,
    encodeReturnContext,
    decodeReturnContext,
    addReturnContext,
    buildActivityUrl: addReturnContext
  };
}));
