/**
 * card-arena-ui.js - 卡牌对战（2v2 全屏竞技台）UI 层
 *
 * 依赖：window.CardArena（js/card-arena.js 纯逻辑）、PetSystem.getAllSpecies、CardCollection
 * 设计（方案 docs/方案/2026-07-01-卡牌对战-方案.md §5.3 + math-pk 全屏竞技台风格）：
 *   - 独立 arena modal（#arenaBattleModal / #arenaTeamModal），不动探索 battle modal
 *   - 听 CardArena.getState().log 事件（actionResolved/faint/switch/battleEnd）更新 UI，不解析中文
 *   - 选队 → startBattle（TEAM_SIZE 预设敌人）→ 回合制（普攻/技能/防御/必杀/换人）→ 胜负结算
 *   - 对战 modal 全屏化（position:fixed;inset:0），三栏 grid（玩家 | 出招提示 | 对手）
 *   - 字体整体放大（名字 20px / HP 16px / 出招提示 28px），背景按 stage.chapter 选 arena-N.png
 */
const CardArenaUI = (function () {

    // ===== 队伍规模（与 CardArena.TEAM_SIZE 同步；1 上场 + 1 替补）=====
    const TEAM_SIZE = (typeof CardArena !== 'undefined' && CardArena.TEAM_SIZE) ? CardArena.TEAM_SIZE : 2;

    // ===== 状态 =====
    let selectedIds = [];        // 选队已选 species id
    let logSeenLen = 0;          // 已渲染到 UI 的 log 长度（用于增量取事件）
    let lastDamageEvents = [];   // 本回合伤害事件（用于浮动数字）
    let uiLocked = false;        // 动作锁（防连点）
    let lastMoveText = '';       // 最近一回合的出招提示大字（持续到下一动作）
    let arenaMotionCleanupTimer = null;
    let arenaMotionImpactTimer = null;
    let arenaResultTimer = null;

    // ===== PvP 本地热座状态 =====
    // pvpMode：'off' | 'pickA' | 'pickB'（选队阶段轮到谁）
    let pvpMode = 'off';         // 选队进度：off=A未选 / pickA=A选队中 / pickB=B选队中
    let pvpTeamAIds = [];        // 玩家A 已选 species id（TEAM_SIZE 只）
    let pvpTeamBIds = [];        // 玩家B 已选 species id（TEAM_SIZE 只）

    // ===== 闯关：关卡数据 + 进度 =====
    const PROGRESS_KEY = 'petbank_arena_progress'; // { cleared:[id], current:id }
    let stagesCache = null;       // arena-stages.json 缓存
    let pendingStageId = null;    // 当前正在打的关卡 id（null = 自由对战/随机敌人）

    function getTodayKey() {
        if (window.PetBankDailyState && typeof window.PetBankDailyState.localDate === 'function') {
            return window.PetBankDailyState.localDate();
        }
        if (window.PetBankTime && typeof window.PetBankTime.localDate === 'function') {
            return window.PetBankTime.localDate();
        }
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    }

    function playSfx(name) {
        if (window.sfx && typeof window.sfx.play === 'function') {
            window.sfx.play(name);
        }
    }

    // 读进度（带兜底：默认解锁第 1 关）
    function getProgress() {
        try {
            const raw = localStorage.getItem(PROGRESS_KEY);
            if (raw) {
                const p = JSON.parse(raw);
                if (p && Array.isArray(p.cleared)) {
                    return { cleared: p.cleared, current: p.current || 1 };
                }
            }
        } catch (e) {}
        return { cleared: [], current: 1 };
    }

    function _saveProgress(p) {
        try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) {}
    }

    // 关卡是否解锁：id <= current
    function isUnlocked(id) {
        const p = getProgress();
        return id <= p.current;
    }

    // 关卡是否已通关
    function isCleared(id) {
        return getProgress().cleared.includes(id);
    }

    /**
     * 通关一关：标记 + 解锁下一关（仅首次发放奖励，重玩不再发）
     * @param {number} stageId
     * @param {object} reward { points, dropCard }
     * @returns {object} { firstClear:boolean, unlockedNext:number|null, granted:{points,card?} }
     */
    function clearStage(stageId, reward) {
        const p = getProgress();
        const firstClear = !p.cleared.includes(stageId);
        let unlockedNext = null;
        let granted = {};
        if (firstClear) {
            p.cleared.push(stageId);
            // 解锁下一关
            const maxId = (stagesCache && stagesCache.stages)
                ? Math.max(...stagesCache.stages.map(s => s.id))
                : 10;
            if (stageId < maxId && stageId >= p.current) {
                p.current = stageId + 1;
                unlockedNext = stageId + 1;
            }
            _saveProgress(p);
            // 发奖励（仅首次）：首通只送固定新卡，不再发成长积分
            // （卡牌系统不产出成长积分，收口到主循环任务/探索；reward.points 字段保留供 Step6 接训练券复用）
            if (reward && reward.dropCard) {
                try {
                    if (window.CardCollection && typeof CardCollection.addCard === 'function') {
                        CardCollection.addCard(reward.dropCard);
                        granted.card = reward.dropCard;
                    }
                } catch (e) {}
            }
            // 对战道具首通奖励（进 InventorySystem 背包）
            if (reward && reward.dropItem) {
                try {
                    if (typeof InventorySystem !== 'undefined' && typeof InventorySystem.addItem === 'function') {
                        const r = InventorySystem.addItem(reward.dropItem, 1);
                        if (r && r.success) granted.item = reward.dropItem;
                    }
                } catch (e) {}
            }
        }
        return { firstClear, unlockedNext, granted };
    }

    // 加载关卡数据（运行时 fetch，带缓存）
    async function _loadStages() {
        if (stagesCache) return stagesCache;
        try {
            const res = await fetch(window.resolvePetBankAssetUrl ? window.resolvePetBankAssetUrl('data/arena-stages.json') : 'data/arena-stages.json');
            stagesCache = await res.json();
        } catch (e) {
            stagesCache = null;
        }
        return stagesCache;
    }

    // species id → 名字（展示敌人/掉卡用）
    function _speciesName(id) {
        try {
            const all = PetSystem.getAllSpecies();
            const sp = all.find(s => s.id === id);
            return sp ? (sp.name || id) : id;
        } catch (e) { return id; }
    }

    /**
     * 取当前对战背景图 URL（训练营专属卡牌对战训练场背景）
     * - 闯关模式（pendingStageId != null）：按关卡 chapter 取 assets/arena/training-bg-{chapter}.png（1~5）
     * - 自由对战 / PvP：用 training-bg-1.png（通用训练场）
     * 章节越界（>5 或 <1）退化为 training-bg-1.png
     */
    function _arenaBgUrl() {
        if (pendingStageId != null && stagesCache) {
            const st = stagesCache.stages.find(s => s.id === pendingStageId);
            if (st && st.chapter >= 1 && st.chapter <= 5) {
                return window.resolvePetBankAssetUrl
                    ? window.resolvePetBankAssetUrl('assets/arena/training-bg-' + st.chapter + '.png')
                    : 'assets/arena/training-bg-' + st.chapter + '.png';
            }
        }
        return window.resolvePetBankAssetUrl
            ? window.resolvePetBankAssetUrl('assets/arena/training-bg-1.png')
            : 'assets/arena/training-bg-1.png';
    }

    /**
     * 取当前对战模式标签（顶部 topbar 中间显示）
     * - 闯关：关卡名（如「草地练习场」）
     * - PvP：「玩家A vs 玩家B」
     * - 自由：「自由练习」
     */
    function _modeLabel() {
        const s = CardArena.getState();
        if (s && s.mode === 'pvp') return '玩家A vs 玩家B';
        if (pendingStageId != null && stagesCache) {
            const st = stagesCache.stages.find(x => x.id === pendingStageId);
            if (st) return st.name;
        }
        return '自由练习';
    }

    // ===== 关卡选择 modal =====
    async function openStages() {
        const data = await _loadStages();
        const modal = document.getElementById('arenaStagesModal');
        const grid = document.getElementById('arenaStagesGrid');
        if (!modal || !grid) return;
        if (!data || !Array.isArray(data.stages)) {
            grid.innerHTML = '<div class="text-xs text-muted">关卡数据加载失败，请刷新重试。</div>';
            modal.classList.add('show');
            return;
        }
        const p = getProgress();
        _claimDailyTickets();  // 空操作（积分兑换制不再每日发券），保留调用兼容
        const ticketCount = (typeof InventorySystem !== 'undefined' && InventorySystem.getCount)
            ? InventorySystem.getCount('arena_ticket') : 0;
        const usedToday = _arenaBattleUsedToday();
        const remainToday = Math.max(0, 3 - usedToday);
        const ticketBar = `
            <div style="grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px;padding:6px 12px;margin-bottom:6px;background:linear-gradient(90deg,#FFF8DC80,#FAF8F2);border:1px dashed #D4B96A;border-radius:8px;">
                <span style="font-size:12px;color:#8A7240;font-weight:bold;">🏕️ 每日 3 场免费 · 🎫额外券可续战</span>
                <span style="font-size:12px;color:#8A7240;font-weight:bold;">今日剩余 ${remainToday}/3 · 持有额外券 ${ticketCount}</span>
            </div>
        `;
        const flowSteps = `
            <div class="arena-flow-steps" aria-label="卡牌 PK 流程">
                <span class="active">选关</span>
                <span>选队</span>
                <span>对战</span>
                <span>奖励</span>
            </div>
        `;
        // 自由练习入口卡片（置顶）：随机敌人，不计进度不计积分，随时玩
        const freePlayCard = `
            <div class="arena-stage-card open" style="grid-column:1/-1;background:linear-gradient(90deg,#FFF8DC80,#FAF8F2);border-color:#D4B96A;" onclick="CardArenaUI.openFreePlay()">
                <div class="stage-head">
                    <span class="stage-no">🆓</span>
                    <span class="stage-name">自由练习</span>
                    <span class="stage-state open">▶ 随时玩</span>
                </div>
                <div class="stage-chapter">不计进度 · 不计积分</div>
                <div class="stage-desc">随机对手，自由组队，随时热身一局。</div>
                <div class="stage-enemies">敌方：随机 ${TEAM_SIZE} 只</div>
                <div class="stage-reward">奖励：无（成长积分看轻章节首通）</div>
            </div>
        `;
        // 按 5 大区域分组渲染：每区域一个标题 + 该区域下的轻章节卡片
        // 五区低饱和色（贴合项目鼠尾草绿基调；参考 design-to-code 生成图 + Codex token）
        const regionColors = {
            1: { main: '#8FCAA6', text: '#3F7A5E' },  // 起点花园 薄荷绿
            2: { main: '#7AB06A', text: '#4A7A40' },  // 森林边界 苔藓绿
            3: { main: '#7AB5CC', text: '#3D6E85' },  // 海边集市 雾蓝
            4: { main: '#A89C8C', text: '#6A5E50' },  // 高地洞窟 石灰棕
            5: { main: '#D4B96A', text: '#8A7240' }   // 星空终点 浅金
        };
        let lastChapter = 0;
        const stagesHtml = data.stages.map(st => {
            // 区域切换 → 插入区域标题（grid-column:1/-1 跨两列独占行）
            let regionHeader = '';
            if (st.chapter !== lastChapter) {
                const ch = (data.chapters || []).find(c => c.id === st.chapter) || {};
                const rc = regionColors[st.chapter] || regionColors[1];
                regionHeader = `
                    <div class="arena-region-head" style="grid-column:1/-1;display:flex;align-items:baseline;flex-wrap:wrap;gap:8px;margin:10px 0 2px;padding:6px 12px;background:linear-gradient(90deg,${rc.main}33,${rc.main}0A);border-left:3px solid ${rc.main};border-radius:10px;">
                        <span style="font-weight:700;font-size:13px;color:${rc.text};">🗺️ 区域 ${st.chapter} · ${ch.name || ''}</span>
                        <span class="text-xs text-muted">${ch.theme || ''}</span>
                    </div>
                `;
                lastChapter = st.chapter;
            }
            const cleared = p.cleared.includes(st.id);
            const unlocked = st.id <= p.current;
            const stateTag = cleared ? '✓ 已通关' : (unlocked ? '▶ 可挑战' : '🔒 锁定');
            const stateCls = cleared ? 'cleared' : (unlocked ? 'open' : 'locked');
            const stars = '★'.repeat(st.difficulty) + '☆'.repeat(5 - st.difficulty);
            const enemyNames = st.enemies.slice(0, 3).map(_speciesName).join(' / ');
            const clickAttr = unlocked
                ? `onclick="CardArenaUI.enterStage(${st.id})"`
                : '';
            return regionHeader + `
                <div class="arena-stage-card ${stateCls}" ${clickAttr}>
                    <div class="stage-head">
                        <span class="stage-no">${st.id}</span>
                        <span class="stage-name">${st.name}</span>
                        <span class="stage-state ${stateCls}">${stateTag}</span>
                    </div>
                    <div class="stage-chapter">轻章节 · ${stars}</div>
                    <div class="stage-desc">${st.desc || ''}</div>
                    <div class="stage-enemies">敌方：${enemyNames}</div>
                    <div class="stage-reward">🃏 首通新卡：${(st.reward&&st.reward.dropCard)?_speciesName(st.reward.dropCard):'—'} · 🎫 每日3场免费</div>
                </div>
            `;
        }).join('');
        grid.innerHTML = flowSteps + ticketBar + freePlayCard + stagesHtml;
        modal.classList.add('show');
        playSfx('trainingUnlock');
        playSfx('uiOpen');
    }

    function closeStages() {
        const m = document.getElementById('arenaStagesModal');
        if (m) m.classList.remove('show');
        playSfx('uiClose');
    }

    // 点关卡 → 进入选队（敌人 = 该关 enemies）
    function enterStage(stageId) {
        if (!isUnlocked(stageId)) return;
        playSfx('choiceConfirm');
        // 对战每日 3 场免费 / profile；用完后可凭 arena_ticket（额外券）续战
        if (!_payArenaEntry()) return;
        pendingStageId = stageId;
        closeStages();
        openTeamSelect(stageId);
    }

    // 入场校验：每日 3 场免费 / profile；3 场用完后每张 arena_ticket（额外券）续战 1 场
    // 日限 key petbank_arena_battle_day_${activeId} = JSON {date:'YYYY-MM-DD', count:N}，跨日重置
    function _payArenaEntry() {
        const DAILY_LIMIT = 3;
        const pid = (window.ProfileManager && typeof window.ProfileManager.getActiveId === 'function')
            ? (window.ProfileManager.getActiveId() || 'default') : 'default';
        const DAY_KEY = 'petbank_arena_battle_day_' + pid;
        const today = getTodayKey();
        let rec = null;
        try { rec = JSON.parse(localStorage.getItem(DAY_KEY) || 'null'); } catch (e) { rec = null; }
        if (!rec || rec.date !== today) rec = { date: today, count: 0 };
        // 每日 3 场免费
        if (rec.count < DAILY_LIMIT) {
            rec.count += 1;
            try { localStorage.setItem(DAY_KEY, JSON.stringify(rec)); } catch (e) {}
            return true;
        }
        // 超过 3 场：用 🎫额外对战券续战
        if (typeof InventorySystem !== 'undefined' && InventorySystem.getCount
            && InventorySystem.getCount('arena_ticket') > 0
            && InventorySystem.removeItem) {
            InventorySystem.removeItem('arena_ticket', 1);
            return true;
        }
        const msg = '今日 3 场已用完，可用 🎫额外对战券续战';
        if (typeof showToast === 'function') showToast(msg); else alert(msg);
        return false;
    }

    // 读取今日对战已用次数（供 UI 展示，0~3）
    function _arenaBattleUsedToday() {
        const pid = (window.ProfileManager && typeof window.ProfileManager.getActiveId === 'function')
            ? (window.ProfileManager.getActiveId() || 'default') : 'default';
        const DAY_KEY = 'petbank_arena_battle_day_' + pid;
        const today = getTodayKey();
        try {
            const rec = JSON.parse(localStorage.getItem(DAY_KEY) || 'null');
            if (rec && rec.date === today) return rec.count || 0;
        } catch (e) {}
        return 0;
    }

    // 积分兑换制上线后不再每日发券（arena_ticket 改为「免费券」由兑换商店等途径产出）
    // 保留空函数避免 openStages 调用报错；旧 localStorage 标记保留避免回退触发
    function _claimDailyTickets() {
        return;
    }

    // 自由练习入口：随机敌人，不计进度不计积分，随时玩（基础练习免费）
    function openFreePlay() {
        pendingStageId = null;
        closeStages();
        openTeamSelect();  // 不传 stageId → 自由对战分支（_currentEnemies 走随机敌人）
    }

    // 预设敌方队伍（中等强度，保证有对战）
    // 用 PetSystem.getAllSpecies 随机 TEAM_SIZE 只 common/rare 兜底，避免硬编码 id 失效
    function _pickEnemies() {
        const all = PetSystem.getAllSpecies();
        const candidates = all.filter(s => s.rarity === 'common' || s.rarity === 'rare');
        const pool = candidates.length >= TEAM_SIZE ? candidates : all;
        // 洗牌取 TEAM_SIZE 只
        const shuffled = pool.slice().sort(() => Math.random() - 0.5);
        return shuffled.slice(0, TEAM_SIZE).map(s => s.id);
    }

    // 取当前对战敌人：闯关模式用该关 enemies，否则随机
    // 注意：闯关 enemies 仍为 3 只（关卡数据），这里裁切到 TEAM_SIZE 以匹配 2v2
    function _currentEnemies() {
        if (pendingStageId != null && stagesCache) {
            const st = stagesCache.stages.find(s => s.id === pendingStageId);
            if (st && Array.isArray(st.enemies) && st.enemies.length >= TEAM_SIZE) {
                return st.enemies.slice(0, TEAM_SIZE);
            }
        }
        return _pickEnemies();
    }

    // 取当前关卡奖励对象（闯关模式；自由对战返回 null）
    function _currentStageReward() {
        if (pendingStageId == null || !stagesCache) return null;
        const st = stagesCache.stages.find(s => s.id === pendingStageId);
        return st ? st.reward : null;
    }

    // 取当前关卡敌人弱化倍率（闯关模式；自由对战/无配置返回 null）
    // 低章节 stage.enemyMult={atk,hp}，用于 CardArena.startBattle 第 2 参弱化敌人
    function _currentEnemyMult() {
        if (pendingStageId == null || !stagesCache) return null;
        const st = stagesCache.stages.find(s => s.id === pendingStageId);
        return (st && st.enemyMult) ? st.enemyMult : null;
    }

    // 读取已收集的卡 id；CardCollection 是卡牌存储的唯一 owner。
    function _getCollectedIds() {
        if (window.CardCollection && typeof window.CardCollection.getCollectedIds === 'function') {
            return window.CardCollection.getCollectedIds();
        }
        return [];
    }

    // 打赢随机奖励：从全量 species 随机抽 1，未拥有→addCard，已拥有→addExp(20)；返回提示文本
    function _grantRandomCardOrExp() {
        try {
            if (typeof PetSystem === 'undefined' || !PetSystem.getAllSpecies) return '';
            const all = PetSystem.getAllSpecies();
            if (!Array.isArray(all) || all.length === 0) return '';
            const sp = all[Math.floor(Math.random() * all.length)];
            const petId = sp.id;
            const spName = _speciesName(petId);
            const owned = _getCollectedIds().indexOf(petId) !== -1;
            if (!owned && window.CardCollection && typeof CardCollection.addCard === 'function') {
                CardCollection.addCard(petId);
                return '🃏 获得新卡：' + spName;
            }
            if (typeof PetSystem.addExp === 'function') PetSystem.addExp(20);
            return '✨ 重复卡 +20 EXP（' + spName + '）';
        } catch (e) { return ''; }
    }

    // 取 species 立绘图（imageStages['2'] 终极态 / imageUrl）
    function _speciesImg(sp) {
        if (!sp) return '';
        const raw = (sp.imageStages && sp.imageStages['2']) || sp.imageUrl || '';
        if (!raw) return '';
        return window.resolvePetBankAssetUrl ? window.resolvePetBankAssetUrl(raw) : raw;
    }

    // 稀有度边框 class
    function _rarityCls(sp) {
        return 'rarity-' + (sp.rarity || 'common');
    }

    // 四维小数值文本
    function _statsText(c) {
        return `ATK ${c.atk} · DEF ${c.def} · SPD ${c.spd}`;
    }

    // HP 百分比（防 maxHp=0）
    function _hpPct(c) {
        if (!c || !c.maxHp || c.maxHp <= 0) return 0;
        return Math.max(0, Math.min(100, (c.hp / c.maxHp) * 100));
    }

    function _teamAliveText(team) {
        const alive = (team || []).filter(c => c && c.hp > 0).length;
        return `${alive}/${(team || []).length || 0} 存活`;
    }

    function _skillChipHtml(c) {
        const skills = (c && Array.isArray(c.skills)) ? c.skills.slice(0, 3) : [];
        if (!skills.length) return '<span class="arena-skill-chip muted">基础技能</span>';
        return skills.map(sk => {
            const cd = sk.currentCd > 0 ? ` · CD${sk.currentCd}` : '';
            return `<span class="arena-skill-chip">${sk.name || sk.id || '技能'}${cd}</span>`;
        }).join('');
    }

    function _combatCardHtml(c, role, sideClass) {
        return `
            <div class="arena-combat-card ${sideClass || ''}" data-side="${sideClass || ''}">
                <div class="arena-combat-role">${role}</div>
                ${_fighterHtml(c)}
                ${_hpLineHtml(c)}
                <div class="arena-combat-detail">
                    <span>ATK <b>${c.atk}</b></span>
                    <span>DEF <b>${c.def}</b></span>
                    <span>SPD <b>${c.spd}</b></span>
                </div>
                <div class="arena-skill-row">${_skillChipHtml(c)}</div>
            </div>
        `;
    }

    function _tacticsHtml(s, p, e, isPvp) {
        const faster = (p.spd || 0) >= (e.spd || 0) ? p.name : e.name;
        const enemyHpPct = Math.round(_hpPct(e));
        const hint = enemyHpPct <= 35
            ? `对手 ${e.name} 血量偏低，可以考虑重击收尾。`
            : ((p.hp / Math.max(1, p.maxHp)) <= 0.35
                ? `${p.name} 状态危险，防御或换人更稳。`
                : `${faster} 速度占优，先手节奏很关键。`);
        return `
            <div class="arena-tactics-board">
                <div class="arena-tactics-kicker">${isPvp ? '热座战术板' : '训练战术板'}</div>
                <strong>${hint}</strong>
                <div class="arena-tactics-grid">
                    <span>我方 ${_teamAliveText(s.player)}</span>
                    <span>${isPvp ? '玩家B' : '对手'} ${_teamAliveText(s.enemy)}</span>
                    <span>回合 ${s.round}</span>
                </div>
            </div>
        `;
    }

    // ===== 选队 modal =====
    // stageId 可选：闯关模式传关卡 id（敌人用该关 enemies）；不传 = 自由对战（随机敌人）
    function openTeamSelect(stageId) {
        pendingStageId = (typeof stageId === 'number') ? stageId : null;
        pvpMode = 'off';  // PvE 选队：清空 PvP 模式标记
        _openTeamSelectInternal();
    }

    /**
     * PvP 本地热座入口：双人轮流选 3 只，共用收集卡池
     * 流程：A 选 3 只 → 确认 → 提示"轮到玩家B" → B 选 3 只 → 确认 → 开战（mode='pvp'）
     */
    function openPvpSetup() {
        pvpMode = 'pickA';        // 进入 A 选队阶段
        pvpTeamAIds = [];
        pvpTeamBIds = [];
        pendingStageId = null;    // PvP 不走闯关
        closeStages();
        _openTeamSelectInternal();
    }

    /**
     * 选队 modal 内部实现（PvE / PvP 共用）
     * - pvpMode='off'：PvE 单人选队（selectedIds）
     * - pvpMode='pickA'/'pickB'：PvP 双人轮流选队（selectedIds 复用作当前方暂存）
     */
    function _openTeamSelectInternal() {
        const ids = _getCollectedIds();
        if (ids.length < TEAM_SIZE) {
            // 收集不足：提示去探索，不打开 modal
            if (typeof showToast === 'function') showToast('收集的宠物不足 ' + TEAM_SIZE + ' 只，先去探索收集宠物卡 ⛏️');
            else alert('收集的宠物不足 ' + TEAM_SIZE + ' 只，先去探索收集宠物卡');
            return;
        }
        selectedIds = [];  // 重置当前方暂存
        const all = PetSystem.getAllSpecies();
        const owned = ids
            .map(id => all.find(s => s.id === id))
            .filter(Boolean);

        const modal = document.getElementById('arenaTeamModal');
        const grid = document.getElementById('arenaTeamGrid');
        if (!modal || !grid) return;

        grid.innerHTML = owned.map(sp => {
            const img = _speciesImg(sp);
            const isSSR = sp.rarity === 'legendary';
            return `
                <div class="arena-pick-card ${_rarityCls(sp)}" data-id="${sp.id}" onclick="CardArenaUI.togglePick('${sp.id}')">
                    <span class="pick-badge">✓</span>
                    ${img
                        ? `<img class="pick-img" src="${img}" alt="${sp.name}" onerror="this.style.display='none';var fallback=this.parentElement&&this.parentElement.querySelector('.pick-emoji');if(fallback)fallback.style.display=''">`
                        : ''}
                    <div class="pick-emoji" style="${img ? 'display:none' : ''}">${sp.emoji || '🐾'}</div>
                    <div class="pick-name">${sp.name}</div>
                    <div class="pick-stats">HP${sp.base_hp||100} ATK${sp.base_atk||5} ${isSSR ? '🟡' : ''}</div>
                </div>
            `;
        }).join('');

        _updateTeamFooter();
        modal.classList.add('show');
        playSfx('questionReveal');
        playSfx('uiOpen');
        playSfx('cardFlip');
        playSfx('spotlightPulse');
    }

    function togglePick(id) {
        const idx = selectedIds.indexOf(id);
        if (idx >= 0) {
            selectedIds.splice(idx, 1);
            playSfx('teamDeselect');
        } else {
            if (selectedIds.length >= TEAM_SIZE) {
                if (typeof showToast === 'function') showToast('已选满 ' + TEAM_SIZE + ' 只');
                return;
            }
            // SSR 校验提示（最终以 CardArena.selectTeam / selectTeamPvp 为准）
            const all = PetSystem.getAllSpecies();
            const sp = all.find(s => s.id === id);
            const ssrCount = selectedIds
                .map(x => all.find(s => s.id === x))
                .filter(s => s && s.rarity === 'legendary').length;
            if (sp && sp.rarity === 'legendary' && ssrCount >= 1) {
                if (typeof showToast === 'function') showToast('每队 SSR(传说) 最多 1 只');
                return;
            }
            selectedIds.push(id);
            playSfx('teamSelect');
            playSfx('cardFlip');
            if (selectedIds.length === TEAM_SIZE) playSfx('duelReady');
            playSfx('choiceConfirm');
        }
        // 同步 DOM 选中态
        document.querySelectorAll('#arenaTeamGrid .arena-pick-card').forEach(el => {
            el.classList.toggle('selected', selectedIds.includes(el.dataset.id));
        });
        _updateTeamFooter();
    }

    function _updateTeamFooter() {
        const text = document.getElementById('arenaTeamCount');
        const btn = document.getElementById('arenaTeamConfirm');
        if (pvpMode === 'pickA' || pvpMode === 'pickB') {
            // PvP：提示当前选择方
            const who = (pvpMode === 'pickA') ? '玩家A' : '玩家B';
            if (text) text.textContent = `${who}：已选 ${selectedIds.length} / ${TEAM_SIZE}`;
            if (btn) {
                btn.disabled = selectedIds.length !== TEAM_SIZE;
                btn.textContent = (pvpMode === 'pickA') ? '玩家A 确认 →' : '开始友谊赛 ⚔️';
            }
        } else {
            if (text) text.textContent = `已选 ${selectedIds.length} / ${TEAM_SIZE}`;
            if (btn) btn.disabled = selectedIds.length !== TEAM_SIZE;
        }
    }

    function confirmTeam() {
        if (selectedIds.length !== TEAM_SIZE) return;
        playSfx('choiceConfirm');

        // ===== PvP 轮流选队分支 =====
        if (pvpMode === 'pickA') {
            // 玩家A 确认 → 暂存 A 队，切到 B 选队
            pvpTeamAIds = selectedIds.slice();
            pvpMode = 'pickB';
            selectedIds = [];
            // 重开 modal 渲染 B 选队（共用卡池）
            _openTeamSelectInternal();
            if (typeof showToast === 'function') showToast('玩家A 已选完，轮到玩家B 选队');
            return;
        }
        if (pvpMode === 'pickB') {
            // 玩家B 确认 → 开战
            pvpTeamBIds = selectedIds.slice();
            pvpMode = 'off';
            // 调用 CardArena PvP 选队 + 开战
            const res = CardArena.selectTeamPvp(pvpTeamAIds.slice(), pvpTeamBIds.slice());
            if (!res.ok) {
                if (typeof showToast === 'function') showToast(res.error || 'PvP 选队失败');
                pvpMode = 'pickA'; pvpTeamAIds = []; pvpTeamBIds = [];
                _openTeamSelectInternal();
                return;
            }
            document.getElementById('arenaTeamModal').classList.remove('show');
            CardArena.startBattlePvp();
            logSeenLen = 0;
            lastDamageEvents = [];
            lastMoveText = '';
            uiLocked = false;
            playSfx('challengeStart');
            openBattleModal();
            return;
        }

        // ===== PvE 选队分支（原逻辑）=====
        const res = CardArena.selectTeam(selectedIds.slice());
        if (!res.ok) {
            if (typeof showToast === 'function') showToast(res.error || '选队失败');
            return;
        }
        // 关选队 modal
        document.getElementById('arenaTeamModal').classList.remove('show');
        // 开战：闯关模式用该关 enemies，否则随机敌人（自由对战兼容）
        const enemies = _currentEnemies();
        CardArena.startBattle(enemies, _currentEnemyMult());
        logSeenLen = 0;
        lastDamageEvents = [];
        lastMoveText = '';
        uiLocked = false;
        playSfx('challengeStart');
        openBattleModal();
    }

    function closeTeamModal() {
        document.getElementById('arenaTeamModal').classList.remove('show');
        playSfx('uiClose');
        // PvP 选队中途关闭：重置 PvP 状态，避免脏数据残留
        if (pvpMode === 'pickA' || pvpMode === 'pickB') {
            pvpMode = 'off';
            pvpTeamAIds = [];
            pvpTeamBIds = [];
        }
    }

    // ===== 对战 modal =====
    function openBattleModal() {
        const modal = document.getElementById('arenaBattleModal');
        if (!modal) return;
        if (typeof window.snapshotBattleMilestonesForRun === 'function') window.snapshotBattleMilestonesForRun();
        modal.classList.add('show');
        renderBattle();
        playSfx('battleStart');
    }

    function closeBattleModal() {
        if (arenaResultTimer) {
            clearTimeout(arenaResultTimer);
            arenaResultTimer = null;
        }
        _clearBattleMotion();
        document.getElementById('arenaBattleModal').classList.remove('show');
        playSfx('uiClose');
    }

    // 取当前上场 combatant
    function _p() { const s = CardArena.getState(); return s ? s.player[s.activeP] : null; }
    function _e() { const s = CardArena.getState(); return s ? s.enemy[s.activeE] : null; }

    function renderBattle() {
        const s = CardArena.getState();
        if (!s) return;
        const isPvp = (s.mode === 'pvp');
        const stage = document.getElementById('arenaStage');
        const p = s.player[s.activeP];
        const e = s.enemy[s.activeE];
        const bgUrl = _arenaBgUrl();
        const modeLabel = _modeLabel();

        // 顶部 topbar：左「回合/模式」+ 中「模式标签」+ 右退出
        // PvP 时左侧 pill 用操作方高亮（玩家A 蓝 / 玩家B 粉）
        const roundPill = isPvp && s.operator
            ? `<span class="arena-pill pvp-${s.operator.toLowerCase()}">🎮 ${s.operator === 'A' ? '玩家A' : '玩家B'} 回合</span>`
            : `<span class="arena-pill">第 ${s.round} 回合</span>`;
        const modePill = `<span class="arena-pill arena-mode">${modeLabel}</span>`;
        const actorLabel = isPvp
            ? (s.operator === 'B' ? '玩家B 正在行动' : '玩家A 正在行动')
            : '我方伙伴正在行动';
        const actorPill = `<span class="arena-pill arena-current-actor">${actorLabel}</span>`;

        // 中间出招提示（大字，参考 math-pk .arena-question）
        // lastMoveText 在 _animateAndRender 里据最新事件更新；为空时显示居中 VS
        const moveHtml = lastMoveText
            ? `<div class="arena-move-text">${lastMoveText}</div>`
            : `<div class="arena-move-vs">VS</div>`;

        stage.innerHTML = `
            <div class="arena-fullscreen-bg" style="background-image:url('${bgUrl}')"></div>
            <div class="arena-fullscreen-overlay"></div>
            <div class="arena-topbar">
                <div class="arena-topbar-left">${roundPill}</div>
                <div class="arena-topbar-center">${modePill}${actorPill}</div>
                <button class="arena-exit-btn" title="退出" onclick="CardArenaUI.closeBattleModal()">✕</button>
            </div>
            <div class="arena-stage-grid">
                <div class="arena-side arena-side-player" id="arenaFighterP">
                    ${_combatCardHtml(p, isPvp ? '玩家A' : '我方伙伴', 'player')}
                </div>
                <div class="arena-center">
                    <div class="arena-move-zone" id="arenaMoveZone">${moveHtml}</div>
                    ${_tacticsHtml(s, p, e, isPvp)}
                </div>
                <div class="arena-side arena-side-enemy" id="arenaFighterE">
                    ${_combatCardHtml(e, isPvp ? '玩家B' : '训练对手', 'enemy')}
                </div>
                <div class="arena-vs-watermark">VS</div>
                <div class="arena-damage-zone" id="arenaDamageZone"></div>
                <div class="arena-result-overlay" id="arenaResultOverlay"></div>
            </div>
            <div class="arena-bottom">
                <div class="arena-bench" id="arenaBench"></div>
                <div class="arena-actions" id="arenaActionsInner"></div>
                <div class="arena-log" id="arenaLog"></div>
            </div>
        `;

        // 替补队列：PvP 双方都显示（A 队=左，B 队=右），PvE 仅玩家
        const bench = document.getElementById('arenaBench');
        if (isPvp) {
            bench.innerHTML =
                '<span class="arena-bench-label">A 替补</span>' +
                s.player.map((c, i) => _benchSlotHtml(c, i, i === s.activeP, 'player')).join('') +
                '<span class="arena-bench-divider">|</span>' +
                '<span class="arena-bench-label">B 替补</span>' +
                s.enemy.map((c, i) => _benchSlotHtml(c, i, i === s.activeE, 'enemy')).join('');
        } else {
            bench.innerHTML = '<span class="arena-bench-label">替补</span>' +
                s.player.map((c, i) => _benchSlotHtml(c, i, i === s.activeP, 'player')).join('');
        }

        // 动作区（渲染到 arenaActionsInner）
        const actions = document.getElementById('arenaActionsInner');
        if (isPvp) {
            // PvP：双方动作按钮（操作方启用，非操作方禁用）
            const pEnabled = (s.operator === 'A');
            const eEnabled = (s.operator === 'B');
            actions.innerHTML = `
                <div class="arena-action-pvp">
                    <div class="arena-side-label ${pEnabled ? 'active' : ''}">玩家A</div>
                    <div class="arena-side-btns">${_actionBtnsHtml(p, 'player', pEnabled)}</div>
                    <div class="arena-switch-row">${_switchBtnsHtml(s, 'player', pEnabled)}</div>
                </div>
                <div class="arena-action-pvp">
                    <div class="arena-side-label ${eEnabled ? 'active' : ''}">玩家B</div>
                    <div class="arena-side-btns">${_actionBtnsHtml(e, 'enemy', eEnabled)}</div>
                    <div class="arena-switch-row">${_switchBtnsHtml(s, 'enemy', eEnabled)}</div>
                </div>
            `;
        } else {
            // PvE：仅玩家动作按钮
            actions.innerHTML = `
                <div class="arena-action-row">${_actionBtnsHtml(p, 'player', true)}</div>
                <div class="arena-switch-row">${_switchBtnsHtml(s, 'player', true)}</div>
            `;
        }

        // 渲染最近日志（底部小日志条）
        _renderLog();
    }

    /**
     * 单个 fighter 的 HTML（大立绘 + 大名字 + 属性条）
     * 字体整体放大：立绘 140px / 名字 20px / 属性 14px（参考 math-pk .arena-avatar/.arena-name）
     */
    function _fighterHtml(c) {
        const img = c.img;
        return `
            <div class="arena-fighter-art">
                ${img
                    ? `<img class="arena-avatar" src="${img}" alt="${c.name}" onerror="this.style.display='none';var fallback=this.parentElement&&this.parentElement.querySelector('.arena-fighter-emoji');if(fallback)fallback.style.display=''">`
                    : ''}
                <div class="arena-fighter-emoji" style="${img ? 'display:none' : ''}">🐾</div>
            </div>
            <div class="arena-fighter-name">${c.name}</div>
            <div class="arena-fighter-stats">${_statsText(c)}</div>
        `;
    }

    /**
     * HP 条 + HP 数字（放大：条高 16px / 数字 16px）
     */
    function _hpLineHtml(c) {
        return `
            <div class="arena-hp-line">
                <div class="arena-hp-bar"><div class="arena-hp-fill" style="width:${_hpPct(c)}%"></div></div>
                <div class="arena-hp-text">❤️ ${c.hp}/${c.maxHp}</div>
            </div>
        `;
    }

    /**
     * 替补槽 HTML
     * @param {object} c combatant
     * @param {number} i 队内 index
     * @param {boolean} active 是否当前上场
     * @param {'player'|'enemy'} side 方位（PvP 点击换人需带上）
     */
    function _benchSlotHtml(c, i, active, side) {
        const img = c.img;
        const fainted = c.hp <= 0;
        const clickAttr = (!active && !fainted) ? `onclick="CardArenaUI.doSwitch(${i}, '${side}')"` : '';
        return `
            <div class="arena-bench-slot ${active ? 'active' : ''} ${fainted ? 'fainted' : ''}"
                 ${clickAttr}
                 title="${fainted ? '已倒下' : (active ? '上场中' : '点击换人（耗回合）')}">
                ${img
                    ? `<img class="bench-img" src="${img}" alt="${c.name}" onerror="this.style.display='none';var fallback=this.parentElement&&this.parentElement.querySelector('.bench-emoji');if(fallback)fallback.style.display=''">`
                    : `<span class="bench-emoji">🐾</span>`}
                <div class="bench-hp"><div class="bench-hp-fill" style="width:${_hpPct(c)}%"></div></div>
            </div>
        `;
    }

    // 4 动作按钮（普攻/重击/防御/必杀），CD 中或非操作方禁用
    // sideEnabled：该方是否为当前操作方（PvE 传 true）
    function _actionBtnsHtml(p, side, sideEnabled) {
        // 等级分级（等级 = PetSystem.getState().level）：Lv1-4 攻击系；Lv5-9 +防御；Lv10+ +必杀+道具
        const petLevel = (typeof PetSystem !== 'undefined' && PetSystem.getState)
            ? (PetSystem.getState().level || 1) : 1;
        const findSk = (id) => (p.skills || []).find(s => s.id === id);
        const allBtns = [
            { id: 'attack', label: '⚔️ 普攻', action: { type: 'attack' }, minLv: 1 },
            { id: 'power_strike', label: '💥 重击', action: { type: 'skill', skillId: 'power_strike' }, minLv: 1 },
            { id: 'defend', label: '🛡️ 防御', action: { type: 'defend', skillId: 'defend' }, minLv: 5 },
            { id: 'ultimate', label: '🌟 必杀', action: { type: 'skill', skillId: 'ultimate' }, minLv: 10 },
        ];
        const buttons = allBtns.filter(b => petLevel >= b.minLv);
        const skillBtns = buttons.map(b => {
            const sk = findSk(b.id);
            const cd = sk ? sk.currentCd : 0;
            const disabled = !sideEnabled || uiLocked || cd > 0;
            const cdTag = cd > 0 ? `<span class="cd-tag">CD ${cd}</span>` : '';
            const actWithSide = Object.assign({ side: side }, b.action);
            const act = JSON.stringify(actWithSide).replace(/"/g, '&quot;');
            return `<button class="arena-act-btn" ${disabled ? 'disabled' : ''} onclick='CardArenaUI.doAction(${act})'>${b.label}${cdTag}</button>`;
        }).join('');

        // 道具按钮：Lv10+ 才开放；显示持有 battle 道具总数 badge，点击打开道具面板
        if (petLevel < 10) return skillBtns;
        let battleCount = 0;
        try {
            if (typeof InventorySystem !== 'undefined' && InventorySystem.getItemsByType) {
                battleCount = InventorySystem.getItemsByType('battle').reduce((s, i) => s + (i.count || 0), 0);
            }
        } catch (e) {}
        const itemDisabled = !sideEnabled || uiLocked || battleCount <= 0;
        const badge = battleCount > 0 ? `<span class="cd-tag" style="background:#4CAF50;color:#fff;">${battleCount}</span>` : '';
        const itemBtn = `<button class="arena-act-btn" ${itemDisabled ? 'disabled' : ''} onclick='CardArenaUI.openItemPanel("${side}")'>🎒 道具${badge}</button>`;
        return skillBtns + itemBtn;
    }

    // 换人按钮（除当前上场外，存活的）；sideEnabled 控制启用
    function _switchBtnsHtml(s, side, sideEnabled) {
        // 换人 Lv5+ 才开放（Lv1-4 返回空，不渲染换人按钮）
        const petLevel = (typeof PetSystem !== 'undefined' && PetSystem.getState)
            ? (PetSystem.getState().level || 1) : 1;
        if (petLevel < 5) return '';
        const team = (side === 'enemy') ? s.enemy : s.player;
        const activeIdx = (side === 'enemy') ? s.activeE : s.activeP;
        return team.map((c, i) => {
            if (i === activeIdx) return '';
            const fainted = c.hp <= 0;
            const disabled = !sideEnabled || uiLocked || fainted;
            return `<button class="arena-switch-btn" ${disabled ? 'disabled' : ''} onclick="CardArenaUI.doSwitch(${i}, '${side}')">🔄 ${c.name}（${c.hp}）</button>`;
        }).join('');
    }

    function _renderLog() {
        const el = document.getElementById('arenaLog');
        if (!el) return;
        const s = CardArena.getState();
        if (!s) return;
        const recent = s.log.slice(-3);
        el.innerHTML = recent.map(ev => `<p>${_logText(ev)}</p>`).join('');
        el.scrollTop = el.scrollHeight;
    }

    // 日志事件 → 简洁文本（不用于判伤害，仅展示）
    function _logText(ev) {
        // PvP：方位→玩家标识
        const s = CardArena.getState();
        let side;
        if (s && s.mode === 'pvp') {
            side = ev.side === 'player' ? '玩家A' : (ev.side === 'enemy' ? '玩家B' : '系统');
        } else {
            side = ev.side === 'player' ? '我方' : (ev.side === 'enemy' ? '敌方' : '系统');
        }
        switch (ev.action) {
            case 'defend': return `${side} 进入防御`;
            case 'itemUsed': {
                let tail = '';
                if (ev.heal > 0) tail = `回血 +${ev.heal}`;
                else if (ev.dmg > 0) tail = `造成 ${ev.dmg} 伤害`;
                else if (ev.target === 'reviveFlag') tail = '复活标记已存';
                else if (ev.target && String(ev.target).indexOf('revive') === 0) tail = '复活替补';
                else if (ev.target === 'self') tail = '属性提升';
                return `${side} 使用 ${ev.name || '道具'}${tail ? '（' + tail + '）' : ''}`;
            }
            case 'attack': return `${side} 普攻 → ${ev.dmg} 伤害`;
            case 'power_strike': return `${side} 重击 → ${ev.dmg} 伤害`;
            case 'ultimate': return `${side} 必杀 → ${ev.dmg} 伤害`;
            case 'switch': return `${side} 换人`;
            case 'faint': return `${side} 倒下`;
            case 'pvpTurnStart': return `轮到 ${ev.operator === 'A' ? '玩家A' : '玩家B'} 操作`;
            case 'battleEnd':
                if (s && s.mode === 'pvp') {
                    return `玩家${ev.pvpWinner || (ev.result === 'win' ? 'A' : 'B')} 获胜！`;
                }
                return ev.result === 'win' ? '胜利！' : '失败';
            default: return '';
        }
    }

    // ===== 对战道具面板 =====
    function _injectArenaItemStyles() {
        if (document.getElementById('arena-item-panel-styles')) return;
        const style = document.createElement('style');
        style.id = 'arena-item-panel-styles';
        style.textContent = `
            .arena-item-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:1100; }
            .arena-item-panel { background:#fff; border-radius:14px; padding:16px; width:min(92vw,420px); max-height:80vh; overflow-y:auto; box-shadow:0 8px 30px rgba(0,0,0,0.25); }
            .arena-item-title { font-weight:bold; font-size:16px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; }
            .arena-item-list { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
            .arena-item-card { border:1px solid #eee; border-radius:10px; padding:10px; text-align:center; cursor:pointer; transition:transform .15s, box-shadow .15s; background:#fafafa; }
            .arena-item-card:hover { transform:translateY(-2px); box-shadow:0 4px 12px rgba(0,0,0,0.12); border-color:#4CAF50; }
            .arena-item-card.disabled { opacity:.45; cursor:not-allowed; }
            .arena-item-emoji { font-size:2rem; display:block; }
            .arena-item-name { font-weight:bold; font-size:13px; margin:4px 0 2px; }
            .arena-item-count { font-size:.75rem; color:#888; }
            .arena-item-desc { font-size:.7rem; color:#999; margin-top:4px; line-height:1.3; }
            .arena-item-empty { grid-column:1/-1; text-align:center; color:#999; padding:20px 0; }
            @media (max-width:480px) { .arena-item-list { grid-template-columns:1fr; } }
        `;
        document.head.appendChild(style);
    }

    function openItemPanel(side) {
        const s = CardArena.getState();
        if (!s || s.status !== 'ongoing' || uiLocked) return;
        if (s.mode === 'pvp') {
            const opSide = (s.operator === 'A') ? 'player' : 'enemy';
            if (side !== opSide) return;
        }
        _injectArenaItemStyles();
        let items = [];
        try {
            if (typeof InventorySystem !== 'undefined' && InventorySystem.getItemsByType) {
                items = InventorySystem.getItemsByType('battle');
            }
        } catch (e) {}
        const overlay = document.createElement('div');
        overlay.className = 'arena-item-overlay';
        overlay.id = 'arenaItemOverlay';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        const list = items.length === 0
            ? '<div class="arena-item-empty">背包没有对战道具<br>去商店「🎒 对战道具」分类购买</div>'
            : items.map(it => `
                <div class="arena-item-card ${it.count <= 0 ? 'disabled' : ''}"
                     ${it.count > 0 ? `onclick="CardArenaUI.useBattleItem('${it.id}','${side}')"` : ''}>
                    <span class="arena-item-emoji">${it.emoji || '🎒'}</span>
                    <div class="arena-item-name">${it.name}</div>
                    <div class="arena-item-count">x${it.count}</div>
                    <div class="arena-item-desc">${it.description || ''}</div>
                </div>
            `).join('');
        overlay.innerHTML = `
            <div class="arena-item-panel">
                <div class="arena-item-title">
                    <span>🎒 选择对战道具</span>
                    <button onclick="CardArenaUI.closeItemPanel()" style="background:none;border:none;font-size:18px;color:#999;cursor:pointer;">✕</button>
                </div>
                <div class="arena-item-list">${list}</div>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    function closeItemPanel() {
        const el = document.getElementById('arenaItemOverlay');
        if (el) el.remove();
    }

    function useBattleItem(itemId, side) {
        const s = CardArena.getState();
        if (!s || s.status !== 'ongoing' || uiLocked) return;
        if (s.mode === 'pvp') {
            const opSide = (s.operator === 'A') ? 'player' : 'enemy';
            if (side !== opSide) return;
        }
        closeItemPanel();
        uiLocked = true;
        const beforeLogLen = s.log.length;
        const action = { type: 'item', itemId: itemId, side: side };
        let st;
        try {
            st = (s.mode === 'pvp') ? CardArena.turnPvp(action) : CardArena.turn(action);
        } catch (err) {
            uiLocked = false;
            if (typeof showToast === 'function') showToast(err.message || '道具使用失败');
            return;
        }
        _animateAndRender(st, beforeLogLen);
    }

    // ===== 动作执行 =====
    /**
     * @param {object} action { type, skillId?, side? } side 由按钮注入（'player'/'enemy'）
     * PvE：忽略 side，走 CardArena.turn
     * PvP：校验 action.side === 当前操作方方位，否则忽略；走 CardArena.turnPvp
     */
    function doAction(action) {
        const s = CardArena.getState();
        if (!s || s.status !== 'ongoing' || uiLocked) return;
        // PvP：校验操作方方位（A=player, B=enemy），非操作方点击忽略
        if (s.mode === 'pvp') {
            const opSide = (s.operator === 'A') ? 'player' : 'enemy';
            if (action.side !== opSide) return;
        }
        uiLocked = true;
        const beforeLogLen = s.log.length;
        let st;
        try {
            st = (s.mode === 'pvp') ? CardArena.turnPvp(action) : CardArena.turn(action);
        } catch (err) {
            uiLocked = false;
            if (typeof showToast === 'function') showToast(err.message || '操作失败');
            return;
        }
        // 本回合新增事件（beforeLogLen..end）
        _animateAndRender(st, beforeLogLen);
    }

    /**
     * @param {number} idx 换人目标 index
     * @param {'player'|'enemy'} side 方位（PvP 区分双方；PvE 默认 player）
     */
    function doSwitch(idx, side) {
        const s = CardArena.getState();
        if (!s || s.status !== 'ongoing' || uiLocked) return;
        const actSide = side || 'player';
        // PvP：校验操作方方位
        if (s.mode === 'pvp') {
            const opSide = (s.operator === 'A') ? 'player' : 'enemy';
            if (actSide !== opSide) return;
        }
        uiLocked = true;
        const beforeLogLen = s.log.length;
        const action = { type: 'switch', switchIdx: idx, side: actSide };
        let st;
        try {
            st = (s.mode === 'pvp') ? CardArena.turnPvp(action) : CardArena.turn(action);
        } catch (err) {
            uiLocked = false;
            if (typeof showToast === 'function') showToast(err.message || '换人失败');
            return;
        }
        _animateAndRender(st, beforeLogLen);
    }

    // 增量取事件 → 出招提示 → 浮动伤害 → 解锁 → 重渲染 → 结算
    function _animateAndRender(st, beforeLogLen) {
        const newEvents = st.log.slice(beforeLogLen);
        _playArenaSfx(newEvents, st);
        // 据最新一回合事件刷新出招提示大字（持续到下一动作）
        const moveText = _moveTextFromEvents(newEvents, st);
        if (moveText) lastMoveText = moveText;
        const ended = (st.status === 'win' || st.status === 'lose');
        if (!ended) uiLocked = false;  // 先解锁，再 renderBattle（按钮 disabled 据此）
        renderBattle();                // 重渲染 stage（含 #arenaDamageZone / #arenaMoveZone）
        _popDamage(newEvents);         // 重渲染后再 append 浮动伤害（zone 已存在）
        _playBattleMotion(newEvents);
        if (ended) {
            if (arenaResultTimer) clearTimeout(arenaResultTimer);
            arenaResultTimer = setTimeout(() => {
                arenaResultTimer = null;
                const current = CardArena.getState();
                if (current && (current.status === 'win' || current.status === 'lose')) _showResult(current.status);
            }, 700);
        }
    }

    function _latestActionEvent(events) {
        if (!Array.isArray(events)) return null;
        for (let i = events.length - 1; i >= 0; i--) {
            const ev = events[i];
            if (!ev) continue;
            if (ev.action === 'attack' || ev.action === 'power_strike' || ev.action === 'ultimate' || ev.action === 'itemUsed') {
                return ev;
            }
        }
        return null;
    }

    function _motionStyleFromEvent(ev) {
        if (!ev) return '';
        if (ev.action === 'ultimate') return 'arena-motion-style-ultimate';
        if (ev.action === 'power_strike') return 'arena-motion-style-heavy';
        return 'arena-motion-style-basic';
    }

    function _clearBattleMotion() {
        if (arenaMotionImpactTimer) {
            clearTimeout(arenaMotionImpactTimer);
            arenaMotionImpactTimer = null;
        }
        if (arenaMotionCleanupTimer) {
            clearTimeout(arenaMotionCleanupTimer);
            arenaMotionCleanupTimer = null;
        }
        document.querySelectorAll('.arena-combat-card, #arenaDamageZone, #arenaStage').forEach((el) => {
            if (!el) return;
            el.classList.remove(
                'arena-battle-lunge',
                'arena-battle-lunge-player',
                'arena-battle-lunge-enemy',
                'arena-impact-burst',
                'arena-impact-style-basic',
                'arena-impact-style-heavy',
                'arena-impact-style-ultimate',
                'arena-impact-backlight',
                'arena-impact-floor-ring',
                'arena-impact-shockwave',
                'arena-target-recoil',
                'arena-target-slam',
                'arena-target-recoil-player',
                'arena-target-recoil-enemy',
                'arena-motion-style-basic',
                'arena-motion-style-heavy',
                'arena-motion-style-ultimate',
                'arena-hp-shake',
                'arena-lunge-afterimage',
                'arena-stage-impact-focus'
            );
        });
    }

    function _playBattleMotion(events) {
        const ev = _latestActionEvent(events);
        if (!ev) return;
        const actorSide = ev.side === 'enemy' ? 'enemy' : 'player';
        const targetSide = actorSide === 'player' ? 'enemy' : 'player';
        const actorCard = document.querySelector(`.arena-combat-card[data-side="${actorSide}"]`);
        const targetCard = document.querySelector(`.arena-combat-card[data-side="${targetSide}"]`);
        const zone = document.getElementById('arenaDamageZone');
        const stage = document.getElementById('arenaStage');
        const styleClass = _motionStyleFromEvent(ev);
        _clearBattleMotion();
        if (actorCard) {
            actorCard.classList.add('arena-battle-lunge', `arena-battle-lunge-${actorSide}`, 'arena-lunge-afterimage');
            if (styleClass) actorCard.classList.add(styleClass);
        }
        if (stage) stage.classList.add('arena-stage-impact-focus');
        arenaMotionImpactTimer = setTimeout(() => {
            arenaMotionImpactTimer = null;
            const impactClass = styleClass === 'arena-motion-style-ultimate'
                ? 'arena-impact-style-ultimate'
                : styleClass === 'arena-motion-style-heavy'
                    ? 'arena-impact-style-heavy'
                    : 'arena-impact-style-basic';
            if (zone) zone.classList.add('arena-impact-burst', impactClass);
            if (targetCard) {
                targetCard.classList.add('arena-impact-backlight', 'arena-impact-floor-ring', 'arena-impact-shockwave', impactClass, 'arena-target-recoil', 'arena-target-slam', `arena-target-recoil-${targetSide}`, 'arena-hp-shake');
                if (styleClass) targetCard.classList.add(styleClass);
            }
        }, ev.action === 'ultimate' ? 170 : 120);
        arenaMotionCleanupTimer = setTimeout(_clearBattleMotion, 900);
    }

    function _playArenaSfx(events, st) {
        if (!Array.isArray(events) || !events.length) return;
        let comboPlayed = false;
        let healPlayed = false;
        let impactPlayed = false;
        for (let i = 0; i < events.length; i++) {
            const ev = events[i];
            if (ev.action === 'attack') {
                playSfx('dashWhoosh');
                playSfx(ev.side === 'player' ? 'playerAttack' : 'enemyAttack');
                if (ev.dmg > 0 && !impactPlayed) {
                    playSfx('battleImpact');
                    impactPlayed = true;
                }
                continue;
            }
            if (ev.action === 'power_strike' || ev.action === 'ultimate') {
                playSfx('dashWhoosh');
                playSfx('skillCast');
                if (ev.dmg > 0 && !impactPlayed) {
                    playSfx('battleImpact');
                    impactPlayed = true;
                }
                if (!comboPlayed) {
                    playSfx('comboUp');
                    comboPlayed = true;
                }
                continue;
            }
            if (ev.action === 'defend') {
                playSfx('defend');
                playSfx('shieldSpark');
                continue;
            }
            if (ev.action === 'itemUsed') {
                playSfx('itemUse');
                if (ev.heal > 0 && !healPlayed) {
                    playSfx('healPulse');
                    healPlayed = true;
                }
                if (ev.dmg > 0 && !impactPlayed) {
                    playSfx('battleImpact');
                    impactPlayed = true;
                }
                continue;
            }
            if (ev.action === 'switch') {
                playSfx('uiOpen');
                playSfx('switchPoof');
                continue;
            }
            if (ev.action === 'faint') {
                playSfx('battleImpact');
                playSfx('stunPop');
                playSfx('faintDrop');
            }
        }
        if (st && (st.status === 'win' || st.status === 'lose')) {
            playSfx(st.status === 'win' ? 'roundWinCue' : 'roundLoseCue');
            playSfx(st.status === 'win' ? 'battleWin' : 'battleLose');
            if (pendingStageId != null && st.status === 'win') playSfx('rewardStar');
            if (st.status === 'win') {
                playSfx('rewardFanfare');
                playSfx('victoryBurst');
            }
            else playSfx('faintDrop');
        }
    }

    /**
     * 从本回合新增事件提炼"出招提示"大字文本（取最后一个有代表性的动作事件）
     * 不解析中文日志，直接读结构化字段 action/side/dmg
     * 返回 '' 表示无可见提示（如纯换人回合由 switch 事件覆盖）
     */
    function _moveTextFromEvents(events, st) {
        if (!events || !events.length) return '';
        const isPvp = st && st.mode === 'pvp';
        const sideLabel = (side) => {
            if (side === 'player') return isPvp ? '玩家A' : '我方';
            if (side === 'enemy') return isPvp ? '玩家B' : '敌方';
            return '';
        };
        const skillIcon = { attack: '⚔️', power_strike: '💥', ultimate: '🌟', defend: '🛡️' };
        const skillName = { attack: '普攻', power_strike: '重击', ultimate: '必杀', defend: '防御' };
        // 倒序找最后一个"动作"事件（attack/power_strike/ultimate/defend/switch/faint）
        for (let i = events.length - 1; i >= 0; i--) {
            const ev = events[i];
            if (ev.action === 'switch') {
                return `🔄 ${sideLabel(ev.side)} 换人`;
            }
            if (ev.action === 'faint') {
                return `💀 ${sideLabel(ev.side)} 倒下`;
            }
            if (ev.action === 'defend') {
                return `${skillIcon.defend} ${sideLabel(ev.side)} 防御`;
            }
            if (ev.action === 'itemUsed') {
                let tail = '';
                if (ev.heal > 0) tail = ` +${ev.heal} HP`;
                else if (ev.dmg > 0) tail = ` → ${ev.dmg} 伤害`;
                else if (ev.target === 'reviveFlag') tail = '（标记已存）';
                else if (ev.target && String(ev.target).indexOf('revive') === 0) tail = '（复活成功）';
                else if (ev.target === 'self') tail = '（增益生效）';
                return `${ev.name || '🎒'} ${sideLabel(ev.side)}${tail}`;
            }
            if (ev.action === 'attack' || ev.action === 'power_strike' || ev.action === 'ultimate') {
                const icon = skillIcon[ev.action] || '⚔️';
                const name = skillName[ev.action] || '攻击';
                return `${icon} ${sideLabel(ev.side)}${name} → ${ev.dmg} 伤害`;
            }
        }
        return '';
    }

    // 浮动伤害数字（听 dmg 事件，不解析文本）
    function _popDamage(events) {
        const zone = document.getElementById('arenaDamageZone');
        if (!zone) return;
        const s = CardArena.getState();
        events.forEach(ev => {
            if (ev.dmg == null || ev.dmg <= 0) return;
            // side = actor 方：player 攻击 → 命中敌方（右侧），enemy 攻击 → 命中我方（左侧）
            const targetSide = ev.side === 'player' ? 'enemy' : 'player';
            const el = document.createElement('div');
            el.className = 'arena-dmg-pop ' + ev.side;
            el.textContent = '-' + ev.dmg;
            // 落点：命中方 fighter 区域随机偏移
            const isLeft = targetSide === 'player';
            const x = isLeft ? (10 + Math.random() * 30) : (60 + Math.random() * 30);
            const y = 30 + Math.random() * 40;
            el.style.left = x + '%';
            el.style.top = y + '%';
            zone.appendChild(el);
            setTimeout(() => el.remove(), 900);
        });
    }

    // ===== 胜负结算 =====
    // PvP 模式（s.mode==='pvp'）：显示玩家A/B 获胜 + 再战/关闭
    // 闯关模式（pendingStageId!=null）：胜利→clearStage（仅首次发奖+解锁下一关）；失败→不结算进度
    // 自由对战（pendingStageId==null）：随机积分，行为不变
    function _showResult(status) {
        const overlay = document.getElementById('arenaResultOverlay');
        if (!overlay) return;
        const isWin = status === 'win';
        const s = CardArena.getState();
        const resultHero = (title, subline, tone) => `
            <div class="arena-result-hero ${tone || (isWin ? 'win' : 'lose')}">
                <span class="arena-result-kicker">${isWin ? '结果结算' : '重新整理'}</span>
                <strong>${title}</strong>
                ${subline ? `<p>${subline}</p>` : ''}
            </div>
        `;

        // —— PvP 本地热座彩蛋 ——
        // win = 玩家A 胜（enemy=玩家B 全灭），lose = 玩家A 负 / 玩家B 胜
        if (s && s.mode === 'pvp') {
            const winner = isWin ? 'A' : 'B';  // A 队=player 全灭→lose→B 胜
            playSfx('resultStamp');
            const milestoneHtml = typeof window.renderBattleMilestoneUnlockSummary === 'function'
                ? window.renderBattleMilestoneUnlockSummary(typeof window.consumeBattleMilestoneUnlocksForRun === 'function'
                    ? window.consumeBattleMilestoneUnlocksForRun()
                    : [], { compact: true })
                : '';
            overlay.innerHTML = `
                <div class="arena-result-title win">🏆 玩家${winner} 获胜！</div>
                ${resultHero(`玩家${winner} 先把节奏拿住了`, '这一局已经打成一场完整的家庭对战。', 'win')}
                <div class="text-xs text-muted" style="margin:4px 0;">家庭双人彩蛋 · 友谊赛不计积分</div>
                ${milestoneHtml}
                <div class="arena-result-btns">
                    <button class="btn-primary" onclick="CardArenaUI.rematchPvp()">🔁 再战</button>
                    <button class="btn-secondary" onclick="CardArenaUI.closeBattleModal()">✕ 关闭</button>
                </div>
            `;
            overlay.classList.add('show');
            return;
        }

        // —— 闯关模式 ——
        if (isWin && pendingStageId != null) {
            const reward = _currentStageReward() || { points: 0 };
            const result = clearStage(pendingStageId, reward);
            const stageName = (stagesCache && stagesCache.stages)
                ? (stagesCache.stages.find(s => s.id === pendingStageId) || {}).name
                : ('关卡 ' + pendingStageId);
            playSfx('resultStamp');
            const rewardLines = [];
            if (result.firstClear) {
                if (result.granted.points) rewardLines.push(`+${result.granted.points} 积分`);
                if (result.granted.card) rewardLines.push(`🃏 解锁新卡：${_speciesName(result.granted.card)}`);
                if (result.granted.item) {
                    const it = (typeof InventorySystem !== 'undefined' && InventorySystem.getItemData)
                        ? InventorySystem.getItemData(result.granted.item) : null;
                    rewardLines.push(`${it ? it.emoji : '🎒'} 获得道具：${it ? it.name : result.granted.item}`);
                }
            } else {
                rewardLines.push('重玩关卡（奖励已领取）');
            }
            // 积分兑换制奖励：每次打赢 → 出场宠 +10 EXP + 随机卡/经验（不计积分）
            try {
                if (typeof PetSystem !== 'undefined' && PetSystem.addExp) PetSystem.addExp(10);
            } catch (e) {}
            const extraGrant = _grantRandomCardOrExp();
            if (extraGrant) {
                rewardLines.unshift(extraGrant);
                if (typeof showToast === 'function') showToast(extraGrant);
            }
            if (typeof window.recordBattleRecentActivity === 'function') {
                window.recordBattleRecentActivity({
                    id: `arena_stage_${pendingStageId || 'free'}_${Date.now()}`,
                    mode: 'arena',
                    title: `卡牌训练营通关 · ${stageName || '训练营'}`,
                    detail: rewardLines.join(' · ') || '完成一场训练营挑战'
                });
            }
            const nextBtn = result.unlockedNext
                ? `<button class="btn-primary" onclick="CardArenaUI.gotoNext(${result.unlockedNext})">➡️ 下一关</button>`
                : '';
            const milestoneHtml = typeof window.renderBattleMilestoneUnlockSummary === 'function'
                ? window.renderBattleMilestoneUnlockSummary(typeof window.consumeBattleMilestoneUnlocksForRun === 'function'
                    ? window.consumeBattleMilestoneUnlocksForRun()
                    : [], { compact: true })
                : '';
            if (result.firstClear || result.unlockedNext) playSfx('trainingUnlock');
            overlay.innerHTML = `
                <div class="arena-result-title win">🏆 通关！</div>
                ${resultHero(`轻章节已经推进到 ${stageName}`, rewardLines[0] || '这次训练已经成功记进今日战果。', 'win')}
                <div class="text-xs text-muted" style="margin-bottom:4px;">${stageName}</div>
                <div class="arena-result-reward">${rewardLines.join(' · ') || '完成'}</div>
                ${result.unlockedNext ? '<div class="text-xs" style="color:#10b981;margin:4px 0;">🔓 已解锁下一关</div>' : ''}
                ${milestoneHtml}
                <div class="arena-result-btns">
                    ${nextBtn}
                    <button class="btn-secondary" onclick="CardArenaUI.replayStage()">🔁 再战</button>
                    <button class="btn-secondary" onclick="CardArenaUI.backToStages()">📋 关卡列表</button>
                </div>
            `;
            overlay.classList.add('show');
            return;
        }
        if (!isWin && pendingStageId != null) {
            playSfx('resultStamp');
            const milestoneHtml = typeof window.renderBattleMilestoneUnlockSummary === 'function'
                ? window.renderBattleMilestoneUnlockSummary(typeof window.consumeBattleMilestoneUnlocksForRun === 'function'
                    ? window.consumeBattleMilestoneUnlocksForRun()
                    : [], { compact: true })
                : '';
            overlay.innerHTML = `
                <div class="arena-result-title lose">💀 失败</div>
                ${resultHero('这局先收住，下一局再换个打法', '先看看队伍站位和技能顺序，再回来打一轮。', 'lose')}
                <div class="text-xs text-muted" style="margin:4px 0;">再调整队伍试试吧</div>
                ${milestoneHtml}
                <div class="arena-result-btns">
                    <button class="btn-primary" onclick="CardArenaUI.replayStage()">🔁 再战</button>
                    <button class="btn-secondary" onclick="CardArenaUI.backToStages()">📋 关卡列表</button>
                </div>
            `;
            overlay.classList.add('show');
            return;
        }

        // —— 自由对战（练习模式：可随时玩，不计成长积分，避免刷分循环）——
        // 奖励收口到「轻章节首通」；自由练习只给成就感，不走 addGrowthPoints
        playSfx('resultStamp');
        const milestoneHtml = typeof window.renderBattleMilestoneUnlockSummary === 'function'
            ? window.renderBattleMilestoneUnlockSummary(typeof window.consumeBattleMilestoneUnlocksForRun === 'function'
                ? window.consumeBattleMilestoneUnlocksForRun()
                : [], { compact: true })
            : '';
        overlay.innerHTML = `
            <div class="arena-result-title ${isWin ? 'win' : 'lose'}">${isWin ? '🏆 胜利' : '💀 失败'}</div>
            ${resultHero(isWin ? '这一局练习已经打完了' : '这局练习先停在这里', isWin ? '再打一局，手感会更顺。' : '先调一下队伍，再回来继续。', isWin ? 'win' : 'lose')}
            <div class="arena-result-reward">${isWin ? '练习完成！' : '再调整队伍试试'}</div>
            <div class="text-xs text-muted" style="margin:4px 0;">自由练习 · 不计成长积分（奖励看轻章节首通）</div>
            ${milestoneHtml}
            <div class="arena-result-btns">
                <button class="btn-primary" onclick="CardArenaUI.rematch()">🔁 再战一局</button>
                <button class="btn-secondary" onclick="CardArenaUI.closeBattleModal()">✕ 关闭</button>
            </div>
        `;
        overlay.classList.add('show');
    }

    // 下一关：解锁后直接进入（需关卡已解锁）
    function gotoNext(nextId) {
        const overlay = document.getElementById('arenaResultOverlay');
        if (overlay) overlay.classList.remove('show');
        closeBattleModal();
        enterStage(nextId);
    }

    // 再战当前关：同关同队重打
    function replayStage() {
        const overlay = document.getElementById('arenaResultOverlay');
        if (overlay) overlay.classList.remove('show');
        if (pendingStageId == null || selectedIds.length !== TEAM_SIZE) {
            closeBattleModal();
            openTeamSelect();
            return;
        }
        CardArena.reset();
        const res = CardArena.selectTeam(selectedIds.slice());
        if (!res.ok) { closeBattleModal(); openStages(); return; }
        CardArena.startBattle(_currentEnemies(), _currentEnemyMult());
        logSeenLen = 0;
        lastDamageEvents = [];
        lastMoveText = '';
        uiLocked = false;
        renderBattle();
    }

    // 返回关卡列表
    function backToStages() {
        const overlay = document.getElementById('arenaResultOverlay');
        if (overlay) overlay.classList.remove('show');
        closeBattleModal();
        openStages();
    }

    function rematch() {
        const overlay = document.getElementById('arenaResultOverlay');
        if (overlay) overlay.classList.remove('show');
        CardArena.reset();
        // 重新选队 + 开战
        if (selectedIds.length === TEAM_SIZE) {
            const res = CardArena.selectTeam(selectedIds.slice());
            if (res.ok) {
                CardArena.startBattle(_currentEnemies(), _currentEnemyMult());
                logSeenLen = 0;
                lastDamageEvents = [];
                lastMoveText = '';
                uiLocked = false;
                renderBattle();
                return;
            }
        }
        // 选队信息丢失 → 回到选队
        closeBattleModal();
        openTeamSelect();
    }

    /**
     * PvP 再战：用已存的双方队伍 ID 重新选队 + 开战（不重走选队 modal）
     */
    function rematchPvp() {
        const overlay = document.getElementById('arenaResultOverlay');
        if (overlay) overlay.classList.remove('show');
        CardArena.reset();
        if (pvpTeamAIds.length === TEAM_SIZE && pvpTeamBIds.length === TEAM_SIZE) {
            const res = CardArena.selectTeamPvp(pvpTeamAIds.slice(), pvpTeamBIds.slice());
            if (res.ok) {
                CardArena.startBattlePvp();
                logSeenLen = 0;
                lastDamageEvents = [];
                lastMoveText = '';
                uiLocked = false;
                renderBattle();
                return;
            }
        }
        // 队伍信息丢失 → 回到 PvP 选队
        closeBattleModal();
        openPvpSetup();
    }

    function stop() {
        if (arenaResultTimer) {
            clearTimeout(arenaResultTimer);
            arenaResultTimer = null;
        }
        _clearBattleMotion();
        uiLocked = false;
        ['arenaStagesModal', 'arenaTeamModal', 'arenaBattleModal', 'arenaResultOverlay'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('show');
        });
    }

    // Public API
    return {
        openTeamSelect,
        togglePick,
        confirmTeam,
        closeTeamModal,
        closeBattleModal,
        doAction,
        doSwitch,
        // 对战道具
        openItemPanel,
        closeItemPanel,
        useBattleItem,
        rematch,
        // PvP 本地热座
        openPvpSetup,
        rematchPvp,
        stop,
        // 闯关
        openStages,
        closeStages,
        enterStage,
        openFreePlay,
        gotoNext,
        replayStage,
        backToStages,
        getProgress,
        isUnlocked,
        isCleared,
        clearStage,
        // 暴露给测试
        _pickEnemies,
        _loadStages
    };
})();

window.CardArenaUI = CardArenaUI;
