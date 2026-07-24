/**
 * exploration.js - 探索冒险 + 地图路线渲染
 */

const ExplorationSystem = (function () {
    /**
     * S1（按 min_level 重排版）：12 场景按解锁等级 LV1→LV2→LV3→LV4→LV5 由外向内螺旋推进，
     * array 顺序即路线 polyline 顺序；同 LV 场景连续排列，LV 过渡处两节点地理相邻、直连无绕行
     * （修复红框反馈：waterfall[Lv2 尾] → desert[Lv3 头] 上下紧挨，中间不隔其他节点）。
     *
     * 圈层划分（按 min_level，非 chapter）：
     *   外层 Lv1-2：forest + beach/candy/waterfall（顶部弧）
     *   中层 Lv3  ：desert/cave/mountain（右→底弧）
     *   内层 Lv4  ：castle/underwater（底→左）
     *   中心 Lv5  ：volcano/space/stargarden（向心，终点）
     *
     * chapter 字段保留原值（供 arenaChapter / buildMapNode 章节主题用），不再用作分层依据；
     * ring 字段值 = min_level（1-5 圈层 CSS 类）。相邻中心距 ≥24%，桌面 190px 卡不重叠。
     */
    const MAP_LAYOUT = [
        { id: 'forest',     x:  8, y: 12, size: 198, chapter: 1, min_level: 1, ring: 1 }, // 外层 左上 起点 Lv1
        { id: 'beach',      x: 32, y:  6, size: 182, chapter: 2, min_level: 2, ring: 2 }, // 外层 上左 Lv2
        { id: 'candy',      x: 60, y:  6, size: 176, chapter: 2, min_level: 2, ring: 2 }, // 外层 上右 Lv2
        { id: 'waterfall',  x: 88, y: 12, size: 176, chapter: 3, min_level: 2, ring: 2 }, // 外层 右上 Lv2 尾
        { id: 'desert',     x: 92, y: 38, size: 176, chapter: 3, min_level: 3, ring: 3 }, // 中层 右上 Lv3 头（紧挨 waterfall）
        { id: 'cave',       x: 88, y: 64, size: 172, chapter: 4, min_level: 3, ring: 3 }, // 中层 右下 Lv3
        { id: 'mountain',   x: 68, y: 86, size: 172, chapter: 4, min_level: 3, ring: 3 }, // 中层 底偏右 Lv3 尾
        { id: 'castle',     x: 40, y: 88, size: 176, chapter: 4, min_level: 4, ring: 4 }, // 内层 底偏左 Lv4 头（紧挨 mountain）
        { id: 'underwater', x: 12, y: 70, size: 176, chapter: 3, min_level: 4, ring: 4 }, // 内层 左下 Lv4 尾
        { id: 'volcano',    x: 10, y: 44, size: 172, chapter: 4, min_level: 5, ring: 5 }, // 中心 左中 Lv5 头（紧挨 underwater）
        { id: 'space',      x: 40, y: 34, size: 168, chapter: 5, min_level: 5, ring: 5 }, // 中心 上 Lv5
        { id: 'stargarden', x: 60, y: 50, size: 194, chapter: 5, min_level: 5, ring: 5 }  // 中心 终点 Lv5
    ];

    /**
     * BLANK_CELLS 仅作为路线装饰点保留，不再暗示可点击的额外玩法节点。
     */
    const BLANK_CELLS = [
        { x: 20, y:  9 }, // forest→beach
        { x: 74, y: 10 }, // candy→waterfall
        { x: 90, y: 25 }, // waterfall→desert（Lv2→Lv3 过渡）
        { x: 54, y: 87 }, // mountain→castle（Lv3→Lv4 过渡）
        { x: 11, y: 57 }, // underwater→volcano（Lv4→Lv5 过渡）
        { x: 50, y: 42 }  // space→stargarden
    ];

    const RING_GUIDES = [
        { ring: 1, cx: 50, cy: 49, rx: 44, ry: 42 },
        { ring: 2, cx: 50, cy: 49, rx: 34, ry: 32 },
        { ring: 3, cx: 50, cy: 50, rx: 24, ry: 22 },
        { ring: 4, cx: 50, cy: 50, rx: 12, ry: 15 }
    ];
    // 章节（03 章节结构）：1 起点花园 / 2 森林边界 / 3 海边集市 / 4 高地洞窟 / 5 星空终点
    const CHAPTER_THEME = {
        1: { name: '起点花园', color: '#7ee68a' },
        2: { name: '森林边界', color: '#5ec8a0' },
        3: { name: '海边集市', color: '#5ab8d4' },
        4: { name: '高地洞窟', color: '#c89060' },
        5: { name: '星空终点', color: '#a888d4' }
    };
    // LV（解锁等级）色系：buildRouteSvg 色带按 min_level 分段，呈现"外绿→蓝→棕→橙→中心紫"等级递进
    const LV_THEME = {
        1: { name: '初探', color: '#7ee68a' },
        2: { name: '进阶', color: '#5ab8d4' },
        3: { name: '勇者', color: '#c89060' },
        4: { name: '挑战', color: '#f0a040' },
        5: { name: '终章', color: '#a888d4' }
    };
    // S2（层级信息增强）：把 5 个 min_level 合并成 4 个可视圈层带，配套标签文案 / 代表色 / 标签坐标。
    // 坐标取每圈底部空隙（12 节点最大空档在底部偏中），x=50 纵向堆叠，不遮挡节点；不改 S1 坐标/色带分段。
    // idx 与 RING_GUIDES 一一对应（0=外圈最大椭圆 → outer，3=最内椭圆 → core）。
    const TIER_META = [
        { key: 'outer', label: 'Lv.1-2 启程', levelRange: [1, 2],  color: LV_THEME[1].color, lx: 50, ly: 85 },
        { key: 'mid',   label: 'Lv.3 探险',   levelRange: [3, 3],  color: LV_THEME[3].color, lx: 50, ly: 76 },
        { key: 'inner', label: 'Lv.4 精英',   levelRange: [4, 4],  color: LV_THEME[4].color, lx: 50, ly: 67 },
        { key: 'core',  label: 'Lv.5 终点',   levelRange: [5, 99], color: LV_THEME[5].color, lx: 50, ly: 59 }
    ];
    // 宠物当前等级 → 所在圈层 key（pet.level 来自 PetSystem.getState().level）
    function petLevelToTierKey(level) {
        const lv = Number(level) || 1;
        for (const t of TIER_META) {
            if (lv >= t.levelRange[0] && lv <= t.levelRange[1]) return t.key;
        }
        return 'core';
    }

    function emitBattleAnimation(type, detail) {
        if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function' || typeof CustomEvent === 'undefined') return;
        window.dispatchEvent(new CustomEvent('battle-animate', {
            detail: Object.assign({ type }, detail || {})
        }));
    }

    let scenes = null;
    let currentBattle = null;
    let unlockedScenes = {};

    async function loadScenes() {
        if (scenes) return scenes;
        try {
            const response = await fetch(window.resolvePetBankAssetUrl ? window.resolvePetBankAssetUrl('data/scenes.json') : 'data/scenes.json');
            scenes = await response.json();
            loadUnlockState();
            return scenes;
        } catch (e) {
            console.error('Failed to load scenes.json:', e);
            return { scenes: [] };
        }
    }

    function loadUnlockState() {
        try {
            unlockedScenes = JSON.parse(localStorage.getItem('petbank_unlocked_scenes') || '{}');
        } catch {
            unlockedScenes = {};
        }
    }

    function saveUnlockState() {
        localStorage.setItem('petbank_unlocked_scenes', JSON.stringify(unlockedScenes));
    }

    function getAllScenes() {
        return scenes?.scenes || [];
    }

    function getSceneById(sceneId) {
        return getAllScenes().find((scene) => scene.id === sceneId) || null;
    }

    function getCurrentBattle() {
        return currentBattle;
    }

    function getMapLayout() {
        return MAP_LAYOUT.map((item) => ({ ...item }));
    }

    function isSceneUnlocked(scene) {
        const pet = PetSystem.getState();
        if (pet.level < (scene.min_level || 1)) return false;
        if ((scene.unlock_cost || 0) > 0 && !unlockedScenes[scene.id]) return false;
        return true;
    }

    function getUnlockedCount() {
        return getAllScenes().filter((scene) => isSceneUnlocked(scene)).length;
    }

    function getCurrentPoints() {
        const pointsApi = window.PetBankPoints;
        return pointsApi && typeof pointsApi.get === 'function'
            ? Number(pointsApi.get()) || 0
            : 0;
    }

    function updatePointBindings() {
        if (typeof window.updateStats === 'function') {
            window.updateStats();
        }
    }

    function updateMapStats() {
        const totalSceneCount = getAllScenes().length || 1;
        const unlockedCount = getUnlockedCount();
        const countEl = document.getElementById('mapUnlockedCount');
        const barEl = document.getElementById('mapProgressBar');
        const ptsEl = document.getElementById('mapPoints');
        const petLevelEl = document.getElementById('mapPetLevel');
        const winsEl = document.getElementById('mapWins');
        const pet = PetSystem.getState();

        if (countEl) countEl.textContent = `${unlockedCount}/${totalSceneCount} 场景已解锁`;
        if (barEl) barEl.style.width = `${Math.round(unlockedCount / totalSceneCount * 100)}%`;
        if (ptsEl) ptsEl.textContent = getCurrentPoints();
        if (petLevelEl) petLevelEl.textContent = `Lv.${pet.level}`;
        if (winsEl) winsEl.textContent = pet.wins || 0;
    }

    function buildRouteSvg(currentTierKey) {
        const points = MAP_LAYOUT.map((node) => `${node.x} ${node.y}`);
        const full = points.join(', ');
        // S2：4 个 LV 圈层分区底——同尺寸由大到小叠层填色，形成 4 条彩色圈带（外→内：绿/棕/橙/紫）。
        // 当前层 fill-opacity 0.16，其余 0.085，让"我在这一层"更易辨（07：装饰半透明、不喧宾夺主）。
        const bandFills = RING_GUIDES.map((guide, idx) => {
            const tier = TIER_META[idx];
            if (!tier) return '';
            const isCur = currentTierKey && currentTierKey === tier.key;
            const op = isCur ? 0.16 : 0.085;
            return `<ellipse class="map-ring-fill" cx="${guide.cx}" cy="${guide.cy}" rx="${guide.rx}" ry="${guide.ry}" fill="${tier.color}" fill-opacity="${op}" vector-effect="non-scaling-stroke"></ellipse>`;
        }).join('');
        const guides = RING_GUIDES.map((guide) => `
            <ellipse
                class="map-ring-guide ring-${guide.ring}"
                cx="${guide.cx}"
                cy="${guide.cy}"
                rx="${guide.rx}"
                ry="${guide.ry}"
                vector-effect="non-scaling-stroke"
            ></ellipse>
        `).join('');
        const stars = MAP_LAYOUT.map((node) => `
            <circle class="map-route-spark" cx="${node.x}" cy="${node.y}" r="1.8"></circle>
        `).join('');
        // S1（按 min_level 重排）：路径按解锁等级 LV 切成连续段（边界节点同时属于前后段，段段相连），
        // 每段铺一层 LV 色淡彩，沿螺旋呈现"外绿 → 蓝 → 棕 → 橙 → 中心紫"的等级递进感。
        const tierSegs = [];
        let cur = MAP_LAYOUT.length ? (MAP_LAYOUT[0].min_level || 1) : 1;
        let start = 0;
        for (let i = 1; i <= MAP_LAYOUT.length; i++) {
            const lv = i < MAP_LAYOUT.length ? (MAP_LAYOUT[i].min_level || cur) : null;
            if (lv !== cur) {
                const end = i < MAP_LAYOUT.length ? i : MAP_LAYOUT.length - 1;
                const sub = points.slice(start, end + 1).join(', ');
                const color = (LV_THEME[cur] || {}).color || '#f5e09e';
                tierSegs.push(
                    `<polyline class="map-route-tier" points="${sub}" stroke="${color}" vector-effect="non-scaling-stroke"></polyline>`
                );
                start = end; // 下一段从边界节点起步，段与段相连
                cur = lv;
            }
        }
        return `
            <svg class="map-route-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                ${bandFills}
                ${guides}
                ${tierSegs.join('')}
                <polyline class="map-route-line" points="${full}" vector-effect="non-scaling-stroke"></polyline>
                <polyline class="map-route-dash" points="${full}" vector-effect="non-scaling-stroke"></polyline>
                ${stars}
            </svg>
        `;
    }

    function buildMapNode(scene, layout, activeSceneId, boardId) {
        const unlocked = isSceneUnlocked(scene);
        const unlockCost = scene.unlock_cost || 0;
        const isLockedByPoints = unlockCost > 0 && !unlockedScenes[scene.id];
        // S0(F2)：解锁动作透传 boardId，避免重渲回首页板
        const safeBoard = boardId || 'forestMapSceneGrid';
        const returnTarget = safeBoard === 'forestMapSceneGrid' ? 'forest-map' : 'explore';
        const action = unlocked
            ? `ExplorationSystem.goExplore('${scene.id}', { returnTarget: '${returnTarget}' })`
            : `ExplorationSystem.tryUnlock('${scene.id}', '${safeBoard}')`;
        const theme = CHAPTER_THEME[layout.chapter] || CHAPTER_THEME[1];
        const stateClass = [
            'map-scene-node',
            `ring-${layout.ring || 1}`,
            `chapter-${layout.chapter}`,
            unlocked ? 'is-open' : 'is-locked',
            unlocked ? 'is-reachable' : '',
            activeSceneId === scene.id ? 'is-active' : ''
        ].filter(Boolean).join(' ');
        const pillText = unlocked
            ? `<span class="map-scene-pill">危险 ${scene.danger_level}</span><span class="map-scene-pill">HP -${scene.hp_cost}</span>`
            : `<span class="map-scene-pill locked">Lv.${scene.min_level}</span>${unlockCost > 0 ? `<span class="map-scene-pill locked">${unlockCost} 分</span>` : ''}`;

        return `
            <button
                type="button"
                class="${stateClass}"
                style="left:${layout.x}%;top:${layout.y}%;--node-size:${layout.size}px;--chapter-color:${theme.color};--ring-level:${layout.ring || 1};"
                onclick="${action}"
                aria-label="${unlocked ? `前往${scene.name}` : `解锁${scene.name}`}"
            >
                <div class="map-scene-bubble">
                    <div class="map-scene-thumb">
                        <img src="${window.resolvePetBankAssetUrl ? window.resolvePetBankAssetUrl(scene.image) : scene.image}" alt="${scene.name}" loading="lazy">
                        <div class="map-scene-meta">
                            <div class="map-scene-title"><span>${scene.emoji}</span><span>${scene.name}</span></div>
                            <div class="map-scene-chapter" style="color:${theme.color}">${theme.name}</div>
                            <div class="map-scene-desc">${scene.description}</div>
                        </div>
                        ${!unlocked ? `
                            <div class="map-scene-lock">
                                <strong>🔒 ${isLockedByPoints ? `${unlockCost} 积分解锁` : `需要 Lv.${scene.min_level}`}</strong>
                                <span>${isLockedByPoints ? `当前需达到 Lv.${scene.min_level}` : '升级后即可进入'}</span>
                            </div>` : ''
                        }
                    </div>
                    <div class="map-scene-pills">${pillText}</div>
                    <div class="map-scene-star"></div>
                </div>
            </button>
        `;
    }

    function renderSceneGridMap(activeSceneId = null, boardId = 'forestMapSceneGrid') {
        const board = document.getElementById(boardId);
        if (!board || !scenes) return;

        const sceneMap = new Map(getAllScenes().map((scene) => [scene.id, scene]));
        const nodes = MAP_LAYOUT
            .map((layout) => {
                const scene = sceneMap.get(layout.id);
                return scene ? buildMapNode(scene, layout, activeSceneId, boardId) : '';
            })
            .join('');

        // 路线装饰点铺在场景节点之下（z-index:4 < 场景卡 z-index:6），不参与交互。
        const blanks = BLANK_CELLS.map((cell) => `
            <span class="map-blank-node" style="left:${cell.x}%;top:${cell.y}%;" aria-hidden="true"></span>
        `).join('');

        // S2：读宠物等级 → 当前 LV 圈层；注入 4 个圈层标签（当前层 is-current 高亮）+ 分区底色（透传 buildRouteSvg）
        const petLevel = (window.PetSystem && typeof PetSystem.getState === 'function')
            ? (PetSystem.getState().level || 1) : 1;
        const curTierKey = petLevelToTierKey(petLevel);
        const tierLabels = TIER_META.map((t) => `
            <div class="map-tier-label ${t.key === curTierKey ? 'is-current' : ''}" style="left:${t.lx}%;top:${t.ly}%;--tier-color:${t.color};" aria-hidden="true">${t.label}</div>
        `).join('');

        board.innerHTML = `${blanks}${nodes}${tierLabels}${buildRouteSvg(curTierKey)}`;
        updateMapStats();
    }

    function unlockScene(sceneId) {
        const scene = getSceneById(sceneId);
        if (!scene) return { success: false, msg: '场景不存在' };
        if (unlockedScenes[sceneId]) return { success: false, msg: '已解锁' };
        if ((scene.unlock_cost || 0) <= 0) return { success: false, msg: '免费场景无需解锁' };

        const pet = PetSystem.getState();
        if (pet.level < scene.min_level) return { success: false, msg: `需要 Lv.${scene.min_level}` };

        const points = getCurrentPoints();
        if (points < scene.unlock_cost) return { success: false, msg: `积分不足（需要 ${scene.unlock_cost}）` };

        const pointsApi = window.PetBankPoints;
        if (!pointsApi || typeof pointsApi.spend !== 'function' || !pointsApi.spend(scene.unlock_cost)) {
            return { success: false, msg: '积分系统未就绪，请稍后重试' };
        }
        unlockedScenes[sceneId] = true;
        saveUnlockState();
        updatePointBindings();
        updateMapStats();
        return { success: true, msg: `解锁成功！花费 ${scene.unlock_cost} 积分` };
    }

    function tryUnlock(sceneId, boardId) {
        const result = unlockScene(sceneId);
        if (typeof window.showToast === 'function') {
            window.showToast(result.msg);
        } else {
            alert(result.msg);
        }
        if (result.success) {
            // S0(F2)：重渲保留调用方所在 board，默认首页板；探索 tab 内调用透传 'sceneGrid'。
            const targetBoard = boardId || 'forestMapSceneGrid';
            renderSceneGridMap(sceneId, targetBoard);
            if (targetBoard === 'sceneGrid' && typeof window.renderExplorePage === 'function') {
                void window.renderExplorePage(sceneId);
            }
        }
    }

    // 跳转探索页
    function goExplore(sceneId, options = {}) {
        const targetPage = options.returnTarget === 'forest-map' ? 'forest-map' : 'explore';
        // 宠物小屋 R5 第二守卫（F1）：hp<=0 且已选宠 → 拦截，不进任何探索页
        if (window.PetSystem) {
            try {
                const s = PetSystem.getState();
                if (s.species && s.hp <= 0) {
                    if (typeof window.switchPage === 'function') window.switchPage(targetPage);
                    if (typeof window.showToast === 'function') {
                        window.showToast('宠物倒下了，先去宠物小屋救援吧');
                    } else {
                        alert('宠物倒下了，请先去宠物小屋救援！');
                    }
                    return;
                }
            } catch (e) {}
        }
        const openStage = function () {
            if (window.ExplorationDetail && typeof window.ExplorationDetail.show === 'function') {
                return window.ExplorationDetail.show(sceneId, {
                    hostId: 'explorationStageRoot',
                    returnTarget: options.returnTarget || 'forest-map'
                });
            }
            if (typeof window.startExplorationUI === 'function') {
                return window.startExplorationUI(sceneId);
            }
            return null;
        };
        if (typeof window.switchPage === 'function') {
            const pageReady = window.switchPage(targetPage);
            if (pageReady && typeof pageReady.then === 'function') {
                void pageReady.then(openStage);
            } else {
                openStage();
            }
            return;
        }
        openStage();
    }

    function showSceneDetail(sceneId) {
        goExplore(sceneId);
    }

    function closeSceneDetail() {
        if (window.ExplorationDetail && typeof window.ExplorationDetail.exit === 'function') {
            window.ExplorationDetail.exit();
            return;
        }
        if (typeof window.renderExplorePage === 'function') {
            void window.renderExplorePage();
        }
    }

    function startExploration(sceneId) {
        const scene = getSceneById(sceneId);
        if (!scene) return { success: false, msg: '场景不存在' };
        if (!isSceneUnlocked(scene)) return { success: false, msg: '场景未解锁' };

        const pet = PetSystem.getState();
        if (pet.hp <= 0) return { success: false, msg: '宠物已倒下，无法探索' };
        if (pet.hp < scene.hp_cost) return { success: false, msg: `HP 不足，需要 ${scene.hp_cost}` };

        PetSystem.takeDamage(scene.hp_cost);
        PetSystem.addExploration();
        if (scene.monsters.length > 0) {
            // 章末精英区（danger>=4）40% 概率遇 species 敌人（图鉴宠物，首胜定向掉卡）
            let monster = null;
            if (scene.danger_level >= 4 && Math.random() < 0.4 && typeof PetSystem.getAllSpecies === 'function') {
                monster = _pickSpeciesEnemy(scene.danger_level);
            }
            if (!monster) {
                monster = scene.monsters[Math.floor(Math.random() * scene.monsters.length)];
            }
            return { success: true, msg: `遇到 ${monster.name}！`, battle: { scene, monster } };
        }

        const expGain = 5 + scene.danger_level * 2;
        const result = PetSystem.addExp(expGain);
        return {
            success: true,
            msg: `安全通过！获得 ${expGain} EXP${result.leveled_up ? `，升级到 Lv.${result.new_level}！` : ''}`,
            leveled_up: result.leveled_up
        };
    }

    // 章末精英区 species 敌人（图鉴宠物，包装名，首胜定向掉卡；见 docs/卡牌系统/方案/2026-07-01-探索species敌人-规则.md）
    function _pickSpeciesEnemy(danger) {
        const all = PetSystem.getAllSpecies();
        const rarities = danger >= 5 ? ['legendary', 'epic'] : ['epic', 'legendary'];
        const pool = all.filter(s => rarities.includes(s.rarity));
        if (pool.length === 0) return null;
        const sp = pool[Math.floor(Math.random() * pool.length)];
        // 命名包装（不敌对感）：野生/失控/镜像/同族守卫 4 选 1
        const base = sp.name || sp.id;
        const r = Math.random();
        const name = r < 0.25 ? `${base}同族守卫`
            : r < 0.5 ? `野生${base}`
            : r < 0.75 ? `失控${base}`
            : `镜像${base}`;
        return {
            id: sp.id + '_enemy',
            name: name,
            emoji: sp.emoji || '🐾',
            hp: sp.base_hp,
            atk: sp.base_atk,
            def: sp.base_def || 0,
            exp: 10 + danger * 5,
            drops: [],
            isSpecies: true,
            speciesId: sp.id,
            baseName: base
        };
    }

    function startBattle(scene, monster) {
        const pet = PetSystem.getState();
        // 战斗深化：每场战斗重置 CD/防御态（设计稿 §9）
        if (typeof PetSystem.resetBattleState === 'function') {
            PetSystem.resetBattleState();
        }
        const arenaChapter = (MAP_LAYOUT.find(m => m.id === scene.id) || {}).chapter || 1;
        currentBattle = {
            scene,
            monster: Object.assign({}, monster, {
                exp: Number(monster.exp != null ? monster.exp : monster.reward_exp) || 0,
                current_hp: monster.hp
            }),
            pet_max_hp: pet.hp,
            log: [],
            turn: 1,
            status: 'ongoing',
            chapter: arenaChapter
        };
        currentBattle.log.push({ type: 'system', text: `⚔️ 遭遇战：${pet.species_data?.name || '宠物'} vs ${monster.name} (Lv.${scene.danger_level})` });
        emitBattleAnimation('battle-start', { actor: 'system', target: 'all' });
        const galgameActive = !!(window.ExplorationDetail && ExplorationDetail.isActive && ExplorationDetail.isActive());
        if (!galgameActive && window.sfx && typeof sfx.battleStart === 'function') sfx.battleStart();
        return currentBattle;
    }

    function buildBattleGuidedFeedback(battle, cause) {
        const monsterName = battle?.monster?.name || '对手';
        if (cause === 'flee_failed') {
            return {
                note: `这次撤退没有拉开距离，被 ${monsterName} 接上了反击节奏。`,
                nextStep: '先回宠物小屋休息或救援；下次体力低时，可以先用防御或回血道具稳住。'
            };
        }
        return {
            note: `${monsterName} 的反击比较重，这次主要是体力没有撑到最后。`,
            nextStep: '先回宠物小屋休息或救援；再挑战时先看 HP，必要时用防御、回血道具或换低危险场景热身。'
        };
    }

    function markBattleLost(battle, cause) {
        battle.status = 'lost';
        battle.guidedFeedback = buildBattleGuidedFeedback(battle, cause);
        if (typeof window.recordGuidedFeedback === 'function') {
            window.recordGuidedFeedback({
                id: `explore_feedback_${Date.now()}`,
                mode: 'explore',
                cause: cause || 'battle_lost',
                note: battle.guidedFeedback.note,
                nextStep: battle.guidedFeedback.nextStep
            });
        }
        battle.log.push({ type: 'system', text: '💤 宠物需要休息一下。' });
        battle.log.push({ type: 'system', text: `复盘：${battle.guidedFeedback.note}` });
        battle.log.push({ type: 'system', text: `下一步：${battle.guidedFeedback.nextStep}` });
    }

    // battleTurn(action)
    //   action: 'attack' | 'flee' | { type:'skill', skillId } | { type:'item', itemId, itemName, resultMsg }
    // 技能/道具都消耗 1 回合（敌人反击），defend 在敌人反击时减伤并清除
    function battleTurn(action = 'attack') {
        if (!currentBattle || currentBattle.status !== 'ongoing') return null;

        const battle = currentBattle;
        const pet = PetSystem.getState();
        const petAtk = PetSystem.getTotalAtk();

        battle.turn += 1;

        // 归一化 action 为对象形式
        const act = (typeof action === 'string') ? { type: action } : (action || { type: 'attack' });
        // 本回合刚启动 CD 的技能，回合末 tick 时跳过（保证 CD=N 真正封禁 N 回合）
        const cdStartedThisTurn = [];

        if (act.type === 'flee') {
            // flee_chance 对齐 combat.json（0.3）
            const fleeChance = 0.3;
            if (Math.random() < fleeChance) {
                battle.status = 'fled';
                battle.log.push({ type: 'system', text: '🏃 逃跑成功！' });
                const expGain = Math.floor(battle.monster.exp * 0.3);
                PetSystem.addExp(expGain);
                battle.log.push({ type: 'reward', text: `获得 ${expGain} EXP (逃跑奖励减半)` });
            } else {
                battle.log.push({ type: 'system', text: '逃跑失败！' });
                const damage = Math.max(1, battle.monster.atk - Math.floor(pet.level / 2));
                const ko = PetSystem.takeDamage(damage, { applyDefend: true });
                battle.log.push({ type: 'enemy', text: `${battle.monster.name} 攻击！造成 ${damage} 伤害` });
                if (ko || PetSystem.getState().hp <= 0) {
                    markBattleLost(battle, 'flee_failed');
                    emitBattleAnimation('battle-lose', { actor: 'enemy', target: 'pet' });
                }
                emitBattleAnimation('enemy-attack', { actor: 'monster', target: 'pet', damage });
            }
            // 回合结束：CD 递减
            if (typeof PetSystem.tickCooldowns === 'function') PetSystem.tickCooldowns(cdStartedThisTurn);
            return battle;
        }

        // ---- 玩家行动 ----
        let playerDmg = 0;
        let actionLabel = '攻击';

        if (act.type === 'skill') {
            const skill = PetSystem.getSkill(act.skillId);
            if (!skill) {
                battle.log.push({ type: 'system', text: `未知技能：${act.skillId}` });
                return battle;
            }
            // CD 校验（理论上 UI 已禁用，二次防护）
            if (!PetSystem.canUseSkill(act.skillId)) {
                battle.log.push({ type: 'system', text: `${skill.name} 冷却中（剩 ${PetSystem.getCooldown(act.skillId)} 回合）` });
                return battle;
            }
            if (skill.type === 'defend') {
                // 防御：设 defending，下回合减伤，本回合不造伤
                PetSystem.setDefending(true);
                battle.log.push({ type: 'player', text: `${skill.icon} ${skill.name}！下回合受击减伤 50%` });
                emitBattleAnimation('defend', { actor: 'pet', target: 'pet', skillId: skill.id });
                PetSystem.startCooldown(skill.id, skill.cooldown);
                cdStartedThisTurn.push(skill.id);
            } else {
                // 攻击型技能：multiplier × getTotalAtk
                playerDmg = BattleEngine.calcDamage(petAtk, battle.monster.def || 0, { mult: skill.multiplier, randSub: 0 });
                battle.monster.current_hp -= playerDmg;
                battle.log.push({
                    type: 'player',
                    text: `${skill.icon} ${skill.name}！对 ${battle.monster.name} 造成 ${playerDmg} 伤害 (${Math.max(0, battle.monster.current_hp)}/${battle.monster.hp})`
                });
                emitBattleAnimation('skill-cast', { actor: 'pet', target: 'monster', skillId: skill.id, damage: playerDmg });
                PetSystem.startCooldown(skill.id, skill.cooldown);
                cdStartedThisTurn.push(skill.id);
            }
        } else if (act.type === 'item') {
            // 道具：使用动作在 app.js 已完成（InventorySystem.useItem），这里只记录日志 + 消耗回合
            battle.log.push({ type: 'reward', text: `🎒 使用 ${act.itemName || '道具'}：${act.resultMsg || '生效'}` });
            emitBattleAnimation('item-use', { actor: 'pet', target: 'pet', itemId: act.itemId });
        } else {
            // 普攻
            playerDmg = BattleEngine.calcDamage(petAtk, battle.monster.def || 0, { useDef: false });
            battle.monster.current_hp -= playerDmg;
            battle.log.push({
                type: 'player',
                text: `⚔️ 你攻击 ${battle.monster.name}，造成 ${playerDmg} 伤害 (${Math.max(0, battle.monster.current_hp)}/${battle.monster.hp})`
            });
            emitBattleAnimation('player-attack', { actor: 'pet', target: 'monster', damage: playerDmg });
        }

        // ---- 判定胜利 ----
        if (battle.monster.current_hp <= 0) {
            battle.status = 'won';
            PetSystem.addWin();
            const expGain = battle.monster.exp + battle.scene.danger_level * 3;
            const result = PetSystem.addExp(expGain);
            battle.log.push({
                type: 'reward',
                text: `🎉 胜利！获得 ${expGain} EXP${result.leveled_up ? `，升级 Lv.${result.new_level}！` : ''}`
            });
            emitBattleAnimation('battle-win', { actor: 'pet', target: 'monster' });

            for (const drop of battle.monster.drops || []) {
                if (Math.random() < drop.rate) {
                    InventorySystem.addItem(drop.item_id, 1);
                    const itemData = InventorySystem.getItemData(drop.item_id);
                    battle.log.push({ type: 'reward', text: `📦 发现补给：${itemData?.name || drop.item_id} x1` });
                }
            }
            for (const rare of battle.scene.rare_drops || []) {
                if (Math.random() < rare.rate) {
                    InventorySystem.addItem(rare.item_id, 1);
                    const itemData = InventorySystem.getItemData(rare.item_id);
                    battle.log.push({ type: 'reward', text: `💎 发现稀有线索：${itemData?.name || rare.item_id} x1` });
                }
            }
            // 回合结束：CD 递减
            if (typeof PetSystem.tickCooldowns === 'function') PetSystem.tickCooldowns(cdStartedThisTurn);
            return battle;
        }

        // ---- 敌人反击（defend/道具/普攻/技能后均触发，除非玩家已胜利）----
        const enemyAtk = BattleEngine.calcDamage(battle.monster.atk, 0, { randMax: 2 });
        // applyDefend=true：若玩家处于 defending 态，takeDamage 内部伤害×0.5 并清除 defending（一次性）
        const wasDefending = !!(typeof PetSystem.isDefending === 'function' && PetSystem.isDefending());
        const ko = PetSystem.takeDamage(enemyAtk, { applyDefend: true });
        battle.log.push({
            type: 'enemy',
            text: `${battle.monster.name} 反击！造成 ${enemyAtk} 伤害${wasDefending ? '（🛡️ 防御减伤已生效）' : ''}`
        });
        emitBattleAnimation('enemy-attack', { actor: 'monster', target: 'pet', damage: enemyAtk, defended: wasDefending });
        if (ko) {
            markBattleLost(battle, 'enemy_counter');
            emitBattleAnimation('battle-lose', { actor: 'monster', target: 'pet' });
        }

        // 回合结束：CD 递减
        if (typeof PetSystem.tickCooldowns === 'function') PetSystem.tickCooldowns(cdStartedThisTurn);

        return battle;
    }

    function endBattle() {
        currentBattle = null;
    }

    return {
        loadScenes,
        getAllScenes,
        getSceneById,
        getCurrentBattle,
        getMapLayout,
        getUnlockedCount,
        isSceneUnlocked,
        unlockScene,
        tryUnlock,
        renderSceneGridMap,
        updateMapStats,
        goExplore,
        showSceneDetail,
        closeSceneDetail,
        startExploration,
        startBattle,
        battleTurn,
        endBattle
    };
})();

window.ExplorationSystem = ExplorationSystem;
