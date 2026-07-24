(function () {
  'use strict';

  function loadLevelProgress(state, key, debugLevel, clamp, levelCount) {
    const saved = Number(window.localStorage?.getItem(key) || 1);
    const override = debugLevel();
    state.highestUnlockedLevel = clamp(
      Math.max(Number.isFinite(saved) ? saved : 1, override || 1),
      1,
      levelCount
    );
    window.localStorage?.setItem(key, String(state.highestUnlockedLevel));
  }

  function saveLevelProgress(state, key, value, clamp, levelCount) {
    state.highestUnlockedLevel = clamp(value, 1, levelCount);
    window.localStorage?.setItem(key, String(state.highestUnlockedLevel));
  }

  function loadHeroSelection(state, key, heroRegistry, autoStart, debugAutoStart) {
    const saved = String(window.localStorage?.getItem(key) || 'boy');
    state.selectedHeroId = Object.prototype.hasOwnProperty.call(heroRegistry, saved) ? saved : 'boy';
    state.heroSelectOpen = !(autoStart || debugAutoStart);
    state.onboardingStep = state.heroSelectOpen ? 'welcome' : 'world';
    window.localStorage?.setItem(key, state.selectedHeroId);
  }

  function saveHeroSelection(state, key) {
    window.localStorage?.setItem(key, state.selectedHeroId);
  }

  function loadRewardProgress(state, key) {
    try {
      const saved = JSON.parse(window.localStorage?.getItem(key) || '{}');
      state.rewardBank = {
        stars: Number.isFinite(Number(saved.stars)) ? Math.max(0, Number(saved.stars)) : 0,
        supports: saved.supports && typeof saved.supports === 'object' ? saved.supports : {}
      };
    } catch {
      state.rewardBank = { stars: 0, supports: {} };
    }
  }

  function saveRewardProgress(state, key) {
    window.localStorage?.setItem(key, JSON.stringify(state.rewardBank));
  }

  function loadReviewProgress(state, key) {
    try {
      const saved = JSON.parse(window.localStorage?.getItem(key) || '[]');
      state.reviewCardIds = Array.isArray(saved) ? saved.filter(Boolean).slice(0, 20) : [];
    } catch {
      state.reviewCardIds = [];
    }
  }

  function saveReviewProgress(state, key) {
    window.localStorage?.setItem(key, JSON.stringify(state.reviewCardIds));
  }

  window.WordMemoryStorage = {
    loadLevelProgress,
    saveLevelProgress,
    loadHeroSelection,
    saveHeroSelection,
    loadRewardProgress,
    saveRewardProgress,
    loadReviewProgress,
    saveReviewProgress
  };
})();
