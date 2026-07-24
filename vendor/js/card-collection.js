/**
 * CardCollection Module v2
 * 改造：顶部系列 tab 按钮 + 所有卡片全可见（不再隐藏未收集）
 * 系列 tab 点击切换下方卡片分类
 */
const CardCollection = (function() {
    let _cards = [];
    const STORAGE_KEY = 'petbank_cards';
    const REWARD_TICKETS_PER_SERIES = 5;

    let _allSpecies = [];
    let _seriesStats = {};
    let _selectedBooklet = 'all';      // 'all' | 主题册 id
    let _selectedGallery = 'all';      // 'all' | 顶层分馆 id
    let _lastContainerId = 'card-collection-container';
    let _loreById = {};
    let _loreByName = {};
    let _loreLoadPromise = null;
    let _loreLoaded = false;
    let _catalogRenderPromise = null;
    let _catalogLoadAttempted = false;

    const SOURCE_DETAIL_LABELS = {
        original: '阳光花园馆 · 经典植物',
        pvz: '阳光花园馆 · 写实实验',
        banchong2_plant: '阳光花园馆 · 甜芽花园',
        banchong: '奇趣冒险馆 · 多族冒险',
        banchong2: '奇趣冒险馆 · 萌爪伙伴',
        classpet: '创想课堂馆 · 风格练习',
        minecraft: '方块生态馆 · 原版生态'
    };
    function escapeHtmlAttr(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    function escapeJsString(value) {
        return String(value ?? '')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n');
    }
    function resolveAssetUrl(value) {
        return window.resolvePetBankAssetUrl ? window.resolvePetBankAssetUrl(value) : value;
    }
    const SERIES_DISPLAY_LABELS = {
        PVZ: '经典植物线',
        'pvz真实': '写实实验线'
    };
    const GALLERY_ORDER = ['sunshine', 'adventure', 'classroom', 'blocky'];
    const GALLERY_CONFIG = {
        sunshine: {
            name: '阳光花园馆',
            subtitle: '经典植物 · 写实实验 · 甜芽花园',
            summary: '收录植物系、花园系、写实实验线与花果萌芽伙伴。',
            cardLabel: '植物图鉴入口',
            cardIntro: '含向日葵、豌豆射手、坚果墙，也收着草莓、竹子、银杏等甜芽花园伙伴。',
            sourceKeys: ['original', 'pvz', 'banchong2_plant'],
            accent: 'sun',
            gradient: 'linear-gradient(135deg, #fff0b8 0%, #f7c95f 100%)',
            coverImage: 'assets/pokedex-halls/sunshine.webp',
            coverPosition: 'center 42%',
            heroPetIds: ['pvz_sunflower', 'bc2p_strawberry', 'bc2p_bamboo'],
            hallIntro: '这里收录《植物大战僵尸》主题植物卡、写实实验线植物伙伴，以及班宠乐园2来的甜芽花园伙伴。翻开这一馆，可以从阳光补给、自然观察、花果奖励和成长陪伴几条路线慢慢认识每一种植物。',
            hallHighlights: [
                '经典植物卡：豌豆射手、向日葵、坚果墙、樱桃炸弹等都在这里。',
                '写实实验线：把 PVZ 植物做成更像自然图鉴的观察对象，更适合慢慢辨认形态。',
                '甜芽花园册：草莓、竹子、银杏、榴莲等花果伙伴适合做学习打卡和自然观察。',
                '适合做功能分类记忆：攻击、防守、阳光生产与控制型植物一目了然。'
            ],
            hallTags: ['PVZ 经典植物', '写实实验线', '甜芽花园', '阳光补给']
        },
        adventure: {
            name: '奇趣冒险馆',
            subtitle: '旅途族群 · 陪伴发现',
            summary: '收录冒险路上遇见的多族群成长伙伴。',
            cardLabel: '冒险伙伴入口',
            cardIntro: '收着灵兽、守护兽与旅行伙伴，适合按神话、陪伴感和旅途故事来记忆角色。',
            sourceKeys: ['banchong', 'banchong2'],
            accent: 'adventure',
            gradient: 'linear-gradient(135deg, #ffd7e8 0%, #f6a4bf 100%)',
            coverImage: 'assets/pokedex-halls/adventure.webp',
            coverPosition: 'center 52%',
            heroPetIds: ['4413441b-af1', '2cd112b5-025', '35a035d7-972'],
            hallIntro: '这里像一整层冒险故事馆，收着山海灵兽、旅行伙伴、梦境萌宠和守护型异兽。适合一边翻图鉴，一边按神话、旅途、生肖与守护四种气质去记忆角色。',
            hallHighlights: [
                '神话瑞兽线：麒麟、青龙、朱雀、九色鹿等高辨识度角色集中收藏。',
                '旅行与绮梦线：旅途装扮伙伴、彩梦角色和星瞳猫系会让图鉴更有故事感。',
                '守护与异兽线：守护系、双钳族等小众角色，适合做“能力型伙伴”分类记忆。'
            ],
            hallTags: ['神话瑞兽', '旅行伙伴', '绮梦奇旅', '守护异兽']
        },
        classroom: {
            name: '创想课堂馆',
            subtitle: '主题创作 · 风格练习',
            summary: '收录课堂主题、风格实验与创作型伙伴。',
            cardLabel: '创作角色入口',
            cardIntro: '把萌宠、幻想、像素与国潮角色放进同一本创作册，适合练风格辨认和形象联想。',
            sourceKeys: ['classpet'],
            accent: 'classroom',
            gradient: 'linear-gradient(135deg, #dff2ff 0%, #8bc7ff 100%)',
            coverImage: 'assets/pokedex-halls/classroom.webp',
            coverPosition: 'center 46%',
            heroPetIds: ['cp_cat_01', 'cp_unicorn_01', 'cp_robot_01'],
            hallIntro: '这里像一本课堂创作集，收着萌宠练习、幻想角色、像素生物、科幻机械和国潮灵感。最适合用来练“风格辨认”和“形象联想”。',
            hallHighlights: [
                '萌宠与幻想：猫狗兔、独角兽、精灵等，是最友好的入门观察对象。',
                '像素与科幻：像素动物、机器人、UFO 等题材，适合练“画风切换”识别。',
                '国潮灵感：熊猫、中国龙、孔雀、麋鹿等东方主题，方便讲故事和做角色设定。'
            ],
            hallTags: ['萌宠插画', '幻想设定', '像素机巧', '东方灵感']
        },
        blocky: {
            name: '方块生态馆',
            subtitle: '像素地貌 · 生态观察',
            summary: '收录方块世界里的生态观察对象与像素生物。',
            cardLabel: '生态观察入口',
            cardIntro: '收着狼、悦灵、末影人与洞穴怪物，适合按地貌、生境和危险度做生态观察。',
            sourceKeys: ['minecraft'],
            accent: 'blocky',
            gradient: 'linear-gradient(135deg, #ddf5dd 0%, #97d488 100%)',
            coverImage: 'assets/pokedex-halls/blocky.webp',
            coverPosition: 'center 50%',
            heroPetIds: ['mc_wolf', 'mc_allay', 'mc_ender_dragon'],
            hallIntro: '这里是一整本《我的世界》生态观察册，从温顺生物到夜行怪物都按方块世界的生境与危险度收录。整体更像儿童版的生态手账。',
            hallHighlights: [
                '常见伙伴：狼、猫、兔子、鹦鹉、海龟、美西螈等，适合先做生态启蒙。',
                '特殊生物：悦灵、末影人、循声守卫、末影龙等，会把图鉴的神秘感拉满。',
                '适合做场景记忆：陆地、海洋、洞穴与末地等不同地貌都能对应到生物类型。'
            ],
            hallTags: ['生态观察', '常见伙伴', '危险生物', '方块世界']
        }
    };
    const THEME_BOOKLETS = {
        sunshine: [
            { id: 'sun-classic', name: '经典植物册', subtitle: '豌豆与向日葵', series: ['PVZ'] },
            { id: 'sun-real', name: '写实实验册', subtitle: '写实观察线', series: ['pvz真实'] },
            { id: 'sun-banchong2-plant', name: '甜芽花园册', subtitle: '班宠乐园2 · 花果萌芽', series: ['甜芽花园族'] }
        ],
        adventure: [
            { id: 'adv-myth', name: '神话瑞兽册', subtitle: '瑞兽与山海', series: ['灵兽族', '瑞兽族', '山海族', '敦煌族'] },
            { id: 'adv-star', name: '星梦奇旅册', subtitle: '星瞳与旅途', series: ['星瞳族', '绮梦族', '旅行族'] },
            { id: 'adv-cute', name: '萌宠搭档册', subtitle: '生肖与绒爪', series: ['萌肖族', '酷肖族', '绒爪族'] },
            { id: 'adv-banchong2', name: '萌爪伙伴册', subtitle: '班宠乐园2 · 软萌同行', series: ['萌爪伙伴族'] },
            { id: 'adv-guard', name: '守护异兽册', subtitle: '守护与双钳', series: ['守护系', '双钳族'] }
        ],
        classroom: [
            { id: 'class-imagine', name: '想象涂鸦册', subtitle: '萌宠与幻想', series: ['萌宠风', '幻想风'] },
            { id: 'class-pixel', name: '像素机巧册', subtitle: '像素与科幻', series: ['像素风', '科幻风'] },
            { id: 'class-oriental', name: '东方灵感册', subtitle: '国潮创作', series: ['国潮风'] }
        ],
        blocky: [
            { id: 'block-vanilla', name: '原版生态册', subtitle: '方块生物观察', series: ['我的世界'] }
        ]
    };
    const DETAIL_SAMPLE_DATA = {
        '向日葵': {
            codexTitle: '植物镇见习培育师',
            subtitle: '晨光学堂毕业生 · 白天型补给伙伴',
            story: '向日葵来自植物镇南边的晨露坡，从小就跟着花圃管理员记录太阳升落，所以总能比别人更早发现天气和情绪的变化。它小时候在植物镇的晨光学堂上学，最爱把窗台上的种子盒排得整整齐齐，毕业后留在温室里做见习培育师，负责照看刚发芽的小苗。平时它最喜欢清晨晒太阳、整理补给篮，还会悄悄给准备出发的伙伴塞上一包阳光点心。遇到队伍紧张或体力下滑时，它最擅长把储存的光能变成温暖结晶，让大家重新打起精神。',
            traits: ['温暖靠谱', '晨光亲和', '补给意识强', '很会照顾同伴'],
            skills: [
                { name: '阳光结晶', desc: '把晨光压缩成柔亮结晶，稳定恢复伙伴体力与心情。' },
                { name: '温室点名', desc: '快速观察全队状态，优先照顾最紧张或最疲惫的伙伴。' },
                { name: '晨曦补给', desc: '清晨行动时效率最高，能让整支队伍更快进入好状态。' }
            ],
            stageLabels: ['种子休眠', '破土发芽', '晨光初放', '稳定盛开', '丰收日耀'],
            exhibitNote: '它不是冲在最前面的那一个，却常常是让整支队伍安心出发的那一道光。'
        }
    };
    const DEFAULT_STAGE_LABELS = ['初始形态', '幼体阶段', '成长阶段', '成熟阶段', '完全阶段', '终极阶段'];
    const RARITY_META = {
        common: { label: '普通', badge: '柔光' },
        rare: { label: '稀有', badge: '闪亮' },
        epic: { label: '史诗', badge: '珍藏' },
        legendary: { label: '传说', badge: '馆藏' }
    };
    const CARD_STAT_LABELS = {
        base_hp: '生命',
        base_atk: '攻击',
        base_def: '防御',
        base_spd: '速度'
    };

    function indexLoreData(entries) {
        _loreById = {};
        _loreByName = {};

        (entries || []).forEach((entry) => {
            if (!entry) return;
            if (entry.id) _loreById[entry.id] = entry;
            if (entry.name) _loreByName[entry.name] = entry;
        });
    }

    function loadLoreData() {
        if (_loreLoadPromise) return _loreLoadPromise;

        _loreLoadPromise = fetch(window.resolvePetBankAssetUrl ? window.resolvePetBankAssetUrl('data/pokedex-lore-draft.json') : 'data/pokedex-lore-draft.json')
            .then((resp) => {
                if (!resp.ok) throw new Error(`lore fetch failed: ${resp.status}`);
                return resp.json();
            })
            .then((data) => {
                indexLoreData(data && data.pets ? data.pets : []);
                _loreLoaded = true;

                const container = document.getElementById(_lastContainerId);
                if (container && container.innerHTML && container.innerHTML.trim()) {
                    renderUI(_lastContainerId);
                }
            })
            .catch((err) => {
                console.warn('[CardCollection] pokedex lore load failed:', err);
                indexLoreData([]);
            });

        return _loreLoadPromise;
    }

    function getLoreEntry(pet) {
        if (!pet) return null;
        return _loreById[pet.id] || _loreByName[pet.name] || null;
    }

    function getGalleryById(galleryId) {
        return GALLERY_CONFIG[galleryId] || null;
    }

    function getGalleryIdForSource(source) {
        const entry = GALLERY_ORDER.find((galleryId) => {
            const gallery = getGalleryById(galleryId);
            return gallery && gallery.sourceKeys.includes(source || 'original');
        });
        return entry || null;
    }

    function isPetInGallery(pet, galleryId) {
        if (galleryId === 'all') return true;
        const gallery = getGalleryById(galleryId);
        if (!gallery) return true;
        return gallery.sourceKeys.includes(pet.source || 'original');
    }

    function getGalleryPets(galleryId) {
        return _allSpecies.filter((pet) => isPetInGallery(pet, galleryId));
    }

    function getGalleryCollectedCount(galleryId) {
        return getGalleryPets(galleryId).filter((pet) => _cards.includes(pet.id)).length;
    }

    function getPetDisplayImage(pet) {
        if (!pet) return '';

        if (pet.imageStages) {
            const stageKeys = Object.keys(pet.imageStages).sort((a, b) => Number(a) - Number(b));
            if (pet.imageStages['2']) return resolveAssetUrl(pet.imageStages['2']);
            if (pet.imageStages['1']) return resolveAssetUrl(pet.imageStages['1']);
            if (stageKeys.length) return resolveAssetUrl(pet.imageStages[stageKeys[Math.min(2, stageKeys.length - 1)]]);
        }

        if (Array.isArray(pet.stages) && pet.stages.length) {
            const stage = pet.stages[Math.min(2, pet.stages.length - 1)] || pet.stages[0];
            if (stage && stage.imageUrl) return resolveAssetUrl(stage.imageUrl);
        }

        return resolveAssetUrl(pet.imageUrl || '');
    }

    function getGalleryPreviewPets(galleryId) {
        const gallery = getGalleryById(galleryId);
        const fallback = getGalleryPets(galleryId).slice(0, 3);
        if (!gallery) return fallback;

        const featured = (gallery.heroPetIds || [])
            .map((petId) => _allSpecies.find((pet) => pet.id === petId))
            .filter(Boolean);

        return featured.length ? featured : fallback;
    }

    function renderPreviewStackHtml(galleryId, className) {
        const previewPets = getGalleryPreviewPets(galleryId).slice(0, 3);
        if (!previewPets.length) return '';

        const cards = previewPets.map((pet) => {
            const imageUrl = getPetDisplayImage(pet);
            const art = imageUrl
                ? `<img src="${imageUrl}" alt="${pet.name}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'card-gallery-preview-emoji\\'>${pet.emoji || '🐾'}</span>'">`
                : `<span class="card-gallery-preview-emoji">${pet.emoji || '🐾'}</span>`;
            return `
                <div class="card-gallery-preview-card">
                    <div class="card-gallery-preview-art">${art}</div>
                    <div class="card-gallery-preview-name">${pet.name}</div>
                </div>`;
        }).join('');

        return `<div class="card-gallery-preview-stack ${className || ''}">${cards}</div>`;
    }

    function getBookletsForGallery(galleryId) {
        return THEME_BOOKLETS[galleryId] || [];
    }

    function getBookletById(galleryId, bookletId) {
        return getBookletsForGallery(galleryId).find((booklet) => booklet.id === bookletId) || null;
    }

    function isPetInBooklet(pet, galleryId, bookletId) {
        if (bookletId === 'all') return true;
        const booklet = getBookletById(galleryId, bookletId);
        if (!booklet) return true;
        return booklet.series.includes(pet.series || '');
    }

    function getGalleryIconMarkup(accent) {
        if (accent === 'sun') {
            return `<span class="card-gallery-icon card-gallery-icon-sun" aria-hidden="true">
                <svg viewBox="0 0 64 64" class="card-gallery-icon-svg">
                    <circle cx="32" cy="32" r="10"></circle>
                    <path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M49 15l-6 6M21 43l-6 6"></path>
                    <path d="M24 38c4 4 12 4 16 0"></path>
                </svg>
            </span>`;
        }
        if (accent === 'adventure') {
            return `<span class="card-gallery-icon card-gallery-icon-adventure" aria-hidden="true">
                <svg viewBox="0 0 64 64" class="card-gallery-icon-svg">
                    <circle cx="32" cy="32" r="20"></circle>
                    <path d="M32 18l4 10 10 4-10 4-4 10-4-10-10-4 10-4z"></path>
                    <circle cx="32" cy="32" r="3"></circle>
                </svg>
            </span>`;
        }
        if (accent === 'classroom') {
            return `<span class="card-gallery-icon card-gallery-icon-classroom" aria-hidden="true">
                <svg viewBox="0 0 64 64" class="card-gallery-icon-svg">
                    <path d="M15 20c6-4 13-4 17-1v25c-4-3-11-3-17 1z"></path>
                    <path d="M49 20c-6-4-13-4-17-1v25c4-3 11-3 17 1z"></path>
                    <path d="M22 26h6M22 32h6M36 26h6M36 32h6"></path>
                </svg>
            </span>`;
        }
        return `<span class="card-gallery-icon card-gallery-icon-blocky" aria-hidden="true">
            <svg viewBox="0 0 64 64" class="card-gallery-icon-svg">
                <path d="M32 12 46 20 32 28 18 20z"></path>
                <path d="M18 20v16l14 8V28z"></path>
                <path d="M46 20v16l-14 8V28z"></path>
            </svg>
        </span>`;
    }

    function syncSpeciesFromPetSystem() {
        if (typeof PetSystem !== 'undefined' && typeof PetSystem.getAllSpecies === 'function') {
            _allSpecies = PetSystem.getAllSpecies() || [];
        }
        _calculateSeriesStats();
    }

    function shouldWaitForPetCatalog() {
        if (typeof PetSystem === 'undefined' || typeof PetSystem.loadPetDB !== 'function') return false;
        if (typeof PetSystem.isDBLoaded === 'function' && PetSystem.isDBLoaded()) return false;
        return !_catalogLoadAttempted;
    }

    function renderCatalogLoading(container) {
        container.innerHTML = `
            <div class="card-collection-shell">
                <section class="card-overview-panel card-catalog-loading">
                    <div class="card-overview-kicker">宠物图鉴馆</div>
                    <h2 class="card-overview-heading">正在整理完整图鉴...</h2>
                    <p class="card-overview-copy">图鉴会先等完整宠物库加载完成，再展示四座分馆，避免线上慢网络时只出现少量 fallback 卡片。</p>
                    <div class="card-catalog-loading-bar"><span></span></div>
                </section>
            </div>`;
    }

    function requestCatalogRender(containerId) {
        if (_catalogRenderPromise || typeof PetSystem === 'undefined' || typeof PetSystem.loadPetDB !== 'function') return;
        _catalogLoadAttempted = true;
        _catalogRenderPromise = PetSystem.loadPetDB()
            .then(() => {
                syncSpeciesFromPetSystem();
                renderUI(containerId || _lastContainerId);
            })
            .catch((error) => {
                console.warn('[CardCollection] Pet catalog load failed:', error);
                syncSpeciesFromPetSystem();
                renderUI(containerId || _lastContainerId);
            })
            .finally(() => {
                _catalogRenderPromise = null;
            });
    }

    function setView(view, source) {
        if (view === 'gallery') {
            if ((_selectedGallery || 'all') === (source || 'all')) {
                _selectedGallery = 'all';
            } else {
                _selectedGallery = source || 'all';
            }
            _selectedBooklet = 'all';
        } else if (view === 'booklet') {
            _selectedBooklet = source || 'all';
        } else {
            _selectedBooklet = source || 'all';
        }
        renderUI(_lastContainerId);
    }

    function setComposedCardFallbackArt(fallbackEl, fallbackSrc, fallbackAlt, fallbackEmoji) {
        if (!fallbackEl) return;
        const portrait = fallbackEl.querySelector('.card-portrait');
        if (!portrait) return;
        const emoji = fallbackEmoji || '🐾';
        if (fallbackSrc) {
            portrait.innerHTML = `<img src="${escapeHtmlAttr(fallbackSrc)}" alt="${escapeHtmlAttr(fallbackAlt || '宠物')}" loading="lazy" onerror="this.parentElement.innerHTML='<span class=\\'card-emoji-big\\'>${emoji}</span>'">`;
            return;
        }
        portrait.innerHTML = `<span class="card-emoji-big">${emoji}</span>`;
    }

    function handleComposedCardImageError(imgEl) {
        if (!imgEl) return;
        const shell = imgEl.parentElement;
        const fallback = shell ? shell.querySelector('.card-composed-v2-fallback') : null;
        setComposedCardFallbackArt(
            fallback,
            imgEl.dataset.fallbackSrc || '',
            imgEl.dataset.fallbackAlt || '',
            imgEl.dataset.fallbackEmoji || '🐾'
        );
        imgEl.style.display = 'none';
        shell?.classList.add('is-fallback');
    }

    function getSceneDisplayName(sceneId, fallbackName) {
        try {
            if (sceneId && typeof ExplorationSystem !== 'undefined' && typeof ExplorationSystem.getAllScenes === 'function') {
                const scenes = ExplorationSystem.getAllScenes() || [];
                const matchedScene = scenes.find((scene) => scene.id === sceneId);
                if (matchedScene && matchedScene.name) return matchedScene.name;
            }
        } catch (e) {}
        return fallbackName || '';
    }

    function getSeriesDisplayLabel(series) {
        return SERIES_DISPLAY_LABELS[series] || series || '经典系列';
    }

    function buildLoreDetailMeta(pet, lore) {
        const rarity = pet.rarity || 'common';
        const rarityName = (RARITY_META[rarity] && RARITY_META[rarity].label) || '普通';
        const sourceName = getSourceLabel(pet.source);
        const seriesName = getSeriesDisplayLabel(pet.series);
        const statFocus = [
            { key: 'base_hp', name: '耐久' },
            { key: 'base_atk', name: '攻击' },
            { key: 'base_def', name: '防御' },
            { key: 'base_spd', name: '速度' }
        ].sort((a, b) => (pet[b.key] || 0) - (pet[a.key] || 0));

        return {
            codexTitle: lore.codexTitle || `${seriesName}调查档案`,
            subtitle: lore.subtitle || `${rarityName} · ${sourceName}伙伴`,
            intro: lore.intro || '',
            story: lore.story || `${pet.name} 是一只来自 ${sourceName} 的 ${rarityName} 宠物。`,
            traits: Array.isArray(lore.traits) && lore.traits.length
                ? lore.traits.slice(0, 4)
                : [seriesName, ...statFocus.slice(0, 2).map((item) => `${item.name}偏强`)],
            skills: Array.isArray(lore.skills) && lore.skills.length
                ? lore.skills.slice(0, 3)
                : buildFallbackSkills(pet, statFocus),
            stageLabels: Array.isArray(lore.stageLabels) && lore.stageLabels.length ? lore.stageLabels : DEFAULT_STAGE_LABELS,
            exhibitNote: lore.intro || `${pet.name} 已接入图鉴调查档案。`,
            dossierEntries: buildLoreDossierEntries(lore),
            sceneId: lore.sceneId || '',
            sceneName: getSceneDisplayName(lore.sceneId || '', lore.sceneName || ''),
            origin: lore.origin || ''
        };
    }

    function getDetailMeta(pet) {
        const lore = getLoreEntry(pet);
        if (lore) return buildLoreDetailMeta(pet, lore);

        const exact = DETAIL_SAMPLE_DATA[pet.id] || DETAIL_SAMPLE_DATA[pet.name];
        if (exact) return exact;

        const rarity = pet.rarity || 'common';
        const rarityName = (RARITY_META[rarity] && RARITY_META[rarity].label) || '普通';
        const sourceName = getSourceLabel(pet.source);
        const seriesName = getSeriesDisplayLabel(pet.series);
        const statFocus = [
            { key: 'base_hp', name: '耐久' },
            { key: 'base_atk', name: '攻击' },
            { key: 'base_def', name: '防御' },
            { key: 'base_spd', name: '速度' }
        ].sort((a, b) => (pet[b.key] || 0) - (pet[a.key] || 0));
        const topTraits = statFocus.slice(0, 2).map(item => `${item.name}偏强`);

        return {
            codexTitle: `${seriesName}观察记录`,
            subtitle: `${rarityName} · ${sourceName}收集对象`,
            story: pet.desc
                ? `${pet.desc} 它在 ${seriesName} 中有很高辨识度，是图鉴里值得长期观察的伙伴。`
                : `${pet.name} 是一只来自 ${sourceName} 的 ${rarityName} 宠物，适合继续补充专属故事设定。`,
            traits: [seriesName, ...topTraits, `${sourceName}来源`].slice(0, 4),
            skills: buildFallbackSkills(pet, statFocus),
            stageLabels: DEFAULT_STAGE_LABELS,
            dossierEntries: [],
            sceneId: '',
            sceneName: '',
            origin: '',
            exhibitNote: `${pet.name} 的基础图鉴档案已建立，后续还可以继续补充更完整的故事与世界观。`
        };
    }

    function buildLoreDossierEntries(lore) {
        return [
            { label: '来自', value: lore.origin || '' },
            { label: '小时候', value: formatChildhoodDossierText(lore.childhood) },
            { label: '上学', value: lore.school || '' },
            { label: '现在工作', value: lore.work || '' },
            { label: '喜欢做', value: lore.hobby || '' },
            { label: '擅长', value: lore.specialty || '' },
            { label: '能力', value: lore.ability || '' }
        ].filter((entry) => entry.value);
    }

    function formatChildhoodDossierText(childhood) {
        return String(childhood || '')
            .trim()
            .replace(/^(从小|小时候)/, '')
            .trim();
    }

    function buildFallbackSkills(pet, statFocus) {
        const lead = statFocus[0]?.name || '成长';
        const second = statFocus[1]?.name || '陪伴';
        const seriesName = getSeriesDisplayLabel(pet.series);
        return [
            { name: `${lead}本能`, desc: `在 ${lead} 方向上表现更突出，适合做这一类型的代表宠物。` },
            { name: `${second}天赋`, desc: `兼具 ${second} 方面的潜力，可作为长期培养对象。` },
            { name: '伙伴气场', desc: `${seriesName} 特征明显，适合放入图鉴做重点展示。` }
        ];
    }

    function getStageEntries(pet) {
        if (Array.isArray(pet.stages) && pet.stages.length) {
            return pet.stages
                .map((stage, index) => ({
                    index,
                    imageUrl: resolveAssetUrl(stage.imageUrl),
                    label: stage.stage != null ? `阶段 ${stage.stage}` : DEFAULT_STAGE_LABELS[index] || `阶段 ${index + 1}`
                }))
                .filter(stage => !!stage.imageUrl);
        }

        if (pet.imageStages) {
            return Object.keys(pet.imageStages)
                .sort((a, b) => Number(a) - Number(b))
                .map((key, index) => ({
                    index: Number(key),
                    imageUrl: resolveAssetUrl(pet.imageStages[key]),
                    label: DEFAULT_STAGE_LABELS[index] || `阶段 ${Number(key) + 1}`
                }))
                .filter(stage => !!stage.imageUrl);
        }

        return pet.imageUrl ? [{ index: 0, imageUrl: resolveAssetUrl(pet.imageUrl), label: '基础形态' }] : [];
    }

    function getHighlightedStageIndex(pet, entries) {
        try {
            if (typeof PetSystem !== 'undefined' && PetSystem.getState) {
                const state = PetSystem.getState();
                if (state && state.species === pet.id) {
                    const current = (PetSystem.getCurrentStage && PetSystem.getCurrentStage()) || null;
                    if (current && current.stageIdx != null) return current.stageIdx;
                    if (PetSystem.STAGES && Array.isArray(PetSystem.STAGES)) {
                        let idx = 0;
                        PetSystem.STAGES.forEach((stage) => {
                            if (state.level >= stage.min_level) idx = stage.stageIdx || idx;
                        });
                        return idx;
                    }
                }
            }
        } catch (e) {}

        if (!entries.length) return 0;
        return entries[Math.min(2, entries.length - 1)].index;
    }

    function getSourceLabel(source) {
        return SOURCE_DETAIL_LABELS[source] || source || '未知来源';
    }

    function getRarityLabel(rarity) {
        return (RARITY_META[rarity] && RARITY_META[rarity].label) || '普通';
    }

    function getRarityBadge(rarity) {
        return (RARITY_META[rarity] && RARITY_META[rarity].badge) || '收藏';
    }

    function getComposedCardImagePath(petId) {
        return resolveAssetUrl(`assets/cards/composed-v2/${petId}.webp`);
    }

    function openStageLightbox(imageUrl, petName, stageLabel) {
        if (!imageUrl) return;
        let lightbox = document.getElementById('cardStageLightbox');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'cardStageLightbox';
            lightbox.className = 'card-stage-lightbox';
            document.body.appendChild(lightbox);
        }
        const safeName = escapeHtmlAttr(petName || '宠物');
        const safeLabel = escapeHtmlAttr(stageLabel || '成长阶段');
        lightbox.innerHTML = `
            <div class="card-stage-lightbox-backdrop" onclick="CardCollection.closeStageLightbox()"></div>
            <div class="card-stage-lightbox-panel" role="dialog" aria-modal="true" aria-label="${safeName} ${safeLabel} 大图" onclick="event.stopPropagation()">
                <button type="button" class="card-stage-lightbox-close" onclick="CardCollection.closeStageLightbox()" aria-label="关闭大图">&times;</button>
                <div class="card-stage-lightbox-copy">
                    <span>成长阶段大图</span>
                    <strong>${safeName}</strong>
                    <p>${safeLabel}</p>
                </div>
                <div class="card-stage-lightbox-frame">
                    <img src="${escapeHtmlAttr(imageUrl)}" alt="${safeName} ${safeLabel}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                    <div class="card-stage-lightbox-fallback" style="display:none;">🐾</div>
                </div>
            </div>`;
        lightbox.classList.add('show');
    }

    function closeStageLightbox() {
        const lightbox = document.getElementById('cardStageLightbox');
        if (lightbox) lightbox.classList.remove('show');
    }

    function init() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const parsed = saved ? JSON.parse(saved) : [];
            _cards = Array.isArray(parsed)
                ? parsed.filter((id) => typeof id === 'string' && id.length > 0)
                : [];
        } catch (error) {
            _cards = [];
            console.warn('[CardCollection] failed to parse stored cards; using an empty collection', error);
        }
        syncSpeciesFromPetSystem();
        void loadLoreData();
    }

    function getCollectedIds() {
        return _cards.slice();
    }

    function addCard(petId) {
        if (!_cards.includes(petId)) {
            _cards.push(petId);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_cards));
            _calculateSeriesStats();
            checkSeriesRewards(petId);
            return true;
        }
        return false;
    }

    function _calculateSeriesStats() {
        _seriesStats = {};
        _allSpecies.forEach(s => {
            const series = s.series || '经典';
            if (!_seriesStats[series]) _seriesStats[series] = { total: 0, collected: 0 };
            _seriesStats[series].total++;
            if (_cards.includes(s.id)) _seriesStats[series].collected++;
        });
    }

    function checkSeriesRewards(newPetId) {
        const pet = _allSpecies.find(s => s.id === newPetId);
        if (!pet) return;
        const series = pet.series || '经典';
        const stats = _seriesStats[series];
        if (stats && stats.collected === stats.total) {
            const awarded = JSON.parse(localStorage.getItem('petbank_awarded_series') || '[]');
            if (!awarded.includes(series)) {
                awarded.push(series);
                localStorage.setItem('petbank_awarded_series', JSON.stringify(awarded));
                if (typeof InventorySystem !== 'undefined' && InventorySystem.addItem) {
                    InventorySystem.addItem('arena_ticket', REWARD_TICKETS_PER_SERIES);
                    if (typeof showToast === 'function') showToast(`🎉 系列「${series}」收集完成！+${REWARD_TICKETS_PER_SERIES} 训练券`);
                }
            }
        }
    }

    function renderUI(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        _lastContainerId = containerId;
        syncSpeciesFromPetSystem();
        if (shouldWaitForPetCatalog()) {
            renderCatalogLoading(container);
            requestCatalogRender(containerId);
            return;
        }

        // 统计
        const totalCollected = _cards.length;
        const totalPossible = _allSpecies.length;
        const rarityCounts = { common: 0, rare: 0, epic: 0, legendary: 0 };
        _cards.forEach(id => { const p = _allSpecies.find(s => s.id === id); if (p && rarityCounts[p.rarity] !== undefined) rarityCounts[p.rarity]++; });
        const currentGallery = getGalleryById(_selectedGallery);
        const petsInGalleryScope = _selectedGallery === 'all' ? _allSpecies : getGalleryPets(_selectedGallery);
        const scopeCollected = petsInGalleryScope.filter((pet) => _cards.includes(pet.id)).length;
        const currentBooklets = _selectedGallery === 'all' ? [] : getBookletsForGallery(_selectedGallery);
        if (_selectedBooklet !== 'all' && !currentBooklets.some((booklet) => booklet.id === _selectedBooklet)) {
            _selectedBooklet = 'all';
        }
        const currentBooklet = _selectedGallery === 'all' ? null : getBookletById(_selectedGallery, _selectedBooklet);
        const filteredPets = _selectedBooklet === 'all'
            ? petsInGalleryScope
            : petsInGalleryScope.filter((pet) => isPetInBooklet(pet, _selectedGallery, _selectedBooklet));
        const totalPercent = totalPossible ? Math.round(totalCollected / totalPossible * 100) : 0;
        const scopePercent = petsInGalleryScope.length ? Math.round(scopeCollected / petsInGalleryScope.length * 100) : 0;
        const currentHallLabel = currentGallery ? currentGallery.name : '图鉴馆目录';
        const currentSeriesLabel = currentBooklet
            ? currentBooklet.name
            : (currentGallery ? '本馆全部' : '点击下方分馆进入');
        const currentScopeNote = currentBooklet
            ? `${currentBooklet.subtitle} · 继续翻看这一册中的伙伴。`
            : (currentGallery ? currentGallery.summary : '点击下方任意分馆，会进入对应的专属图鉴页、主题册和完整馆藏。');
        const currentScopeCountText = currentGallery
            ? `${scopeCollected} / ${petsInGalleryScope.length} 已登记`
            : `${GALLERY_ORDER.length} 座分馆待浏览`;
        const gridIntro = currentBooklet
            ? `${currentBooklet.name}检索区 · 点击任意宠物卡片，可查看成长阶段、故事描述与能力面板。`
            : (currentGallery
                ? `${currentGallery.name}检索区 · 点击任意宠物卡片，可查看成长阶段、故事描述与能力面板。`
                : '先选择一个分馆，再进入对应图鉴页继续翻看完整馆藏。');
        const themeTitle = currentGallery ? `${currentGallery.name} · 主题册` : '分馆目录';
        const themeNote = currentGallery
            ? '按题材继续翻册，浏览会比直接看原始系列更清楚。'
            : '每一座分馆都会进入独立图鉴页，里面有代表卡、馆藏说明和完整宠物卡。';

        let html = `<div class="card-collection-shell">`;
        const travelMemories = window.TravelMemory?.getAll?.() || [];
        const travelCardsHtml = travelMemories.length
            ? `<section class="travel-memory-gallery" aria-label="旅行记忆收藏"><div class="travel-memory-gallery-head"><div><div class="card-overview-kicker">旅行记忆</div><h3>宠物带回来的小卡片</h3></div><span>${travelMemories.length} 张</span></div><div class="travel-memory-gallery-grid">${travelMemories.map((memory) => {
                const hasBackground = window.TravelMemory?.isRenderableAsset?.(memory, 'cardAsset');
                const hasFrame = window.TravelMemory?.isRenderableAsset?.(memory, 'petCardAsset');
                const pet = memory.pet || null;
                const petImage = pet?.image
                    ? `<img class="travel-memory-pet" src="${escapeHtmlAttr(resolveAssetUrl(pet.image))}" alt="${escapeHtmlAttr(pet.name || '我的宠物')}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="travel-memory-pet-fallback" hidden>${escapeHtmlAttr(pet.emoji || memory.icon || '🐾')}</span>`
                    : `<span class="travel-memory-pet-fallback">${escapeHtmlAttr(pet?.emoji || memory.icon || '🐾')}</span>`;
                const background = hasBackground
                    ? `<img class="travel-memory-card-bg" src="${escapeHtmlAttr(resolveAssetUrl(memory.cardAsset))}" alt="" aria-hidden="true" onerror="this.hidden=true">`
                    : '';
                const frame = hasFrame
                    ? `<img class="travel-memory-card-frame" src="${escapeHtmlAttr(memory.petCardAsset)}" alt="" aria-hidden="true" onerror="this.hidden=true">`
                    : '';
                const petLabel = pet ? `${pet.name || '我的宠物'} · ${pet.stage || '成长中'}` : '我的宠物 · 旅行中';
                return `<article class="travel-memory-gallery-card"><div class="travel-memory-gallery-art travel-memory-card-composition">${background}<div class="travel-memory-card-css-fallback" aria-hidden="true">${escapeHtmlAttr(memory.icon)}</div>${frame}<div class="travel-memory-card-pet">${petImage}</div></div><strong>${escapeHtmlAttr(memory.title)}</strong><small>${escapeHtmlAttr(petLabel)}<br>${escapeHtmlAttr(memory.returnText)}</small><em>${escapeHtmlAttr(memory.nextPreview)}</em></article>`;
            }).join('')}</div></section>`
            : '';
        html += travelCardsHtml;

        // === 图鉴馆首页总览 ===
        html += `<section class="card-overview-panel"><div class="card-overview-grid">
            <article class="card-overview-hero">
                <div class="card-overview-kicker">宠物图鉴馆</div>
                <h2 class="card-overview-heading">已登记 ${totalCollected} 位伙伴</h2>
                <p class="card-overview-copy">总馆进度 ${totalPercent}% · 越多伙伴加入，图鉴馆的故事就越完整。</p>
                <div class="card-overview-meter">
                    <strong>${totalCollected} / ${totalPossible}</strong>
                    <span>总馆收集进度</span>
                </div>
                <div class="card-overview-bar"><div class="card-overview-fill" style="width:${totalPercent}%"></div></div>
            </article>
            <article class="card-overview-side">
                <div class="card-overview-title">稀有度分布</div>
                <div class="card-overview-rarity-list">
                    <div class="card-overview-rarity rarity-common"><span>柔光</span><strong>${rarityCounts.common}</strong></div>
                    <div class="card-overview-rarity rarity-rare"><span>闪亮</span><strong>${rarityCounts.rare}</strong></div>
                    <div class="card-overview-rarity rarity-epic"><span>珍藏</span><strong>${rarityCounts.epic}</strong></div>
                    <div class="card-overview-rarity rarity-legendary"><span>馆藏</span><strong>${rarityCounts.legendary}</strong></div>
                </div>
            </article>
            <article class="card-overview-side">
                <div class="card-overview-title">当前展区</div>
                <div class="card-overview-current">${currentHallLabel}</div>
                <div class="card-overview-current-sub">${currentSeriesLabel}</div>
                <div class="card-overview-current-count">${currentScopeCountText}</div>
                <p class="card-overview-note">${currentScopeNote}</p>
                <div class="card-overview-bar compact"><div class="card-overview-fill" style="width:${currentGallery ? scopePercent : totalPercent}%"></div></div>
            </article>
        </div></section>`;

        if (_selectedGallery === 'all') {
            html += `<section class="card-filter-panel">
                <div class="card-theme-strip">
                    <div class="card-theme-head">
                        <div class="card-theme-title">${themeTitle}</div>
                        <div class="card-theme-note">${themeNote}</div>
                    </div>
                </div>
                <div class="card-gallery-row">`;
            GALLERY_ORDER.forEach(galleryId => {
                const gallery = getGalleryById(galleryId);
                if (!gallery) return;
                const pets = getGalleryPets(galleryId);
                if (!pets.length) return;
                const collected = getGalleryCollectedCount(galleryId);
                const percent = Math.round(collected / pets.length * 100);
                html += `
                <button type="button" class="card-gallery-card" onclick="CardCollection.setView('gallery','${galleryId}')">
                    <div class="card-gallery-card-media" style="background:${gallery.gradient}">
                        <img class="card-gallery-cover-image" src="${resolveAssetUrl(gallery.coverImage)}" alt="${gallery.name}" loading="lazy" style="object-position:${gallery.coverPosition || 'center 42%'}">
                        <div class="card-gallery-cover-scrim"></div>
                        <div class="card-gallery-cover-progress">${collected} / ${pets.length}</div>
                        <div class="card-gallery-card-body">
                            <div class="card-gallery-name">${gallery.name}</div>
                            <div class="card-gallery-blurb">${gallery.cardIntro || gallery.summary}</div>
                            <div class="card-gallery-bar"><div class="card-gallery-fill" style="width:${percent}%"></div></div>
                        </div>
                    </div>
                </button>`;
            });
            html += `</div>
                <div class="card-theme-empty">点击任意分馆封面，会进入对应的专属图鉴页；那里会展开代表卡、馆藏说明、主题册和完整宠物卡。</div>
            </section>`;
            html += `</div>`;
            container.innerHTML = html;
            return;
        }

        const hallPreviewStack = renderPreviewStackHtml(_selectedGallery, 'large');
        html += `<section class="card-hall-hero">
            <button type="button" class="card-hall-back" onclick="CardCollection.setView('gallery','all')">返回图鉴馆首页</button>
            <div class="card-hall-hero-grid">
                <article class="card-hall-hero-cover" style="background:${currentGallery.gradient}">
                    <img class="card-hall-cover-image" src="${resolveAssetUrl(currentGallery.coverImage)}" alt="${currentGallery.name}" loading="lazy" style="object-position:${currentGallery.coverPosition || 'center 42%'}">
                    <div class="card-hall-cover-scrim"></div>
                    <div class="card-hall-cover-badge">${getGalleryIconMarkup(currentGallery.accent)}</div>
                    <div class="card-hall-cover-meta">
                        <div class="card-hall-cover-kicker">${currentGallery.subtitle}</div>
                        <div class="card-hall-cover-count">${scopeCollected} / ${petsInGalleryScope.length} 已登记</div>
                    </div>
                    ${hallPreviewStack}
                </article>
                <article class="card-hall-hero-copy">
                    <div class="card-hall-copy-kicker">分馆导览</div>
                    <h2 class="card-hall-title">${currentGallery.name}</h2>
                    <p class="card-hall-intro">${currentGallery.hallIntro}</p>
                    <div class="card-hall-tags">
                        ${(currentGallery.hallTags || []).map((tag) => `<span class="card-hall-tag">${tag}</span>`).join('')}
                    </div>
                    <div class="card-hall-points">
                        ${(currentGallery.hallHighlights || []).map((item) => `<div class="card-hall-point">${item}</div>`).join('')}
                    </div>
                </article>
            </div>
        </section>`;

        html += `<section class="card-filter-panel">
            <div class="card-theme-strip">
                <div class="card-theme-head">
                    <div class="card-theme-title">${themeTitle}</div>
                    <div class="card-theme-note">${themeNote}</div>
                </div>
            </div>
            <div class="card-theme-booklets">`;
        html += `<button class="card-booklet-card${_selectedBooklet === 'all' ? ' active' : ''}" onclick="CardCollection.setView('booklet','all')">
                <div class="card-booklet-kicker">整馆总览</div>
                <div class="card-booklet-name">本馆全部</div>
                <div class="card-booklet-subtitle">${currentGallery.summary}</div>
                <div class="card-booklet-count">${scopeCollected}/${petsInGalleryScope.length}</div>
            </button>`;
        currentBooklets.forEach((booklet) => {
            const count = petsInGalleryScope.filter((pet) => booklet.series.includes(pet.series || '')).length;
            const collected = petsInGalleryScope.filter((pet) => booklet.series.includes(pet.series || '') && _cards.includes(pet.id)).length;
            const active = booklet.id === _selectedBooklet ? ' active' : '';
            html += `<button class="card-booklet-card${active}" onclick="CardCollection.setView('booklet','${booklet.id}')">
                    <div class="card-booklet-kicker">主题册</div>
                    <div class="card-booklet-name">${booklet.name}</div>
                    <div class="card-booklet-subtitle">${booklet.subtitle} · ${booklet.series.map(getSeriesDisplayLabel).join(' / ')}</div>
                    <div class="card-booklet-count">${collected}/${count}</div>
                </button>`;
        });
        html += `</div></section>`;

        html += `<section class="card-grid-section">
            <div class="card-grid-heading">
                <div class="card-section-title">${filteredPets.length} 种</div>
                <p class="card-grid-intro">${gridIntro}</p>
            </div>`;
        html += `<div class="card-grid">`;

        filteredPets.forEach(s => {
            const isCollected = _cards.includes(s.id);
            const rarityClass = `card-rarity-${s.rarity || 'common'}`;
            const img2 = (s.imageStages && s.imageStages['2']) || s.imageUrl;
            const portrait = `<span class="card-emoji-big">${s.emoji || '🐾'}</span>`;
            const sv = (v) => (v != null && v !== undefined) ? v : '-';
            const statsHtml = `
                <div class="card-stat card-stat-hp">❤${sv(s.base_hp)}</div>
                <div class="card-stat card-stat-spd">✦${sv(s.base_spd)}</div>
                <div class="card-stat card-stat-def">🛡${sv(s.base_def)}</div>
                <div class="card-stat card-stat-atk">⚔${sv(s.base_atk)}</div>`;
            const seriesHtml = s.series ? `<div class="card-series-tag">${getSeriesDisplayLabel(s.series)}</div>` : '';
            const stateHtml = `<div class="card-collect-state-badge ${isCollected ? 'collected' : 'uncollected'}">${isCollected ? '已收录' : '待发现'}</div>`;
            const specHtml = `<div class="card-card-spec">${getRarityLabel(s.rarity)} · ${getSourceLabel(s.source)}</div>`;
            const uncollectedClass = isCollected ? '' : ' uncollected';
            const composedSrc = getComposedCardImagePath(s.id);
            const legacyCardHtml = `
                ${seriesHtml}
                <div class="card-portrait">${portrait}</div>
                ${statsHtml}
                <div class="card-card-footer">
                    <div class="card-name">${s.name}</div>
                    ${specHtml}
                </div>`;
            html += `
            <div class="card-item card-item-book card-composed-v2${uncollectedClass} ${rarityClass}" onclick="CardCollection.showDetail('${s.id}')">
                ${stateHtml}
                <div class="card-composed-v2-shell">
                    <div class="card-composed-v2-fallback">
                        ${legacyCardHtml}
                    </div>
                    <img class="card-composed-v2-img" src="${composedSrc}" alt="${s.name}" loading="lazy" data-fallback-src="${escapeHtmlAttr(img2 || '')}" data-fallback-alt="${escapeHtmlAttr(s.name)}" data-fallback-emoji="${escapeHtmlAttr(s.emoji || '🐾')}" onerror="CardCollection.handleComposedCardImageError(this)">
                </div>
            </div>`;
        });

        html += `</div></section></div>`;
        container.innerHTML = html;
    }

    // 兼容旧 API
    function _renderGrid() { renderUI(_lastContainerId); }
    function _renderCategory() { renderUI(_lastContainerId); }

    function showDetail(petId) {
        const pet = _allSpecies.find(s => s.id === petId);
        if (!pet) return;
        const isCollected = _cards.includes(petId);
        const modal = document.getElementById('cardDetailModal');
        if (!modal) return;
        const detailMeta = getDetailMeta(pet);
        const stageEntries = getStageEntries(pet);
        const highlightedStage = getHighlightedStageIndex(pet, stageEntries);
        const rarity = pet.rarity || 'common';
        const rarityLabel = getRarityLabel(rarity);
        const sourceLabel = getSourceLabel(pet.source);
        const portrait = pet.imageUrl
            ? `<img class="card-detail-hero-image" src="${resolveAssetUrl(pet.imageUrl)}" alt="${pet.name}" onerror="this.outerHTML='<div class=\\'card-detail-hero-fallback\\'>${pet.emoji || '🐾'}</div>'">`
            : `<div class="card-detail-hero-fallback">${pet.emoji || '🐾'}</div>`;
        const traitsHtml = detailMeta.traits.map(trait => `<span class="card-detail-trait">${trait}</span>`).join('');
        const dossierEntries = Array.isArray(detailMeta.dossierEntries) ? detailMeta.dossierEntries : [];
        const dossierHtml = dossierEntries.map((entry) => `
            <div class="card-detail-dossier-item">
                <span class="card-detail-dossier-label">${entry.label}</span>
                <strong>${entry.value}</strong>
            </div>`).join('');
        const skillsHtml = detailMeta.skills.map(skill => `
            <div class="card-detail-skill">
                <strong>${skill.name}</strong>
                <p>${skill.desc}</p>
            </div>`).join('');
        const stageHtml = stageEntries.map((stage, index) => {
            const activeClass = stage.index === highlightedStage ? ' active' : '';
            const label = detailMeta.stageLabels[index] || stage.label || `阶段 ${index + 1}`;
            return `
                <button type="button" class="card-detail-stage${activeClass}" onclick="CardCollection.openStageLightbox('${escapeJsString(stage.imageUrl)}','${escapeJsString(pet.name)}','${escapeJsString(label)}')" aria-label="查看 ${escapeHtmlAttr(pet.name)} ${escapeHtmlAttr(label)} 大图">
                    <div class="card-detail-stage-frame">
                        <img src="${escapeHtmlAttr(stage.imageUrl)}" alt="${escapeHtmlAttr(pet.name)} ${escapeHtmlAttr(label)}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                        <div class="card-detail-stage-fallback" style="display:none;">${pet.emoji || '🐾'}</div>
                    </div>
                    <div class="card-detail-stage-label">${escapeHtmlAttr(label)}</div>
                    <div class="card-detail-stage-hint">点击放大</div>
                </button>`;
        }).join('');
        modal.innerHTML = `
            <div class="card-modal-overlay" onclick="CardCollection.closeDetail()"></div>
            <div class="card-modal-content card-modal-content-book">
                <div class="card-detail-shell">
                    <button class="close-btn" onclick="CardCollection.closeDetail()">&times;</button>
                    <div class="card-detail-main">
                        <section class="card-detail-hero">
                            <div class="card-detail-rarity">${getRarityBadge(rarity)} · ${rarityLabel}</div>
                            <div class="card-detail-series">${getSeriesDisplayLabel(pet.series)}</div>
                            <div class="card-detail-hero-art">
                                ${portrait}
                            </div>
                            <div class="card-detail-codex-no">No.${pet.id || pet.name}</div>
                            <div class="card-detail-exhibit">${detailMeta.exhibitNote}</div>
                        </section>
                        <section class="card-detail-info">
                            <div class="card-detail-kicker">${detailMeta.codexTitle}</div>
                            <h2 class="card-detail-name">${pet.name}</h2>
                            <p class="card-detail-subtitle">${detailMeta.subtitle}</p>
                            <div class="card-detail-meta">
                                <span>来源：${sourceLabel}</span>
                                <span>系列：${getSeriesDisplayLabel(pet.series)}</span>
                                ${detailMeta.origin ? `<span>来自：${detailMeta.origin}</span>` : ''}
                                ${detailMeta.sceneName ? `<span>出现场景：${detailMeta.sceneName}</span>` : ''}
                                <span>收藏：${isCollected ? '已收藏' : '未收集'}</span>
                            </div>
                            <section class="card-detail-story">
                                <h3>宠物故事</h3>
                                ${detailMeta.intro ? `<p>${detailMeta.intro}</p>` : ''}
                                <p>${detailMeta.story}</p>
                            </section>
                            ${(dossierEntries.length || detailMeta.sceneId)
                                ? `<section class="card-detail-dossier">
                                    <h3>角色档案</h3>
                                    ${dossierEntries.length ? `<div class="card-detail-dossier-grid">${dossierHtml}</div>` : ''}
                                    ${detailMeta.sceneId
                                        ? `<button type="button" class="card-detail-scene-cta" onclick="CardCollection.openSceneInvestigation('${detailMeta.sceneId}')">去${detailMeta.sceneName || '对应场景'}继续调查</button>`
                                        : ''}
                                </section>`
                                : ''}
                            <section class="card-detail-traits">
                                <h3>性格特征</h3>
                                <div class="card-detail-trait-list">${traitsHtml}</div>
                            </section>
                            <section class="card-detail-skills">
                                <h3>代表技能</h3>
                                <div class="card-detail-skill-list">${skillsHtml}</div>
                            </section>
                        </section>
                    </div>
                    <div class="card-detail-lower">
                        <section class="card-detail-stages">
                            <div class="card-detail-section-title">成长阶段</div>
                            <div class="card-detail-stage-strip">${stageHtml}</div>
                        </section>
                        <section class="card-detail-stats-panel">
                            <div class="card-detail-section-title">能力面板</div>
                            <div class="card-detail-stat-grid">
                                <div class="stat-box"><span>${CARD_STAT_LABELS.base_hp}</span><strong>${sv(pet.base_hp)}</strong></div>
                                <div class="stat-box"><span>${CARD_STAT_LABELS.base_atk}</span><strong>${sv(pet.base_atk)}</strong></div>
                                <div class="stat-box"><span>${CARD_STAT_LABELS.base_def}</span><strong>${sv(pet.base_def)}</strong></div>
                                <div class="stat-box"><span>${CARD_STAT_LABELS.base_spd}</span><strong>${sv(pet.base_spd)}</strong></div>
                            </div>
                        </section>
                    </div>
                </div>
            </div>`;
        modal.classList.add('show');

        function sv(v) { return (v != null && v !== undefined) ? v : '-'; }
    }

    function closeDetail() {
        closeStageLightbox();
        const modal = document.getElementById('cardDetailModal');
        if (modal) modal.classList.remove('show');
    }

    function openSceneInvestigation(sceneId) {
        closeDetail();
        if (sceneId && typeof ExplorationDetail !== 'undefined' && typeof ExplorationDetail.show === 'function') {
            ExplorationDetail.show(sceneId);
            return;
        }
        if (typeof switchPage === 'function') {
            switchPage('explore');
        }
    }

    return { init, renderUI, addCard, getCollectedIds, showDetail, closeDetail, setView, openStageLightbox, closeStageLightbox, openSceneInvestigation, handleComposedCardImageError };
})();

window.CardCollection = CardCollection;
