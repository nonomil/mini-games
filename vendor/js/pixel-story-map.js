/* PixelStoryMap - paged small maps for three worlds plus detective mini-games */
(function (root) {
    'use strict';

    var PACK_ROOT = 'data/story-packs/05-pixel-worlds-story';
    var PAGE_SIZE = 5;
    var manifestCache = null;
    var pageByTrack = {};

    function assetUrl(path) {
        return typeof root.resolvePetBankAssetUrl === 'function' ? root.resolvePetBankAssetUrl(path) : path;
    }

    function fetchJson(path) {
        if (root.PetBankAssetLoader && typeof root.PetBankAssetLoader.fetchJson === 'function') {
            return root.PetBankAssetLoader.fetchJson(path);
        }
        return root.fetch(assetUrl(path)).then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + path);
            return response.json();
        });
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getCompletedChapters() {
        if (root.PixelStoryEngine && typeof root.PixelStoryEngine.getCompletedChapters === 'function') {
            return root.PixelStoryEngine.getCompletedChapters();
        }
        return [];
    }

    function getTracks(manifest) {
        return (manifest.worlds || []).concat(manifest.bonusTracks || []);
    }

    function findTrack(manifest, trackId) {
        var tracks = getTracks(manifest);
        return tracks.find(function (track) { return track.id === trackId; }) || tracks[0] || null;
    }

    function getPageCount(nodes) {
        return Math.max(1, Math.ceil(nodes.length / PAGE_SIZE));
    }

    function getPagePosition(index) {
        var positions = [
            { x: 16, y: 55 },
            { x: 33, y: 31 },
            { x: 50, y: 62 },
            { x: 67, y: 34 },
            { x: 84, y: 56 }
        ];
        return positions[index] || positions[positions.length - 1];
    }

    function isNodeUnlocked(nodes, index, completed) {
        if (index === 0) return true;
        return completed.indexOf(nodes[index - 1].levelId) !== -1;
    }

    function render(containerId, preferredTrackId) {
        var container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!container) return;

        var manifestPromise = manifestCache
            ? Promise.resolve(manifestCache)
            : fetchJson(PACK_ROOT + '/manifest.json').then(function (manifest) {
                manifestCache = manifest;
                return manifest;
            });

        manifestPromise.then(function (manifest) {
            renderTrack(container, manifest, preferredTrackId || container.dataset.preferredTrack || 'sci-fi', pageByTrack[preferredTrackId] || 0);
        }).catch(function (error) {
            container.innerHTML = '<div class="pixel-story-map pixel-story-map-fallback"><div class="pixel-story-map-fallback-content"><strong>像素世界正在准备</strong><span>地图信号暂时离线，请稍后再试。</span></div></div>';
            console.error('[PixelStoryMap] manifest load failed:', error);
        });
    }

    function renderTrack(container, manifest, trackId, requestedPage) {
        var track = findTrack(manifest, trackId);
        if (!track) {
            container.innerHTML = '<div class="pixel-story-map pixel-story-map-fallback">没有可用地图</div>';
            return;
        }

        var completed = getCompletedChapters();
        var worldTracks = manifest.worlds || [];
        var bonusTracks = manifest.bonusTracks || [];
        var nodes = (track.nodes || []).slice().sort(function (a, b) { return (a.order || 99) - (b.order || 99); });
        var pageCount = getPageCount(nodes);
        var page = Math.max(0, Math.min(pageCount - 1, Number.isFinite(Number(requestedPage)) ? Number(requestedPage) : 0));
        pageByTrack[track.id] = page;
        container.dataset.preferredTrack = track.id;
        var pageStart = page * PAGE_SIZE;
        var pageNodes = nodes.slice(pageStart, pageStart + PAGE_SIZE);
        var visibleNodes = pageNodes.filter(function (node) {
            return isNodeUnlocked(nodes, nodes.indexOf(node), completed);
        });
        var background = track.background ? assetUrl(track.background) : '';
        var pageTitle = pageNodes.length
            ? '第 ' + (page + 1) + ' 站 · ' + (pageNodes[0].label || '新的航线')
            : '新的航线正在等待点亮';
        var isHomeEmbed = container.dataset.pixelStoryHost === 'home';
        var mapPanelId = 'pixel-story-map-panel-' + (container.id || 'default');

        var html = '';
        if (!isHomeEmbed) {
            html += '<div class="pixel-story-map-world-tabs" role="tablist" aria-label="像素世界地图">';
            worldTracks.forEach(function (item) {
                var active = item.id === track.id;
                html += '<button type="button" id="pixel-story-world-tab-' + escapeHtml(item.id) + '" class="pixel-story-world-tab' + (active ? ' is-active' : '') + '" data-world="' + escapeHtml(item.id) + '" role="tab" aria-selected="' + (active ? 'true' : 'false') + '" aria-controls="' + escapeHtml(mapPanelId) + '">';
                html += '<strong>' + escapeHtml(item.title) + '</strong><small>' + escapeHtml(item.subtitle || '') + '</small></button>';
            });
            html += '</div>';
        }
        html += '<section id="' + escapeHtml(mapPanelId) + '" class="pixel-story-map pixel-story-map-world pixel-story-map-tone-' + escapeHtml(track.tone || 'default') + '" data-map-page="' + page + '" role="tabpanel" aria-label="' + escapeHtml(track.title) + '">';
        if (background) html += '<img class="pixel-story-map-bg" src="' + background + '" alt="">';
        html += '<div class="pixel-story-map-chrome">';
        html += '<div><span class="pixel-story-map-kicker">PIXEL WORLDS / ' + escapeHtml(track.id.toUpperCase()) + '</span><strong>' + escapeHtml(track.title) + '</strong><small>' + escapeHtml(pageTitle) + '</small></div>';
        html += '<div class="pixel-story-map-stat"><strong>' + nodes.filter(function (node) { return completed.indexOf(node.levelId) !== -1; }).length + '<em>/' + nodes.length + '</em></strong><span>已点亮节点</span></div>';
        html += '</div>';
        html += '<div class="pixel-story-map-pager" aria-label="地图分页">';
        html += '<button type="button" class="pixel-story-map-page-btn" data-map-page-prev' + (page === 0 ? ' disabled' : '') + '>‹ 上一页</button>';
        html += '<span data-map-page-label aria-live="polite" aria-atomic="true">第 ' + (page + 1) + '/' + pageCount + ' 页</span>';
        html += '<button type="button" class="pixel-story-map-page-btn" data-map-page-next' + (page >= pageCount - 1 ? ' disabled' : '') + '>下一页 ›</button>';
        html += '</div>';

        var routePath = visibleNodes.map(function (node, index) {
            var position = getPagePosition(pageNodes.indexOf(node));
            return (index === 0 ? 'M' : 'L') + position.x + ',' + position.y;
        }).join(' ');
        html += '<svg class="pixel-story-route pixel-story-route-world" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="' + routePath + '" fill="none"></path></svg>';

        if (!visibleNodes.length) {
            html += '<div class="pixel-story-map-locked-message"><strong>这张小地图还没有亮起</strong><span>完成上一页的最后一站，新的朋友就会出现。</span></div>';
        }
        visibleNodes.forEach(function (node) {
            var globalIndex = nodes.indexOf(node);
            var isCompleted = completed.indexOf(node.levelId) !== -1;
            var position = getPagePosition(pageNodes.indexOf(node));
            var classNames = 'pixel-story-node pixel-story-node-' + escapeHtml(track.tone || 'default') + (isCompleted ? ' completed' : ' next');
            var vocabAttributes = node.vocabRegionId
                ? ' data-vocab-region-id="' + escapeHtml(node.vocabRegionId) + '" data-required-ability="' + escapeHtml(node.requiredAbility || '') + '"'
                : '';
            html += '<button type="button" class="' + classNames + '" style="left:' + position.x + '%;top:' + position.y + '%" data-chapter="' + escapeHtml(node.levelId) + '"' + vocabAttributes + ' aria-label="进入' + escapeHtml(node.label || node.levelId) + '">';
            html += '<div class="pixel-story-node-glow"></div>';
            if (node.icon) html += '<img class="pixel-story-node-icon" src="' + assetUrl(node.icon) + '" alt="">';
            else html += '<span class="pixel-story-node-icon pixel-story-node-symbol" aria-hidden="true">✦</span>';
            html += '<span class="pixel-story-node-index">' + String(node.order || globalIndex + 1).padStart(2, '0') + '</span>';
            html += '<span class="pixel-story-node-label"><strong>' + escapeHtml(node.label || node.levelId) + '</strong><small>' + escapeHtml(node.subtitle || '') + '</small></span>';
            html += '<span class="pixel-story-node-state">' + (isCompleted ? '已完成' : '现在出发') + '</span></button>';
        });
        html += '<div class="pixel-story-map-legend"><span><i></i>本页航线</span><small>完成当前节点后，下一站才会出现</small></div>';
        if (bonusTracks.length && track.id !== 'detective') {
            var bonus = bonusTracks[0];
            html += '<button type="button" class="pixel-story-detective-bonus" data-detective-bonus aria-label="进入' + escapeHtml(bonus.title) + '"><span class="pixel-story-detective-bonus-icon"><i data-lucide="search" aria-hidden="true"></i></span><span><strong>' + escapeHtml(bonus.title) + '</strong><small>' + escapeHtml(bonus.subtitle || '') + ' · 20 个额外环节</small></span><span aria-hidden="true">进入 →</span></button>';
        }
        html += '</section>';
        container.innerHTML = html;
        if (root.lucide && typeof root.lucide.createIcons === 'function') root.lucide.createIcons();

        var worldTabs = Array.prototype.slice.call(container.querySelectorAll('[data-world]'));
        worldTabs.forEach(function (tab, tabIndex) {
            tab.addEventListener('click', function () {
                if (root.PixelStoryEngine && typeof root.PixelStoryEngine.setPreferredTrack === 'function') root.PixelStoryEngine.setPreferredTrack(tab.dataset.world, false);
                renderTrack(container, manifest, tab.dataset.world, pageByTrack[tab.dataset.world] || 0);
            });
            tab.addEventListener('keydown', function (event) {
                var direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
                var targetIndex = event.key === 'Home' ? 0 : event.key === 'End' ? worldTabs.length - 1 : tabIndex + direction;
                if (!direction && event.key !== 'Home' && event.key !== 'End') return;
                event.preventDefault();
                var target = worldTabs[(targetIndex + worldTabs.length) % worldTabs.length];
                target.focus();
                target.click();
            });
        });
        var prev = container.querySelector('[data-map-page-prev]');
        var next = container.querySelector('[data-map-page-next]');
        if (prev) prev.addEventListener('click', function () { renderTrack(container, manifest, track.id, page - 1); });
        if (next) next.addEventListener('click', function () { renderTrack(container, manifest, track.id, page + 1); });
        container.querySelectorAll('[data-detective-bonus]').forEach(function (button) {
            button.addEventListener('click', function () {
                if (root.PixelStoryEngine && typeof root.PixelStoryEngine.setPreferredTrack === 'function') root.PixelStoryEngine.setPreferredTrack('detective', false);
                renderTrack(container, manifest, 'detective', pageByTrack.detective || 0);
            });
        });
        container.querySelectorAll('.pixel-story-node').forEach(function (node) {
            node.addEventListener('click', function () {
                if (root.PixelStoryEngine && typeof root.PixelStoryEngine.setPreferredTrack === 'function') root.PixelStoryEngine.setPreferredTrack(track.id, false);
                var chapterId = node.dataset.chapter;
                if (node.dataset.vocabRegionId && root.MinecraftVocabExplorationBridge && typeof root.MinecraftVocabExplorationBridge.openExpedition === 'function') {
                    root.MinecraftVocabExplorationBridge.openExpedition(node.dataset.vocabRegionId, {
                        returnTarget: 'explore',
                        preferredTrackId: track.id,
                        storyNodeId: chapterId,
                        requiredAbility: node.dataset.requiredAbility || ''
                    });
                    return;
                }
                if (root.PixelStoryEngine && typeof root.PixelStoryEngine.enterChapter === 'function') root.PixelStoryEngine.enterChapter(chapterId);
            });
        });
    }

    root.PixelStoryMap = root.PixelStoryMap || { render: render };
})(window);
