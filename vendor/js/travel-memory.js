/* Idempotent travel memories shared by exploration completion and the home UI. */
(function (root) {
    'use strict';

    const STORAGE_KEY = 'petbank_travel_memory_v1';
    const ASSET_SOURCES = ['existing', 'Agnes', 'Bee/Grok', 'ChatGPT-web', 'manual'];
    const ASSET_STATUSES = ['placeholder', 'candidate', 'verified', 'published'];
    let scenes = {};

    function read() {
        try {
            const raw = JSON.parse(root.localStorage?.getItem(STORAGE_KEY) || '{}');
            return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
        } catch (error) {
            return {};
        }
    }

    function write(value) {
        try { root.localStorage?.setItem(STORAGE_KEY, JSON.stringify(value)); } catch (error) {}
    }

    function configure(catalog) {
        scenes = catalog && typeof catalog === 'object' && !Array.isArray(catalog) ? catalog : {};
        return scenes;
    }

    function normalizePetSnapshot(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
        const hasValue = ['speciesId', 'name', 'emoji', 'image', 'stage'].some((key) => input[key] != null && String(input[key]).trim());
        if (!hasValue) return null;
        const value = (key, fallback = '') => String(input[key] ?? fallback).trim().slice(0, 160);
        const snapshot = {
            speciesId: value('speciesId'),
            name: value('name', '我的宠物'),
            emoji: value('emoji', '🐾'),
            image: value('image'),
            stage: value('stage', '成长中')
        };
        return snapshot.speciesId || snapshot.name || snapshot.image ? snapshot : null;
    }

    function getCatalog() { return { ...scenes }; }

    async function load() {
        if (Object.keys(scenes).length) return scenes;
        try {
            const url = root.resolvePetBankAssetUrl ? root.resolvePetBankAssetUrl('data/travel-rewards.json') : 'data/travel-rewards.json';
            const response = await root.fetch(url);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            configure(data.scenes);
        } catch (error) {
            configure({});
        }
        return scenes;
    }

    function getSceneMemory(sceneId) {
        const scene = scenes[String(sceneId || '')];
        if (!scene) return null;
        return {
            sceneId: String(sceneId),
            title: scene.memoryTitle || '旅行纪念物',
            icon: scene.memoryIcon || '📸',
            itemId: scene.itemId || null,
            asset: typeof scene.asset === 'string' ? scene.asset : '',
            cardAsset: typeof scene.cardAsset === 'string' ? scene.cardAsset : '',
            fridgeAsset: typeof scene.fridgeAsset === 'string' ? scene.fridgeAsset : '',
            petCardAsset: typeof scene.petCardAsset === 'string' ? scene.petCardAsset : '',
            assetVersion: scene.assetVersion || 'v1',
            assetSource: ASSET_SOURCES.includes(scene.assetSource) ? scene.assetSource : 'manual',
            assetStatus: ASSET_STATUSES.includes(scene.assetStatus) ? scene.assetStatus : 'placeholder',
            assetStatuses: normalizeAssetStatuses(scene.assetStatuses, scene.assetStatus),
            fridgeFurnitureId: scene.fridgeFurnitureId || null,
            pet: null,
            nextPreview: scene.nextPreview || '下一站正在准备中',
            returnText: scene.returnText || '宠物带着旅行纪念物回家啦！'
        };
    }

    function normalizeAssetStatuses(statuses, fallback) {
        const result = {};
        ['asset', 'cardAsset', 'fridgeAsset', 'petCardAsset'].forEach((field) => {
            const value = statuses && statuses[field];
            result[field] = ASSET_STATUSES.includes(value)
                ? value
                : (ASSET_STATUSES.includes(fallback) ? fallback : 'placeholder');
        });
        return result;
    }

    function isRenderableAsset(memory, field) {
        const candidate = memory && memory[field];
        const status = memory?.assetStatuses?.[field] || memory?.assetStatus;
        return Boolean(candidate && ['verified', 'published'].includes(status));
    }

    function record(input = {}) {
        const sceneId = String(input.sceneId || '').trim();
        const template = getSceneMemory(sceneId);
        if (!sceneId || !template) return { accepted: false, reason: 'unknown_scene' };
        const memories = read();
        if (memories[sceneId]) return { accepted: false, reason: 'duplicate', memory: memories[sceneId] };
        const memory = {
            ...template,
            pet: normalizePetSnapshot(input.pet),
            completedAt: input.completedAt || new Date().toISOString(),
            schemaVersion: 1
        };
        memories[sceneId] = memory;
        write(memories);
        return { accepted: true, memory };
    }

    function getAll() { return Object.values(read()); }

    function hydrateStoredMemories() {
        const memories = read();
        let changed = false;
        Object.keys(memories).forEach((sceneId) => {
            const template = getSceneMemory(sceneId);
            if (!template) return;
            const current = memories[sceneId];
            const merged = { ...template, ...current };
            ['asset', 'cardAsset', 'fridgeAsset', 'petCardAsset', 'assetVersion', 'assetSource', 'assetStatus', 'assetStatuses', 'fridgeFurnitureId', 'pet'].forEach((key) => {
                if (current[key] !== merged[key]) changed = true;
            });
            memories[sceneId] = merged;
        });
        if (changed) write(memories);
        return Object.values(memories);
    }

    function getOwnedAssets(kind) {
        const field = kind === 'fridge' ? 'fridgeAsset' : kind === 'card' ? 'cardAsset' : kind === 'badge' ? 'asset' : '';
        return getAll().filter(memory => !field || memory[field]);
    }

    root.TravelMemory = {
        STORAGE_KEY,
        ASSET_SOURCES,
        ASSET_STATUSES,
        configure,
        load,
        getCatalog,
        getSceneMemory,
        normalizePetSnapshot,
        isRenderableAsset,
        record,
        getAll,
        hydrateStoredMemories,
        getOwnedAssets
    };
})(typeof window !== 'undefined' ? window : globalThis);
