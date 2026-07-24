(function (root) {
    'use strict';

    const KEY_PREFIX = 'petbank_exploration_progress_v1:';

    function key(sceneId) {
        return `${KEY_PREFIX}${String(sceneId || '').trim()}`;
    }

    function save(input = {}) {
        const sceneId = String(input.sceneId || '').trim();
        if (!sceneId) return { accepted: false, reason: 'invalid_scene' };
        const value = {
            schemaVersion: 1,
            sceneId,
            eventIndex: Math.max(0, Number(input.eventIndex) || 0),
            activeEventIndex: Math.max(0, Number(input.activeEventIndex ?? input.eventIndex) || 0),
            awaitingInput: Boolean(input.awaitingInput),
            foundItems: Array.isArray(input.foundItems) ? [...new Set(input.foundItems)] : [],
            nodeId: String(input.nodeId || 'see')
        };
        if (input.flowMode === 'short') {
            value.flowMode = 'short';
            value.flowPhase = String(input.flowPhase || 'see');
            value.seeCursor = Math.max(0, Number(input.seeCursor) || 0);
            value.challengeStatus = String(input.challengeStatus || 'available');
            if (input.choiceFeedback && typeof input.choiceFeedback === 'object') {
                value.choiceFeedback = {
                    text: String(input.choiceFeedback.text || ''),
                    reward: String(input.choiceFeedback.reward || ''),
                    found: Boolean(input.choiceFeedback.found),
                    item: input.choiceFeedback.item ? String(input.choiceFeedback.item) : ''
                };
            }
        }
        try { root.localStorage?.setItem(key(sceneId), JSON.stringify(value)); } catch (error) { return { accepted: false, reason: 'storage_error' }; }
        return { accepted: true, value };
    }

    function load(sceneId) {
        if (!sceneId) return null;
        try {
            const raw = root.localStorage?.getItem(key(sceneId));
            if (!raw) return null;
            const value = JSON.parse(raw);
            return value && value.schemaVersion === 1 ? value : null;
        } catch (error) {
            return null;
        }
    }

    function clear(sceneId) {
        if (!sceneId) return;
        try { root.localStorage?.removeItem(key(sceneId)); } catch (error) {}
    }

    root.ExplorationProgress = { KEY_PREFIX, save, load, clear };
})(typeof window !== 'undefined' ? window : globalThis);
