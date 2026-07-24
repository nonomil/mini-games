// ============================================================
// js/hanzi-progress.js
// 汉字学习记忆系统（按 profileId 隔离）
// 存储规范：petbank_hanzi_progress_{ProfileManager.getActiveId()||'default'}
// 数据结构：{ items: { itemId: { seen, correct, wrong, streak, lastTs, status } } }
//   itemId 规范："{level}:{type}:{key}"   type∈{char,word}
//   status: 'new'(seen=0) | 'learning'(错过 或 streak<2) | 'mastered'(连续答对≥2)
// 零依赖，IIFE + window.HanziProgress 挂载；风格对齐 leaderboard.js
// ============================================================
(function () {
    'use strict';

    function _profileId() {
        try {
            if (window.ProfileManager && typeof window.ProfileManager.getActiveId === 'function') {
                return window.ProfileManager.getActiveId() || 'default';
            }
        } catch (_) {}
        return 'default';
    }

    function _key() {
        return `petbank_hanzi_progress_${_profileId()}`;
    }

    function _read() {
        try {
            const raw = localStorage.getItem(_key());
            if (!raw) return { items: {} };
            const obj = JSON.parse(raw);
            return { items: (obj && obj.items && typeof obj.items === 'object') ? obj.items : {} };
        } catch (_) {
            return { items: {} };
        }
    }

    function _write(data) {
        try {
            localStorage.setItem(_key(), JSON.stringify(data));
        } catch (_) {}
    }

    function _newItem() {
        return { seen: 0, correct: 0, wrong: 0, streak: 0, lastTs: 0, status: 'new' };
    }

    function _ensure(data, itemId) {
        let it = data.items[itemId];
        if (!it) {
            it = _newItem();
            data.items[itemId] = it;
        }
        return it;
    }

    // 记录一次答题，更新状态机，返回该 itemId 的新状态对象（副本）
    //   correct=true : seen+1,correct+1,streak+1；streak≥2 → mastered
    //   correct=false: seen+1,wrong+1,streak=0 → learning
    function record(itemId, correct) {
        const data = _read();
        const it = _ensure(data, itemId);
        it.seen += 1;
        it.lastTs = Date.now();
        if (correct) {
            it.correct += 1;
            it.streak += 1;
            if (it.streak >= 2) it.status = 'mastered';
            else it.status = 'learning';
        } else {
            it.wrong += 1;
            it.streak = 0;
            it.status = 'learning';
        }
        _write(data);
        return Object.assign({}, it);
    }

    function getStatus(itemId) {
        const data = _read();
        const it = data.items[itemId];
        return it ? Object.assign({}, it) : _newItem();
    }

    let _last = null; // 上一题 itemId，避免连续重复

    // 按 weight 加权随机选 1：
    //   错题(learning 且 wrong>0)=5、新字(new)=3、learning(其他)=1.5、mastered=0.3
    //   pool 空返回 null；pool.length>1 时避开 _last
    //   可选 excludeSet：本局已出 itemId 集合，先从中剔除以实现局内去重；
    //     剔除后为空（本局已覆盖全 pool）则忽略 excludeSet 回退，允许第二轮重复。
    function pickNext(pool, excludeSet) {
        if (!pool || !pool.length) return null;
        const data = _read();

        function weightOf(itemId) {
            const it = data.items[itemId];
            if (!it || it.status === 'new') return 3;
            if (it.status === 'mastered') return 0.3;
            // learning
            return it.wrong > 0 ? 5 : 1.5;
        }

        // 第一步：剔除本局已出题（局内去重）
        let base = pool;
        if (excludeSet && excludeSet.size && pool.length) {
            const filtered = pool.filter(id => !excludeSet.has(id));
            if (filtered.length) base = filtered;
        }
        // 第二步：避开紧邻上一题
        let cand = base;
        if (_last && base.length > 1) {
            cand = base.filter(id => id !== _last);
            if (!cand.length) cand = base;
        }
        const weights = cand.map(weightOf);
        let total = weights.reduce((a, b) => a + b, 0);
        let chosen;
        if (total <= 0) {
            // 全 0 权重兜底：均匀随机
            chosen = cand[Math.floor(Math.random() * cand.length)];
        } else {
            let r = Math.random() * total;
            chosen = cand[0];
            for (let i = 0; i < cand.length; i++) {
                r -= weights[i];
                if (r <= 0) { chosen = cand[i]; break; }
            }
        }
        _last = chosen;
        return chosen;
    }

    // 汇总某 level 进度。allItems = 该 level 全部 itemId 数组
    //   返回 { total, learned(seen>0), mastered, toReview(wrong>0 且 非 mastered), newCount }
    function stats(level, allItems) {
        const data = _read();
        const ids = Array.isArray(allItems) ? allItems : [];
        let learned = 0, mastered = 0, toReview = 0, newCount = 0;
        for (const id of ids) {
            const it = data.items[id];
            if (!it || !it.seen) { newCount++; continue; }
            learned++;
            if (it.status === 'mastered') mastered++;
            if (it.wrong > 0 && it.status !== 'mastered') toReview++;
        }
        return {
            total: ids.length,
            learned: learned,
            mastered: mastered,
            toReview: toReview,
            newCount: newCount
        };
    }

    // 重置当前 profile 的全部进度（调试/清空用）
    function reset() {
        _write({ items: {} });
        _last = null;
    }

    window.HanziProgress = {
        record: record,
        getStatus: getStatus,
        pickNext: pickNext,
        stats: stats,
        reset: reset
    };
})();
