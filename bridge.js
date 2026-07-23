(function () {
  'use strict';

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const launchId = String(params.get('petbankLaunch') || '').trim();
  const profileRef = String(params.get('petbankProfile') || '').trim();
  const hostOrigin = (() => {
    try { return document.referrer ? new URL(document.referrer).origin : ''; } catch (error) { return ''; }
  })();
  const pending = new Map();

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

  window.addEventListener('message', (event) => {
    const data = event.data || {};
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

  window.MiniGamesBridge = { getLaunchInfo, gameUrl };
}());
