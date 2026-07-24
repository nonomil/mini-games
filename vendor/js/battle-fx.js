/**
 * battle-fx.js - lightweight visual effects for exploration battles.
 *
 * CSS/SVG effects are the default runtime path. If a Lottie renderer is present
 * later, the same event map can load local JSON overlays without changing
 * battle logic.
 */
(function () {
    'use strict';

    var LOTTIE_ROOT = typeof window.resolvePetBankAssetUrl === 'function'
        ? window.resolvePetBankAssetUrl('assets/battle-fx/lottie/')
        : 'assets/battle-fx/lottie/';

    var SKILL_EFFECTS = {
        power_strike: {
            name: 'power-strike',
            target: 'monster',
            label: '强力击',
            lottie: LOTTIE_ROOT + 'power-strike.json',
            html: '<span class="battle-fx-ring"></span><span class="battle-fx-core"></span><span class="battle-fx-spark fx-a"></span><span class="battle-fx-spark fx-b"></span><span class="battle-fx-spark fx-c"></span>'
        },
        defend: {
            name: 'shield',
            target: 'pet',
            label: '防御',
            lottie: LOTTIE_ROOT + 'shield.json',
            html: '<span class="battle-fx-shield-dome"></span><span class="battle-fx-shield-glint"></span>'
        },
        ultimate: {
            name: 'ultimate',
            target: 'monster',
            label: '必杀',
            lottie: LOTTIE_ROOT + 'ultimate.json',
            modalClass: 'battle-fx-screen-kick',
            html: '<span class="battle-fx-bolt"></span><span class="battle-fx-bolt bolt-ghost"></span><span class="battle-fx-ring"></span><span class="battle-fx-spark fx-a"></span><span class="battle-fx-spark fx-b"></span>'
        }
    };

    var EVENT_EFFECTS = {
        'battle-start': {
            name: 'start',
            target: 'center',
            label: '遭遇战',
            html: '<span class="battle-fx-ring"></span><span class="battle-fx-core"></span>'
        },
        'player-attack': {
            name: 'slash',
            target: 'monster',
            label: '攻击',
            attacker: 'pet',
            defender: 'monster',
            motionStyle: 'dash',
            recoil: true,
            lottie: LOTTIE_ROOT + 'slash.json',
            html: '<span class="battle-fx-streak"></span><span class="battle-fx-streak streak-soft"></span><span class="battle-fx-contact"></span><span class="battle-fx-spark fx-a"></span><span class="battle-fx-spark fx-b"></span>'
        },
        'enemy-attack': {
            name: 'enemy-claw',
            target: 'pet',
            label: '',
            attacker: 'monster',
            defender: 'pet',
            motionStyle: 'pounce',
            recoil: true,
            html: '<span class="battle-fx-claw c1"></span><span class="battle-fx-claw c2"></span><span class="battle-fx-claw c3"></span><span class="battle-fx-contact enemy-contact"></span>'
        },
        'item-use': {
            name: 'item-heal',
            target: 'pet',
            label: '道具',
            html: '<span class="battle-fx-ring"></span><span class="battle-fx-spark fx-a"></span><span class="battle-fx-spark fx-b"></span><span class="battle-fx-spark fx-c"></span>'
        },
        'battle-win': {
            name: 'victory',
            target: 'center',
            label: '胜利',
            html: '<span class="battle-fx-ring"></span><span class="battle-fx-core"></span><span class="battle-fx-spark fx-a"></span><span class="battle-fx-spark fx-b"></span><span class="battle-fx-spark fx-c"></span>'
        },
        'battle-lose': {
            name: 'loss',
            target: 'center',
            label: '',
            html: '<span class="battle-fx-smoke s1"></span><span class="battle-fx-smoke s2"></span><span class="battle-fx-smoke s3"></span>'
        }
    };

    function getEffectSpec(type, detail) {
        detail = detail || {};
        if (type === 'skill-cast') {
            var skillSpec = SKILL_EFFECTS[detail.skillId] || {
                name: 'power-strike',
                target: 'monster',
                label: '技能',
                attacker: 'pet',
                defender: 'monster',
                motionStyle: 'arc',
                recoil: true,
                lottie: LOTTIE_ROOT + 'power-strike.json',
                html: SKILL_EFFECTS.power_strike.html
            };
            if (!skillSpec.attacker) skillSpec.attacker = 'pet';
            if (!skillSpec.defender) skillSpec.defender = skillSpec.target === 'pet' ? 'pet' : 'monster';
            if (!skillSpec.motionStyle) skillSpec.motionStyle = detail.skillId === 'ultimate' ? 'burst' : 'arc';
            if (skillSpec.recoil == null) skillSpec.recoil = skillSpec.defender === 'monster';
            return skillSpec;
        }
        if (type === 'defend') return SKILL_EFFECTS.defend;
        return EVENT_EFFECTS[type] || null;
    }

    function ensureLayer(zone) {
        var layer = zone.querySelector('.battle-fx-layer');
        if (layer) return layer;
        layer = document.createElement('div');
        layer.className = 'battle-fx-layer';
        layer.setAttribute('aria-hidden', 'true');
        zone.appendChild(layer);
        return layer;
    }

    function tryLottie(el, path) {
        if (!path || !window.lottie || typeof window.lottie.loadAnimation !== 'function') return false;
        try {
            var mount = document.createElement('div');
            mount.className = 'battle-fx-lottie';
            el.appendChild(mount);
            window.lottie.loadAnimation({
                container: mount,
                renderer: 'svg',
                loop: false,
                autoplay: true,
                path: path
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    function show(type, detail) {
        var zone = document.getElementById('battleDamageZone');
        if (!zone) return;

        var spec = getEffectSpec(type, detail || {});
        if (!spec) return;

        var layer = ensureLayer(zone);
        var el = document.createElement('div');
        el.className = 'battle-fx battle-fx-' + spec.name + ' battle-fx-target-' + (spec.target || 'center');
        el.dataset.label = spec.label || '';
        el.setAttribute('aria-hidden', 'true');

        if (!tryLottie(el, spec.lottie)) {
            el.innerHTML = spec.html || '';
        }

        layer.appendChild(el);

        var modal = document.getElementById('battleModal');
        if (modal && spec.modalClass) {
            modal.classList.remove(spec.modalClass);
            void modal.offsetWidth;
            modal.classList.add(spec.modalClass);
            setTimeout(function () { modal.classList.remove(spec.modalClass); }, 520);
        }

        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 1100);
    }

    window.BattleFx = {
        show: function (type, detail) { show(type, detail); },
        getEffectSpec: getEffectSpec
    };
})();
