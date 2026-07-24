/* PixelStoryPage - fixed hosts for the story map and its internal stage. */
(function (root) {
    'use strict';

    let initialized = false;

    function get(id) {
        return root.document && root.document.getElementById(id);
    }

    function setHostState(host, visible) {
        if (!host) return;
        host.hidden = !visible;
        host.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    function ensureStoryShell() {
        const host = get('pixelStoryMapHost');
        if (!host) return null;
        let shell = get('pixelStoryShell');
        if (!shell || !host.contains(shell)) {
            host.innerHTML = '<div class="pixel-story-shell" id="pixelStoryShell" data-mode="story" data-view="map"><div class="pixel-story-map-slot" id="pixelStoryMapContainer"></div></div>';
            shell = get('pixelStoryShell');
        }
        if (!get('pixelStoryMapContainer')) {
            shell.innerHTML = '<div class="pixel-story-map-slot" id="pixelStoryMapContainer"></div>';
        }
        return shell;
    }

    function showLoading(message) {
        const loading = get('exploreLoadingState');
        if (!loading) return;
        loading.textContent = message || '正在打开故事地图…';
        loading.hidden = false;
    }

    function hideLoading() {
        const loading = get('exploreLoadingState');
        if (loading) loading.hidden = true;
    }

    function showError(error) {
        const loading = get('exploreLoadingState');
        if (!loading) return;
        loading.innerHTML = '<strong>故事地图暂时没有接通</strong><span>请检查本地服务后重试。</span><button type="button">重新连接</button>';
        loading.classList.add('is-error');
        loading.hidden = false;
        const retry = loading.querySelector('button');
        if (retry) retry.addEventListener('click', function () {
            loading.classList.remove('is-error');
            void activate();
        }, { once: true });
        console.warn('[PixelStoryPage] story map activation failed:', error);
    }

    async function showMap(options = {}) {
        const shell = ensureStoryShell();
        if (!shell) return false;
        shell.dataset.mode = 'story';
        shell.dataset.view = 'map';
        setHostState(get('pixelStoryMapHost'), true);
        setHostState(get('pixelStoryChapterHost'), false);
        setHostState(get('explorationStageRoot'), false);
        root.document.body.classList.remove('exploration-stage-active');
        try {
            if (!root.PixelStoryEngine || typeof root.PixelStoryEngine.render !== 'function') {
                throw new Error('PixelStoryEngine.render is unavailable');
            }
            await root.PixelStoryEngine.render('pixelStoryMapContainer', options.preferredTrackId || 'sci-fi');
            initialized = true;
            const loading = get('exploreLoadingState');
            if (loading) loading.classList.remove('is-error');
        } catch (error) {
            showError(error);
            return false;
        }
        hideLoading();
        return true;
    }

    async function activate(options = {}) {
        showLoading('正在打开故事地图…');
        return showMap(options);
    }

    async function showAdventure() {
        const shell = ensureStoryShell();
        if (!shell) return false;
        setHostState(get('pixelStoryMapHost'), true);
        setHostState(get('pixelStoryChapterHost'), false);
        setHostState(get('explorationStageRoot'), false);
        shell.dataset.mode = 'adventure';
        shell.dataset.view = 'map';
        const currentCaseId = root.SpaceGrowthDetective && typeof root.SpaceGrowthDetective.getSelectedCaseId === 'function'
            ? root.SpaceGrowthDetective.getSelectedCaseId()
            : '';
        shell.innerHTML =
            '<div class="pixel-story-modebar" role="tablist" aria-label="探索模式">' +
            '  <button class="pixel-story-mode" data-explore-mode="story" role="tab" aria-selected="false"><span aria-hidden="true"><i data-lucide="book-open"></i></span><strong>故事漫游</strong><small>读一段，学一点</small></button>' +
            '  <button class="pixel-story-mode is-active" data-explore-mode="adventure" role="tab" aria-selected="true"><span aria-hidden="true"><i data-lucide="compass"></i></span><strong>冒险挑战</strong><small>选路线，赢奖励</small></button>' +
            '</div><div id="adventureContainer"></div>';
        const storyTab = shell.querySelector('[data-explore-mode="story"]');
        if (storyTab) storyTab.addEventListener('click', function () { void showMap(); });
        if (root.SpaceGrowthDetective && typeof root.SpaceGrowthDetective.render === 'function') {
            await root.SpaceGrowthDetective.render('adventureContainer');
            if (currentCaseId && typeof root.PetStoryCases?.render === 'function') {
                await root.PetStoryCases.render('petStoryCasePanel', currentCaseId);
            }
        }
        if (root.lucide) root.lucide.createIcons();
        hideLoading();
        return true;
    }

    function deactivate() {
        root.document.body.classList.remove('pixel-story-stage-active');
        setHostState(get('pixelStoryChapterHost'), false);
    }

    function getViewState() {
        const shell = get('pixelStoryShell');
        const mapHost = get('pixelStoryMapHost');
        const chapterHost = get('pixelStoryChapterHost');
        return {
            mode: shell?.dataset.mode || 'story',
            view: shell?.dataset.view || 'map',
            mapHostVisible: mapHost ? !mapHost.hidden : false,
            chapterHostVisible: chapterHost ? !chapterHost.hidden : false
        };
    }

    root.PixelStoryPage = { activate, deactivate, showMap, showAdventure, getViewState };
})(window);
