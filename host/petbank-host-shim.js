/**
 * Mini-games host shim for ported PetBank playground/explore modules.
 * Provides minimal globals so standalone shells can boot without the main SPA.
 */
(function (global) {
  'use strict';

  const PROJECT_STORAGE_PREFIX = 'minigames_';
  const PORTED_STORAGE_PREFIX = 'minigames_ported_';

  function createScopedStorage(storage) {
    if (!storage || typeof storage.getItem !== 'function' || typeof Proxy !== 'function') return storage;

    const mapKey = (key) => {
      const value = String(key);
      if (value.startsWith(PROJECT_STORAGE_PREFIX)) return value;
      return PORTED_STORAGE_PREFIX + value;
    };
    const visiblePhysicalKeys = () => {
      const keys = [];
      for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key && key.startsWith(PROJECT_STORAGE_PREFIX)) keys.push(key);
      }
      return keys;
    };
    const logicalKey = (key) => key.startsWith(PORTED_STORAGE_PREFIX)
      ? key.slice(PORTED_STORAGE_PREFIX.length)
      : key;
    const scoped = {
      getItem(key) {
        return storage.getItem(mapKey(key));
      },
      setItem(key, value) {
        storage.setItem(mapKey(key), String(value));
      },
      removeItem(key) {
        storage.removeItem(mapKey(key));
      },
      clear() {
        visiblePhysicalKeys().forEach((key) => storage.removeItem(key));
      },
      key(index) {
        const key = visiblePhysicalKeys()[Number(index)];
        return key ? logicalKey(key) : null;
      }
    };

    const facade = {};
    Object.defineProperties(facade, {
      getItem: { value: scoped.getItem, enumerable: false, configurable: true },
      setItem: { value: scoped.setItem, enumerable: false, configurable: true },
      removeItem: { value: scoped.removeItem, enumerable: false, configurable: true },
      clear: { value: scoped.clear, enumerable: false, configurable: true },
      key: { value: scoped.key, enumerable: false, configurable: true },
      length: { get: () => visiblePhysicalKeys().length, enumerable: false }
    });
    const standardProperties = new Set([
      ...Object.getOwnPropertyNames(Object.prototype),
      'getItem', 'setItem', 'removeItem', 'clear', 'key', 'length'
    ]);
    const proxy = new Proxy(facade, {
      get(target, property, receiver) {
        if (typeof property === 'string' && !standardProperties.has(property)) {
          return scoped.getItem(property);
        }
        return Reflect.get(target, property, receiver);
      },
      set(target, property, value, receiver) {
        if (typeof property === 'string' && !standardProperties.has(property)) {
          scoped.setItem(property, value);
          return true;
        }
        return Reflect.set(target, property, value, receiver);
      },
      deleteProperty(target, property) {
        if (typeof property === 'string' && !standardProperties.has(property)) {
          scoped.removeItem(property);
          return true;
        }
        return Reflect.deleteProperty(target, property);
      },
      ownKeys() {
        return ['length', ...visiblePhysicalKeys().map(logicalKey)];
      },
      getOwnPropertyDescriptor(target, property) {
        if (property === 'length') return Reflect.getOwnPropertyDescriptor(target, property);
        if (typeof property === 'string' && visiblePhysicalKeys().some((key) => logicalKey(key) === property)) {
          return {
            configurable: true,
            enumerable: true,
            value: scoped.getItem(property),
            writable: false
          };
        }
        return Reflect.getOwnPropertyDescriptor(target, property);
      }
    });
    return proxy;
  }

  const nativeStorage = global.localStorage;
  if (nativeStorage && !global.__MINIGAMES_SCOPED_STORAGE__) {
    const scopedStorage = createScopedStorage(nativeStorage);
    let installed = false;
    try {
      Object.defineProperty(global, 'localStorage', {
        configurable: true,
        enumerable: true,
        value: scopedStorage
      });
      installed = scopedStorage !== nativeStorage && global.localStorage === scopedStorage;
    } catch (error) {
      try {
        global.localStorage = scopedStorage;
        installed = scopedStorage !== nativeStorage && global.localStorage === scopedStorage;
      } catch (fallbackError) {
        console.warn('[mini-games-host] localStorage proxy installation failed', fallbackError);
      }
    }
    if (installed) global.__MINIGAMES_SCOPED_STORAGE__ = true;
    else console.warn('[mini-games-host] localStorage isolation is unavailable');
  }

  function toast(message) {
    const text = String(message || '').trim();
    if (!text) return;
    let node = document.getElementById('mini-games-toast');
    if (!node) {
      node = document.createElement('div');
      node.id = 'mini-games-toast';
      node.setAttribute('role', 'status');
      node.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;max-width:min(90vw,420px);padding:12px 16px;border-radius:14px;background:rgba(32,53,75,.92);color:#fff;font:14px/1.4 Microsoft YaHei,sans-serif;box-shadow:0 12px 28px rgba(0,0,0,.18)';
      document.body.appendChild(node);
    }
    node.textContent = text;
    clearTimeout(node._timer);
    node._timer = setTimeout(() => { node.remove(); }, 2600);
  }

  function localDate(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  if (typeof global.showToast !== 'function') global.showToast = toast;
  if (typeof global.switchPage !== 'function') {
    global.switchPage = function switchPage(page) {
      if (page === 'playground' || page === 'map') {
        window.location.href = '../../index.html#games';
        return;
      }
      console.info('[mini-games-host] switchPage ignored in standalone shell:', page);
    };
  }

  global.PetBankTime = global.PetBankTime || Object.freeze({
    localDate,
    now: () => Date.now()
  });

  global.PetBankDailyState = global.PetBankDailyState || {
    getDate: () => localDate(),
    isToday: (value) => String(value || '') === localDate()
  };

  global.ProfileManager = global.ProfileManager || {
    getActiveProfileId() {
      try {
        return localStorage.getItem('minigames_profile_id') || 'local-child';
      } catch (_) {
        return 'local-child';
      }
    },
    getActiveProfile() {
      return { id: this.getActiveProfileId(), name: '本地玩家' };
    },
    getActiveId() {
      return this.getActiveProfileId();
    }
  };

  const pointsKey = 'minigames_local_points';
  function readPoints() {
    try { return Math.max(0, Number(localStorage.getItem(pointsKey) || 0) || 0); }
    catch (_) { return 0; }
  }
  function writePoints(value) {
    try { localStorage.setItem(pointsKey, String(Math.max(0, Number(value) || 0))); } catch (_) {}
  }

  global.PetBankPoints = global.PetBankPoints || {
    get: readPoints,
    add(amount, meta) {
      const delta = Math.max(0, Math.floor(Number(amount) || 0));
      const next = readPoints() + delta;
      writePoints(next);
      if (delta > 0) toast('本局获得 ' + delta + ' 分');
      if (global.MiniGamesBridge && typeof global.MiniGamesBridge.reportActivity === 'function') {
        global.MiniGamesBridge.reportActivity({
          activityId: (meta && (meta.activityId || meta.sourceId || meta.source)) || global.MINIGAMES_ACTIVITY_ID || 'mini-games-local',
          completionId: (meta && meta.eventId) || ('local-' + Date.now()),
          pointsHint: delta
        });
      }
      return { ok: true, total: next, delta };
    },
    spend(amount) {
      const cost = Math.max(0, Math.floor(Number(amount) || 0));
      const current = readPoints();
      if (current < cost) return { ok: false, total: current };
      writePoints(current - cost);
      return { ok: true, total: current - cost };
    },
    deduct(amount) {
      return this.spend(amount);
    }
  };

  global.GameRewardReceipts = global.GameRewardReceipts || {
    _seen: new Set(),
    claim(input) {
      const payload = input && typeof input === 'object' ? input : { eventId: input };
      const id = String(payload.eventId || '');
      if (!id) return { accepted: false, duplicate: false, reason: 'missing-event-id' };
      if (this._seen.has(id)) return { accepted: false, duplicate: true };
      this._seen.add(id);
      try {
        const raw = JSON.parse(localStorage.getItem('minigames_reward_receipts') || '[]');
        if (Array.isArray(raw) && raw.includes(id)) return { accepted: false, duplicate: true };
        const next = Array.isArray(raw) ? raw.concat(id).slice(-200) : [id];
        localStorage.setItem('minigames_reward_receipts', JSON.stringify(next));
      } catch (error) {
        console.warn('[mini-games-host] reward receipt persistence failed', error);
        return { accepted: false, duplicate: false, reason: 'receipt-storage-failed' };
      }
      const points = Math.max(0, Math.floor(Number(payload.points) || 0));
      if (points > 0) global.PetBankPoints.add(points, {
        source: payload.source || 'mini-games-local',
        sourceId: payload.sourceId || payload.source || global.MINIGAMES_ACTIVITY_ID,
        activityId: payload.activityId,
        eventId: id
      });
      return { accepted: true, duplicate: false };
    }
  };

  global.CoreRewardService = global.CoreRewardService || {
    claim(input) {
      const payload = input && typeof input === 'object' ? input : {};
      const reward = Array.isArray(payload.rewards)
        ? payload.rewards.find((item) => item && item.type === 'growth_points')
        : null;
      const receipt = global.GameRewardReceipts.claim({
        eventId: payload.eventId,
        source: payload.source || 'game',
        sourceId: payload.sourceId || global.MINIGAMES_ACTIVITY_ID,
        activityId: payload.activityId || payload.sourceId,
        points: reward && reward.amount
      });
      return { accepted: Boolean(receipt.accepted), duplicate: Boolean(receipt.duplicate), reason: receipt.reason || '' };
    }
  };

  global.Leaderboard = global.Leaderboard || {
    _key(mode) { return 'minigames_lb_' + String(mode || 'default'); },
    getBest(mode) {
      try { return Number(localStorage.getItem(this._key(mode)) || 0) || 0; }
      catch (_) { return 0; }
    },
    submit(mode, score) {
      const value = Math.max(0, Math.floor(Number(score) || 0));
      const best = this.getBest(mode);
      if (value > best) {
        try { localStorage.setItem(this._key(mode), String(value)); } catch (_) {}
        return { best: value, improved: true };
      }
      return { best, improved: false };
    },
    record(mode, score) {
      return this.submit(mode, score);
    }
  };

  // Lightweight pet stub so forest exploration map can render and run soft battles.
  if (!global.PetSystem) {
    const petState = {
      name: '探险伙伴',
      level: 5,
      hp: 100,
      maxHp: 100,
      exp: 0,
      atk: 18,
      def: 8,
      wins: 0,
      defending: false,
      cooldowns: {}
    };
    global.PetSystem = {
      getState() { return Object.assign({}, petState); },
      getTotalAtk() { return petState.atk; },
      getAllSpecies() {
        return [
          { id: 'slime', name: '史莱姆', hp: 40, atk: 8, def: 2, exp: 10 },
          { id: 'wolf', name: '小狼', hp: 55, atk: 12, def: 4, exp: 16 },
          { id: 'golem', name: '石怪', hp: 80, atk: 14, def: 10, exp: 24 }
        ];
      },
      takeDamage(amount) {
        petState.hp = Math.max(0, petState.hp - Math.max(0, Number(amount) || 0));
        return petState.hp;
      },
      addExploration() {},
      addExp(amount) { petState.exp += Math.max(0, Number(amount) || 0); },
      addWin() { petState.wins += 1; },
      resetBattleState() { petState.hp = petState.maxHp; petState.defending = false; petState.cooldowns = {}; },
      tickCooldowns() {
        Object.keys(petState.cooldowns).forEach((key) => {
          petState.cooldowns[key] = Math.max(0, (petState.cooldowns[key] || 0) - 1);
        });
      },
      getSkill(id) { return { id: id || 'attack', mult: id === 'power' ? 1.6 : 1, cd: id === 'power' ? 2 : 0 }; },
      canUseSkill(id) { return !petState.cooldowns[id || 'attack']; },
      getCooldown(id) { return petState.cooldowns[id || 'attack'] || 0; },
      setDefending(flag) { petState.defending = Boolean(flag); },
      isDefending() { return Boolean(petState.defending); },
      startCooldown(id, turns) { petState.cooldowns[id || 'attack'] = Math.max(0, Number(turns) || 0); }
    };
  }

  if (!global.InventorySystem) {
    global.InventorySystem = {
      add() { return true; },
      getCount() { return 0; }
    };
  }

  if (!global.BattleEngine) {
    global.BattleEngine = {
      calcDamage(atk, def, options) {
        if (atk && typeof atk === 'object') {
          options = atk;
          def = Number(atk.def) || 0;
          atk = Number(atk.atk) || 10;
        }
        const opts = options || {};
        const attack = Number(atk) || 10;
        const defense = Number(def) || 0;
        const mult = Number(opts.mult) || 1;
        const useDef = Boolean(opts.useDef);
        const randMax = Number.isFinite(Number(opts.randMax)) ? Math.max(1, Number(opts.randMax)) : 3;
        const randSub = Number.isFinite(Number(opts.randSub)) ? Number(opts.randSub) : 1;
        const raw = (useDef ? Math.max(1, attack - Math.floor(defense / 2)) : attack) * mult;
        return Math.max(1, Math.floor(raw) + Math.floor(Math.random() * randMax) - randSub);
      },
      decideOrder(a, b) {
        const sa = Number(typeof a === 'number' ? a : a && a.spd) || 0;
        const sb = Number(typeof b === 'number' ? b : b && b.spd) || 0;
        return sa >= sb ? 'A' : 'B';
      },
      makeCombatant(base, side) {
        return Object.assign({
          side: side || 'player',
          hp: 50,
          maxHp: 50,
          atk: 10,
          def: 4,
          spd: 5
        }, base || {});
      }
    };
  }

  if (typeof global.resolvePetBankAssetUrl !== 'function') {
    global.resolvePetBankAssetUrl = function resolvePetBankAssetUrl(assetPath) {
      const value = String(assetPath || '');
      if (!value) return value;
      if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
      if (value.startsWith('../../') || value.startsWith('./') || value.startsWith('/')) return value;
      // shells live under games/* so shared root data/assets are two levels up
      return '../../' + value.replace(/^\/+/, '');
    };
  }

  global.MiniGamesHost = Object.freeze({
    toast,
    ready: true
  });
}(window));
