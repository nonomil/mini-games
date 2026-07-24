/**
 * card-arena.js - 卡牌对战（宝可梦式 2v2 PvE）核心逻辑
 *
 * 设计（方案 docs/方案/2026-07-01-卡牌对战-方案.md §3 机制 / §4 架构 / §5 技术）：
 *   - 纯逻辑 + 状态：选队 / 入场 / 回合制（普攻/技能/防御/换人） / 胜负 / 自动换人
 *   - 不碰 DOM/UI/掉落/EXP（mode adapter 职责，UI 由 app.js 后续接入）
 *   - def/spd 必接：calcDamage(useDef:true) + decideOrder 先手
 *   - combatant 用 BattleEngine.makeCombatant
 *   - 队伍规模 TEAM_SIZE=2（1 上场 + 1 替补），原 3v3 收口为 2v2 降低认知负担
 *
 * 事件契约（log 数组，供 UI 渲染，非中文文本判伤害）：
 *   { actor, side, action, dmg, targetHp, faint, switch }
 *   side: 'player'|'enemy'  action: 'attack'|'power_strike'|'ultimate'|'defend'|'switch'
 */
const CardArena = (function () {

    // ===== 技能定义（每场重置 CD）=====
    // 普攻 { mult:1, cd:0 }  /  power_strike { mult:1.8, cd:2 }  /  defend { type:'defend', cd:3 }  /  ultimate { mult:3, cd:5 }
    const SKILL_DEFS = {
        attack:       { id: 'attack',       type: 'attack', mult: 1,   cd: 0 },
        power_strike: { id: 'power_strike', type: 'attack', mult: 1.8, cd: 2 },
        defend:       { id: 'defend',       type: 'defend', mult: 0,   cd: 3 },
        ultimate:     { id: 'ultimate',     type: 'attack', mult: 3,   cd: 5 }
    };

    // SSR（传说）稀有度限制：每队 ≤1
    const SSR_RARITIES = ['legendary'];

    // 队伍规模：2 只（1 上场 + 1 替补）。原 3v3 → 2v2，降低认知负担。
    const TEAM_SIZE = 2;

    let playerTeam = null;   // 玩家选定队伍（combatant×TEAM_SIZE，已 makeCombatant）
    let arenaState = null;   // 当前对战状态
    // ===== PvP 本地热座（彩蛋）状态 =====
    // pvpTeamA/pvpTeamB：双人各自选定的 TEAM_SIZE 只 combatant（side='player'/'enemy' 区分方位）
    let pvpTeamA = null;     // 玩家A 队伍（方位 player）
    let pvpTeamB = null;     // 玩家B 队伍（方位 enemy）

    /**
     * 构建默认 3 技能槽（普攻 + power_strike + defend + ultimate 四技能）
     * 每只 combatant 都带这 4 个技能，CD 各自独立计数。
     */
    function _defaultSkills() {
        return Object.values(SKILL_DEFS).map(s => ({
            id: s.id, type: s.type, mult: s.mult || 0, cd: s.cd || 0, currentCd: 0
        }));
    }

    function _resolveCombatantImg(src) {
        if (!src) return '';
        return window.resolvePetBankAssetUrl ? window.resolvePetBankAssetUrl(src) : src;
    }

    /**
     * 从 PetSystem species 构建单个 combatant
     * @param {object} species PetSystem.getAllSpecies() 项（base_hp/atk/def/spd/rarity/imageStages）
     * @param {'player'|'enemy'} side
     */
    function _combatantFromSpecies(species, side) {
        const c = BattleEngine.makeCombatant({
            id: species.id,
            name: species.name || species.id,
            img: _resolveCombatantImg((species.imageStages && species.imageStages['2']) || species.imageUrl || ''),
            side: side,
            level: 1,
            hp: species.base_hp || 100,
            maxHp: species.base_hp || 100,
            atk: species.base_atk || 5,
            def: species.base_def || 0,
            spd: species.base_spd || 0,
            skills: _defaultSkills()
        });
        _initArenaFields(c);
        return c;
    }

    /**
     * 给 combatant 加上竞技场对战道具 buff 字段（不污染 BattleEngine.makeCombatant）
     * - atkMult/defMult：本战有效，道具可叠加（攻击药 +30%、防御药 +30%）
     * - reviveFlag：复活符标记（无阵亡时存此，阵亡时自动触发）
     * 新对战 makeCombatant 默认无这些字段，本战结束随 combatant 丢弃即重置
     */
    function _initArenaFields(c) {
        if (!c) return c;
        c.atkMult = 1;
        c.defMult = 1;
        c.reviveFlag = null;
        return c;
    }

    /**
     * 对 enemy combatant 应用弱化倍率（低章节用，data/arena-stages.json 的 stage.enemyMult）
     * 仅影响 atk / maxHp(&hp)，floor≥1；player 队不走此函数，不受影响
     */
    function _applyEnemyMult(c, statMult) {
        if (!statMult || !c) return;
        if (statMult.atk != null) {
            c.atk = Math.max(1, Math.floor((c.atk || 1) * statMult.atk));
        }
        if (statMult.hp != null) {
            const newMax = Math.max(1, Math.floor((c.maxHp || c.hp || 1) * statMult.hp));
            c.maxHp = newMax;
            c.hp = Math.min(c.hp, newMax);
        }
    }

    /**
     * 从预设数值构建 enemy combatant（enemySpeciesOrIds 项若是 object 直接用，否则当 speciesId 查）
     * @param {object} statMult 可选弱化倍率 {atk,hp}（低章节敌人弱化用）
     */
    function _combatantFromEnemySpec(spec, side, statMult) {
        // 已是 combatant-like 对象（含 hp/atk/def/spd）
        if (spec && (spec.hp != null || spec.maxHp != null) && (spec.atk != null)) {
            const c = BattleEngine.makeCombatant({
                id: spec.id || ('enemy_' + Math.random().toString(36).slice(2, 7)),
                name: spec.name || spec.id || '敌方',
                img: _resolveCombatantImg(spec.img || ''),
                side: side,
                level: spec.level || 1,
                hp: spec.hp != null ? spec.hp : (spec.maxHp || 100),
                maxHp: spec.maxHp || spec.hp || 100,
                atk: spec.atk || 5,
                def: spec.def || 0,
                spd: spec.spd || 0,
                skills: Array.isArray(spec.skills) && spec.skills.length ? spec.skills : _defaultSkills()
            });
            _initArenaFields(c);
            _applyEnemyMult(c, statMult);
            return c;
        }
        // 否则当 speciesId，查 PetSystem
        const all = (typeof PetSystem !== 'undefined') ? PetSystem.getAllSpecies() : [];
        const sp = all.find(s => s.id === spec);
        if (sp) {
            const c = _combatantFromSpecies(sp, side);
            _applyEnemyMult(c, statMult);
            return c;
        }
        // 兜底
        const c = BattleEngine.makeCombatant({
            id: String(spec), name: String(spec), side: side,
            hp: 100, maxHp: 100, atk: 5, def: 0, spd: 0, skills: _defaultSkills()
        });
        _initArenaFields(c);
        _applyEnemyMult(c, statMult);
        return c;
    }

    /**
     * 选队内部构建：从 speciesId 数组构建 combatant 队伍（含校验）
     * @param {string[]} petIds TEAM_SIZE 个 species id
     * @param {'player'|'enemy'} side 方位
     * @returns {object} { ok, error?, team? }
     *
     * 校验：恰好 TEAM_SIZE 只 + 每队 SSR(legendary) ≤1
     */
    function _buildTeam(petIds, side) {
        if (!Array.isArray(petIds) || petIds.length !== TEAM_SIZE) {
            return { ok: false, error: '队伍必须恰好 ' + TEAM_SIZE + ' 只' };
        }
        const all = (typeof PetSystem !== 'undefined') ? PetSystem.getAllSpecies() : [];
        const picked = [];
        let ssrCount = 0;
        for (const id of petIds) {
            const sp = all.find(s => s.id === id);
            if (!sp) {
                return { ok: false, error: '未找到宠物: ' + id };
            }
            if (SSR_RARITIES.includes(sp.rarity)) ssrCount++;
            picked.push(sp);
        }
        if (ssrCount > 1) {
            return { ok: false, error: '每队 SSR(传说) 最多 1 只' };
        }
        // 首发：spd 最高首发（方案 §3.3）。按 spd 降序排，首发 index=0
        picked.sort((a, b) => (b.base_spd || 0) - (a.base_spd || 0));
        const team = picked.map(sp => _combatantFromSpecies(sp, side));
        return { ok: true, team: team };
    }

    /**
     * 选队（PvE）：从收集卡 / 任意 species 选 TEAM_SIZE 只上场，方位 player
     * @param {string[]} petIds TEAM_SIZE 个 species id
     * @returns {object} { ok, error?, team? }
     *
     * 校验：恰好 TEAM_SIZE 只 + 每队 SSR(legendary) ≤1
     */
    function selectTeam(petIds) {
        const res = _buildTeam(petIds, 'player');
        if (res.ok) playerTeam = res.team;
        return res;
    }

    /**
     * PvP 选队：双人各选 TEAM_SIZE 只（共用收集卡池），分别落 player/enemy 方位
     * @param {string[]} teamAIds 玩家A 的 TEAM_SIZE 个 species id（方位 player）
     * @param {string[]} teamBIds 玩家B 的 TEAM_SIZE 个 species id（方位 enemy）
     * @returns {object} { ok, error?, teamA?, teamB? }
     */
    function selectTeamPvp(teamAIds, teamBIds) {
        const a = _buildTeam(teamAIds, 'player');
        if (!a.ok) return { ok: false, error: '玩家A：' + a.error };
        const b = _buildTeam(teamBIds, 'enemy');
        if (!b.ok) return { ok: false, error: '玩家B：' + b.error };
        pvpTeamA = a.team;
        pvpTeamB = b.team;
        return { ok: true, teamA: pvpTeamA, teamB: pvpTeamB };
    }

    /**
     * 开始对战
     * @param {(string|object)[]} enemySpeciesOrIds 敌方 TEAM_SIZE 只（speciesId 或预设数值对象）
     * @param {object} [enemyStatMult] 可选弱化倍率 {atk,hp}（低章节敌人弱化，由 UI 从 stage.enemyMult 传入）
     * @returns {object} arenaState
     */
    function startBattle(enemySpeciesOrIds, enemyStatMult) {
        if (!playerTeam || playerTeam.length !== TEAM_SIZE) {
            throw new Error('startBattle: 尚未选队，请先 selectTeam');
        }
        if (!Array.isArray(enemySpeciesOrIds) || enemySpeciesOrIds.length !== TEAM_SIZE) {
            throw new Error('startBattle: 敌方必须 ' + TEAM_SIZE + ' 只');
        }
        const enemy = enemySpeciesOrIds.map(spec => _combatantFromEnemySpec(spec, 'enemy', enemyStatMult));
        arenaState = {
            mode: 'pve',          // 'pve' 闯关/自由对战 / 'pvp' 本地热座
            player: playerTeam,
            enemy: enemy,
            activeP: 0,
            activeE: 0,
            round: 1,
            status: 'ongoing',
            log: []
        };
        return arenaState;
    }

    /**
     * 开始 PvP 本地热座对战（无 AI，双人轮流操作）
     * - arenaState 加 mode:'pvp' + operator:'A'|'B'（当前操作方）
     * - operator 仅决定"谁出招"，不改变方位：A 操作 player 方，B 操作 enemy 方
     * - 首回合 operator 由双方首发 spd 决定（spd 高者先操作，平手 A 先）
     * @returns {object} arenaState
     */
    function startBattlePvp() {
        if (!pvpTeamA || pvpTeamA.length !== TEAM_SIZE || !pvpTeamB || pvpTeamB.length !== TEAM_SIZE) {
            throw new Error('startBattlePvp: 尚未完成双人选队，请先 selectTeamPvp');
        }
        // spd 决定首回合谁先操作（A 的首发 vs B 的首发）
        const spdA = pvpTeamA[0].spd || 0;
        const spdB = pvpTeamB[0].spd || 0;
        const firstOperator = BattleEngine.decideOrder(spdA, spdB) === 'A' ? 'A' : 'B';
        arenaState = {
            mode: 'pvp',
            player: pvpTeamA,    // 玩家A 队伍（方位 player）
            enemy: pvpTeamB,     // 玩家B 队伍（方位 enemy）
            activeP: 0,
            activeE: 0,
            round: 1,
            operator: firstOperator,  // 当前操作方 'A'|'B'
            status: 'ongoing',
            log: []
        };
        // 记录初始操作方（便于 UI 提示）
        arenaState.log.push({
            actor: 'system', side: 'system', action: 'pvpTurnStart',
            dmg: 0, targetHp: 0, faint: false, switch: false, operator: firstOperator
        });
        return arenaState;
    }

    // ===== 内部：取/设 当前上场 combatant =====
    function _activeP() { return arenaState.player[arenaState.activeP]; }
    function _activeE() { return arenaState.enemy[arenaState.activeE]; }

    /**
     * 查找下一只存活的 combatant index（从 start 起环形扫描）
     * @returns {number|null} 存活 index，全灭返回 null
     */
    function _nextAliveIndex(team, start) {
        const n = team.length;
        for (let i = 0; i < n; i++) {
            const idx = (start + i) % n;
            if (team[idx].hp > 0) return idx;
        }
        return null;
    }

    /**
     * 判全灭
     */
    function _allFainted(team) {
        return team.every(c => c.hp <= 0);
    }

    /**
     * 对 target 造成伤害（应用 defending 减伤 + calcDamage useDef）
     * @returns {{ dmg:number, targetHp:number }}
     */
    function _dealDamage(actor, target, skill) {
        const mult = skill ? (skill.mult || 1) : 1;
        // 对战道具 buff：atk×atkMult（攻击药 +30%），def×defMult（防御药 +30%）
        const effAtk = Math.max(0, Math.floor((actor.atk || 0) * (actor.atkMult || 1)));
        const effDef = Math.max(0, Math.floor((target.def || 0) * (target.defMult || 1)));
        // calcDamage(useDef:true) → base = max(1, atk - floor(def/2))，def=0 退化安全（atk）
        let dmg = BattleEngine.calcDamage(effAtk, effDef, { mult: mult, useDef: true });
        // 先记下是否主动防御（下面的分支会消耗 defending 标志）
        const activeDefended = !!target.defending;
        // defend 减伤：目标本回合 defending → 受击 ×0.5（一次性，方案 §3.2）
        if (target.defending) {
            dmg = Math.max(1, Math.floor(dmg * 0.5));
            target.defending = false; // 一次性消耗
        }
        // 低等级(Lv1-4)无defend按钮，被动韧性减伤25%防秒杀；Lv5+有defend后取消
        // 条件：受击方=玩家宠物 且 等级<5 且 本回合未主动 defend（避免与主动防御叠加）
        if (target.side === 'player' && !activeDefended
            && typeof PetSystem !== 'undefined' && PetSystem.getState
            && PetSystem.getState().level < 5) {
            dmg = Math.max(1, Math.floor(dmg * 0.75));
        }
        target.hp = Math.max(0, target.hp - dmg);
        return { dmg: dmg, targetHp: target.hp };
    }

    /**
     * 敌方 AI（贪心，方案 §3.4）
     * 返回 action 对象：{ type, skillId? }
     *  - HP<30% 且 defend CD 好 → defend
     *  - ultimate CD 好 → ultimate
     *  - power_strike CD 好 → power_strike
     *  - 否则 attack
     */
    function _enemyDecide(self) {
        const hpRatio = self.maxHp > 0 ? self.hp / self.maxHp : 1;
        const findSkill = (id) => self.skills.find(s => s.id === id);
        const canUse = (sk) => sk && sk.currentCd <= 0;

        if (hpRatio < 0.3) {
            const defend = findSkill('defend');
            if (canUse(defend)) return { type: 'defend', skillId: 'defend' };
        }
        const ult = findSkill('ultimate');
        if (canUse(ult)) return { type: 'skill', skillId: 'ultimate' };
        const ps = findSkill('power_strike');
        if (canUse(ps)) return { type: 'skill', skillId: 'power_strike' };
        return { type: 'attack', skillId: 'attack' };
    }

    /**
     * 执行单个 actor 的一次行动（对 target）
     * 修改 actor/target 状态，push log，返回是否触发 faint（target hp<=0）
     * @param {object} actor 攻击方 combatant
     * @param {object} target 防守方 combatant
     * @param {object} action { type:'attack'|'skill'|'defend', skillId? }
     * @param {'player'|'enemy'} side actor 所属方
     */
    function _execAction(actor, target, action, side) {
        // defend：设置本方 defending 标志（下次受击减伤），不造伤
        if (action.type === 'defend') {
            actor.defending = true;
            const sk = actor.skills.find(s => s.id === (action.skillId || 'defend'));
            if (sk) sk.currentCd = sk.cd; // 进入 CD
            arenaState.log.push({
                actor: actor.id, side: side, action: 'defend',
                dmg: 0, targetHp: target.hp, faint: false, switch: false
            });
            return false;
        }

        // attack / skill → 取 skill 定义
        const skillId = action.skillId || (action.type === 'skill' ? 'power_strike' : 'attack');
        const sk = actor.skills.find(s => s.id === skillId) || SKILL_DEFS.attack;
        // CD 检查：技能在 CD 中 → 退化为普攻（容错，不阻塞）
        let usedSkill = sk;
        if (sk && sk.currentCd > 0) {
            usedSkill = actor.skills.find(s => s.id === 'attack') || SKILL_DEFS.attack;
        }
        const { dmg, targetHp } = _dealDamage(actor, target, usedSkill);
        // 进入 CD（普攻 cd=0 不影响）
        if (usedSkill && usedSkill.cd > 0) usedSkill.currentCd = usedSkill.cd;

        const faint = target.hp <= 0;
        arenaState.log.push({
            actor: actor.id, side: side, action: usedSkill.id,
            dmg: dmg, targetHp: targetHp, faint: faint, switch: false
        });
        return faint;
    }

    /**
     * 复活符标记触发：本方当前上场带 reviveFlag 且 hp<=0 → 按 pct 复活（消耗标记）
     * 在 _autoSwitchAfterFaint 之前调用，复活成功则不进入换人流程
     * @param {'player'|'enemy'} side
     * @returns {boolean} 是否触发了复活
     */
    function _triggerReviveFlagIfAny(side) {
        const team = (side === 'player') ? arenaState.player : arenaState.enemy;
        const activeIdx = (side === 'player') ? arenaState.activeP : arenaState.activeE;
        const c = team[activeIdx];
        if (c && c.hp <= 0 && c.reviveFlag) {
            const pct = c.reviveFlag.pct || 50;
            c.hp = Math.max(1, Math.floor(c.maxHp * pct / 100));
            arenaState.log.push({
                actor: c.id, side: side, action: 'itemUsed',
                dmg: 0, targetHp: c.hp, faint: false, switch: false,
                itemId: c.reviveFlag.itemId || 'battle_revive',
                name: '复活符（自动触发）', target: 'revive:auto'
            });
            c.reviveFlag = null;
            return true;
        }
        return false;
    }

    /**
     * 使用对战道具（竞技场专用，type:'battle'）
     * - heal_pct：本方上场宠物回 heal_pct% × maxHp（不超 maxHp）
     * - atk_buff：本方上场宠物 atkMult *= (1+atk_buff)（本战有效）
     * - def_buff：本方上场宠物 defMult *= (1+def_buff)（本战有效）
     * - dmg：对敌方上场宠物造成固定伤害（触发 faint 判定）
     * - revive_pct：若本方有阵亡替补，复活第一个（revive_pct% hp）；否则存 reviveFlag，下次阵亡自动触发
     * 校验：InventorySystem.getCount(itemId) > 0
     * 消耗：InventorySystem.removeItem(itemId, 1)
     * log：{ actor, side, action:'itemUsed', itemId, name, target, dmg?, heal? }
     * @param {'player'|'enemy'} side 使用方（PvP 由 operator 映射）
     * @param {string} itemId 对战道具 id
     * @returns {{ ok:boolean, error?:string, log?:object }} 处理结果
     */
    function _useBattleItem(side, itemId) {
        if (typeof InventorySystem === 'undefined' || !InventorySystem.getItemData) {
            return { ok: false, error: '背包系统未就绪' };
        }
        const data = InventorySystem.getItemData(itemId);
        if (!data || data.type !== 'battle') {
            return { ok: false, error: '非对战道具: ' + itemId };
        }
        if (InventorySystem.getCount(itemId) <= 0) {
            return { ok: false, error: data.name + ' 数量不足' };
        }

        const isPlayerSide = (side === 'player');
        const selfTeam = isPlayerSide ? arenaState.player : arenaState.enemy;
        const enemyTeam = isPlayerSide ? arenaState.enemy : arenaState.player;
        const selfActive = selfTeam[isPlayerSide ? arenaState.activeP : arenaState.activeE];
        const enemyActive = enemyTeam[isPlayerSide ? arenaState.activeE : arenaState.activeE];
        const eff = data.effect || {};
        const logEntry = {
            actor: selfActive.id, side: side, action: 'itemUsed',
            dmg: 0, targetHp: 0, faint: false, switch: false,
            itemId: itemId, name: data.name, target: ''
        };

        if (typeof eff.heal_pct === 'number') {
            const c = selfActive;
            if (c.hp > 0) {
                const before = c.hp;
                c.hp = Math.min(c.maxHp, c.hp + Math.floor(c.maxHp * eff.heal_pct / 100));
                logEntry.heal = c.hp - before;
                logEntry.target = 'self';
                logEntry.targetHp = c.hp;
            } else {
                return { ok: false, error: '上场宠物已倒下，无法回血' };
            }
        } else if (typeof eff.atk_buff === 'number') {
            if (selfActive.hp <= 0) return { ok: false, error: '上场宠物已倒下' };
            selfActive.atkMult = (selfActive.atkMult || 1) * (1 + eff.atk_buff);
            logEntry.target = 'self';
            logEntry.targetHp = selfActive.hp;
        } else if (typeof eff.def_buff === 'number') {
            if (selfActive.hp <= 0) return { ok: false, error: '上场宠物已倒下' };
            selfActive.defMult = (selfActive.defMult || 1) * (1 + eff.def_buff);
            logEntry.target = 'self';
            logEntry.targetHp = selfActive.hp;
        } else if (typeof eff.dmg === 'number') {
            const c = enemyActive;
            if (!c || c.hp <= 0) return { ok: false, error: '敌方上场已倒下' };
            const before = c.hp;
            c.hp = Math.max(0, c.hp - eff.dmg);
            logEntry.dmg = before - c.hp;
            logEntry.faint = c.hp <= 0;
            logEntry.target = 'enemy';
            logEntry.targetHp = c.hp;
        } else if (typeof eff.revive_pct === 'number') {
            // 复活符：先找阵亡替补复活；无阵亡则存 reviveFlag（下次阵亡自动触发）
            const faintedIdx = selfTeam.findIndex(c => c.hp <= 0);
            if (faintedIdx >= 0) {
                const c = selfTeam[faintedIdx];
                c.hp = Math.max(1, Math.floor(c.maxHp * eff.revive_pct / 100));
                logEntry.target = 'revive:' + faintedIdx;
                logEntry.targetHp = c.hp;
                logEntry.switch = true;
            } else {
                selfActive.reviveFlag = { pct: eff.revive_pct, itemId: itemId };
                logEntry.target = 'reviveFlag';
                logEntry.targetHp = selfActive.hp;
            }
        } else {
            return { ok: false, error: '未知对战道具效果' };
        }

        InventorySystem.removeItem(itemId, 1);
        arenaState.log.push(logEntry);
        return { ok: true, log: logEntry };
    }

    /**
     * 倒下后自动换人（不耗回合）
     * @param {'player'|'enemy'} side
     * @returns {boolean} 是否触发了换人
     */
    function _autoSwitchAfterFaint(side) {
        // 先判复活符标记：触发则 hp>0，跳过换人
        if (_triggerReviveFlagIfAny(side)) return false;
        if (side === 'player') {
            const fainted = _activeP();
            if (fainted.hp <= 0) {
                arenaState.log.push({
                    actor: fainted.id, side: 'player', action: 'faint',
                    dmg: 0, targetHp: 0, faint: true, switch: false
                });
                const next = _nextAliveIndex(arenaState.player, arenaState.activeP + 1);
                if (next != null) {
                    arenaState.activeP = next;
                    arenaState.log.push({
                        actor: _activeP().id, side: 'player', action: 'switch',
                        dmg: 0, targetHp: _activeP().hp, faint: false, switch: true
                    });
                    return true;
                }
            }
        } else {
            const fainted = _activeE();
            if (fainted.hp <= 0) {
                arenaState.log.push({
                    actor: fainted.id, side: 'enemy', action: 'faint',
                    dmg: 0, targetHp: 0, faint: true, switch: false
                });
                const next = _nextAliveIndex(arenaState.enemy, arenaState.activeE + 1);
                if (next != null) {
                    arenaState.activeE = next;
                    arenaState.log.push({
                        actor: _activeE().id, side: 'enemy', action: 'switch',
                        dmg: 0, targetHp: _activeE().hp, faint: false, switch: true
                    });
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * 回合末 CD tick（跳过本回合刚启动 CD 的技能）
     * @param {Set<string>} startedThisTurn 本回合进入 CD 的技能 key（actor.id + skillId）
     */
    function _cdTick(startedThisTurn) {
        const tickCombatant = (c) => {
            if (!c.skills) return;
            for (const sk of c.skills) {
                if (sk.currentCd > 0) {
                    const key = c.id + ':' + sk.id;
                    if (!startedThisTurn.has(key)) {
                        sk.currentCd = Math.max(0, sk.currentCd - 1);
                    }
                }
            }
        };
        arenaState.player.forEach(tickCombatant);
        arenaState.enemy.forEach(tickCombatant);
    }

    /**
     * 判胜负
     */
    function _resolveEnd() {
        if (_allFainted(arenaState.enemy)) {
            arenaState.status = 'win';
            arenaState.log.push({
                actor: 'system', side: 'system', action: 'battleEnd',
                dmg: 0, targetHp: 0, faint: false, switch: false, result: 'win'
            });
            return true;
        }
        if (_allFainted(arenaState.player)) {
            arenaState.status = 'lose';
            arenaState.log.push({
                actor: 'system', side: 'system', action: 'battleEnd',
                dmg: 0, targetHp: 0, faint: false, switch: false, result: 'lose'
            });
            return true;
        }
        return false;
    }

    /**
     * 玩家行动 → 敌方 AI 行动（或反序，由 spd 先手决定）
     * @param {object} action { type:'attack'|'skill'|'defend'|'switch', skillId?, switchIdx? }
     * @returns {object} arenaState
     *
     * switch：换人=耗本回合（不出招），activeP=switchIdx
     */
    function turn(action) {
        if (!arenaState || arenaState.status !== 'ongoing') {
            throw new Error('turn: 无进行中的对战');
        }
        if (!action || !action.type) {
            throw new Error('turn: 缺少 action.type');
        }

        const roundStartLogLen = arenaState.log.length;
        const startedThisTurn = new Set(); // 本回合进入 CD 的技能（CD tick 跳过）

        const p = _activeP();
        const e = _activeE();

        // ----- 使用对战道具：耗本回合，玩家不出招，敌方 AI 反击 -----
        if (action.type === 'item') {
            const res = _useBattleItem('player', action.itemId);
            if (!res.ok) {
                throw new Error('turn: ' + (res.error || '道具使用失败'));
            }
            // 道具致死敌方 → 自动换人 + 胜负判定（玩家不主动出招）
            if (res.log && res.log.faint) {
                _autoSwitchAfterFaint('enemy');
            }
            if (_resolveEnd()) { arenaState.round++; return arenaState; }
            // 敌方 AI 反击
            const ea = _enemyDecide(_activeE());
            _execAction(_activeE(), _activeP(), ea, 'enemy');
            if (ea.skillId && ea.type !== 'attack') {
                startedThisTurn.add(_activeE().id + ':' + ea.skillId);
            }
            // 玩方被反击致死 → 自动换人（_autoSwitchAfterFaint 内含 reviveFlag 触发）
            _autoSwitchAfterFaint('player');
            if (_resolveEnd()) { arenaState.round++; return arenaState; }
            _cdTick(startedThisTurn);
            arenaState.round++;
            return arenaState;
        }

        // ----- 玩家手动换人：耗本回合，不出招 -----
        if (action.type === 'switch') {
            const idx = action.switchIdx;
            if (typeof idx !== 'number' || idx < 0 || idx >= arenaState.player.length) {
                throw new Error('turn: switchIdx 非法');
            }
            if (idx === arenaState.activeP) {
                throw new Error('turn: 不能换成当前上场宠物');
            }
            if (arenaState.player[idx].hp <= 0) {
                throw new Error('turn: 不能换成已倒下的宠物');
            }
            const oldId = p.id;
            arenaState.activeP = idx;
            arenaState.log.push({
                actor: arenaState.player[idx].id, side: 'player', action: 'switch',
                dmg: 0, targetHp: arenaState.player[idx].hp, faint: false, switch: true,
                from: oldId
            });
            // 换人耗本回合 → 敌方 AI 仍行动一次（玩家本回合不出招）
            // 敌方对玩家新上场 combatant 攻击
            const enemyAction = _enemyDecide(e);
            _execAction(e, _activeP(), enemyAction, 'enemy');
            if (enemyAction.skillId) startedThisTurn.add(e.id + ':' + enemyAction.skillId);
            _autoSwitchAfterFaint('player');
            if (_resolveEnd()) { arenaState.round++; return arenaState; }

            _cdTick(startedThisTurn);
            arenaState.round++;
            return arenaState;
        }

        // ----- 普攻/技能/防御：按 spd 先手决定顺序 -----
        const order = BattleEngine.decideOrder(p.spd, e.spd); // 'A'=玩家先, 'B'=敌方先

        const playerAct = () => {
            const curP = _activeP();
            const curE = _activeE();
            // 玩家 defend/attack/skill
            const act = { type: action.type, skillId: action.skillId || (action.type === 'defend' ? 'defend' : 'attack') };
            _execAction(curP, curE, act, 'player');
            if (act.skillId && action.type !== 'attack') {
                startedThisTurn.add(curP.id + ':' + act.skillId);
            }
        };
        const enemyAct = () => {
            const curP = _activeP();
            const curE = _activeE();
            // 敌方已倒下则跳过（不会再行动）
            if (curE.hp <= 0) return;
            const ea = _enemyDecide(curE);
            _execAction(curE, curP, ea, 'enemy');
            if (ea.skillId && ea.type !== 'attack') {
                startedThisTurn.add(curE.id + ':' + ea.skillId);
            }
        };

        if (order === 'A') {
            playerAct();
            if (!_resolveEnd()) {
                _autoSwitchAfterFaint('enemy');
                if (!_resolveEnd()) enemyAct();
            }
        } else {
            enemyAct();
            if (!_resolveEnd()) {
                _autoSwitchAfterFaint('player');
                if (!_resolveEnd()) playerAct();
            }
        }

        // ----- 倒下自动换人 + 胜负判定 -----
        _autoSwitchAfterFaint('player');
        _autoSwitchAfterFaint('enemy');
        if (_resolveEnd()) { arenaState.round++; return arenaState; }

        // ----- 回合末 CD tick（跳过本回合启动的）-----
        _cdTick(startedThisTurn);
        arenaState.round++;
        return arenaState;
    }

    /**
     * PvP 本地热座回合：**仅当前操作方做 1 动作**，动作后切换 operator（A↔B）
     * - operator=A → 操作 player 方当前 combatant → 造伤 enemy 方 → 切换 operator=B
     * - operator=B → 操作 enemy 方当前 combatant → 造伤 player 方 → 切换 operator=A
     * - 动作类型：attack / skill / defend / switch（换人=本方换，不造伤，仍切 operator）
     * - HP 归零自动换人（被换方自己换，不耗 operator 回合）；全灭判胜负
     * - def/spd 接入：useDef:true 减伤；spd 仅决定首回合 operator（startBattlePvp 内已定）
     * @param {object} action { type:'attack'|'skill'|'defend'|'switch', skillId?, switchIdx? }
     * @returns {object} arenaState
     */
    function turnPvp(action) {
        if (!arenaState || arenaState.mode !== 'pvp') {
            throw new Error('turnPvp: 当前不是 PvP 对战');
        }
        if (arenaState.status !== 'ongoing') {
            throw new Error('turnPvp: 无进行中的对战');
        }
        if (!action || !action.type) {
            throw new Error('turnPvp: 缺少 action.type');
        }

        const op = arenaState.operator;   // 'A' | 'B'
        // 操作方 → 方位映射：A 操作 player 方，B 操作 enemy 方
        const opSide = (op === 'A') ? 'player' : 'enemy';
        const defSide = (op === 'A') ? 'enemy' : 'player';  // 防守方（被造伤方）
        const startedThisTurn = new Set();

        const opTeam = (opSide === 'player') ? arenaState.player : arenaState.enemy;
        const opActiveIdx = (opSide === 'player') ? arenaState.activeP : arenaState.activeE;
        const opActive = opTeam[opActiveIdx];

        // ----- 使用对战道具：作用于操作方当前 combatant，耗本操作方回合 → 切 operator -----
        if (action.type === 'item') {
            const res = _useBattleItem(opSide, action.itemId);
            if (!res.ok) {
                throw new Error('turnPvp: ' + (res.error || '道具使用失败'));
            }
            // 道具致死防守方 → 自动换人（_autoSwitchAfterFaint 内含 reviveFlag）
            const defSideForItem = (opSide === 'player') ? 'enemy' : 'player';
            if (res.log && res.log.faint) {
                _autoSwitchAfterFaint(defSideForItem);
            }
            _pvpEndTurnTick(startedThisTurn);
            _pvpCheckEnd();
            if (arenaState.status !== 'ongoing') {
                arenaState.round++;
                return arenaState;
            }
            _pvpSwitchOperator();
            if (arenaState.status === 'ongoing') {
                arenaState.log.push({
                    actor: 'system', side: 'system', action: 'pvpTurnStart',
                    dmg: 0, targetHp: 0, faint: false, switch: false,
                    operator: arenaState.operator
                });
            }
            arenaState.round++;
            return arenaState;
        }

        // ----- 换人：本方换人（不造伤），仍耗本操作方回合 → 切 operator -----
        if (action.type === 'switch') {
            const idx = action.switchIdx;
            if (typeof idx !== 'number' || idx < 0 || idx >= opTeam.length) {
                throw new Error('turnPvp: switchIdx 非法');
            }
            if (idx === opActiveIdx) {
                throw new Error('turnPvp: 不能换成当前上场宠物');
            }
            if (opTeam[idx].hp <= 0) {
                throw new Error('turnPvp: 不能换成已倒下的宠物');
            }
            if (opSide === 'player') arenaState.activeP = idx;
            else arenaState.activeE = idx;
            arenaState.log.push({
                actor: opTeam[idx].id, side: opSide, action: 'switch',
                dmg: 0, targetHp: opTeam[idx].hp, faint: false, switch: true
            });
            // 换人结束本操作方回合
            _pvpEndTurnTick(startedThisTurn);
            _pvpSwitchOperator();
            _pvpCheckEnd();
            if (arenaState.status === 'ongoing') {
                arenaState.log.push({
                    actor: 'system', side: 'system', action: 'pvpTurnStart',
                    dmg: 0, targetHp: 0, faint: false, switch: false,
                    operator: arenaState.operator
                });
            }
            arenaState.round++;
            return arenaState;
        }

        // ----- 攻击/技能/防御：操作方对防守方当前 combatant 出招 -----
        const defTeam = (defSide === 'player') ? arenaState.player : arenaState.enemy;
        const defActiveIdx = (defSide === 'player') ? arenaState.activeP : arenaState.activeE;
        const defActive = defTeam[defActiveIdx];

        // defend：设置本方 defending（不造伤），仍切 operator
        // attack/skill：对防守方当前 combatant 造伤
        const act = { type: action.type, skillId: action.skillId || (action.type === 'defend' ? 'defend' : 'attack') };
        _execAction(opActive, defActive, act, opSide);
        if (act.skillId && action.type !== 'attack') {
            startedThisTurn.add(opActive.id + ':' + act.skillId);
        }

        // 防守方倒下 → 自动换人（防守方自己换，不耗 operator 回合）
        if (defActive.hp <= 0) {
            _autoSwitchAfterFaint(defSide);
        }

        // 本操作方回合结束
        _pvpEndTurnTick(startedThisTurn);
        _pvpSwitchOperator();
        _pvpCheckEnd();
        if (arenaState.status === 'ongoing') {
            arenaState.log.push({
                actor: 'system', side: 'system', action: 'pvpTurnStart',
                dmg: 0, targetHp: 0, faint: false, switch: false,
                operator: arenaState.operator
            });
        }
        arenaState.round++;
        return arenaState;
    }

    /**
     * PvP 辅助：回合末 CD tick（所有 6 只 combatant，跳过本回合启动的）
     */
    function _pvpEndTurnTick(startedThisTurn) {
        const tick = (c) => {
            if (!c.skills) return;
            for (const sk of c.skills) {
                if (sk.currentCd > 0) {
                    const key = c.id + ':' + sk.id;
                    if (!startedThisTurn.has(key)) {
                        sk.currentCd = Math.max(0, sk.currentCd - 1);
                    }
                }
            }
        };
        arenaState.player.forEach(tick);
        arenaState.enemy.forEach(tick);
    }

    /**
     * PvP 辅助：切换操作方 A↔B
     */
    function _pvpSwitchOperator() {
        arenaState.operator = (arenaState.operator === 'A') ? 'B' : 'A';
    }

    /**
     * PvP 辅助：判胜负（win = 玩家A 胜，lose = 玩家A 负/玩家B 胜）
     * 兼容现有 _showResult 逻辑：enemy 全灭 → win；player 全灭 → lose
     */
    function _pvpCheckEnd() {
        if (_allFainted(arenaState.enemy)) {
            // enemy 方（玩家B）全灭 → 玩家A 胜
            arenaState.status = 'win';
            arenaState.log.push({
                actor: 'system', side: 'system', action: 'battleEnd',
                dmg: 0, targetHp: 0, faint: false, switch: false,
                result: 'win', pvpWinner: 'A'
            });
        } else if (_allFainted(arenaState.player)) {
            // player 方（玩家A）全灭 → 玩家B 胜
            arenaState.status = 'lose';
            arenaState.log.push({
                actor: 'system', side: 'system', action: 'battleEnd',
                dmg: 0, targetHp: 0, faint: false, switch: false,
                result: 'lose', pvpWinner: 'B'
            });
        }
    }

    /**
     * 获取当前对战状态
     */
    function getState() {
        return arenaState;
    }

    /**
     * 重置：清空选队 + 对战状态
     */
    function reset() {
        playerTeam = null;
        arenaState = null;
        pvpTeamA = null;
        pvpTeamB = null;
    }

    // Public API
    return {
        selectTeam,
        selectTeamPvp,
        startBattle,
        startBattlePvp,
        turn,
        turnPvp,
        getState,
        reset,
        // 暴露常量供 UI/测试查阅
        TEAM_SIZE,
        // 暴露技能定义供 UI/测试查阅
        SKILL_DEFS
    };
})();

window.CardArena = CardArena;
