(function () {
  const DATA_URL = "../../data/hanzi-questions.json";
  const IMAGE_ROOT = "../../assets/hanzi-img";
  const PLATFORM_ROOT = "./assets/generated/adventure-assets";
  const PET_SPRITE_ROOT = "./assets/generated/pet-sprites";
  const LANE_COUNT = 6;
  const STORAGE_KEY = "minigames_hanzi_bubble_runner_best";
  const launchParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const launchId = String(launchParams.get("petbankLaunch") || "").trim();
  const profileRef = String(launchParams.get("petbankProfile") || "").trim();
  const hostOrigin = (() => {
    try { return document.referrer ? new URL(document.referrer).origin : ""; } catch (error) { return ""; }
  })();
  let completionSent = false;

  function sendCompletion(score, stars) {
    if (completionSent || !launchId || !profileRef || !window.opener || !hostOrigin) return false;
    try {
      window.opener.postMessage({
        type: "petbank.bridge.v1.completed",
        version: 1,
        projectId: "mini-games",
        launchId,
        profileRef,
        activityId: "hanzi-bubble-runner",
        completionId: `run:${launchId}`,
        score: Number(score) || 0,
        stars: Number(stars) || 0,
        occurredAt: new Date().toISOString()
      }, hostOrigin);
      completionSent = true;
      return true;
    } catch (error) {
      console.warn("[hanzi-bubble-runner] completion send failed", error);
      return false;
    }
  }

  const petSpriteFiles = {
    idle: "pet_idle.png",
    run: "pet_run.png",
    jump: "pet_jump.png",
    catch: "pet_catch.png",
    hit: "pet_hit.png",
    celebrate: "pet_celebrate.png"
  };

  const platformImages = [
    "platform_grass_small.png",
    "platform_wood.png",
    "platform_grass_round.png",
    "platform_stone.png",
    "platform_cloud.png",
    "platform_grass_small.png"
  ];

  const stageLayouts = [
    {
      name: "forest-zigzag",
      tier: 0,
      slots: [
        { x: 15, y: 82, bubbleX: 15, bubbleY: 56, asset: 0, scale: 0.92 },
        { x: 31, y: 64, bubbleX: 30, bubbleY: 36, asset: 1, scale: 0.84 },
        { x: 48, y: 75, bubbleX: 48, bubbleY: 47, asset: 2, scale: 0.88 },
        { x: 60, y: 52, bubbleX: 60, bubbleY: 24, asset: 3, scale: 0.78 },
        { x: 76, y: 59, bubbleX: 76, bubbleY: 32, asset: 4, scale: 0.82 },
        { x: 88, y: 37, bubbleX: 87, bubbleY: 14, asset: 0, scale: 0.74 }
      ],
      decor: [
        { x: 8, y: 62, asset: 4, scale: 0.54, layer: "far" },
        { x: 39, y: 90, asset: 2, scale: 0.56, layer: "near" },
        { x: 92, y: 75, asset: 1, scale: 0.58, layer: "far" }
      ]
    },
    {
      name: "short-long-short",
      tier: 0,
      slots: [
        { x: 18, y: 78, bubbleX: 18, bubbleY: 50, asset: 1, scale: 0.86 },
        { x: 36, y: 58, bubbleX: 35, bubbleY: 30, asset: 0, scale: 0.76 },
        { x: 51, y: 70, bubbleX: 51, bubbleY: 42, asset: 3, scale: 0.8 },
        { x: 67, y: 48, bubbleX: 67, bubbleY: 22, asset: 2, scale: 0.76 },
        { x: 82, y: 58, bubbleX: 82, bubbleY: 31, asset: 0, scale: 0.8 },
        { x: 91, y: 33, bubbleX: 90, bubbleY: 14, asset: 4, scale: 0.7 }
      ],
      decor: [
        { x: 27, y: 89, asset: 4, scale: 0.5, layer: "far" },
        { x: 57, y: 86, asset: 1, scale: 0.54, layer: "near" },
        { x: 75, y: 40, asset: 4, scale: 0.48, layer: "far" }
      ]
    },
    {
      name: "branch-back",
      tier: 1,
      slots: [
        { x: 13, y: 83, bubbleX: 13, bubbleY: 57, asset: 2, scale: 0.9 },
        { x: 29, y: 67, bubbleX: 28, bubbleY: 39, asset: 0, scale: 0.8 },
        { x: 43, y: 53, bubbleX: 43, bubbleY: 25, asset: 4, scale: 0.74 },
        { x: 59, y: 66, bubbleX: 59, bubbleY: 39, asset: 1, scale: 0.8 },
        { x: 72, y: 45, bubbleX: 72, bubbleY: 19, asset: 3, scale: 0.74 },
        { x: 87, y: 50, bubbleX: 87, bubbleY: 23, asset: 0, scale: 0.78 }
      ],
      decor: [
        { x: 22, y: 42, asset: 4, scale: 0.46, layer: "far" },
        { x: 51, y: 84, asset: 2, scale: 0.52, layer: "near" },
        { x: 93, y: 72, asset: 1, scale: 0.48, layer: "far" }
      ]
    },
    {
      name: "high-low-high",
      tier: 1,
      slots: [
        { x: 16, y: 76, bubbleX: 16, bubbleY: 49, asset: 0, scale: 0.84 },
        { x: 31, y: 47, bubbleX: 31, bubbleY: 20, asset: 4, scale: 0.72 },
        { x: 45, y: 62, bubbleX: 45, bubbleY: 35, asset: 1, scale: 0.8 },
        { x: 58, y: 83, bubbleX: 58, bubbleY: 56, asset: 2, scale: 0.86 },
        { x: 73, y: 57, bubbleX: 73, bubbleY: 30, asset: 3, scale: 0.76 },
        { x: 88, y: 39, bubbleX: 88, bubbleY: 15, asset: 0, scale: 0.74 }
      ],
      decor: [
        { x: 9, y: 55, asset: 1, scale: 0.5, layer: "far" },
        { x: 38, y: 86, asset: 4, scale: 0.5, layer: "near" },
        { x: 80, y: 78, asset: 2, scale: 0.52, layer: "near" }
      ]
    },
    {
      name: "stair-break",
      tier: 2,
      slots: [
        { x: 14, y: 84, bubbleX: 14, bubbleY: 57, asset: 1, scale: 0.88 },
        { x: 28, y: 71, bubbleX: 29, bubbleY: 45, asset: 0, scale: 0.78 },
        { x: 43, y: 57, bubbleX: 43, bubbleY: 31, asset: 2, scale: 0.78 },
        { x: 62, y: 61, bubbleX: 62, bubbleY: 34, asset: 4, scale: 0.74 },
        { x: 78, y: 41, bubbleX: 78, bubbleY: 17, asset: 3, scale: 0.72 },
        { x: 89, y: 63, bubbleX: 88, bubbleY: 37, asset: 0, scale: 0.76 }
      ],
      decor: [
        { x: 20, y: 48, asset: 4, scale: 0.46, layer: "far" },
        { x: 52, y: 83, asset: 1, scale: 0.54, layer: "near" },
        { x: 96, y: 42, asset: 2, scale: 0.48, layer: "far" }
      ]
    },
    {
      name: "valley-climb",
      tier: 2,
      slots: [
        { x: 13, y: 70, bubbleX: 13, bubbleY: 43, asset: 4, scale: 0.76 },
        { x: 28, y: 86, bubbleX: 28, bubbleY: 59, asset: 2, scale: 0.88 },
        { x: 45, y: 60, bubbleX: 45, bubbleY: 33, asset: 0, scale: 0.76 },
        { x: 60, y: 73, bubbleX: 60, bubbleY: 47, asset: 1, scale: 0.8 },
        { x: 76, y: 48, bubbleX: 76, bubbleY: 22, asset: 3, scale: 0.72 },
        { x: 90, y: 55, bubbleX: 90, bubbleY: 29, asset: 0, scale: 0.76 }
      ],
      decor: [
        { x: 7, y: 88, asset: 1, scale: 0.48, layer: "near" },
        { x: 35, y: 45, asset: 4, scale: 0.46, layer: "far" },
        { x: 69, y: 86, asset: 2, scale: 0.52, layer: "near" }
      ]
    },
    {
      name: "double-peak",
      tier: 2,
      slots: [
        { x: 15, y: 82, bubbleX: 15, bubbleY: 55, asset: 0, scale: 0.86 },
        { x: 30, y: 54, bubbleX: 30, bubbleY: 27, asset: 3, scale: 0.72 },
        { x: 45, y: 79, bubbleX: 45, bubbleY: 52, asset: 1, scale: 0.84 },
        { x: 60, y: 51, bubbleX: 60, bubbleY: 25, asset: 4, scale: 0.72 },
        { x: 75, y: 70, bubbleX: 75, bubbleY: 44, asset: 2, scale: 0.78 },
        { x: 89, y: 38, bubbleX: 89, bubbleY: 14, asset: 0, scale: 0.7 }
      ],
      decor: [
        { x: 8, y: 48, asset: 4, scale: 0.46, layer: "far" },
        { x: 52, y: 91, asset: 2, scale: 0.5, layer: "near" },
        { x: 95, y: 68, asset: 1, scale: 0.5, layer: "far" }
      ]
    }
  ];

  const difficultySteps = [
    { minScore: 0, tier: 0, floatMs: 2500, drift: 0, decoys: "easy", feedback: "热身路线，先看清任务。" },
    { minScore: 3, tier: 1, floatMs: 2100, drift: 5, decoys: "similar", feedback: "路线开始绕一点，相近字会出现。" },
    { minScore: 7, tier: 2, floatMs: 1750, drift: 10, decoys: "similar", feedback: "挑战路线，气泡会轻轻移动。" }
  ];

  const similarChars = {
    日: ["目", "田", "白"],
    目: ["日", "自", "月"],
    田: ["日", "目", "口"],
    口: ["日", "田", "回"],
    木: ["本", "术", "林"],
    林: ["木", "森", "树"],
    云: ["去", "雨", "风"],
    雨: ["云", "两", "雪"],
    风: ["凤", "飞", "云"],
    马: ["妈", "鸟", "牛"],
    鸟: ["乌", "马", "鸡"],
    水: ["火", "河", "海"],
    火: ["水", "光", "灯"],
    石: ["右", "岩", "山"],
    山: ["石", "出", "田"],
    月: ["目", "日", "明"],
    明: ["朋", "月", "日"],
    河: ["海", "水", "可"],
    海: ["河", "水", "每"],
    书: ["本", "笔", "写"],
    笔: ["毛", "书", "竹"],
    车: ["东", "连", "船"],
    船: ["车", "舟", "河"],
    花: ["草", "化", "树"],
    草: ["花", "早", "树"],
    树: ["林", "木", "草"],
    星: ["日", "光", "醒"],
    光: ["火", "日", "明"]
  };

  const fallbackItems = [
    { char: "山", pinyin: "shan", example: "我们一起去爬**山**。", opts: ["山", "水", "火", "木"] },
    { char: "水", pinyin: "shui", example: "小鱼在**水**里游。", opts: ["水", "火", "山", "石"] },
    { char: "火", pinyin: "huo", example: "冬天烤**火**真暖和。", opts: ["火", "水", "木", "日"] },
    { char: "木", pinyin: "mu", example: "这是一棵大**木**头。", opts: ["木", "日", "月", "石"] },
    { char: "日", pinyin: "ri", example: "**日**头升起来了。", opts: ["日", "月", "石", "田"] }
  ];

  const dom = {
    runnerScene: document.getElementById("runnerScene"),
    missionImage: document.getElementById("missionImage"),
    missionPinyin: document.getElementById("missionPinyin"),
    missionSentence: document.getElementById("missionSentence"),
    voiceButton: document.getElementById("voiceButton"),
    timeLeft: document.getElementById("timeLeft"),
    comboText: document.getElementById("comboText"),
    starText: document.getElementById("starText"),
    rankText: document.getElementById("rankText"),
    comboFill: document.getElementById("comboFill"),
    goalFill: document.getElementById("goalFill"),
    goalLabel: document.getElementById("goalLabel"),
    laneField: document.getElementById("laneField"),
    runnerPet: document.getElementById("runnerPet"),
    startPanel: document.getElementById("startPanel"),
    startButton: document.getElementById("startButton"),
    resultPanel: document.getElementById("resultPanel"),
    resultStars: document.getElementById("resultStars"),
    resultTitle: document.getElementById("resultTitle"),
    resultDetail: document.getElementById("resultDetail"),
    recordDetail: document.getElementById("recordDetail"),
    reviewList: document.getElementById("reviewList"),
    restartButton: document.getElementById("restartButton"),
    bestLine: document.getElementById("bestLine"),
    feedback: document.getElementById("feedback")
  };

  const state = {
    phase: "ready",
    data: fallbackItems,
    targetIndex: 0,
    lane: 2,
    score: 0,
    combo: 0,
    bestCombo: 0,
    timeLeft: 60,
    goal: 12,
    misses: 0,
    reviewChars: [],
    bubbles: [],
    layoutIndex: 0,
    layout: stageLayouts[0],
    difficulty: difficultySteps[0],
    lastDifficultyTier: 0,
    timer: null,
    petPoseTimer: null,
    audioContext: null,
    bestRecord: loadBestRecord(),
    petSpritesReady: false,
    petPose: "idle",
    speechEnabled: "speechSynthesis" in window
  };

  function loadBestRecord() {
    try {
      const raw = window.localStorage && window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { score: 0, combo: 0, stars: 0, rounds: 0 };
      const record = JSON.parse(raw);
      return {
        score: Number(record.score) || 0,
        combo: Number(record.combo) || 0,
        stars: Number(record.stars) || 0,
        rounds: Number(record.rounds) || 0
      };
    } catch (error) {
      return { score: 0, combo: 0, stars: 0, rounds: 0 };
    }
  }

  function saveBestRecord(record) {
    state.bestRecord = record;
    try {
      if (window.localStorage) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch (error) {
      // Local storage can be unavailable in some embedded browsers; the in-memory record still works.
    }
  }

  function cleanPinyin(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ü/g, "v")
      .toLowerCase();
  }

  function cleanSentence(example, char) {
    const text = String(example || `找到 **${char}** 这个字。`);
    return text.replace(`**${char}**`, "＿").replace(/\*\*/g, "");
  }

  function normalizeItem(item) {
    const char = item.char || item.answer || "山";
    const opts = Array.isArray(item.opts) && item.opts.length ? item.opts : [char];
    return {
      char,
      pinyin: cleanPinyin(item.pinyin || ""),
      example: item.example || `找到 **${char}** 这个字。`,
      sentence: cleanSentence(item.example, char),
      opts: Array.from(new Set([char, ...opts])).slice(0, 5)
    };
  }

  async function loadData() {
    try {
      const response = await fetch(DATA_URL);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const levels = payload && payload.levels ? Object.values(payload.levels).flat() : [];
      state.data = levels.map(normalizeItem).filter((item) => item.char);
    } catch (error) {
      state.data = fallbackItems.map(normalizeItem);
      console.warn("使用内置汉字题库。", error);
    }
  }

  function testImage(url) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = url;
    });
  }

  async function loadPetSprites() {
    const entries = Object.entries(petSpriteFiles);
    const checks = await Promise.all(entries.map(([, file]) => testImage(`${PET_SPRITE_ROOT}/${file}`)));
    state.petSpritesReady = checks.every(Boolean);
    setPetPose("idle");
  }

  function shuffle(items) {
    const next = [...items];
    for (let index = next.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
    }
    return next;
  }

  function getTarget() {
    return state.data[state.targetIndex % state.data.length] || fallbackItems[0];
  }

  function getDifficulty() {
    return [...difficultySteps].reverse().find((step) => state.score >= step.minScore) || difficultySteps[0];
  }

  function makeBubbles() {
    const target = getTarget();
    const pool = state.data
      .map((item) => item.char)
      .filter((char) => char && char !== target.char);
    const priorityDistractors = state.difficulty.decoys === "similar"
      ? [...(similarChars[target.char] || []), ...target.opts.filter((char) => char !== target.char)]
      : [...target.opts.filter((char) => char !== target.char), ...(similarChars[target.char] || [])];
    const distractorPool = Array.from(new Set([...priorityDistractors, ...pool]))
      .filter((char) => char && char !== target.char);
    const distractors = shuffle(distractorPool).slice(0, LANE_COUNT - 1);
    while (distractors.length < LANE_COUNT - 1) {
      const filler = pool[Math.floor(Math.random() * pool.length)];
      if (filler && filler !== target.char && !distractors.includes(filler)) distractors.push(filler);
    }
    const chars = shuffle([target.char, ...distractors]).slice(0, LANE_COUNT);
    if (!chars.includes(target.char)) chars[Math.floor(Math.random() * chars.length)] = target.char;

    state.bubbles = chars.map((char, index) => ({
      id: `${state.targetIndex}-${index}-${char}`,
      char,
      isCorrect: char === target.char,
      drift: state.difficulty.drift ? (index % 2 === 0 ? -state.difficulty.drift : state.difficulty.drift) : 0
    }));
  }

  function chooseLayout() {
    state.difficulty = getDifficulty();
    const available = stageLayouts.filter((layout) => layout.tier <= state.difficulty.tier);
    let nextIndex = Math.floor(Math.random() * available.length);
    const currentName = state.layout && state.layout.name;
    if (available.length > 1 && available[nextIndex].name === currentName) {
      nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (available.length - 1))) % available.length;
    }
    state.layoutIndex = stageLayouts.indexOf(available[nextIndex]);
    state.layout = available[nextIndex];
  }

  function speakTarget(force = false) {
    if (!state.speechEnabled || (!force && state.phase !== "playing")) return;
    const target = getTarget();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(`找 ${target.char}。${target.example.replace(/\*\*/g, "")}`);
    utterance.lang = "zh-CN";
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  }

  function updateMission() {
    const target = getTarget();
    dom.missionImage.onerror = () => {
      dom.missionImage.onerror = null;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect x="4" y="4" width="88" height="88" rx="24" fill="#fef3c7" stroke="#d97706" stroke-width="5"/><text x="48" y="62" text-anchor="middle" font-size="48" font-weight="900" fill="#1e1b4b" font-family="Microsoft YaHei, Noto Sans SC, sans-serif">${target.char}</text></svg>`;
      dom.missionImage.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
      dom.missionImage.classList.add("is-missing");
    };
    dom.missionImage.classList.remove("is-missing");
    dom.missionImage.src = `${IMAGE_ROOT}/${encodeURIComponent(target.char)}.webp`;
    dom.missionImage.alt = target.char;
    dom.missionPinyin.textContent = target.pinyin || "hanzi";
    dom.missionSentence.textContent = target.sentence;
  }

  function updateHud() {
    state.difficulty = getDifficulty();
    const progress = Math.min(100, (state.score / state.goal) * 100);
    const rankLabels = ["热身", "绕路", "挑战"];
    dom.timeLeft.textContent = `${state.timeLeft}s`;
    dom.timeLeft.dataset.warn = state.timeLeft <= 10 ? "true" : "false";
    dom.comboText.textContent = `连击 ${state.combo}`;
    dom.starText.textContent = `${state.score}/${state.goal}`;
    dom.rankText.textContent = rankLabels[state.difficulty.tier] || "挑战";
    dom.comboFill.style.width = `${Math.min(100, state.combo * 12)}%`;
    dom.goalFill.style.width = `${progress}%`;
    dom.goalLabel.textContent = `目标 ${state.score}/${state.goal}`;
  }

  function updateBestLine() {
    const record = state.bestRecord;
    const text = `最佳 ${record.score}/${state.goal} / 连击 ${record.combo}`;
    dom.bestLine.textContent = record.rounds > 0 ? `${text} / ${record.rounds}局` : text;
  }

  function laneMetrics(index) {
    return state.layout.slots[index] || stageLayouts[0].slots[index] || stageLayouts[0].slots[0];
  }

  function renderLanes() {
    dom.laneField.innerHTML = "";
    state.layout.decor.forEach((item) => {
      const deco = document.createElement("div");
      deco.className = `platform platform-deco is-${item.layer}`;
      deco.style.left = `${item.x}%`;
      deco.style.top = `${item.y}%`;
      deco.style.setProperty("--platform-scale", item.scale);
      deco.innerHTML = `<img src="${PLATFORM_ROOT}/${platformImages[item.asset % platformImages.length]}" alt="">`;
      dom.laneField.append(deco);
    });

    state.bubbles.forEach((bubble, index) => {
      const slot = laneMetrics(index);
      const { x, y } = slot;
      const lane = document.createElement("div");
      lane.className = "lane";
      lane.style.top = `${y}%`;

      const platform = document.createElement("div");
      platform.className = `platform${index === state.lane ? " is-active" : ""}`;
      platform.style.left = `${x}%`;
      platform.style.setProperty("--platform-scale", slot.scale || 0.8);
      platform.innerHTML = `<img src="${PLATFORM_ROOT}/${platformImages[(slot.asset ?? index) % platformImages.length]}" alt="">`;

      const bubbleButton = document.createElement("button");
      bubbleButton.type = "button";
      bubbleButton.className = `bubble${index === state.lane ? " is-near" : ""}`;
      bubbleButton.style.setProperty("--bubble-art", `url("${PLATFORM_ROOT}/${index === state.lane ? "bubble_gold.png" : "bubble_normal.png"}")`);
      bubbleButton.style.setProperty("--float-delay", `${index * -180}ms`);
      bubbleButton.style.setProperty("--float-duration", `${state.difficulty.floatMs - (state.combo > 3 ? 150 : 0)}ms`);
      bubbleButton.style.setProperty("--drift-x", `${bubble.drift}px`);
      bubbleButton.style.setProperty("--bubble-scale", `${state.difficulty.tier >= 2 && !bubble.isCorrect ? 0.92 : 1}`);
      bubbleButton.dataset.index = String(index);
      bubbleButton.style.left = `${slot.bubbleX ?? x}%`;
      bubbleButton.style.top = `${Math.max(12, slot.bubbleY ?? y - 30)}%`;
      bubbleButton.setAttribute("aria-label", `接住 ${bubble.char}`);
      bubbleButton.textContent = bubble.char;
      bubbleButton.addEventListener("click", () => {
        if (state.phase !== "playing") return;
        moveToLane(index);
        window.setTimeout(() => catchBubble(index), 90);
      });

      lane.append(platform);
      dom.laneField.append(lane, bubbleButton);
    });

    positionPet();
  }

  function positionPet() {
    const { x, y } = laneMetrics(state.lane);
    const fieldRect = dom.laneField.getBoundingClientRect();
    const sceneRect = document.getElementById("runnerScene").getBoundingClientRect();
    const left = fieldRect.left - sceneRect.left + (fieldRect.width * x / 100);
    const top = fieldRect.top - sceneRect.top + (fieldRect.height * (y + 2) / 100);
    dom.runnerPet.style.left = `${left}px`;
    dom.runnerPet.style.top = `${top}px`;
  }

  function setPetPose(pose) {
    state.petPose = pose;
    dom.runnerPet.dataset.pose = pose;
    if (!state.petSpritesReady) return;
    const file = petSpriteFiles[pose] || petSpriteFiles.idle;
    dom.runnerPet.src = `${PET_SPRITE_ROOT}/${file}`;
  }

  function setFeedback(text, type) {
    dom.feedback.textContent = text;
    dom.feedback.dataset.type = type || "normal";
  }

  function getAudioContext() {
    if (!("AudioContext" in window || "webkitAudioContext" in window)) return null;
    if (!state.audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      state.audioContext = new AudioContextClass();
    }
    if (state.audioContext.state === "suspended") state.audioContext.resume();
    return state.audioContext;
  }

  function playSfx(type) {
    const context = getAudioContext();
    if (!context) return;
    const now = context.currentTime;
    const patterns = {
      good: [660, 880],
      bonus: [740, 990, 1320],
      bad: [220, 165],
      level: [523, 784, 1046],
      record: [784, 1046, 1318, 1568]
    };
    const tones = patterns[type] || patterns.good;
    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type === "bad" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, now + index * 0.07);
      gain.gain.setValueAtTime(0.0001, now + index * 0.07);
      gain.gain.exponentialRampToValueAtTime(type === "bad" ? 0.045 : 0.065, now + index * 0.07 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.07 + 0.12);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now + index * 0.07);
      oscillator.stop(now + index * 0.07 + 0.14);
    });
  }

  function spawnHitEffect(node, label, type) {
    if (!node) return;
    const nodeRect = node.getBoundingClientRect();
    const sceneRect = dom.runnerScene.getBoundingClientRect();
    const burst = document.createElement("div");
    burst.className = `hit-burst is-${type}`;
    burst.style.left = `${nodeRect.left - sceneRect.left + nodeRect.width / 2}px`;
    burst.style.top = `${nodeRect.top - sceneRect.top + nodeRect.height / 2}px`;

    const pop = document.createElement("strong");
    pop.textContent = label;
    burst.append(pop);

    const starCount = type === "bad" ? 4 : 7;
    for (let index = 0; index < starCount; index += 1) {
      const spark = document.createElement("span");
      const angle = (Math.PI * 2 * index) / starCount;
      const distance = type === "bad" ? 28 : 42;
      spark.style.setProperty("--spark-x", `${Math.cos(angle) * distance}px`);
      spark.style.setProperty("--spark-y", `${Math.sin(angle) * distance}px`);
      spark.textContent = type === "bad" ? "!" : "★";
      burst.append(spark);
    }

    dom.runnerScene.append(burst);
    window.setTimeout(() => burst.remove(), 860);
  }

  function pulsePet(className, duration = 420) {
    window.clearTimeout(state.petPoseTimer);
    dom.runnerPet.classList.remove("is-jumping", "is-catching", "is-hit", "is-celebrating");
    const pose = className === "is-catching"
      ? "catch"
      : className === "is-hit"
        ? "hit"
        : className === "is-jumping"
          ? "jump"
          : "idle";
    setPetPose(pose);
    void dom.runnerPet.offsetWidth;
    dom.runnerPet.classList.add(className);
    state.petPoseTimer = window.setTimeout(() => {
      dom.runnerPet.classList.remove(className);
      if (state.phase === "playing") setPetPose("idle");
    }, duration);
  }

  function moveToLane(nextLane) {
    state.lane = Math.max(0, Math.min(LANE_COUNT - 1, nextLane));
    renderLanes();
    setPetPose("run");
    pulsePet("is-jumping");
  }

  function catchBubble(index = state.lane) {
    if (state.phase !== "playing") return;
    const bubble = state.bubbles[index];
    const target = getTarget();
    const node = dom.laneField.querySelector(`.bubble[data-index="${index}"]`);
    if (node) node.classList.add("is-pop");

    if (bubble && bubble.isCorrect) {
      state.score += 1;
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      const hasTimeBonus = state.combo > 0 && state.combo % 3 === 0;
      if (hasTimeBonus) state.timeLeft = Math.min(75, state.timeLeft + 2);
      spawnHitEffect(node, hasTimeBonus ? "+1  +2s" : "+1", "good");
      playSfx(hasTimeBonus ? "bonus" : "good");
      setFeedback(hasTimeBonus ? `三连击：${target.char}，时间 +2 秒！` : `接对了：${target.char}。连击继续！`, "good");
      pulsePet("is-catching", hasTimeBonus ? 680 : 520);
      state.targetIndex += 1;
      window.setTimeout(nextQuestion, 220);
    } else {
      state.combo = 0;
      state.misses += 1;
      if (!state.reviewChars.includes(target.char)) state.reviewChars.push(target.char);
      spawnHitEffect(node, "再听", "bad");
      playSfx("bad");
      setFeedback(`这次要找的是 ${target.char}，再听一次。`, "bad");
      pulsePet("is-hit");
      window.setTimeout(speakTarget, 260);
    }

    updateHud();
    if (state.score >= state.goal) finishRound();
  }

  function nextQuestion() {
    if (state.phase !== "playing") return;
    const previousTier = state.lastDifficultyTier;
    chooseLayout();
    state.lastDifficultyTier = state.difficulty.tier;
    makeBubbles();
    state.lane = Math.floor(LANE_COUNT / 2);
    updateMission();
    updateHud();
    renderLanes();
    if (state.score > 0 && state.difficulty.tier > previousTier) {
      playSfx("level");
      setFeedback(state.difficulty.feedback, "normal");
    } else if (state.score > 0) {
      setFeedback("下一题，听提示找正确气泡。", "normal");
    }
    speakTarget();
  }

  function startTimer() {
    window.clearInterval(state.timer);
    state.timer = window.setInterval(() => {
      if (state.phase !== "playing") return;
      state.timeLeft -= 1;
      updateHud();
      if (state.timeLeft <= 0) finishRound();
    }, 1000);
  }

  function startRound() {
    state.phase = "playing";
    state.targetIndex = Math.floor(Math.random() * Math.max(1, state.data.length));
    state.lane = Math.floor(LANE_COUNT / 2);
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.timeLeft = 60;
    state.misses = 0;
    state.reviewChars = [];
    state.lastDifficultyTier = 0;
    dom.runnerPet.classList.remove("is-celebrating", "is-hit", "is-catching", "is-jumping");
    setPetPose("idle");
    dom.startPanel.hidden = true;
    dom.resultPanel.hidden = true;
    state.difficulty = getDifficulty();
    setFeedback("听提示，跳到正确气泡。", "normal");
    nextQuestion();
    startTimer();
  }

  function finishRound() {
    if (state.phase === "finished") return;
    state.phase = "finished";
    window.clearInterval(state.timer);
    if (state.speechEnabled) window.speechSynthesis.cancel();
    dom.runnerPet.classList.remove("is-jumping", "is-catching", "is-hit");
    dom.runnerPet.classList.add("is-celebrating");
    setPetPose("celebrate");

    const stars = Math.min(3, Math.max(1, Math.ceil((state.score / state.goal) * 3)));
    const isNewRecord = state.score > state.bestRecord.score
      || (state.score === state.bestRecord.score && state.bestCombo > state.bestRecord.combo);
    const nextRecord = {
      score: Math.max(state.bestRecord.score, state.score),
      combo: isNewRecord ? state.bestCombo : Math.max(state.bestRecord.combo, state.bestCombo),
      stars: Math.max(state.bestRecord.stars, stars),
      rounds: state.bestRecord.rounds + 1
    };
    saveBestRecord(nextRecord);
    updateBestLine();

    dom.resultStars.innerHTML = "";
    for (let index = 1; index <= 3; index += 1) {
      const star = document.createElement("i");
      star.textContent = "★";
      star.dataset.active = index <= stars ? "true" : "false";
      dom.resultStars.append(star);
    }
    if (isNewRecord) playSfx("record");
    dom.resultTitle.textContent = `${isNewRecord ? "新纪录！" : ""}${stars} 星达成！`;
    dom.resultDetail.textContent = `接到 ${state.score} 个气泡，最高连击 ${state.bestCombo}，错过 ${state.misses} 次`;
    dom.recordDetail.textContent = `最佳 ${state.bestRecord.score}/${state.goal} / 连击 ${state.bestRecord.combo} / ${state.bestRecord.rounds}局`;
    dom.reviewList.innerHTML = "";
    const review = state.reviewChars.slice(0, 6);
    if (review.length === 0) {
      const perfect = document.createElement("span");
      perfect.textContent = "稳";
      dom.reviewList.append(perfect);
    } else {
      review.forEach((char) => {
        const item = document.createElement("span");
        item.textContent = char;
        dom.reviewList.append(item);
      });
    }
    dom.resultPanel.hidden = false;
    sendCompletion(state.score, stars);
    setFeedback("本局结束，可以再来一局。", "normal");
  }

  function handleKeydown(event) {
    if (event.key === "Enter" && state.phase !== "playing") {
      startRound();
      return;
    }
    if (state.phase !== "playing") return;

    const key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "arrowdown" || key === "a" || key === "s") {
      event.preventDefault();
      moveToLane(state.lane - 1);
    }
    if (key === "arrowright" || key === "arrowup" || key === "d" || key === "w") {
      event.preventDefault();
      moveToLane(state.lane + 1);
    }
    if (key === " " || key === "enter") {
      event.preventDefault();
      catchBubble();
    }
  }

  async function init() {
    await loadData();
    await loadPetSprites();
    makeBubbles();
    updateMission();
    updateHud();
    renderLanes();
    updateBestLine();
    dom.voiceButton.addEventListener("click", () => {
      speakTarget(true);
      setFeedback("再听一遍，找任务里的汉字。", "normal");
    });
    dom.startButton.addEventListener("click", startRound);
    dom.restartButton.addEventListener("click", startRound);
    document.addEventListener("keydown", handleKeydown);
  }

  window.addEventListener("message", (event) => {
    const data = event.data || {};
    if (event.origin !== hostOrigin || data.type !== "petbank.bridge.v1.reward-result" || data.launchId !== launchId) return;
    setFeedback(data.status === "accepted" ? "主站奖励已到账。" : data.status === "duplicate" ? "本局奖励已处理。" : "主站暂未接受奖励。", data.status === "rejected" ? "warn" : "success");
  });

  init();
}());
