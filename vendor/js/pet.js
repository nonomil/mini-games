/**
 * pet.js - 宠物养成核心系统 v2.0
 * 负责：宠物状态管理、等级/经验/HP、阶段进化、行动(喂食/玩耍/休息)
 * 
 * 宠物数据库来源：
 *   - pet-bank 原生 8 种（经典系列）
 *   - 仓鼠大冒险 91 种（灵兽族/星瞳族/绮梦族/萌肖族/酷肖族 等 12 系列）
 *   - classpet-pro1.0 40 种（萌宠风/幻想风/像素风/科幻风/国潮风 5 风格）
 *   - 班宠乐园2 动物与植物扩展（萌爪伙伴族/甜芽花园族）
 * 
 * 数据文件：data/pets.json（以 total 字段为准）
 */

const PetSystem = (function () {
    // 宠物阶段配置（对应 imageStages 索引）
    // banchong 宠物：6阶段（0蛋→5完全体）
    // PVZ 宠物：5阶段（蛋→幼崽→成长期→完全体→终极体）
    // classpet 宠物：4阶段（emoji）
    const STAGES = [
        { min_level: 1, name: '蛋',     emoji: '🥚', stageIdx: 0 },
        { min_level: 3, name: '幼崽',   emoji: '🐣', stageIdx: 1 },
        { min_level: 5, name: '成长期', emoji: '🐥', stageIdx: 2 },
        { min_level: 8, name: '完全体', emoji: '🦅', stageIdx: 3 },
        { min_level: 15, name: '终极体', emoji: '👑', stageIdx: 4 },
    ];

    // 等级经验表
    const EXP_TABLE = [0, 30, 80, 150, 250, 400, 600, 850, 1200, 1600, 2100, 2700, 3400, 4200, 5100];
    const MAX_LEVEL = 15;

    // 稀有度配置
    const RARITY = {
        common:    { name: '普通', color: '#95a5a6', icon: '⚪' },
        rare:      { name: '稀有', color: '#3498db', icon: '🔵' },
        epic:      { name: '史诗', color: '#9b59b6', icon: '🟣' },
        legendary: { name: '传说', color: '#f39c12', icon: '🟡' }
    };

    // 宠物种类数据库（从 data/pets.json 动态加载）
    // 内置 fallback PVZ 宠物
    const SPECIES_FALLBACK = [
        { id: 'dog', name: '豌豆射手', emoji: '🫛', desc: '发射豌豆攻击，入门级植物', base_hp: 110, base_atk: 7 },
        { id: 'cat', name: '向日葵', emoji: '🌻', desc: '产出阳光资源，不可或缺', base_hp: 95, base_atk: 6 },
        { id: 'rabbit', name: '坚果墙', emoji: '🥜', desc: '防御力超强，守护前线', base_hp: 130, base_atk: 5 },
        { id: 'turtle', name: '大嘴花', emoji: '🪴', desc: '一口吞僵尸，攻击力惊人', base_hp: 80, base_atk: 12 },
        { id: 'hamster', name: '寒冰射手', emoji: '❄️', desc: '冰冻减速敌人，控制型', base_hp: 70, base_atk: 4 },
        { id: 'parrot', name: '双发射手', emoji: '🔫', desc: '双倍火力输出，DPS之王', base_hp: 85, base_atk: 9 },
        { id: 'goldfish', name: '樱桃炸弹', emoji: '🍒', desc: '范围爆炸伤害，一击必杀', base_hp: 75, base_atk: 3 },
        { id: 'hedgehog', name: '机枪豌豆', emoji: '🟢', desc: '四管齐射，火力压制', base_hp: 90, base_atk: 8 }
    ];

    let SPECIES = [...SPECIES_FALLBACK];
    let PET_DB_LOADED = false;
    let PET_DB_LOAD_PROMISE = null;
    let PET_RUNTIME_INDEX_LOADED = false;
    let PET_RUNTIME_INDEX_LOAD_PROMISE = null;
    let ALL_SERIES = {};

    // 当前宠物状态
    let state = {
        species: null,           // 种类 id
        level: 1,                // 等级
        exp: 0,                  // 当前经验
        hp: 100,                 // 当前 HP
        max_hp: 100,             // 最大 HP
        atk: 5,                  // 攻击力
        def: 0,                  // 防御力（卡牌展示，P4 可选接入战斗）
        spd: 0,                  // 速度（卡牌展示，P4 可选接入战斗）
        wins: 0,                 // 战斗胜利数
        explorations: 0,         // 探索次数
        days_cared: 0,           // 陪伴天数
        weapon: null,            // 装备武器
        armor: null,             // 装备护甲
        last_action_time: null,  // 上次行动时间
        happiness: 100,          // 快乐度
        hunger: 100,             // 饱食度（新增，宠物小屋 §5.3）
        intimacy: 0,             // 亲密度（新增，宠物小屋 §5.3）
        cleanliness: 50,         // 清洁度（新增隐藏维度，方案 §4.5，不进五维条）
        last_home_ts: null,      // 上次离开宠物小屋的 unix 秒（新增，decay 结算基准）
        pet_id: null,            // 宠物实例 ID：故事、回顾等跨模块进度的稳定作用域
        // 战斗深化（设计稿 DESIGN-2026-06-29-02）
        skills: ['power_strike', 'defend', 'ultimate'],  // 已开放技能 id
        defending: false,        // 防御态：下回合受击减伤 50%（一次性）
        // cooldowns 不持久化（每场战斗重置），仅运行期由 ExplorationSystem.startBattle 设置
    };
    // 技能 CD（战斗内 tracking，不写 localStorage）
    let cooldowns = {};
    // 技能定义表（data/skills.json）
    let skillsData = null;

    function createPetId() {
        return `pet_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    // 加载保存的状态
    function load() {
        const saved = localStorage.getItem('petbank_pet');
        if (saved) {
            try {
                state = Object.assign(state, JSON.parse(saved));
            } catch (e) {
                console.error('Pet state load failed:', e);
            }
        }
        // 旧档兼容：def/spd 缺失时从 species 回填（P1 新增字段）
        if (state.species && (state.def == null || state.spd == null)) {
            const sp = SPECIES.find(s => s.id === state.species);
            if (sp) {
                if (state.def == null) state.def = sp.base_def || 0;
                if (state.spd == null) state.spd = sp.base_spd || 0;
            }
        }
        if (state.species && !state.pet_id) {
            state.pet_id = createPetId();
            save();
        }
    }

    // 保存状态
    function save() {
        localStorage.setItem('petbank_pet', JSON.stringify(state));
        if (window.ProfileManager && typeof window.ProfileManager.requestHighPrioritySync === 'function') {
            window.ProfileManager.requestHighPrioritySync('pet');
        }
    }

    // 选择宠物
    function chooseSpecies(speciesId) {
        const species = SPECIES.find(s => s.id === speciesId);
        if (!species) return false;
        state.species = speciesId;
        state.species_data = species;
        state.max_hp = species.base_hp;
        state.hp = species.base_hp;
        state.atk = species.base_atk;
        state.def = species.base_def || 0;
        state.spd = species.base_spd || 0;
        state.level = 1;       // 从蛋开始
        state.exp = 0;
        state.wins = 0;
        state.explorations = 0;
        state.days_cared = 0;
        state.weapon = null;
        state.armor = null;
        state.happiness = 100;
        state.evolution_stage = 0;  // 0=蛋
        state.hunger = 100;
        state.intimacy = 0;
        state.cleanliness = 50;
        state.last_home_ts = null;
        state.pet_id = createPetId();
        save();
        return true;
    }

    function getCurrentSpeciesData() {
        if (!state.species) return null;
        const catalogSpecies = SPECIES.find(s => s.id === state.species) || null;
        const savedSpecies = state.species_data && state.species_data.id === state.species
            ? state.species_data
            : null;
        if (!catalogSpecies) return savedSpecies;
        if (!savedSpecies) return catalogSpecies;
        return Object.assign({}, savedSpecies, catalogSpecies, {
            imageUrl: catalogSpecies.imageUrl || savedSpecies.imageUrl || '',
            imageStages: catalogSpecies.imageStages || savedSpecies.imageStages || null,
            imageStyle: catalogSpecies.imageStyle || savedSpecies.imageStyle || ''
        });
    }

    // 获取当前阶段
    function getCurrentStage() {
        let current = STAGES[0];
        for (const stage of STAGES) {
            if (state.level >= stage.min_level) {
                current = stage;
            }
        }
        return current;
    }

    // 获取当前进化阶段索引（映射到 imageStages）
    function getEvolutionStageIndex() {
        const stage = getCurrentStage();
        return stage.stageIdx || 0;
    }

    // 根据当前阶段获取宠物图片URL
    function getCurrentStageImage() {
        if (!state.species) return null;
        const species = getCurrentSpeciesData();
        if (!species || !species.imageStages) return species.imageUrl || null;
        const idx = getEvolutionStageIndex();
        const key = String(idx);
        return species.imageStages[key] || species.imageUrl || null;
    }

    // 获取当前阶段 emoji
    function getStageEmoji() {
        if (!state.species) return '🥚';
        const species = getCurrentSpeciesData();
        if (!species) return '🥚';
        // Lv 1-2: 蛋；Lv 3-4: 物种 emoji 缩小版；Lv 5+: 完整
        if (state.level < 3) return '🥚';
        if (state.level < 5) return species.emoji; // 幼崽用原 emoji
        return species.emoji;
    }

    // 增加经验值（升级处理）
    function addExp(amount) {
        if (state.level >= MAX_LEVEL) return { leveled_up: false };
        state.exp += amount;
        let leveled_up = false;
        while (state.level < MAX_LEVEL && state.exp >= EXP_TABLE[state.level]) {
            state.exp -= EXP_TABLE[state.level];
            state.level += 1;
            // 升级提升属性
            state.max_hp += 15;
            state.hp = Math.min(state.hp + 30, state.max_hp);
            state.atk += 2;
            // 更新进化阶段
            state.evolution_stage = getEvolutionStageIndex();
            leveled_up = true;
        }
        if (state.level >= MAX_LEVEL) state.exp = 0;
        save();
        return { leveled_up, new_level: state.level };
    }

    // 受到伤害
    // options.applyDefend=true（战斗敌人攻击时）：若 state.defending 为真，伤害×0.5 并清除 defending（一次性）
    function takeDamage(amount, options = {}) {
        let dmg = amount;
        if (options && options.applyDefend === true && state.defending) {
            dmg = Math.max(1, Math.floor(dmg * 0.5));
            state.defending = false;  // 一次性，用后清除
        }
        state.hp = Math.max(0, state.hp - dmg);
        save();
        return state.hp <= 0;
    }

    // 治疗
    function heal(amount) {
        state.hp = Math.min(state.max_hp, state.hp + amount);
        save();
    }

    // 喂食
    // options.homeContext === true：宠物小屋调用，走新语义（spendPoints(10) 扣分 + 饱食/exp/happiness）
    // 不传 homeContext：app.js feedPet 旧入口，走旧语义（仅 heal，不扣分/不加饱食），保留宠物养成页回血行为
    function feed(foodItem, options = {}) {
        if (!state.species) return { success: false, msg: '请先选择一只宠物' };
        if (state.hp <= 0) return { success: false, msg: '宠物需要先复活' };

        // 新语义：宠物小屋喂食（扣 10 分 + 饱食/exp/happiness）
        if (options && options.homeContext === true) {
            if (typeof window.spendPoints !== 'function' || !window.spendPoints(10)) {
                return { success: false, msg: '积分不足（需 10 分）' };
            }
            state.hunger = Math.min(100, state.hunger + 25);
            addExp(10);
            state.happiness = Math.min(100, state.happiness + 5);
            let extraMsg = '';
            if (foodItem && foodItem.effect && foodItem.effect.hp) {
                heal(foodItem.effect.hp);
                extraMsg = `，额外恢复 ${foodItem.effect.hp} HP`;
            }
            save();
            return { success: true, msg: `喂食成功！饱食 +25，经验 +10${extraMsg}` };
        }

        // 旧语义：仅 heal（兼容 app.js feedPet 702/706 旧入口）
        const healAmount = (foodItem && foodItem.effect && foodItem.effect.hp) || 20;
        heal(healAmount);
        state.happiness = Math.min(100, state.happiness + 5);
        save();
        return { success: true, msg: `喂食成功！恢复 ${healAmount} HP` };
    }

    // 玩耍（F4：旧入口 playWithPet 保留走新逻辑，自动获得 exp+5/intimacy+5）
    function play() {
        if (!state.species) return { success: false, msg: '请先选择一只宠物' };
        if (state.hp <= 0) return { success: false, msg: '宠物需要先复活' };
        if (state.hp < 10) return { success: false, msg: 'HP 太低，不能玩耍（先去探索或休息）' };
        state.happiness = Math.min(100, state.happiness + 15);
        state.hp -= 5; // 玩耍消耗体力
        state.intimacy = (state.intimacy || 0) + 5; // 亲密 +5
        addExp(5);
        save();
        return { success: true, msg: '玩耍成功！快乐 +15，亲密 +5，经验 +5' };
    }

    // 休息（F4：旧入口 restPet 保留走新逻辑，自动获得 intimacy+2）
    function rest() {
        if (!state.species) return { success: false, msg: '请先选择一只宠物' };
        heal(Math.floor(state.max_hp * 0.3));
        state.happiness = Math.max(0, state.happiness - 5);
        state.intimacy = (state.intimacy || 0) + 2; // 治疗涨亲密
        save();
        return { success: true, msg: '休息成功！恢复 30% HP，亲密 +2' };
    }

    // 复活
    function revive(hpPercent = 50) {
        if (state.hp > 0) return { success: false, msg: '宠物不需要复活' };
        state.hp = Math.floor(state.max_hp * hpPercent / 100);
        save();
        return { success: true, msg: `复活成功！恢复 ${hpPercent}% HP` };
    }

    // 洗澡（宠物小屋 §4.5）：清洁 +30 / 快乐 +5
    function bath(options = {}) {
        if (!state.species) return { success: false, msg: '请先选择一只宠物' };
        if (state.hp <= 0) return { success: false, msg: '宠物需要先复活' };
        state.cleanliness = Math.min(100, (state.cleanliness ?? 50) + 30);
        state.happiness = Math.min(100, state.happiness + 5);
        save();
        return { success: true, msg: '洗澡成功！清洁 +30，快乐 +5' };
    }

    // 统一亲密度入口，供奖励事件和小屋照料使用。
    function addIntimacy(amount) {
        const delta = Math.max(0, Math.floor(Number(amount) || 0));
        if (!delta) return state.intimacy || 0;
        state.intimacy = Math.max(0, (state.intimacy || 0) + delta);
        save();
        return state.intimacy;
    }

    // 衰减结算（宠物小屋 §4.2，R4：单结算）
    // 触发点：init() 补算、home renderUI 进入结算
    // 三连守卫：ts 无效 / 未来时间 → hours=0 不扣；结算后立即写 last_home_ts=now 保证幂等
    function decay() {
        const now = Math.floor(Date.now() / 1000);
        const ts = state.last_home_ts;
        let hours = 0;
        if (!ts || isNaN(ts) || ts <= 0 || ts > now) {
            hours = 0;
        } else {
            hours = Math.max(0, Math.floor((now - ts) / 3600));
        }
        if (hours >= 1) {
            // 每小时：饱食 -2 / 快乐 -1 / 清洁 -1
            state.hunger = Math.max(0, state.hunger - hours * 2);
            state.happiness = Math.max(0, state.happiness - hours * 1);
            state.cleanliness = Math.max(0, (state.cleanliness ?? 50) - hours * 1);
            // 饱食归零后 HP -5/小时
            if (state.hunger <= 0) {
                state.hp = Math.max(0, state.hp - hours * 5);
            }
        }
        // 结算后立即写 ts（R4 防双结算：后续 renderUI 再算时 hours=0）
        state.last_home_ts = now;
        save();
        return { hours, applied: hours >= 1 };
    }

    // 标记离开宠物小屋（写入 last_home_ts，下次进入结算）
    function markHomeExit() {
        state.last_home_ts = Math.floor(Date.now() / 1000);
        save();
    }

    // 计算总攻击力（含装备）
    function getTotalAtk() {
        let total = state.atk;
        if (state.weapon && state.weapon.effect?.atk) {
            total += state.weapon.effect.atk;
        }
        return total;
    }

    // 防御力（基础 + 护甲加成预留）
    function getTotalDef() {
        let total = state.def || 0;
        if (state.armor && state.armor.effect?.def) {
            total += state.armor.effect.def;
        }
        return total;
    }

    // 速度（基础，暂无装备加成）
    function getTotalSpd() {
        return state.spd || 0;
    }

    // ============ 战斗深化：技能 / CD / 防御 ============
    // 加载技能定义表 data/skills.json
    async function loadSkills() {
        if (skillsData) return skillsData;
        try {
            const resp = await fetch(window.resolvePetBankAssetUrl ? window.resolvePetBankAssetUrl('data/skills.json') : 'data/skills.json');
            if (!resp.ok) {
                throw new Error(`HTTP ${resp.status}`);
            }
            skillsData = await resp.json();
            return skillsData;
        } catch (e) {
            console.warn('Failed to load skills.json:', e);
            return { version: '1.0', skills: [] };
        }
    }

    // 获取技能定义表
    function getSkillsData() {
        return skillsData;
    }

    // 获取单个技能定义
    function getSkill(skillId) {
        return skillsData?.skills?.find(s => s.id === skillId) || null;
    }

    // 玩家已开放技能 id 列表
    function getSkills() {
        return Array.isArray(state.skills) ? [...state.skills] : [];
    }

    // 当前 CD 剩余回合（0 = 可用）
    function getCooldown(skillId) {
        return cooldowns[skillId] || 0;
    }

    // 启动技能 CD
    function startCooldown(skillId, cd) {
        cooldowns[skillId] = Math.max(0, cd);
    }

    // 每回合结束递减所有 CD（最小 0）
    // exclude: 本回合刚启动 CD 的技能 id 数组，跳过本次递减（保证 CD=N 真正封禁 N 回合）
    function tickCooldowns(exclude = []) {
        const skip = Array.isArray(exclude) ? new Set(exclude) : new Set();
        for (const id in cooldowns) {
            if (skip.has(id)) continue;
            cooldowns[id] = Math.max(0, cooldowns[id] - 1);
        }
    }

    // 技能是否可用（已开放 + CD 为 0）
    function canUseSkill(skillId) {
        if (!Array.isArray(state.skills) || !state.skills.includes(skillId)) return false;
        return getCooldown(skillId) <= 0;
    }

    // 每场战斗开始重置 CD（设计稿 §9：CD 不持久化，每场重置）
    function resetBattleState() {
        cooldowns = {};
        state.defending = false;
        save();
    }

    // 设置/读取防御态（战斗用）
    function setDefending(v) {
        state.defending = !!v;
    }
    function isDefending() {
        return !!state.defending;
    }

    // 计算总最大 HP（含装备）
    function getTotalMaxHp() {
        let total = state.max_hp;
        if (state.armor && state.armor.effect?.max_hp) {
            total += state.armor.effect.max_hp;
        }
        return total;
    }

    // 装备物品
    function equip(item) {
        if (item.type !== 'equip') return { success: false, msg: '这不是装备' };
        if (item.slot === 'weapon') {
            state.weapon = item;
        } else if (item.slot === 'armor') {
            state.armor = item;
        }
        // 重新计算 HP 上限
        const newMaxHp = getTotalMaxHp();
        if (newMaxHp > state.max_hp) state.hp += (newMaxHp - state.max_hp);
        state.max_hp = newMaxHp;
        save();
        return { success: true, msg: `已装备 ${item.name}` };
    }

    // 卸下装备
    function unequip(slot) {
        if (slot === 'weapon') state.weapon = null;
        else if (slot === 'armor') state.armor = null;
        const newMaxHp = getTotalMaxHp();
        if (state.hp > newMaxHp) state.hp = newMaxHp;
        state.max_hp = newMaxHp;
        save();
    }

    // 增加探索次数
    function addExploration() {
        state.explorations += 1;
        state.days_cared += 1;
        save();
    }

    // 战斗胜利
    function addWin() {
        state.wins += 1;
        save();
    }

    // 获取状态快照
    function getState() {
        return Object.assign({}, state, {
            stage: getCurrentStage(),
            stage_emoji: getStageEmoji(),
            species_data: getCurrentSpeciesData(),
            total_atk: getTotalAtk(),
            total_max_hp: getTotalMaxHp()
        });
    }

    function getStageSignature(pet) {
        if (!Array.isArray(pet?.stages) || pet.stages.length === 0) return '';
        return pet.stages.map((stage) => stage?.imageUrl || '').join('|');
    }

    const MULTI_STAGE_IMAGE_SOURCES = new Set(['banchong', 'banchong2', 'banchong2_plant']);

    function normalizeSpeciesMedia(pets) {
        const mappedBySignature = new Map();

        for (const pet of pets) {
            const signature = getStageSignature(pet);
            if (!signature) continue;
            if (!pet.imageUrl || !pet.imageStages) continue;
            mappedBySignature.set(signature, {
                imageUrl: pet.imageUrl,
                imageStages: pet.imageStages,
                imageStyle: pet.imageStyle || (MULTI_STAGE_IMAGE_SOURCES.has(pet.source) ? 'banchong' : '')
            });
        }

        return pets.map((pet) => {
            const normalized = {
                id: pet.id,
                name: pet.name,
                emoji: pet.emoji || '🐾',
                desc: pet.desc || '',
                base_hp: pet.base_hp || 100,
                base_atk: pet.base_atk || 5,
                base_def: pet.base_def || 0,
                base_spd: pet.base_spd || 0,
                series: pet.series,
                rarity: pet.rarity || 'common',
                source: pet.source,
                stages: pet.stages,
                imageUrl: pet.imageUrl || '',
                imageStages: pet.imageStages || null,
                imageStyle: pet.imageStyle || ''
            };

            if ((!normalized.imageUrl || !normalized.imageStages) && MULTI_STAGE_IMAGE_SOURCES.has(normalized.source)) {
                const inherited = mappedBySignature.get(getStageSignature(pet));
                if (inherited) {
                    normalized.imageUrl = normalized.imageUrl || inherited.imageUrl;
                    normalized.imageStages = normalized.imageStages || inherited.imageStages;
                    normalized.imageStyle = normalized.imageStyle || inherited.imageStyle;
                }
            }

            return normalized;
        });
    }

    function resolveJsonAsset(path) {
        return typeof window.resolvePetBankAssetUrl === 'function'
            ? window.resolvePetBankAssetUrl(path)
            : path;
    }

    function fetchPetJson(path) {
        if (window.PetBankAssetLoader && typeof window.PetBankAssetLoader.fetchJson === 'function') {
            return window.PetBankAssetLoader.fetchJson(path);
        }
        return fetch(resolveJsonAsset(path)).then((resp) => {
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return resp.json();
        });
    }

    // 探索/地图只需要战斗与展示元数据，不应阻塞在完整图鉴上。
    async function loadPetRuntimeIndex() {
        if (PET_DB_LOADED || PET_RUNTIME_INDEX_LOADED) return true;
        if (PET_RUNTIME_INDEX_LOAD_PROMISE) return PET_RUNTIME_INDEX_LOAD_PROMISE;
        PET_RUNTIME_INDEX_LOAD_PROMISE = (async function() {
            try {
                const db = await fetchPetJson('data/pets-runtime-index.json');
                if (Array.isArray(db.flat) && db.flat.length > SPECIES_FALLBACK.length) {
                    SPECIES = normalizeSpeciesMedia(db.flat);
                    PET_RUNTIME_INDEX_LOADED = true;
                    return true;
                }
                return false;
            } catch (e) {
                console.warn('[PetDB] Failed to load pets-runtime-index.json:', e);
                return false;
            } finally {
                if (!PET_RUNTIME_INDEX_LOADED) PET_RUNTIME_INDEX_LOAD_PROMISE = null;
            }
        })();
        return PET_RUNTIME_INDEX_LOAD_PROMISE;
    }

    // 加载外部完整宠物数据库（data/pets.json），供图鉴/选择器/卡牌使用。
    async function loadPetDB() {
        if (PET_DB_LOADED) return true;
        if (PET_DB_LOAD_PROMISE) return PET_DB_LOAD_PROMISE;
        PET_DB_LOAD_PROMISE = (async function() {
            try {
                const db = await fetchPetJson('data/pets.json');
                if (db.flat && db.flat.length > SPECIES_FALLBACK.length) {
                    SPECIES = normalizeSpeciesMedia(db.flat);
                    ALL_SERIES = db.series || {};
                    PET_DB_LOADED = true;
                    console.log(`[PetDB] Loaded ${SPECIES.length} pets, ${Object.keys(ALL_SERIES).length} series`);
                }
                return PET_DB_LOADED;
            } catch (e) {
                console.warn('[PetDB] Failed to load pets.json:', e);
                return false;
            } finally {
                if (!PET_DB_LOADED) PET_DB_LOAD_PROMISE = null;
            }
        })();
        return PET_DB_LOAD_PROMISE;
    }

    // 获取所有种类
    function getAllSpecies() {
        return SPECIES;
    }

    // 按系列分组获取宠物
    function getAllSpeciesBySeries() {
        const groups = {};
        for (const p of SPECIES) {
            const s = p.series || '经典';
            if (!groups[s]) groups[s] = [];
            groups[s].push(p);
        }
        return groups;
    }

    // 按稀有度获取宠物
    function getSpeciesByRarity(rarity) {
        return SPECIES.filter(p => (p.rarity || 'common') === rarity);
    }

    // 获取稀有度配置
    function getRarityConfig() {
        return RARITY;
    }

    // 获取系列列表
    function getAllSeries() {
        return ALL_SERIES;
    }

    // 数据库是否已加载
    function isDBLoaded() {
        return PET_DB_LOADED;
    }

    // 公开 API
    return {
        load, save, chooseSpecies, getCurrentStage, getStageEmoji,
        getEvolutionStageIndex, getCurrentStageImage,
        addExp, takeDamage, heal, feed, play, rest, revive,
        bath, addIntimacy, decay, markHomeExit,
        equip, unequip, addExploration, addWin, getState, getAllSpecies,
        getTotalAtk, getTotalMaxHp, getTotalDef, getTotalSpd,
        getAllSpeciesBySeries, getSpeciesByRarity, getRarityConfig, getAllSeries,
        isDBLoaded, loadPetDB, loadPetRuntimeIndex,
        // 战斗深化
        loadSkills, getSkillsData, getSkill, getSkills,
        getCooldown, startCooldown, tickCooldowns, canUseSkill,
        resetBattleState, setDefending, isDefending,
        MAX_LEVEL, EXP_TABLE, STAGES, RARITY
    };
})();

window.PetSystem = PetSystem;
