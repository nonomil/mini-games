(function () {
  'use strict';

  function shuffle(list) {
    const copy = [...list];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function randomOffset(amount) {
    return (Math.random() * 2 - 1) * amount;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function isRemoteImageSource(src) {
    return /^https?:\/\//i.test(String(src || '').trim());
  }

  function enemyRemoteImageFailureKey(src) {
    const value = String(src || '').trim();
    if (!value || !isRemoteImageSource(value)) return '';
    try {
      const url = new URL(value, window.location.href);
      if (String(url.hostname || '').toLowerCase() === 'minecraft.wiki'
        && /^\/w\/Special:Redirect\/file\//i.test(String(url.pathname || ''))
      ) return 'minecraft-wiki-special-redirect';
    } catch {
      if (/minecraft\.wiki\/w\/Special:Redirect\/file\//i.test(value)) return 'minecraft-wiki-special-redirect';
    }
    return '';
  }

  window.WordMemoryUtils = { shuffle, clamp, randomOffset, distance, isRemoteImageSource, enemyRemoteImageFailureKey };
})();
