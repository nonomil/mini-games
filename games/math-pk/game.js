(function () {
  'use strict';

  if (typeof window.switchPage !== 'function') {
    window.switchPage = function () {
      window.location.href = '../../index.html#games';
    };
  }

  function render() {
    if (!window.MathAdventureGame || typeof window.MathAdventureGame.render !== 'function') {
      console.warn('[math-adventure] standalone runtime is not ready');
      return;
    }
    const params = new URLSearchParams(window.location.search);
    window.MathAdventureGame.render('math-pk-container');
    if (params.get('mode') === 'daily') document.querySelector('[data-action="open-daily"]')?.click();
  }

  window.MathAdventureStandalone = Object.freeze({
    storageKey: 'minigames_math_adventure_v1',
    dailyStorageKey: 'minigames_math_daily_pk_v1',
    render
  });

  render();
}());
