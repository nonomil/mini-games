// ============================================================
// js/leaderboard.js
// 通用本地排行榜（按 gameId + profileId 隔离）
// 存储规范：petbank_lb_{gameId}_{ProfileManager.getActiveId()||'default'}
// 数据结构：{ best:Number, recent:[{score, ts, ...meta}] }
// 零依赖，IIFE + window 挂载
// ============================================================
(function () {
    'use strict';

    const RECENT_MAX = 10;

    function _profileId() {
        try {
            if (window.ProfileManager && typeof window.ProfileManager.getActiveId === 'function') {
                return window.ProfileManager.getActiveId() || 'default';
            }
        } catch (_) {}
        return 'default';
    }

    function _key(gameId) {
        return `petbank_lb_${gameId}_${_profileId()}`;
    }

    function _read(gameId) {
        try {
            const raw = localStorage.getItem(_key(gameId));
            if (!raw) return { best: 0, recent: [] };
            const obj = JSON.parse(raw);
            return {
                best: Number(obj.best) || 0,
                recent: Array.isArray(obj.recent) ? obj.recent : []
            };
        } catch (_) {
            return { best: 0, recent: [] };
        }
    }

    function _write(gameId, data) {
        try {
            localStorage.setItem(_key(gameId), JSON.stringify(data));
        } catch (_) {}
    }

    // 记录一次成绩，维护 best + recent(≤10)，返回 { best, recent }
    function record(gameId, score, meta) {
        meta = meta || {};
        const data = _read(gameId);
        const n = Number(score) || 0;
        const entry = Object.assign({ score: n, ts: Date.now() }, meta);
        data.recent.unshift(entry);
        if (data.recent.length > RECENT_MAX) data.recent.length = RECENT_MAX;
        if (n > data.best) data.best = n;
        _write(gameId, data);
        return data;
    }

    function getBest(gameId) {
        return _read(gameId).best;
    }

    function getRecent(gameId, n) {
        const all = _read(gameId).recent;
        if (typeof n !== 'number' || n <= 0) n = RECENT_MAX;
        return all.slice(0, Math.min(n, all.length));
    }

    // 简易 sparkline：emoji ▁▂▃▄▅▆▇█ 八档，仅依赖 score 数组
    const _SPARK = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    function _sparkline(scores) {
        if (!scores.length) return '<span class="lb-spark-empty">— 还没有数据 —</span>';
        const lo = Math.min.apply(null, scores);
        const hi = Math.max.apply(null, scores);
        const span = hi - lo;
        return scores.map(function (s) {
            let idx = span === 0 ? 4 : Math.floor((s - lo) / span * 7);
            if (idx < 0) idx = 0;
            if (idx > 7) idx = 7;
            return `<span class="lb-spark-bar" title="${s}">${_SPARK[idx]}</span>`;
        }).join('');
    }

    function _fmtDate(ts) {
        try {
            const d = new Date(ts);
            const pad = function (x) { return x < 10 ? '0' + x : '' + x; };
            return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch (_) { return ''; }
    }

    // 渲染：最高分卡片 + 进步趋势 + 最近列表
    function renderUI(containerId, gameId, opts) {
        opts = opts || {};
        const el = document.getElementById(containerId);
        if (!el) return;
        const data = _read(gameId);
        const recent = data.recent;
        const scoresAsc = recent.slice().reverse().map(function (r) { return r.score; });
        const gameLabel = opts.label || (gameId === 'mathpk' ? '数学 PK' : gameId);

        let listHtml = '';
        if (!recent.length) {
            listHtml = '<li class="lb-empty">还没有对局记录，去玩一局吧 ✨</li>';
        } else {
            listHtml = recent.map(function (r, i) {
                const meta = [];
                if (r.correct !== undefined && r.total !== undefined) {
                    meta.push(`<span class="lb-meta">答对 ${r.correct}/${r.total}</span>`);
                }
                if (r.win !== undefined) {
                    meta.push(`<span class="lb-meta">${r.win ? '🏆 胜' : '⚔️ 负'}</span>`);
                }
                return `<li class="lb-row">
                    <span class="lb-rank">${i === 0 ? '🥇' : '#' + (i + 1)}</span>
                    <span class="lb-score">${r.score}</span>
                    <span class="lb-meta-wrap">${meta.join('')}</span>
                    <span class="lb-ts">${_fmtDate(r.ts)}</span>
                </li>`;
            }).join('');
        }

        // 进步趋势：把历史 best 也标出
        const trendNote = (function () {
            if (scoresAsc.length < 2) return '';
            const first = scoresAsc[0];
            const last = scoresAsc[scoresAsc.length - 1];
            const delta = last - first;
            if (delta > 0) return `<span class="lb-trend up">📈 +${delta} 进步</span>`;
            if (delta < 0) return `<span class="lb-trend down">📉 ${delta} 退步</span>`;
            return `<span class="lb-trend flat">➖ 持平</span>`;
        })();

        el.innerHTML = `
        <div class="lb-page card">
            <div class="card-header">
                <h2 class="text-lg font-bold">🏆 ${gameLabel} 排行榜</h2>
                <p class="text-xs mt-1 text-muted">和自己赛跑 · 记录最高分与最近 ${RECENT_MAX} 局</p>
            </div>
            <div class="lb-body">
                <div class="lb-best-card">
                    <div class="lb-best-label">最高分</div>
                    <div class="lb-best-num">${data.best}</div>
                    <div class="lb-best-trend">${trendNote}</div>
                </div>
                <div class="lb-spark-wrap">
                    <div class="lb-spark-label">最近得分趋势</div>
                    <div class="lb-spark">${_sparkline(scoresAsc)}</div>
                </div>
                <div class="lb-list-wrap">
                    <div class="lb-list-label">最近 ${RECENT_MAX} 局</div>
                    <ul class="lb-list">${listHtml}</ul>
                </div>
            </div>
        </div>`;
    }

    window.Leaderboard = {
        record: record,
        getBest: getBest,
        getRecent: getRecent,
        renderUI: renderUI,
        _read: _read // 供迁移逻辑内部使用
    };
})();
