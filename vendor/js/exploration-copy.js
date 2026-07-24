/* Short-first copy adapter for exploration events. */
(function (root) {
    'use strict';

    const ALLOWED_MOODS = new Set(['happy', 'surprised', 'worried', 'proud']);

    function get(event = {}) {
        const hasShortText = typeof event.shortText === 'string' && event.shortText.trim().length > 0;
        const text = (hasShortText ? event.shortText : event.text) || '';
        const detailText = hasShortText && typeof event.detailText === 'string' ? event.detailText : '';
        const mood = ALLOWED_MOODS.has(event.petMood) ? event.petMood : 'happy';
        return { text, detailText, mood, isShort: hasShortText };
    }

    root.ExplorationCopy = { get };
})(typeof window !== 'undefined' ? window : globalThis);
