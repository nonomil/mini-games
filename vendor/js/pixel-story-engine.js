/* PixelStoryEngine — 像素对话故事核心引擎 */
(function (root) {
    'use strict';

    var STORAGE_KEY = 'petbank_pixel_worlds_progress_v1';
    var STORY_ID = 'pixel-worlds-story';
    var CHAPTERS_BASE = 'data/story-packs/05-pixel-worlds-story';
    var LEVELS_BASE = CHAPTERS_BASE + '/levels';
    var AUDIO_INDEX_PATH = CHAPTERS_BASE + '/audio-index.json';
    var DIALOGUE_CONTAINER_SEL = '#pixelStoryBox';
    var TEXT_CONTAINER_SEL = '#pixelStoryText';

    /* ===== 状态 ===== */
    var manifest = null;
    var audioManifest = null;
    var chapterAudioCache = {}; // chapterId -> chapter audio index
    var chaptersCache = {};      // chapterId -> parsed JSON
    var currentChapter = null;   // current chapter data
    var currentSceneIdx = 0;     // scene index within chapter
    var currentLineIdx = 0;      // line index within scene
    var isAwaitingChoice = false;
    var isFeedbackPhase = false;
    var isCompleteScreen = false;
    var shellElement = null;     // engine host, normally #pixelStoryMapContainer
    var storyShellElement = null; // outer #pixelStoryShell when embedded in explore
    var sceneBgElement = null;   // img element for bg
    var spriteL = null;          // left sprite
    var spriteR = null;          // right sprite
    var spriteC = null;          // center sprite
    var propEl = null;           // scene prop / clue
    var sceneEl = null;          // image/character area
    var dialogueEl = null;       // dialogue area below the scene
    var backBtn = null;
    var boxEl = null;
    var nameEl = null;
    var textEl = null;
    var choicesEl = null;
    var nextHint = null;
    var preferredTrackId = 'sci-fi';

    /* ===== 工具 ===== */
    function assetUrl(path) {
        return typeof root.resolvePetBankAssetUrl === 'function' ? root.resolvePetBankAssetUrl(path) : path;
    }

    function fetchJson(path) {
        if (root.PetBankAssetLoader && typeof root.PetBankAssetLoader.fetchJson === 'function') {
            return root.PetBankAssetLoader.fetchJson(path);
        }
        return root.fetch(assetUrl(path)).then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status + ': ' + path);
            return r.json();
        });
    }

    function configuredAudioBase() {
        var config = root.PetBankConfig || root.PETBANK_CONFIG || {};
        return String(config.pixelStoryAudioBaseUrl || root.__PETBANK_PIXEL_STORY_AUDIO_BASE_URL__ || '').trim();
    }

    function resolveAudioUrl(file) {
        var source = String(file || '');
        var prefix = 'assets/story/pixel-worlds-v1/audio/';
        var base = configuredAudioBase();
        if (base && source.indexOf(prefix) === 0) {
            try {
                var relative = source.slice(prefix.length).replace(/\.wav$/i, '.ogg');
                return new URL(relative, base.replace(/\/+$/, '') + '/').href;
            } catch (e) {
                console.warn('[PixelStory] invalid external audio base:', e);
            }
        }
        return assetUrl(source);
    }

    function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
    function qsa(sel, ctx) { return (ctx || document).querySelectorAll(sel); }

    function setView(view) {
        var nextView = view === 'stage' ? 'stage' : 'map';
        if (storyShellElement) storyShellElement.dataset.view = nextView;
        document.body.classList.toggle('pixel-story-stage-active', nextView === 'stage' && !!storyShellElement);
    }

    /* ===== 进度持久化 ===== */
    function readProgress() {
        try {
            return JSON.parse(root.localStorage.getItem(STORAGE_KEY) || '{}');
        } catch (e) { return {}; }
    }

    function writeProgress(partial) {
        try {
            var cur = readProgress();
            cur.schemaVersion = 1;
            cur.storyId = STORY_ID;
            var merged = {};
            for (var k in cur) merged[k] = cur[k];
            for (var k2 in partial) merged[k2] = partial[k2];
            root.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch (e) { /* storage full or unavailable */ }
    }

    function getChapterProgress(chapterId) {
        var p = readProgress();
        return p.chapters && p.chapters[chapterId] ? p.chapters[chapterId] : null;
    }

    function getCompletedChapters() {
        var p = readProgress();
        var ids = [];
        if (p.chapters) {
            for (var id in p.chapters) {
                if (p.chapters[id] && p.chapters[id].completed) ids.push(id);
            }
        }
        return ids;
    }

    /* ===== 加载 ===== */
    function loadManifest() {
        if (manifest) return Promise.resolve(manifest);
        return fetchJson(CHAPTERS_BASE + '/manifest.json').then(function (m) {
            manifest = m;
            return fetchJson(AUDIO_INDEX_PATH).catch(function (err) {
                console.warn('[PixelStory] audio manifest unavailable; using TTS fallback:', err.message);
                return { version: 1, entries: {} };
            });
        }).then(function (a) {
            audioManifest = a;
            return manifest;
        });
    }

    function loadChapterAudioIndex(chapterId) {
        if (chapterAudioCache[chapterId]) return Promise.resolve(chapterAudioCache[chapterId]);
        var metadata = audioManifest && audioManifest.entries && audioManifest.entries[chapterId];
        if (!metadata || !metadata.path) return Promise.resolve(null);
        return fetchJson(metadata.path).then(function (data) {
            chapterAudioCache[chapterId] = data;
            return data;
        }).catch(function (error) {
            console.warn('[PixelStory] chapter audio index unavailable:', chapterId, error.message);
            return null;
        });
    }

    function loadChapter(chapterId) {
        if (chaptersCache[chapterId]) return Promise.resolve(chaptersCache[chapterId]);
        return fetchJson(LEVELS_BASE + '/' + chapterId + '.json').catch(function (error) {
            var inline = findInlineLevel(chapterId);
            if (!inline) throw error;
            return buildInlineLevel(inline);
        }).then(function (data) {
            chaptersCache[chapterId] = data;
            return data;
        });
    }

    function findInlineLevel(levelId) {
        if (!manifest) return null;
        var tracks = (manifest.worlds || []).concat(manifest.bonusTracks || []);
        for (var i = 0; i < tracks.length; i++) {
            var found = (tracks[i].nodes || []).find(function (node) { return node.levelId === levelId; });
            if (found) {
                if (!found.worldId) found = Object.assign({ worldId: tracks[i].id }, found);
                return found;
            }
        }
        return null;
    }

    function buildInlineLevel(node) {
        var label = node.label || '这个地方';
        var subtitle = node.subtitle || '新的线索';
        var prompt = node.prompt || '完成这一次小互动。';
        var firstAction = node.actions && node.actions[0] && node.actions[0].label ? node.actions[0].label : '仔细观察线索';
        return {
            levelId: node.levelId,
            chapterId: node.levelId,
            worldId: node.worldId || 'detective',
            title: node.label || '像素探险节点',
            rewards: { growthPoints: 3 },
            scenes: [{
                sceneId: node.levelId + '-scene',
                background: node.background,
                lines: [
                    { type: 'narration', text: node.storyText || '新的线索正在发光。', character: 'narrator' },
                    { type: 'dialogue', text: '这里就是' + label + '。我们先把“' + subtitle + '”记在地图上。', character: 'hero', position: 'left' },
                    { type: 'dialogue', text: '我听到了一点提示声，线索还没有走远。', character: 'pet', position: 'right' },
                    { type: 'dialogue', text: '先观察方向，再做一个安全的小动作。', character: 'narrator', position: 'left' },
                    { type: 'activity', activityType: node.activityType || 'scan', prompt: prompt, character: node.character || 'pet', position: 'right', actions: node.actions || [] },
                    { type: 'narration', text: '小小探险家完成了第一步，' + firstAction + '让线索变得清楚起来。', character: 'narrator' },
                    { type: 'dialogue', text: '看！刚才藏起来的线索露出来了。', character: 'hero', position: 'left' },
                    { type: 'dialogue', text: '我们把它和地图上的' + subtitle + '连起来，就知道下一步往哪里走。', character: 'pet', position: 'right' },
                    { type: 'dialogue', text: '记住这个发现，它会帮助我们找到回家的路。', character: 'narrator', position: 'left' },
                    { type: 'dialogue', text: '线索记下来了，下一段路也亮了。', character: 'pet', position: 'right' }
                ]
            }]
        };
    }

    /* ===== 对话引擎核心 ===== */
    function getCurrentLine() {
        if (!currentChapter || !currentChapter.scenes) return null;
        var scene = currentChapter.scenes[currentSceneIdx];
        if (!scene || !scene.lines) return null;
        return scene.lines[currentLineIdx] || null;
    }

    function getCurrentScene() {
        if (!currentChapter || !currentChapter.scenes) return null;
        return currentChapter.scenes[currentSceneIdx] || null;
    }

    function hasNextLine() {
        var scene = getCurrentScene();
        if (!scene) return false;
        return currentLineIdx + 1 < scene.lines.length;
    }

    function hasNextScene() {
        return currentSceneIdx + 1 < currentChapter.scenes.length;
    }

    /* ===== 渲染 ===== */
    function renderLine(line) {
        if (!line || !shellElement) return;
        var scene = getCurrentScene();
        if (!scene) return;

        // 背景切换
        if (scene.background && sceneBgElement) {
            sceneBgElement.src = assetUrl(scene.background);
            sceneBgElement.style.display = 'block';
        }

        // 隐藏立绘
        if (spriteL) spriteL.classList.add('pixel-story-sprite-hide');
        if (spriteR) spriteR.classList.add('pixel-story-sprite-hide');
        if (spriteC) spriteC.classList.add('pixel-story-sprite-hide');
        if (propEl) propEl.classList.add('pixel-story-prop-hide');

        // 旁白模式
        if (line.type === 'narration') {
            renderDialogueText(line, 'narrator');
            return;
        }

        // 隐藏旁白遮罩
        hideNarration();

        // 对话框模式
        if (boxEl) boxEl.style.display = 'block';
        isAwaitingChoice = false;
        isFeedbackPhase = false;

        // 角色立绘
        var charData = getCharacterData(line.character);
        if (charData && charData.sprite) {
            var pos = line.position || 'left';
            var el = pos === 'center' ? spriteC : (pos === 'right' ? spriteR : spriteL);
            if (el) {
                el.src = assetUrl(charData.sprite);
                el.classList.remove('pixel-story-sprite-hide');
            }
        }

        var sceneProps = scene.sceneAssets && scene.sceneAssets.props;
        if (propEl && Array.isArray(sceneProps) && sceneProps[0]) {
            propEl.src = assetUrl(sceneProps[0]);
            propEl.classList.remove('pixel-story-prop-hide');
        }

        // 角色名标签
        if (nameEl && charData) {
            nameEl.textContent = charData.name || line.character;
            nameEl.className = 'pixel-story-name pixel-story-name-' + (charData.labelStyle || 'npc');
            nameEl.style.display = 'inline-block';
        }

        // 对话文本（打字效果）
        if (textEl) {
            textEl.textContent = line.type === 'choice' || line.type === 'activity' ? (line.prompt || '') : (line.text || '');
            textEl.className = 'pixel-story-text';
        }

        // Choice 选择
        if (line.type === 'choice' && line.options) {
            renderChoices(line);
            if (boxEl) boxEl.classList.add('no-click');
            if (nextHint) nextHint.style.display = 'none';
        } else if (line.type === 'activity' && line.actions) {
            renderActivity(line);
            if (boxEl) boxEl.classList.add('no-click');
            if (nextHint) nextHint.style.display = 'none';
        } else {
            clearChoices();
            if (boxEl) boxEl.classList.remove('no-click');
            if (nextHint) nextHint.style.display = 'block';
        }

        // 触发语音
        triggerVoice(line);
    }

    function renderNarration(line) {
        renderDialogueText(line, 'narrator');
    }

    function renderDialogueText(line, characterId) {
        hideNarration();
        if (boxEl) boxEl.style.display = 'block';
        isAwaitingChoice = false;
        isFeedbackPhase = false;
        var charData = getCharacterData(characterId || line.character);
        if (nameEl && charData) {
            nameEl.textContent = charData.name || characterId;
            nameEl.className = 'pixel-story-name pixel-story-name-' + (charData.labelStyle || 'narrator');
            nameEl.style.display = 'inline-block';
        }
        if (textEl) {
            textEl.textContent = line.text || '';
            textEl.className = 'pixel-story-text';
        }
        clearChoices();
        if (boxEl) boxEl.classList.remove('no-click');
        if (nextHint) nextHint.style.display = 'block';
        triggerVoice(line);
    }

    function hideNarration() {
        var existing = document.getElementById('pixelNarrationOverlay');
        if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
        if (boxEl) boxEl.style.display = 'block';
    }

    function renderChoices(line) {
        if (!choicesEl) return;
        isAwaitingChoice = true;
        choicesEl.innerHTML = '';
        choicesEl.style.display = 'flex';

        line.options.forEach(function (opt, idx) {
            var btn = document.createElement('button');
            btn.className = 'pixel-story-choice-btn';
            btn.textContent = opt.label;
            btn.addEventListener('click', function () { handleChoice(line, opt, idx, btn); });
            choicesEl.appendChild(btn);
        });
    }

    function renderActivity(line) {
        if (!choicesEl) return;
        isAwaitingChoice = true;
        choicesEl.innerHTML = '';
        choicesEl.style.display = 'flex';
        (line.actions || []).forEach(function (action) {
            var button = document.createElement('button');
            button.className = 'pixel-story-choice-btn pixel-story-activity-btn';
            button.textContent = action.label;
            button.addEventListener('click', function () { handleActivity(line, action, button); });
            choicesEl.appendChild(button);
        });
    }

    function clearChoices() {
        if (!choicesEl) return;
        choicesEl.innerHTML = '';
        choicesEl.style.display = 'none';
        isAwaitingChoice = false;
    }

    function handleChoice(line, chosen, idx, selectedButton) {
        if (!isAwaitingChoice || !choicesEl) return;
        isAwaitingChoice = false;
        isFeedbackPhase = true;

        // 禁用所有按钮
        qsa('.pixel-story-choice-btn', choicesEl).forEach(function (b) { b.disabled = true; });

        // 标记正确/错误
        if (chosen.isCorrect) {
            selectedButton.className = 'pixel-story-choice-btn correct';
        } else {
            selectedButton.className = 'pixel-story-choice-btn wrong';
            // 如果只有一个正确答案，高亮正确答案
            var correctOpt = line.options.filter(function (o) { return o.isCorrect; })[0];
            if (correctOpt) {
                var btns = qsa('.pixel-story-choice-btn', choicesEl);
                var correctIndex = line.options.indexOf(correctOpt);
                if (btns[correctIndex]) btns[correctIndex].classList.add('correct-answer');
            }
        }

        // 显示反馈
        var feedback = document.createElement('div');
        feedback.className = 'pixel-story-feedback ' + (chosen.isCorrect ? 'correct' : 'wrong');
        feedback.textContent = chosen.feedback || (chosen.isCorrect ? '答对了！' : '再想想～');
        choicesEl.appendChild(feedback);

        // 继续按钮
        var continueBtn = document.createElement('button');
        continueBtn.className = 'pixel-story-continue-btn';
        continueBtn.textContent = '继续 ▶';
        continueBtn.addEventListener('click', function () {
            isFeedbackPhase = false;
            advanceLine();
        });
        choicesEl.appendChild(continueBtn);

        // 记录学习结果
        recordLearning(line, chosen);
    }

    function handleActivity(line, action, selectedButton) {
        if (!isAwaitingChoice || !choicesEl) return;
        isAwaitingChoice = false;
        isFeedbackPhase = true;
        qsa('.pixel-story-activity-btn', choicesEl).forEach(function (button) { button.disabled = true; });
        selectedButton.className = 'pixel-story-choice-btn pixel-story-activity-btn correct';

        var feedback = document.createElement('div');
        feedback.className = 'pixel-story-feedback correct';
        feedback.textContent = action.feedback || '线索记下来了！';
        choicesEl.appendChild(feedback);

        var continueBtn = document.createElement('button');
        continueBtn.className = 'pixel-story-continue-btn';
        continueBtn.textContent = '继续 ▶';
        continueBtn.addEventListener('click', function () {
            isFeedbackPhase = false;
            advanceLine();
        });
        choicesEl.appendChild(continueBtn);
    }

    function recordLearning(line, chosen) {
        try {
            var p = readProgress();
            if (!p.learning) p.learning = {};
            var key = line.learningType + ':' + (line.word || line.expression || line.answer || 'q');
            if (!p.learning[key]) p.learning[key] = { total: 0, correct: 0 };
            p.learning[key].total += 1;
            if (chosen.isCorrect) p.learning[key].correct += 1;
            writeProgress({ learning: p.learning });
        } catch (e) { /* ignore */ }
    }

    function advanceLine() {
        if (isAwaitingChoice || isFeedbackPhase) return;

        var scene = getCurrentScene();
        if (!scene) return;

        // 旁白遮罩点击 → 关闭遮罩
        var overlay = document.getElementById('pixelNarrationOverlay');
        if (overlay) {
            hideNarration();
        }

        if (hasNextLine()) {
            currentLineIdx++;
            saveCurrentProgress();
            renderLine(getCurrentLine());
        } else if (hasNextScene()) {
            currentSceneIdx++;
            currentLineIdx = 0;
            saveCurrentProgress();
            renderLine(getCurrentLine());
        } else {
            showChapterComplete();
        }
    }

    /* ===== 章节完成 ===== */
    function showChapterComplete() {
        if (!shellElement) return;
        isCompleteScreen = true;

        // 保存完成状态
        var p = readProgress();
        if (!p.chapters || typeof p.chapters !== 'object') p.chapters = {};
        p.chapters[currentChapter.chapterId] = { completed: true, completedAt: Date.now() };
        writeProgress({ chapters: p.chapters });

        claimChapterReward(currentChapter);

        var div = document.createElement('div');
        div.className = 'pixel-story-complete';
        div.innerHTML =
            '<div class="pixel-story-complete-card">' +
            '<div class="pixel-story-complete-title">✨ 完成！</div>' +
            '<div class="pixel-story-complete-subtitle">' +
            (currentChapter.title || '本章通过') +
            '</div>' +
            '<button class="pixel-story-complete-btn" id="pixelStoryBackToMapBtn">返回星际地图</button>' +
            '</div>';
        shellElement.appendChild(div);

        document.getElementById('pixelStoryBackToMapBtn').addEventListener('click', function () {
            if (div.parentNode) div.parentNode.removeChild(div);
            isCompleteScreen = false;
            showMap();
        });
    }

    function getProfileId() {
        try {
            if (root.ProfileManager && typeof root.ProfileManager.getActiveId === 'function') {
                return String(root.ProfileManager.getActiveId() || 'local');
            }
        } catch (e) {
            console.warn('[PixelStory] profile lookup failed:', e);
        }
        return 'local';
    }

    function claimChapterReward(chapter) {
        var points = Number(chapter && chapter.rewards && chapter.rewards.growthPoints) || 0;
        if (points <= 0 || !root.CoreRewardService || typeof root.CoreRewardService.claim !== 'function') return;
        var result = root.CoreRewardService.claim({
            eventId: STORY_ID + ':' + chapter.chapterId + ':complete',
            profileId: getProfileId(),
            source: 'game',
            sourceId: chapter.chapterId,
            rewards: [{ type: 'growth_points', amount: points }]
        });
        if (!result.accepted && !result.duplicate) {
            console.warn('[PixelStory] chapter reward was not claimed:', result.reason || 'unknown');
        }
    }

    /* ===== 语音 ===== */
    function triggerVoice(line) {
        if (root.VoiceSystem) {
            var charData = getCharacterData(line.character);
            var text = line.text || line.prompt || '';
            if (text) {
                var audioUrl = getLineAudioUrl();
                var voicePreset = charData && charData.voicePreset ? charData.voicePreset : 'child';
                if (boxEl) {
                    boxEl.dataset.storyAudio = audioUrl || '';
                    boxEl.dataset.storyVoice = voicePreset;
                }
                if (audioUrl && typeof root.VoiceSystem.playStoryAudio === 'function') {
                    root.VoiceSystem.playStoryAudio(audioUrl, text, voicePreset, { force: true });
                } else if (typeof root.VoiceSystem.speakTTS === 'function') {
                    root.VoiceSystem.speakTTS(text, voicePreset, { force: true });
                } else {
                    console.warn('[PixelStory] no voice playback API available');
                }
            }
        }
    }

    function getLineAudioUrl() {
        if (!currentChapter) return '';
        var entry = chapterAudioCache[currentChapter.chapterId];
        if (!entry) return '';
        if (Array.isArray(entry.scenes)) {
            var scene = getCurrentScene();
            var sceneEntry = entry.scenes[currentSceneIdx];
            var lineEntry = sceneEntry && sceneEntry.sceneId === (scene && scene.sceneId)
                ? sceneEntry.lines[currentLineIdx]
                : null;
            return lineEntry && lineEntry.file ? resolveAudioUrl(lineEntry.file) : '';
        }
        var scene = getCurrentScene();
        var legacyKey = currentChapter.chapterId + '/' + (scene ? scene.sceneId : 'scene') + '/' + currentLineIdx;
        var legacyEntry = audioManifest.entries[legacyKey];
        return legacyEntry && legacyEntry.file ? resolveAudioUrl(legacyEntry.file) : '';
    }

    function getCharacterData(charId) {
        if (!manifest || !manifest.characters) return null;
        for (var key in manifest.characters) {
            if (manifest.characters[key].id === charId || key === charId) {
                return manifest.characters[key];
            }
        }
        return null;
    }

    /* ===== 地图渲染 ===== */
    function showMap() {
        if (!shellElement) return;
        if (root.VoiceSystem && typeof root.VoiceSystem.stop === 'function') root.VoiceSystem.stop();
        setView('map');
        // dispatch to PixelStoryMap if available
        if (root.PixelStoryMap && typeof root.PixelStoryMap.render === 'function') {
            var mapContainer = document.getElementById('pixelStoryMapContainer');
            var activeTrack = mapContainer && mapContainer.dataset.preferredTrack ? mapContainer.dataset.preferredTrack : preferredTrackId;
            root.PixelStoryMap.render('pixelStoryMapContainer', activeTrack);
        } else {
            // fallback: simple list
            renderSimpleChapterList();
        }
    }

    function renderSimpleChapterList() {
        if (!shellElement || !manifest) return;
        shellElement.innerHTML =
            '<div class="pixel-story-map pixel-story-map-fallback" id="pixelStoryMapContainer">' +
            '<div class="pixel-story-map-fallback-content"><strong>星际地图正在准备</strong><span>请稍后再试，故事航线马上回来。</span></div>' +
            '</div>';
    }

    /* ===== 入口：进入章节 ===== */
    function enterChapter(chapterId) {
        if (!shellElement) return;
        if (root.VoiceSystem && typeof root.VoiceSystem.stop === 'function') root.VoiceSystem.stop();
        Promise.all([loadChapter(chapterId), loadChapterAudioIndex(chapterId)]).then(function (loaded) {
            var chapter = loaded[0];
            currentChapter = chapter;
            currentSceneIdx = 0;
            currentLineIdx = 0;
            isAwaitingChoice = false;
            isFeedbackPhase = false;
            isCompleteScreen = false;

            // 恢复进度
            var saved = getChapterProgress(chapterId);
            if (saved) {
                if (saved.sceneIdx != null) currentSceneIdx = saved.sceneIdx;
                if (saved.lineIdx != null) currentLineIdx = saved.lineIdx;
            }

            renderStage();
            renderLine(getCurrentLine());
        }).catch(function (err) {
            if (typeof showToast === 'function') showToast('故事加载失败: ' + err.message);
            else console.error('[PixelStory] load error:', err);
        });
    }

    function saveCurrentProgress() {
        if (!currentChapter) return;
        var progress = readProgress();
        var chapters = progress.chapters && typeof progress.chapters === 'object' ? progress.chapters : {};
        chapters[currentChapter.chapterId] = {
            ...(chapters[currentChapter.chapterId] || {}),
            sceneIdx: currentSceneIdx,
            lineIdx: currentLineIdx,
            savedAt: Date.now()
        };
        writeProgress({ chapters: chapters });
    }

    function renderStage() {
        if (!shellElement) return;
        var chapter = currentChapter;
        if (!chapter) return;

        setView('stage');

        shellElement.innerHTML =
            '<div class="pixel-story-stage">' +
            '  <div class="pixel-story-scene" id="pixelStoryScene">' +
            '    <img class="pixel-story-bg" id="pixelStoryBg" src="" alt="" style="display:none">' +
            '    <img class="pixel-story-sprite pixel-story-sprite-left pixel-story-sprite-hide" id="pixelStorySpriteL" alt="">' +
            '    <img class="pixel-story-sprite pixel-story-sprite-right pixel-story-sprite-hide" id="pixelStorySpriteR" alt="">' +
            '    <img class="pixel-story-sprite pixel-story-sprite-center pixel-story-sprite-hide" id="pixelStorySpriteC" alt="">' +
            '    <img class="pixel-story-prop pixel-story-prop-hide" id="pixelStoryProp" alt="">' +
            '    <button class="pixel-story-back" id="pixelStoryBack">← 返回</button>' +
            '  </div>' +
            '  <div class="pixel-story-dialogue pixel-story-box" id="pixelStoryBox">' +
            '    <div class="pixel-story-name" id="pixelStoryName" style="display:none"></div>' +
            '    <div class="pixel-story-text" id="pixelStoryText"></div>' +
            '    <div class="pixel-story-choices" id="pixelStoryChoices" style="display:none"></div>' +
            '    <div class="pixel-story-next" id="pixelStoryNext">▼</div>' +
            '  </div>' +
            '</div>';

        // 缓存DOM引用
        sceneBgElement = document.getElementById('pixelStoryBg');
        spriteL = document.getElementById('pixelStorySpriteL');
        spriteR = document.getElementById('pixelStorySpriteR');
        spriteC = document.getElementById('pixelStorySpriteC');
        propEl = document.getElementById('pixelStoryProp');
        sceneEl = document.getElementById('pixelStoryScene');
        dialogueEl = document.getElementById('pixelStoryBox');
        backBtn = document.getElementById('pixelStoryBack');
        boxEl = document.getElementById('pixelStoryBox');
        nameEl = document.getElementById('pixelStoryName');
        textEl = document.getElementById('pixelStoryText');
        choicesEl = document.getElementById('pixelStoryChoices');
        nextHint = document.getElementById('pixelStoryNext');

        boxEl.addEventListener('click', function (e) {
            if (e.target !== boxEl && !boxEl.contains(e.target)) return;
            if (isAwaitingChoice || isFeedbackPhase || isCompleteScreen) return;
            advanceLine();
        });

        backBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            // 保存进度
            writeProgress({
                chapters: (function () {
                    var current = readProgress();
                    var c = current.chapters && typeof current.chapters === 'object' ? current.chapters : {};
                    var key = currentChapter ? currentChapter.chapterId : 'unknown';
                    c[key] = Object.assign({}, c[key], { sceneIdx: currentSceneIdx, lineIdx: currentLineIdx, savedAt: Date.now() });
                    return c;
                })()
            });
            showMap();
        });

        // Store choices for reference during click
        choicesEl.addEventListener('click', function (e) {
            var btn = e.target.closest('.pixel-story-choice-btn');
            if (!btn || btn.disabled) return;
            // Choice handled via individual btn click listeners
        });
    }

    /* ===== 主入口 ===== */
    function render(containerId, initialTrackId) {
        var container = document.getElementById(containerId);
        if (!container) {
            console.error('[PixelStory] container not found:', containerId);
            return Promise.reject(new Error('container not found'));
        }
        shellElement = container;
        storyShellElement = container.closest('#pixelStoryShell');
        preferredTrackId = initialTrackId || preferredTrackId || 'sci-fi';
        shellElement.classList.add('pixel-story-engine-host');

        return loadManifest().then(function () {
            showMap();
        }).catch(function (err) {
            container.innerHTML = '<div style="padding:40px;color:#ff6b6b;text-align:center">故事加载失败，请检查网络后重试</div>';
            console.error('[PixelStory] init error:', err);
        });
    }

    function setPreferredTrack(trackId, renderNow) {
        preferredTrackId = trackId || 'sci-fi';
        if (renderNow !== false && shellElement && manifest) showMap();
    }

    /* ===== 工具 ===== */
    function showToast(msg) {
        if (typeof root.showToast === 'function') root.showToast(msg);
        else console.log('[PixelStory]', msg);
    }

    /* ===== 对外 API ===== */
    var PixelStoryEngine = {
        render: render,
        enterChapter: enterChapter,
        showMap: showMap,
        loadManifest: loadManifest,
        loadChapter: loadChapter,
        loadChapterAudioIndex: loadChapterAudioIndex,
        setPreferredTrack: setPreferredTrack,
        getCompletedChapters: getCompletedChapters,
        getChapterProgress: getChapterProgress,
        readProgress: readProgress
    };

    if (typeof root.PixelStoryEngine === 'undefined') {
        root.PixelStoryEngine = PixelStoryEngine;
    }
})(window);
