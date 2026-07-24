/**
 * battle-engine.js - 通用战斗纯计算引擎（mode 无关：无状态/无副作用/无掉落）
 *
 * 设计（方案 docs/方案/2026-07-01-卡牌对战-方案.md §4 架构分层）：
 *   - 只做纯战斗计算（伤害/先手/combatant 工厂），不碰掉落/EXP/showEnding/CardCollection/UI
 *   - 探索(1v1) + 卡牌对战(3v3) 共用
 *   - def/spd 接入由 useDef 参数控制（探索默认 false 保现状，卡牌对战 true）
 *
 * 探索兼容：calcDamage 默认 useDef=false 时，公式与原 exploration.js battleTurn 完全一致（不回归）。
 */
const BattleEngine = (function () {

    /**
     * 伤害计算（纯函数）
     * @param {number} atk 攻击力
     * @param {number} def 防御力（useDef=true 时减伤 atk - def/2）
     * @param {object} opts { mult=1 倍率, useDef=false 是否启用 def 减伤, randMax=3 随机上界, randSub=1 随机减数 }
     * @returns {number} 伤害（>=1）
     *
     * 探索现状对齐：
     *   普攻 calcDamage(atk,def,{})            = max(1, atk + rand(0..2) - 1)   ← exploration.js:398
     *   技能 calcDamage(atk,def,{mult,randSub:0}) = max(1, floor(atk*mult) + rand(0..2)) ← exploration.js:384
     *   反击 calcDamage(atk,def,{randMax:2})   = max(1, atk + rand(0..1) - 1)   ← exploration.js:437
     * 卡牌对战启用 def：useDef=true → base = max(1, atk - floor(def/2))
     */
    function calcDamage(atk, def, opts = {}) {
        const { mult = 1, useDef = false, randMax = 3, randSub = 1 } = opts;
        const base = useDef ? Math.max(1, atk - Math.floor(def / 2)) : atk;
        return Math.max(1, Math.floor(base * mult) + Math.floor(Math.random() * randMax) - randSub);
    }

    /**
     * 先手判定（spd 高者先；平手 tieGoesA=true 则 A 先）
     * @returns 'A' | 'B'
     */
    function decideOrder(spdA, spdB, tieGoesA = true) {
        if (spdA > spdB) return 'A';
        if (spdB > spdA) return 'B';
        return tieGoesA ? 'A' : 'B';
    }

    /**
     * combatant 工厂（宠物/怪物统一抽象，3v3 用）
     * side: 'player' | 'enemy'
     */
    function makeCombatant(o) {
        const hp = o.hp != null ? o.hp : (o.maxHp || 0);
        return {
            id: o.id,
            name: o.name || o.id,
            img: o.img || '',
            side: o.side || 'player',
            level: o.level || 1,
            hp: hp,
            maxHp: o.maxHp || hp,
            atk: o.atk || 0,
            def: o.def || 0,
            spd: o.spd || 0,
            skills: Array.isArray(o.skills) ? o.skills : [],
            defending: false
        };
    }

    return { calcDamage, decideOrder, makeCombatant };
})();
window.BattleEngine = BattleEngine;
