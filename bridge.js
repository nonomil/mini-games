(function () {
  'use strict';

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const launchId = String(params.get('petbankLaunch') || '').trim();
  const profileRef = String(params.get('petbankProfile') || '').trim();
  const hostOrigin = (() => {
    try { return document.referrer ? new URL(document.referrer).origin : ''; } catch (error) { return ''; }
  })();
  const pending = new Map();
  const legacyReported = new Set();

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

  function reportActivity(input) {
    const activityId = String(input?.activityId || '').trim();
    if (!activityId || !launchId || !profileRef) return false;
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

  window.addEventListener('message', (event) => {
    const data = event.data || {};
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
  });

  window.MiniGamesBridge = { getLaunchInfo, gameUrl, reportActivity };
}());
