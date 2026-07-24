(function (root) {
    'use strict';

    const NODE_IDS = ['see', 'choose', 'return'];

    function build(events = []) {
        const list = Array.isArray(events) ? events : [];
        const indexes = {
            see: [],
            choose: [],
            return: []
        };
        const optional = { challenge: [], battle: [] };
        list.forEach((event, index) => {
            if (event?.type === 'choice') indexes.choose.push(index);
            else if (event?.type === 'math') optional.challenge.push(index);
            else if (event?.type === 'encounter') {
                indexes.return.push(index);
                optional.battle.push(index);
            } else indexes.see.push(index);
        });
        const nodes = NODE_IDS.map(id => ({ id, eventIndexes: indexes[id] }));
        return { schemaVersion: 1, nodes, optional };
    }

    function getNodeForEvent(model, eventIndex) {
        const index = Number(eventIndex);
        if (model?.optional?.challenge?.includes(index)) return { id: 'challenge', eventIndexes: [index] };
        for (const node of model?.nodes || []) {
            if (node.eventIndexes.includes(index)) return node;
        }
        return { id: 'see', eventIndexes: [] };
    }

    function buildShortFlow(story) {
        const events = Array.isArray(story?.events) ? story.events : [];
        const config = story?.chapter_flow;
        if (config?.mode !== 'short' || events.length === 0) return null;
        const see = Array.isArray(config.see) ? config.see.map(Number) : [];
        const choose = Number(config.choose);
        const math = Number(config.challenge?.math);
        const battle = Number(config.challenge?.battle);
        const validIndex = (index) => Number.isInteger(index) && index >= 0 && index < events.length;
        if (see.length === 0 || see.some((index) => !validIndex(index) || !['narrate', 'discover'].includes(events[index]?.type))) return null;
        if (!validIndex(choose) || events[choose]?.type !== 'choice') return null;
        if (!validIndex(math) || events[math]?.type !== 'math') return null;
        if (!validIndex(battle) || events[battle]?.type !== 'encounter') return null;
        return { schemaVersion: 1, mode: 'short', events, see, choose, challenge: { math, battle } };
    }

    function getShortFlowEvent(flow, node, index = 0) {
        if (!flow) return null;
        const eventIndex = node === 'see'
            ? flow.see[index]
            : node === 'choose'
                ? flow.choose
                : node === 'math'
                    ? flow.challenge.math
                    : node === 'battle'
                        ? flow.challenge.battle
                        : null;
        return eventIndex == null ? null : flow.events?.[eventIndex] || null;
    }

    root.ExplorationChapter = { build, getNodeForEvent, buildShortFlow, getShortFlowEvent, NODE_IDS };
})(typeof window !== 'undefined' ? window : globalThis);
