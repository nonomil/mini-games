import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const required = [
  "web/index.html",
  "web/styles.css",
  "web/game.js",
  "web/simulate.mjs",
  "tools/build_typing_tasks_from_vocab.cjs",
  "tools/build_vocab_banks.cjs",
  "tools/generate_bow_arrow_assets.py",
  "tools/generate_explosion_shockwave_assets.py",
  "tools/split_gpt_creeper_action_sheet.py",
  "prompts/gpt-creeper-multi-action-sheet.md",
  "assets/generated/minecraft-typing-defense/tasks.json",
  "assets/generated/minecraft-typing-defense/tasks.js",
  "assets/generated/minecraft-typing-defense/vocab-banks.json",
  "assets/generated/minecraft-typing-defense/vocab-banks.js",
  "assets/generated/minecraft-typing-defense/manifest.json",
  "assets/vocabs/source/words-0315/manifest.js",
  "assets/vocabs/source/words-0315/01_幼儿园/幼儿园完整词库.js",
  "assets/vocabs/source/words-0315/07_拼音/常用拼音.js",
  "assets/vocabs/source/words-0315/08_幼小衔接/幼小衔接总词库.js",
  "assets/generated/word-cards/cat.webp",
  "assets/generated/word-cards/dog.webp",
  "assets/generated/word-cards/fox.webp",
  "assets/generated/word-cards/bear.webp",
  "assets/generated/word-cards/panda.webp",
  "assets/generated/audio/manifest.json",
  "assets/generated/audio/cue_start.mp3",
  "assets/generated/audio/cue_win.mp3",
  "assets/generated/audio/cue_lose.mp3",
  "assets/generated/audio/task_pinyin_a.mp3",
  "assets/generated/audio/sfx_countdown.wav",
  "assets/generated/audio/sfx_explosion.wav",
  "assets/generated/audio/sfx_letter.wav",
  "assets/generated/typing-defense-assets/manifest.json",
  "assets/generated/typing-defense-assets/_preview_contact_sheet.jpg",
  "assets/generated/typing-defense-assets/creeper_idle.png",
  "assets/generated/typing-defense-assets/creeper_walk_0.png",
  "assets/generated/typing-defense-assets/creeper_walk_1.png",
  "assets/generated/typing-defense-assets/creeper_walk_2.png",
  "assets/generated/typing-defense-assets/creeper_walk_3.png",
  "assets/generated/typing-defense-assets/creeper_stride_0.png",
  "assets/generated/typing-defense-assets/creeper_stride_1.png",
  "assets/generated/typing-defense-assets/creeper_stride_2.png",
  "assets/generated/typing-defense-assets/creeper_stride_3.png",
  "assets/generated/typing-defense-assets/creeper_stride_contact_sheet.jpg",
  "assets/generated/typing-defense-assets/creeper_gpt_idle.png",
  "assets/generated/typing-defense-assets/creeper_gpt_walk_0.png",
  "assets/generated/typing-defense-assets/creeper_gpt_walk_1.png",
  "assets/generated/typing-defense-assets/creeper_gpt_walk_2.png",
  "assets/generated/typing-defense-assets/creeper_gpt_walk_3.png",
  "assets/generated/typing-defense-assets/creeper_gpt_danger_mid.png",
  "assets/generated/typing-defense-assets/creeper_gpt_danger_near.png",
  "assets/generated/typing-defense-assets/creeper_gpt_attack_warning.png",
  "assets/generated/typing-defense-assets/creeper_gpt_hit_reaction.png",
  "assets/generated/typing-defense-assets/creeper_gpt_explosion_0.png",
  "assets/generated/typing-defense-assets/creeper_gpt_explosion_1.png",
  "assets/generated/typing-defense-assets/creeper_gpt_explosion_2.png",
  "assets/generated/typing-defense-assets/creeper_gpt_action_contact_sheet.jpg",
  "assets/generated/typing-defense-assets/creeper_generated_far.png",
  "assets/generated/typing-defense-assets/creeper_generated_mid.png",
  "assets/generated/typing-defense-assets/creeper_generated_near.png",
  "assets/generated/typing-defense-assets/creeper_generated_danger.png",
  "assets/generated/typing-defense-assets/creeper_explosion_0.png",
  "assets/generated/typing-defense-assets/creeper_explosion_1.png",
  "assets/generated/typing-defense-assets/creeper_explosion_2.png",
  "assets/generated/typing-defense-assets/heart_full.png",
  "assets/generated/typing-defense-assets/heart_empty.png",
  "assets/generated/typing-defense-assets/bow_launcher_agnes.png",
  "assets/generated/typing-defense-assets/bow_launcher_idle.png",
  "assets/generated/typing-defense-assets/bow_launcher_draw.png",
  "assets/generated/typing-defense-assets/bow_launcher_release.png",
  "assets/generated/typing-defense-assets/arrow_projectile.png",
  "assets/generated/typing-defense-assets/arrow_projectile_trail.png",
  "assets/generated/typing-defense-assets/bow_arrow_contact_sheet.jpg",
  "assets/generated/typing-defense-assets/explosion_shockwave_0.png",
  "assets/generated/typing-defense-assets/explosion_shockwave_1.png",
  "assets/generated/typing-defense-assets/explosion_shockwave_2.png",
  "assets/generated/typing-defense-assets/explosion_shockwave_contact_sheet.jpg",
  "assets/generated/typing-defense-assets/star_full.png",
  "assets/generated/typing-defense-assets/star_empty.png",
  "assets/generated/typing-defense-assets/horizon_day_back_agnes.png",
  "assets/generated/typing-defense-assets/horizon_day_mid_agnes.png",
  "assets/generated/typing-defense-assets/horizon_day_front_agnes.png",
  "assets/generated/typing-defense-assets/horizon_dusk_back_agnes.png",
  "assets/generated/typing-defense-assets/horizon_dusk_mid_agnes.png",
  "assets/generated/typing-defense-assets/horizon_dusk_front_agnes.png",
  "assets/generated/typing-defense-assets/horizon_overcast_back_agnes.png",
  "assets/generated/typing-defense-assets/horizon_overcast_mid_agnes.png",
  "assets/generated/typing-defense-assets/horizon_overcast_front_agnes.png",
  "assets/generated/typing-defense-assets/voxel_map_background_overcast_agnes.jpg",
  "assets/generated/typing-defense-assets/voxel_ground_foreground_overcast_agnes.png"
];

for (const rel of required) {
  if (!existsSync(resolve(root, rel))) {
    throw new Error(`missing ${rel}`);
  }
}

const html = readFileSync(resolve(root, "web/index.html"), "utf8");
const css = readFileSync(resolve(root, "web/styles.css"), "utf8");
const js = readFileSync(resolve(root, "web/game.js"), "utf8");
const tasksJs = readFileSync(resolve(root, "assets/generated/minecraft-typing-defense/tasks.js"), "utf8");

for (const token of [
  "targetBubble",
  "typedText",
  "keyboard",
  "monsterWrap",
  "creeperRig",
  "backupMonsterWrap",
  "backupCreeperRig",
  "sideMonsterWrap",
  "sideCreeperRig",
  "enemy-task-badge",
  "wordCardPanel",
  "wordCardDeck",
  "wordCardImage",
  "progressWord",
  "frontCreeperImage",
  "backupCreeperImage",
  "explosionLayer",
  "arrowLauncher",
  "bowLauncherImage",
  "arrow",
  "modeTabs",
  "listenButton",
  "vocabSelect",
  "vocabLabel",
  "mathGuidePanel",
  "mathSupportPanel",
  "roundCounter",
  "comboCounter",
  "sceneChip",
  "sceneName",
  "sceneHint",
  "sceneToast",
  "sceneToastName",
  "finalStats",
  "startButton"
]) {
  if (!html.includes(token)) throw new Error(`missing html token ${token}`);
}

for (const forbidden of [
  "side-parallax-left",
  "side-parallax-right"
]) {
  if (html.includes(forbidden)) {
    throw new Error(`forbidden artificial side parallax token remains in html: ${forbidden}`);
  }
}

for (const token of [
  "hitMonster",
  "takeDamage",
  "burstParticles",
  "updateCreeperWalk",
  "updateThreatVisuals",
  "updateBackupCreeper",
  "updateCreeperVisualAsset",
  "getCreeperAssetForProgress",
  "explodeCreeper",
  "showExplosion",
  "playExplosionSound",
  "playCountdownTick",
  "playLetterStep",
  "spawnMiniArrow",
  "spawnLetterImpact",
  "updateCountdownSound",
  "playBufferedAudio",
  "playCurrentTaskVoice",
  "renderKeyboard",
  "inputCharacter",
  "fireArrow",
  "updateArrowPath",
  "completeRound",
  "endGame(true",
  "GAME_MODES",
  "ROUND_GOAL",
  "bestCombo",
  "lastLetterFeedback",
  "lastMiniArrowCount",
  "lastLetterImpactCount",
  "ENVIRONMENT_PACKS",
  "getRoundEnvironmentPack",
  "updateSceneChip",
  "showSceneToast",
  "applyEnvironmentPack",
  "words",
  "mathEasy20",
  "mathEasy100",
  "mathMul",
  "加减起步",
  "加减进阶",
  "乘法启程",
  "buildMathTask",
  "findMatchingEnemies",
  "setActiveEnemy",
  "updateEnemyTaskBadges",
  "lastTargetedEnemyId",
  "wordCardVisible",
  "enemySnapshots",
  "__typingDefenseTest",
  "creeperSnapshots",
  "soundEvents",
  "TEST_MODE",
  "audioManifest"
]) {
  if (!js.includes(token)) throw new Error(`missing game token ${token}`);
}

for (const forbidden of [
  "--left-pan",
  "--right-pan",
  "side-parallax",
  "repeating-linear-gradient(\n      90deg,\n      rgba(26, 55, 24, 0.96)",
  "repeating-linear-gradient(\n      90deg,\n      rgba(44, 74, 34, 0.94)"
]) {
  if (js.includes(forbidden)) {
    throw new Error(`forbidden old parallax token remains in game.js: ${forbidden}`);
  }
}

for (const token of [
  "horizon_day_back_agnes.png",
  "horizon_day_mid_agnes.png",
  "horizon_day_front_agnes.png",
  "--horizon-back-image",
  "--horizon-mid-image",
  "--horizon-front-image"
]) {
  if (!css.includes(token)) throw new Error(`missing environment css token ${token}`);
}

for (const token of [
  "horizon_dusk_back_agnes.png",
  "horizon_dusk_mid_agnes.png",
  "horizon_dusk_front_agnes.png",
  "horizon_overcast_back_agnes.png",
  "horizon_overcast_mid_agnes.png",
  "horizon_overcast_front_agnes.png",
  "voxel_map_background_overcast_agnes.jpg",
  "voxel_ground_foreground_overcast_agnes.png"
]) {
  if (!js.includes(token)) throw new Error(`missing environment game token ${token}`);
}

for (const token of [
  "../assets/generated/minecraft-typing-defense/tasks.js",
  "../assets/generated/minecraft-typing-defense/vocab-banks.js"
]) {
  if (!html.includes(token)) throw new Error(`missing vocab html token ${token}`);
}

if (!tasksJs.includes("__MINECRAFT_TYPING_DEFENSE_TASKS__")) {
  throw new Error("missing generated vocab global in tasks.js");
}
const vocabBanksJs = readFileSync(resolve(root, "assets/generated/minecraft-typing-defense/vocab-banks.js"), "utf8");
if (!vocabBanksJs.includes("__TYPING_DEFENSE_VOCAB_BANKS__")) {
  throw new Error("missing generated multi-vocab global in vocab-banks.js");
}

for (const token of [
  "ROOT_VOCAB_RUNTIME",
  "ROOT_WORD_TASKS",
  "VOCAB_BANKS_RUNTIME",
  "activeVocabId",
  "vocabSelect",
  "applyVocabBank",
  "updateVocabSelect",
  "FALLBACK_WORD_TASKS",
  "wordCardSrcFor",
  "taskTranslation",
  "renderWordCardDeck",
  "vocabSource",
  "vocabTitle",
  "vocabWordCount",
  "MATH_GUIDE_OPTIONS",
  "MATH_SUPPORT_CARDS",
  "updateMathGuidePanel",
  "updateMathSupportControls",
  "selectedMathSupportId",
  "activeMathSupportId",
  "mathRetryUsed"
]) {
  if (!js.includes(token)) throw new Error(`missing vocab game token ${token}`);
}

for (const token of [
  "environmentId",
  "environmentLabel",
  "sceneChipName",
  "sceneToastOpen",
  "sceneToastName"
]) {
  if (!js.includes(token)) throw new Error(`missing environment snapshot token ${token}`);
}

for (const token of [
  "--scenery-drift-far",
  "--scenery-drift-near",
  "--ground-speed-lines-shift",
  "scenery-strip",
  "scenery-far",
  "scenery-near"
]) {
  if (!css.includes(token) && !html.includes(token) && !js.includes(token)) {
    throw new Error(`missing chase-motion token ${token}`);
  }
}

for (const forbidden of ["explosion-core", "explosion-ring", "explosion-smoke"]) {
  if (js.includes(forbidden)) {
    throw new Error(`forbidden circular explosion token remains in game.js: ${forbidden}`);
  }
}
if (!js.includes("shockwave-frame") || !js.includes("shockwaves")) {
  throw new Error("game.js should render transparent shockwave-frame images");
}

for (const forbidden of ["playerWrap", "iron_golem", "铁傀儡"]) {
  if (html.includes(forbidden) || js.includes(forbidden)) {
    throw new Error(`forbidden old protagonist token remains: ${forbidden}`);
  }
}

const manifest = JSON.parse(readFileSync(resolve(root, "assets/generated/typing-defense-assets/manifest.json"), "utf8"));
if (manifest.alphaValidation !== "ok") {
  throw new Error(`asset alpha validation failed: ${JSON.stringify(manifest.alphaValidation)}`);
}
if (!Array.isArray(manifest.assets) || manifest.assets.length < 12) {
  throw new Error("visual asset manifest is too small");
}
if (!manifest.assets.some((asset) => asset.name === "bow_launcher_agnes")) {
  throw new Error("missing Agnes bow launcher asset in manifest");
}
if (!manifest.assets.some((asset) => asset.name === "voxel_map_background_dusk_agnes")) {
  throw new Error("missing true Agnes dusk background asset in manifest");
}
if (!manifest.assets.some((asset) => asset.name === "voxel_ground_foreground_dusk_agnes")) {
  throw new Error("missing true Agnes dusk foreground asset in manifest");
}
if (!manifest.assets.some((asset) => asset.name === "voxel_map_background_overcast_agnes")) {
  throw new Error("missing Agnes overcast background asset in manifest");
}
if (!manifest.assets.some((asset) => asset.name === "voxel_ground_foreground_overcast_agnes")) {
  throw new Error("missing Agnes overcast foreground asset in manifest");
}
if (!manifest.agnesDuskBackgrounds || manifest.agnesDuskBackgrounds.status !== "ok") {
  throw new Error(`missing dusk background generation metadata: ${JSON.stringify(manifest.agnesDuskBackgrounds)}`);
}
if (!manifest.agnesOvercastBackgrounds || manifest.agnesOvercastBackgrounds.status !== "ok") {
  throw new Error(`missing overcast background generation metadata: ${JSON.stringify(manifest.agnesOvercastBackgrounds)}`);
}

const audioManifest = JSON.parse(readFileSync(resolve(root, "assets/generated/audio/manifest.json"), "utf8"));
if (!audioManifest.cues || !audioManifest.tasks || !audioManifest.sfx) {
  throw new Error(`audio manifest missing cues/tasks/sfx: ${JSON.stringify(audioManifest)}`);
}
if (!audioManifest.voicePresets || !audioManifest.voiceAssignments) {
  throw new Error(`audio manifest missing split voice metadata: ${JSON.stringify(audioManifest)}`);
}
if (audioManifest.defaultMode !== "words") {
  throw new Error(`expected defaultMode words, got ${JSON.stringify(audioManifest.defaultMode)}`);
}
if (audioManifest.roundGoal !== 6) {
  throw new Error(`expected roundGoal 6, got ${JSON.stringify(audioManifest.roundGoal)}`);
}
if (audioManifest.voiceAssignments.cues !== "cnCue" || audioManifest.voiceAssignments.words !== "enWord") {
  throw new Error(`expected split cue/word voice assignments, got ${JSON.stringify(audioManifest.voiceAssignments)}`);
}
if (audioManifest.voiceAssignments.pinyin !== "cnCue" || audioManifest.voiceAssignments.letters !== "cnCue" || audioManifest.voiceAssignments.numbers !== "cnCue") {
  throw new Error(`expected non-word tasks to keep Chinese voice assignment, got ${JSON.stringify(audioManifest.voiceAssignments)}`);
}
if (audioManifest.voicePresets.cnCue?.voice !== "zh-CN-XiaoyiNeural") {
  throw new Error(`expected Chinese cue voice zh-CN-XiaoyiNeural, got ${JSON.stringify(audioManifest.voicePresets.cnCue)}`);
}
if (audioManifest.voicePresets.enWord?.voice !== "en-US-AnaNeural") {
  throw new Error(`expected English word voice en-US-AnaNeural, got ${JSON.stringify(audioManifest.voicePresets.enWord)}`);
}
for (const key of ["start", "win", "lose"]) {
  if (!audioManifest.cues[key]) throw new Error(`missing cue ${key}`);
}
for (const key of ["countdown", "explosion"]) {
  if (!audioManifest.sfx[key]) throw new Error(`missing sfx ${key}`);
}
if (!audioManifest.sfx.letter) {
  throw new Error("missing sfx letter");
}
if (!audioManifest.tasks["pinyin:a"]) {
  throw new Error("missing pinyin:a task voice");
}
if (!audioManifest.tasks["words:cat"]) {
  throw new Error("missing words:cat task voice");
}

const typingTasks = JSON.parse(readFileSync(resolve(root, "assets/generated/minecraft-typing-defense/tasks.json"), "utf8"));
const vocabBanks = JSON.parse(readFileSync(resolve(root, "assets/generated/minecraft-typing-defense/vocab-banks.json"), "utf8"));
const typingManifest = JSON.parse(readFileSync(resolve(root, "assets/generated/minecraft-typing-defense/manifest.json"), "utf8"));
if (typingTasks.source?.file !== "data/vocab/english-minecraft/views/typing-view.json") {
  throw new Error(`typing tasks should come from root data/vocab, got ${JSON.stringify(typingTasks.source)}`);
}
if (!Array.isArray(typingTasks.banks?.words) || typingTasks.banks.words.length < 15) {
  throw new Error(`typing task bank too small: ${JSON.stringify(typingTasks.groupCounts)}`);
}
for (const length of ["3", "4", "5"]) {
  if (!typingTasks.groupCounts?.[length] || typingTasks.groupCounts[length] < 4) {
    throw new Error(`missing ${length}-letter typing tasks: ${JSON.stringify(typingTasks.groupCounts)}`);
  }
}
if (typingManifest.source?.file !== typingTasks.source.file) {
  throw new Error(`typing manifest source mismatch: ${JSON.stringify(typingManifest.source)}`);
}
if (!Array.isArray(vocabBanks.banks) || vocabBanks.banks.length < 3) {
  throw new Error(`expected at least 3 switchable vocab banks, got ${JSON.stringify(vocabBanks)}`);
}
for (const bankId of ["minecraft", "kindergarten", "bridge-pinyin"]) {
  const bank = vocabBanks.banks.find((item) => item.id === bankId);
  if (!bank || !Array.isArray(bank.words) || bank.words.length < 8) {
    throw new Error(`missing usable vocab bank ${bankId}: ${JSON.stringify(bank)}`);
  }
}
if (typingManifest.vocabBanks?.file !== "prj/消灭苦力怕打字游戏/assets/generated/minecraft-typing-defense/vocab-banks.json") {
  throw new Error(`typing manifest missing vocab bank output: ${JSON.stringify(typingManifest.vocabBanks)}`);
}

console.log("mathcreep typing prototype validation passed");
