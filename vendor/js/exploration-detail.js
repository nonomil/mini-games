/**
 * exploration-detail.js - 场景探索中间页
 * 大图背景 + 故事推进 + 互动事件 → 战斗
 */

const ExplorationDetail = (function () {
    let currentScene = null;
    let eventIndex = 0;
    let foundItems = [];
    let currentChapter = null;
    let shortFlow = null;
    let shortFlowPhase = 'see';
    let shortSeeCursor = 0;
    let shortChallengeStatus = 'available';
    let shortChoiceFeedback = null;
    let foundItemsGranted = false;
    let stageHostId = 'explorationStageRoot';
    let returnTarget = 'forest-map';

    function resolveAssetUrl(value) {
        return window.resolvePetBankAssetUrl ? window.resolvePetBankAssetUrl(value) : value;
    }

    // CMATH 应用题池（data/math-cmath.json，来源 XiaoMi/cmath CC BY 4.0）
    // 懒加载：进入探索即后台 fetch 一次缓存到内存，genMathQuestion 同步读取
    let CMATH_POOL = null;        // { '1': [...], '2': [...] }
    let _cmathLoading = false;
    function _ensureCmathPool() {
        if (CMATH_POOL || _cmathLoading) return;
        _cmathLoading = true;
        fetch(window.resolvePetBankAssetUrl ? window.resolvePetBankAssetUrl('data/math-cmath.json') : 'data/math-cmath.json')
            .then(r => r.json())
            .then(d => { CMATH_POOL = d.grades || {}; _cmathLoading = false; })
            .catch(() => { _cmathLoading = false; });
    }

    function playSfx(name) {
        if (window.sfx && typeof window.sfx.play === 'function') window.sfx.play(name);
    }

    // 探索故事数据（每个场景一个 JSON，运行时只使用该数据源）
    const STORY_SCENE_IDS = ['forest', 'beach', 'mountain', 'space', 'candy', 'cave', 'waterfall', 'desert', 'underwater', 'castle', 'volcano', 'stargarden'];
    let _storiesLoaded = false;
    let _storiesLoadingPromise = null;
    const STORY_DATA_VERSION = '20260711-short-copy-v1';
    async function _loadStories() {
        if (_storiesLoaded) return;
        if (_storiesLoadingPromise) return _storiesLoadingPromise;
        _storiesLoadingPromise = (async () => {
            const results = await Promise.all(STORY_SCENE_IDS.map(async id => {
                try {
                    const rawUrl = window.resolvePetBankAssetUrl ? window.resolvePetBankAssetUrl(`data/stories/${id}.json`) : `data/stories/${id}.json`;
                    const response = await fetch(`${rawUrl}${rawUrl.includes('?') ? '&' : '?'}v=${STORY_DATA_VERSION}`, { cache: 'no-store' });
                    if (!response.ok) throw new Error(`HTTP ${response.status}`);
                    return await response.json();
                } catch (error) {
                    console.warn(`[ExplorationDetail] story load failed: ${id}`, error);
                    return null;
                }
            }));
            results.forEach((s, i) => {
                    if (s && s.events) storyData[STORY_SCENE_IDS[i]] = s;
            });
            _storiesLoaded = true;
            _storiesLoadingPromise = null;
        })();
        return _storiesLoadingPromise;
    }

    let storyData = {};

    // galgame 立绘映射（场景 → 角色立绘图，Agnes 生图后填路径）
    const SCENE_CHAR_PORTRAIT = {
        forest: 'assets/characters/forest-mushroom-fairy.webp',
        beach: 'assets/characters/beach-captain-gull.webp',
        mountain: 'assets/characters/mountain-snow-wolf.webp',
        space: 'assets/characters/space-alien-guide.webp',
        candy: 'assets/characters/candy-princess.webp',
        cave: 'assets/characters/cave-crystal-guard.webp',
        waterfall: 'assets/characters/waterfall-frog-guide.webp',
        desert: 'assets/characters/desert-mummy-traveler.webp',
        underwater: 'assets/characters/underwater-mermaid.webp',
        castle: 'assets/characters/castle-library-ghost.webp',
        volcano: 'assets/characters/volcano-phoenix.webp',
        stargarden: 'assets/characters/stargarden-star-fox.webp',
    };

    // 显示探索页（galgame 风格：背景 + 左右立绘 + 底部对话框 + 推进）
    async function show(sceneId, options = {}) {
        stageHostId = options.hostId || 'explorationStageRoot';
        returnTarget = options.returnTarget || 'forest-map';
        // 宠物小屋 R5 第二守卫（F1 兜底）：hp<=0 且已选宠 → 拦截
        if (window.PetSystem) {
            try {
                const s = PetSystem.getState();
                if (s.species && s.hp <= 0) {
                    if (typeof window.switchPage === 'function') window.switchPage(returnTarget === 'forest-map' ? 'forest-map' : 'explore');
                    if (typeof window.showToast === 'function') {
                        window.showToast('宠物倒下了，先去宠物小屋救援吧');
                    } else {
                        alert('宠物倒下了，请先去宠物小屋救援！');
                    }
                    return;
                }
            } catch (e) {}
        }
        const scenes = ExplorationSystem.getAllScenes();
        currentScene = scenes.find(s => s.id === sceneId);
        if (!currentScene) return;
        await _loadStories();
        if (window.TravelMemory && typeof window.TravelMemory.load === 'function') {
            await window.TravelMemory.load();
        }
        // 故事未加载(file://协议或fetch失败) → 明确提示，不再静默回退兜底（R1 单一源）
        if (!storyData[currentScene.id]) {
            await switchPage(returnTarget === 'forest-map' ? 'forest-map' : 'explore');
            const failedHost = document.getElementById(stageHostId);
            if (failedHost) {
                failedHost.hidden = false;
                failedHost.innerHTML = '<div class="exploration-stage-error">📖 故事加载失败<br><span>请稍后重试，故事信号暂时没有接通。</span></div>';
            }
            currentScene = null;
            return;
        }
        const events = storyData[currentScene.id]?.events || [];
        currentChapter = window.ExplorationChapter?.build?.(events) || null;
        shortFlow = window.ExplorationChapter?.buildShortFlow?.(storyData[currentScene.id]) || null;
        const saved = window.ExplorationProgress?.load?.(currentScene.id) || null;
        eventIndex = saved && saved.activeEventIndex < events.length ? saved.activeEventIndex : 0;
        foundItems = saved && Array.isArray(saved.foundItems) ? [...saved.foundItems] : [];
        foundItemsGranted = false;
        if (shortFlow && saved?.flowMode === 'short') {
            shortFlowPhase = saved.flowPhase || 'see';
            shortSeeCursor = Math.min(shortFlow.see.length, Number(saved.seeCursor) || 0);
            shortChallengeStatus = saved.challengeStatus || 'available';
            shortChoiceFeedback = saved.choiceFeedback || null;
        } else {
            shortFlowPhase = 'see';
            shortSeeCursor = 0;
            shortChallengeStatus = 'available';
            shortChoiceFeedback = null;
        }
        _ensureCmathPool();  // 后台预加载应用题库（CMATH）

        await switchPage(returnTarget === 'forest-map' ? 'forest-map' : 'explore');

        const el = document.getElementById(stageHostId);
        if (!el) return;
        el.hidden = false;
        el.setAttribute('aria-hidden', 'false');
        document.body.classList.add('exploration-stage-active');

        // galgame 框架：背景 + 左右立绘位 + 退出 + 底部对话框（点击推进）
        el.innerHTML = `
            <div class="galgame-stage" id="galgameStage">
                <div class="galgame-bg"><img src="${resolveAssetUrl(currentScene.image)}" alt="${currentScene.name}"></div>
                <img class="galgame-portrait galgame-portrait-left" id="galgamePortraitL" style="display:none">
                <img class="galgame-portrait galgame-portrait-right" id="galgamePortraitR" src="${resolveAssetUrl(PetSystem.getCurrentStageImage ? PetSystem.getCurrentStageImage() : '')}" alt="宠物">
                <button class="galgame-back" onclick="ExplorationDetail.exit()">← 退出探索</button>
                <div class="galgame-chapter-progress" id="galgameChapterProgress"></div>
                <div class="galgame-box" id="galgameBox" onclick="ExplorationDetail.next()">
                    <div class="galgame-name" id="galgameName">${currentScene.emoji} ${currentScene.name}</div>
                    <div class="galgame-text" id="galgameText"></div>
                    <div class="galgame-choices" id="galgameChoices"></div>
                    <div class="galgame-next">▶</div>
                </div>
            </div>
        `;
        if (shortFlow) renderShortPhase();
        else showNextEvent();
    }

    function chapterNode(eventIdx) {
        return currentChapter && window.ExplorationChapter?.getNodeForEvent
            ? window.ExplorationChapter.getNodeForEvent(currentChapter, eventIdx)
            : { id: 'see' };
    }

    function renderChapterProgress(eventIdx) {
        const el = document.getElementById('galgameChapterProgress');
        if (!el) return;
        const rawActive = chapterNode(eventIdx).id;
        const active = rawActive === 'challenge' ? 'see' : rawActive;
        const labels = [['see', '看见'], ['choose', '选择'], ['return', '带回家']];
        const activeIndex = labels.findIndex(([id]) => id === active);
        el.innerHTML = labels.map(([id, label], index) => `<span class="${id === active ? 'active' : ''} ${activeIndex > index ? 'done' : ''}">${index + 1} ${label}</span>`).join('<b>·</b>');
    }

    function saveProgress(activeEventIndex = eventIndex, awaitingInput = false) {
        if (!currentScene || !window.ExplorationProgress?.save) return;
        const input = {
            sceneId: currentScene.id,
            eventIndex,
            activeEventIndex,
            awaitingInput,
            foundItems,
            nodeId: chapterNode(activeEventIndex).id
        };
        if (shortFlow) {
            input.flowMode = 'short';
            input.flowPhase = shortFlowPhase;
            input.seeCursor = shortSeeCursor;
            input.challengeStatus = shortChallengeStatus;
            input.choiceFeedback = shortChoiceFeedback;
        }
        window.ExplorationProgress.save(input);
    }

    function clearProgress() {
        if (currentScene && window.ExplorationProgress?.clear) window.ExplorationProgress.clear(currentScene.id);
    }

    // 设置左侧角色立绘（场景对应角色）
    function setScenePortrait() {
        const img = document.getElementById('galgamePortraitL');
        if (!img) return;
        const p = SCENE_CHAR_PORTRAIT[currentScene.id];
        if (p) { img.src = resolveAssetUrl(p); img.style.display = ''; img.onerror = () => { img.style.display = 'none'; }; }
        else { img.style.display = 'none'; }
    }

    function setPetMood(mood) {
        const img = document.getElementById('galgamePortraitR');
        if (!img) return;
        img.classList.remove('mood-happy', 'mood-surprised', 'mood-worried', 'mood-proud');
        img.classList.add(`mood-${mood || 'happy'}`);
    }

    function escapeCopy(value) {
        return String(value || '').replace(/[&<>"']/g, (char) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[char]));
    }

    function getEventCopy(event) {
        return window.ExplorationCopy && typeof window.ExplorationCopy.get === 'function'
            ? window.ExplorationCopy.get(event)
            : { text: event?.text || '', detailText: '', mood: 'happy', isShort: false };
    }

    function copyHtml(event, className = '') {
        const copy = getEventCopy(event);
        const detail = copy.detailText
            ? `<button class="galgame-detail-toggle" type="button" onclick="event.stopPropagation();ExplorationDetail.toggleDetail(this)">想知道更多</button><span class="galgame-detail" hidden>${escapeCopy(copy.detailText)}</span>`
            : '';
        return `<span class="${className}">${escapeCopy(copy.text)}</span>${detail}`;
    }

    function applyEventMood(event) {
        setPetMood(getEventCopy(event).mood);
    }

    // 数学解谜出题（难度分级，自实现，不依赖 math-pk 闭包）
    // mathType: 'arithmetic'(裸算式,默认) | 'word'(CMATH 应用题) | 'logic'(找规律)
    // event: 可选，携带 R3 固定场景题(question/answer/options)时优先用
    function genMathQuestion(mathType, difficulty, event) {
        // R3 场景化：事件自带固定场景题优先（无则回退 arithmetic/word-CMATH/logic）
        if (event && event.question && event.answer != null) {
            return { text: event.question, answer: event.answer, options: event.options || genMathOptions(event.answer) };
        }
        // 应用题：从 CMATH 池按年级抽（池未就绪则回退算式，保证不阻塞）
        if (mathType === 'word' && CMATH_POOL) {
            const g = difficulty === 'easy' ? '1' : '2';
            const pool = CMATH_POOL[g] || CMATH_POOL['1'] || [];
            if (pool.length) {
                const q = pool[Math.floor(Math.random() * pool.length)];
                return { text: q.q, answer: q.a, options: q.opts };  // CMATH 自带选项
            }
        }
        // 逻辑题：找规律 / 等式平衡（思维启蒙，后段场景）
        if (mathType === 'logic') return genLogic();
        const d = difficulty || 'easy';
        const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
        const ops = d === 'easy' ? ['+', '-'] : d === 'medium' ? ['×', '×'] : ['×', '÷'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        let a, b, answer;
        if (op === '+') { a = rand(5, 25); b = rand(5, 25); answer = a + b; }
        else if (op === '-') { a = rand(15, 40); b = rand(1, a - 1); answer = a - b; }
        else if (op === '×') { a = rand(2, 9); b = rand(2, 9); answer = a * b; }
        else { b = rand(2, 9); const q = rand(2, 9); a = b * q; answer = q; }
        return { text: `${a} ${op} ${b} = ?`, answer };
    }
    // 逻辑题：找规律（等差/倍数/斐波那契）/ 等式平衡，思维启蒙向（答案≤50）
    function genLogic() {
        const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
        const k = Math.random();
        if (k < 0.4) {                       // 等差
            const a0 = rand(1, 5), d = rand(2, 5);
            return { text: `找规律：${a0}, ${a0 + d}, ${a0 + 2 * d}, ${a0 + 3 * d}, ?`, answer: a0 + 4 * d };
        } else if (k < 0.65) {               // 倍数
            const a0 = rand(2, 4);
            return { text: `找规律：${a0}, ${a0 * 2}, ${a0 * 4}, ?`, answer: a0 * 8 };
        } else if (k < 0.85) {               // 斐波那契
            return { text: `找规律：1, 1, 2, 3, 5, ?`, answer: 8 };
        } else {                             // 等式平衡 ? + a = b
            const b = rand(10, 18), a = rand(2, 8);
            return { text: `猜一猜：? + ${a} = ${b}`, answer: b - a };
        }
    }
    function genMathOptions(answer) {
        const opts = new Set([answer]);
        while (opts.size < 4) {
            const v = answer + Math.floor(Math.random() * 7) - 3;
            if (v >= 0) opts.add(v);
        }
        return [...opts].sort(() => Math.random() - 0.5);
    }

    function buildMathRetryHint(hint, explanation) {
        if (hint) return `下一步：${hint}`;
        if (explanation) return `复盘：${explanation}`;
        return '下一步：先把题目里的数量圈出来，再决定用加法、减法还是乘法。';
    }

    function answerMath(correct, exp, msg, hint, explanation) {
        const textEl = document.getElementById('galgameText');
        const choicesEl = document.getElementById('galgameChoices');
        const box = document.getElementById('galgameBox');
        if (!textEl) return;
        if (correct) {
            playSfx('mathCorrect');
            if (exp && window.PetSystem) PetSystem.addExp(exp);
            const parts = [`<span class="galgame-found">${msg || '答对了！'}</span>`];
            if (explanation) {
                parts.push(`<span class="galgame-explanation">解析：${explanation}</span>`);
            }
            textEl.innerHTML = parts.join('<br>');
        } else {
            playSfx('mathWrong');
            const parts = ['<span class="galgame-warn">这次还差一点，先换个观察顺序。</span>'];
            parts.push(`<span class="galgame-hint">${buildMathRetryHint(hint, explanation)}</span>`);
            if (hint && explanation) {
                parts.push(`<span class="galgame-explanation">复盘：${explanation}</span>`);
            }
            textEl.innerHTML = parts.join('<br>');
        }
        choicesEl.innerHTML = '';
        if (shortFlow && shortFlowPhase === 'math') {
            if (correct) {
                shortFlowPhase = 'battle';
                shortChallengeStatus = 'math-complete';
                box.onclick = () => renderShortBattlePrompt();
            } else {
                shortFlowPhase = 'math';
                box.onclick = () => renderShortMath();
            }
            saveProgress(eventIndex, false);
            return;
        }
        box.onclick = () => ExplorationDetail.next();
        saveProgress(eventIndex, false);
    }

    function renderShortPhase() {
        if (!shortFlow || !currentScene) return;
        if (shortFlowPhase === 'see') {
            const eventIndexForPhase = shortFlow.see[Math.min(shortSeeCursor, shortFlow.see.length - 1)];
            renderChapterProgress(eventIndexForPhase);
            const event = window.ExplorationChapter.getShortFlowEvent(shortFlow, 'see', shortSeeCursor);
            if (!event) {
                shortFlowPhase = 'choose';
                renderShortPhase();
                return;
            }
            renderShortStoryEvent(event, eventIndexForPhase);
            return;
        }
        if (shortFlowPhase === 'choose') {
            renderShortChoice();
            return;
        }
        if (shortFlowPhase === 'math') {
            renderShortMath();
            return;
        }
        if (shortFlowPhase === 'battle') {
            renderShortBattlePrompt();
        }
    }

    function renderShortStoryEvent(event, activeEventIndex) {
        const nameEl = document.getElementById('galgameName');
        const textEl = document.getElementById('galgameText');
        const choicesEl = document.getElementById('galgameChoices');
        const box = document.getElementById('galgameBox');
        if (!nameEl || !textEl || !choicesEl || !box) return;
        choicesEl.innerHTML = '';
        if (event.type === 'discover') {
            playSfx('discover');
            const found = !!(event.item && Math.random() < event.chance);
            textEl.innerHTML = `<span style="font-size:28px">${escapeCopy(event.emoji)}</span> ${copyHtml(event)}${found ? '<br><span class="galgame-found">✨ 获得物品！</span>' : ''}`;
            if (found && !foundItems.includes(event.item)) foundItems.push(event.item);
            nameEl.textContent = '✨ 发现';
        } else {
            nameEl.textContent = `${currentScene.emoji} ${currentScene.name}`;
            textEl.innerHTML = copyHtml(event);
        }
        applyEventMood(event);
        setScenePortrait();
        box.onclick = () => {
            if (shortSeeCursor < shortFlow.see.length - 1) {
                shortSeeCursor += 1;
                saveProgress(activeEventIndex, false);
                renderShortPhase();
            } else {
                shortFlowPhase = 'choose';
                saveProgress(shortFlow.choose, true);
                renderShortPhase();
            }
        };
        saveProgress(activeEventIndex, false);
    }

    function renderShortChoice() {
        const event = window.ExplorationChapter.getShortFlowEvent(shortFlow, 'choose');
        const nameEl = document.getElementById('galgameName');
        const textEl = document.getElementById('galgameText');
        const choicesEl = document.getElementById('galgameChoices');
        const box = document.getElementById('galgameBox');
        if (!event || !nameEl || !textEl || !choicesEl || !box) return;
        renderChapterProgress(shortFlow.choose);
        nameEl.textContent = `${currentScene.emoji} ${currentScene.name}`;
        textEl.innerHTML = shortChoiceFeedback
            ? `<span class="galgame-reward">${escapeCopy(shortChoiceFeedback.text)}</span><br>${escapeCopy(shortChoiceFeedback.reward)}${shortChoiceFeedback.found ? '<br><span class="galgame-found">✨ 获得物品！</span>' : ''}`
            : copyHtml(event);
        applyEventMood(event);
        if (shortChoiceFeedback) {
            choicesEl.innerHTML = '<button class="galgame-choice" onclick="event.stopPropagation();ExplorationDetail.completeShortJourney()">🏠 带回家</button><button class="galgame-choice" onclick="event.stopPropagation();ExplorationDetail.startShortChallenge()">⚔️ 挑战一下</button>';
            box.onclick = null;
            return;
        }
        choicesEl.innerHTML = event.options.map((opt, i) =>
            `<button class="galgame-choice" onclick="event.stopPropagation();ExplorationDetail.choose(${shortFlow.choose},${i})">${escapeCopy(opt.text)}</button>`
        ).join('');
        box.onclick = null;
        saveProgress(shortFlow.choose, true);
    }

    function renderShortMath() {
        const event = window.ExplorationChapter.getShortFlowEvent(shortFlow, 'math');
        if (!event) return;
        shortFlowPhase = 'math';
        eventIndex = shortFlow.challenge.math;
        renderChapterProgress(eventIndex);
        const q = genMathQuestion(event.mathType || 'arithmetic', event.difficulty || 'easy', event);
        const opts = q.options || genMathOptions(q.answer);
        const nameEl = document.getElementById('galgameName');
        const textEl = document.getElementById('galgameText');
        const choicesEl = document.getElementById('galgameChoices');
        const box = document.getElementById('galgameBox');
        if (!nameEl || !textEl || !choicesEl || !box) return;
        nameEl.textContent = '🔢 可选挑战';
        const copy = getEventCopy(event);
        const skillHtml = event.skill ? `<span class="galgame-skill">能力点：${escapeCopy(event.skill)}</span>` : '';
        textEl.innerHTML = `${escapeCopy(copy.text)}${skillHtml ? `<br>${skillHtml}` : ''}<br><span class="galgame-word">${escapeCopy(q.text)}</span>`;
        const rewardMsg = JSON.stringify(event.reward?.msg || '');
        const hint = JSON.stringify(event.hint || '');
        const explanation = JSON.stringify(event.explanation || '');
        choicesEl.innerHTML = opts.map(o =>
            `<button class="galgame-choice" onclick='event.stopPropagation();ExplorationDetail.answerMath(${o === q.answer}, ${event.reward?.exp || 0}, ${rewardMsg}, ${hint}, ${explanation})'>${escapeCopy(o)}</button>`
        ).join('');
        box.onclick = null;
        saveProgress(eventIndex, true);
    }

    function renderShortBattlePrompt() {
        const event = window.ExplorationChapter.getShortFlowEvent(shortFlow, 'battle');
        const nameEl = document.getElementById('galgameName');
        const textEl = document.getElementById('galgameText');
        const choicesEl = document.getElementById('galgameChoices');
        const box = document.getElementById('galgameBox');
        if (!event || !nameEl || !textEl || !choicesEl || !box) return;
        eventIndex = shortFlow.challenge.battle;
        renderChapterProgress(eventIndex);
        nameEl.textContent = '⚔️ 可选挑战';
        textEl.innerHTML = `${copyHtml(event, 'galgame-warn')}<br>准备好就出发！`;
        choicesEl.innerHTML = '<button class="galgame-choice" onclick="event.stopPropagation();ExplorationDetail.startShortBattle()">⚔️ 开始挑战</button>';
        box.onclick = null;
        saveProgress(eventIndex, true);
    }

    function completeShortJourney() {
        if (!shortFlow) return;
        shortChallengeStatus = 'skipped';
        shortFlowPhase = 'return';
        grantFoundItems();
        clearProgress();
        showEnding();
    }

    function grantFoundItems() {
        if (foundItemsGranted || !foundItems.length || !window.InventorySystem?.addItem) return;
        foundItems.forEach((itemId) => window.InventorySystem.addItem(itemId, 1));
        foundItemsGranted = true;
        if (typeof window.showToast === 'function') window.showToast(`探索中发现了 ${foundItems.length} 件物品！`);
    }

    function startShortChallenge() {
        if (!shortFlow) return;
        shortChallengeStatus = 'active';
        shortFlowPhase = 'math';
        saveProgress(shortFlow.challenge.math, true);
        renderShortMath();
    }

    function startShortBattle() {
        if (!shortFlow) return;
        shortChallengeStatus = 'battle';
        shortFlowPhase = 'battle';
        saveProgress(shortFlow.challenge.battle, true);
        triggerBattle();
    }

    function showNextEvent() {
        const events = storyData[currentScene.id]?.events || [];
        if (eventIndex >= events.length) { triggerBattle(); return; }
        const event = events[eventIndex];
        const nameEl = document.getElementById('galgameName');
        const textEl = document.getElementById('galgameText');
        const choicesEl = document.getElementById('galgameChoices');
        const box = document.getElementById('galgameBox');
        if (!nameEl || !textEl) return;
        const activeEventIndex = eventIndex;
        eventIndex++;
        renderChapterProgress(activeEventIndex);
        choicesEl.innerHTML = '';
        box.onclick = () => ExplorationDetail.next();  // 默认点击对话框推进

        if (event.type === 'narrate') {
            nameEl.textContent = `${currentScene.emoji} ${currentScene.name}`;
            textEl.innerHTML = copyHtml(event);
            applyEventMood(event);
            setScenePortrait();
            saveProgress(activeEventIndex, false);
        } else if (event.type === 'discover') {
            playSfx('discover');
            const found = !!(event.item && Math.random() < event.chance);
            nameEl.textContent = '✨ 发现';
            textEl.innerHTML = `<span style="font-size:28px">${escapeCopy(event.emoji)}</span> ${copyHtml(event)}${found ? '<br><span class="galgame-found">✨ 获得物品！</span>' : ''}`;
            applyEventMood(event);
            setScenePortrait();
            if (found) foundItems.push(event.item);
            saveProgress(activeEventIndex, false);
        } else if (event.type === 'choice') {
            nameEl.textContent = `${currentScene.emoji} ${currentScene.name}`;
            textEl.innerHTML = copyHtml(event);
            applyEventMood(event);
            choicesEl.innerHTML = event.options.map((opt, i) =>
                `<button class="galgame-choice" onclick="event.stopPropagation();ExplorationDetail.choose(${eventIndex - 1},${i})">${opt.text}</button>`
            ).join('');
            box.onclick = null;  // choice 时禁点击推进，等选择
            eventIndex--;  // undo，等 choose 推进
            saveProgress(activeEventIndex, true);
            return;
        } else if (event.type === 'encounter') {
            playSfx('encounterWarning');
            nameEl.textContent = '⚠️ 遭遇';
            textEl.innerHTML = `${copyHtml(event, 'galgame-warn')}<br>点击准备战斗！`;
            applyEventMood(event);
            saveProgress(activeEventIndex, true);
        } else if (event.type === 'math') {
            const q = genMathQuestion(event.mathType || 'arithmetic', event.difficulty || 'easy', event);
            const opts = q.options || genMathOptions(q.answer);
            nameEl.textContent = '🔢 谜题';
            // R3: 固定场景题(长题面)用 galgame-word 样式, 仅裸算式保留 galgame-math
            const useWordStyle = !!event.question || event.mathType === 'word';
            const skillHtml = event.skill ? `<span class="galgame-skill">能力点：${event.skill}</span>` : '';
            const copy = getEventCopy(event);
            const qHtml = `${escapeCopy(copy.text)}${skillHtml ? `<br>${skillHtml}` : ''}<br><span class="${useWordStyle ? 'galgame-word' : 'galgame-math'}">${escapeCopy(q.text)}</span>`;
            const rewardMsg = JSON.stringify(event.reward?.msg || '');
            const hint = JSON.stringify(event.hint || '');
            const explanation = JSON.stringify(event.explanation || '');
            textEl.innerHTML = qHtml;
            choicesEl.innerHTML = opts.map(o =>
                `<button class="galgame-choice" onclick='event.stopPropagation();ExplorationDetail.answerMath(${o === q.answer}, ${event.reward?.exp || 0}, ${rewardMsg}, ${hint}, ${explanation})'>${o}</button>`
            ).join('');
            box.onclick = null;  // 等答题
            saveProgress(activeEventIndex, true);
            return;
        }
    }

    function toggleDetail(button) {
        const detail = button && button.nextElementSibling;
        if (!detail) return;
        const hidden = detail.hasAttribute('hidden');
        if (hidden) detail.removeAttribute('hidden');
        else detail.setAttribute('hidden', '');
        button.textContent = hidden ? '收起' : '想知道更多';
    }

    function choose(eventIdx, choiceIdx) {
        const events = storyData[currentScene.id]?.events || [];
        const event = events[eventIdx];
        if (!event) return;
        const choice = event.options[choiceIdx];
        const found = !!(choice.item && Math.random() < choice.chance);
        const textEl = document.getElementById('galgameText');
        const choicesEl = document.getElementById('galgameChoices');
        const box = document.getElementById('galgameBox');
        if (!textEl) return;
        playSfx('choiceConfirm');
        if (shortFlow && eventIdx === shortFlow.choose) {
            shortChoiceFeedback = {
                text: choice.text,
                reward: choice.reward,
                found,
                item: found ? choice.item : ''
            };
            if (found && !foundItems.includes(choice.item)) foundItems.push(choice.item);
            shortFlowPhase = 'choose';
            saveProgress(shortFlow.choose, true);
            renderShortChoice();
            return;
        }
        textEl.innerHTML = `<span class="galgame-reward">${choice.text}</span><br>${choice.reward}${found ? '<br><span class="galgame-found">✨ 获得物品！</span>' : ''}`;
        choicesEl.innerHTML = '';
        box.onclick = () => ExplorationDetail.next();  // 恢复点击推进
        if (found) foundItems.push(choice.item);
        eventIndex++;
        saveProgress(eventIndex, false);
    }

    function triggerBattle() {
        const result = ExplorationSystem.startExploration(currentScene.id);
        if (!result.success) {
            showToast(result.msg);
            exit();
            return;
        }
        // 给予发现的物品（短路径和 legacy 路径共用幂等发放）
        grantFoundItems();

        if (result.battle) {
            playSfx('battleStart');
            const battle = ExplorationSystem.startBattle(result.battle.scene, result.battle.monster);
            showBattleModal(battle);
        } else {
            const memoryResult = recordTravelMemory();
            if (memoryResult?.accepted) showToast(memoryResult.memory.returnText);
            showToast(result.msg);
            if (shortFlow) showEnding();
            else exit();
        }
    }

    function recordTravelMemory() {
        if (!currentScene || !window.TravelMemory || typeof window.TravelMemory.record !== 'function') return null;
        const petState = window.PetSystem?.getState?.() || null;
        const species = petState?.species_data || null;
        const pet = petState?.species ? {
            speciesId: petState.species,
            name: species?.name || '我的宠物',
            emoji: species?.emoji || petState.stage_emoji || '🐾',
            image: window.PetSystem?.getCurrentStageImage?.() || species?.imageUrl || '',
            stage: petState.stage?.name || '成长中'
        } : null;
        const result = window.TravelMemory.record({ sceneId: currentScene.id, pet });
        if (result.accepted && result.memory.itemId && !foundItems.includes(result.memory.itemId) && window.InventorySystem) {
            window.InventorySystem.addItem(result.memory.itemId, 1);
        }
        return result;
    }

    function next() {
        playSfx('dialogueNext');
        if (shortFlow) renderShortPhase();
        else showNextEvent();  // galgame 单条推进（无堆叠，无需 disable）
    }

    function exit() {
        const exitedSceneId = currentScene?.id || null;
        const exitedReturnTarget = returnTarget;
        if (window.VoiceSystem && typeof VoiceSystem.stop === 'function') {
            VoiceSystem.stop();
        }
        clearProgress();
        currentScene = null;
        eventIndex = 0;
        foundItems = [];
        foundItemsGranted = false;
        shortFlow = null;
        shortFlowPhase = 'see';
        shortSeeCursor = 0;
        shortChallengeStatus = 'available';
        shortChoiceFeedback = null;

        const stageHost = document.getElementById(stageHostId);
        if (stageHost) {
            stageHost.innerHTML = '';
            stageHost.hidden = true;
            stageHost.setAttribute('aria-hidden', 'true');
        }
        document.body.classList.remove('exploration-stage-active');
        window.dispatchEvent(new CustomEvent('petbank:exploration-stage-exit', {
            detail: { returnTarget: exitedReturnTarget, sceneId: exitedSceneId }
        }));
        window.scrollTo(0, 0);
    }

    // 战斗胜利后显示结束叙事（点 ▶ 回场景列表）
    function showEnding() {
        const msg = currentScene && storyData[currentScene.id]?.ending_text;
        const nameEl = document.getElementById('galgameName');
        const textEl = document.getElementById('galgameText');
        const box = document.getElementById('galgameBox');
        if (!msg || !nameEl || !textEl) { exit(); return; }
        const memoryResult = recordTravelMemory();
        const memory = memoryResult?.memory || (window.TravelMemory?.getAll?.() || []).find(item => item.sceneId === currentScene.id);
        document.getElementById('galgameChoices').innerHTML = '';
        clearProgress();
        nameEl.textContent = '🎉 冒险完成';
        const badgeHtml = memory && window.TravelMemory?.isRenderableAsset?.(memory, 'asset')
            ? `<img class="travel-memory-art" src="${escapeCopy(memory.asset)}" alt="${escapeCopy(memory.title)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="travel-memory-icon" hidden>${escapeCopy(memory.icon)}</div>`
            : (memory ? `<div class="travel-memory-icon">${escapeCopy(memory.icon)}</div>` : '');
        textEl.innerHTML = `<span class="galgame-found">${escapeCopy(msg)}</span>${memory ? `<div class="travel-memory-card"><div class="travel-memory-visual">${badgeHtml}</div><div><strong>${escapeCopy(memory.title)}</strong><span>${escapeCopy(memory.returnText)}</span><small>${escapeCopy(memory.nextPreview)}</small></div></div>` : ''}`;
        setPetMood('proud');
        box.onclick = () => ExplorationDetail.exit();
    }

    // 是否处于 galgame 探索中（战斗结束后判断要不要回场景列表）
    function isActive() { return currentScene != null; }

    _loadStories();  // 模块加载即预取各场景 JSON

    return {
        show, next, choose, exit, answerMath, isActive, showEnding, toggleDetail,
        completeShortJourney, startShortChallenge, startShortBattle
    };
})();

window.ExplorationDetail = ExplorationDetail;
