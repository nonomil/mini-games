import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const projectRoot = resolve(root, "..", "..");

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(resolve(root, relativePath), "utf8"));
}

function exists(relativePath) {
  return existsSync(resolve(root, relativePath));
}

function resolveGeneratedResource(resourcePath) {
  return resolve(root, String(resourcePath).replace(/^(\.\.\/)+/, ""));
}

const currentRequired = [
  "web/index.html",
  "web/styles.css",
  "web/game.js",
  "web/card-runtime.js",
  "web/feedback-runtime.js",
  "web/independent-loop.js",
  "web/learning-loop.js",
  "web/card-runtime.test.mjs",
  "web/core-v1-fixture.mjs",
  "web/core-v1-fixture.test.mjs",
  "web/feedback-runtime.test.mjs",
  "web/independent-loop.test.mjs",
  "web/learning-loop.test.mjs",
  "web/simulate.mjs",
  "web/verify-contract.test.mjs",
  "assets/generated/minecraft-typing-defense/tasks.json",
  "assets/generated/minecraft-typing-defense/tasks.js",
  "assets/generated/minecraft-typing-defense/vocab-banks.json",
  "assets/generated/minecraft-typing-defense/vocab-banks.js",
  "assets/generated/minecraft-typing-defense/manifest.json",
  "assets/generated/audio/manifest.json",
  "assets/generated/typing-defense-assets/manifest.json"
];

const missingCurrent = currentRequired.filter((relativePath) => !exists(relativePath));
assert(!missingCurrent.length, `missing current resource(s): ${missingCurrent.join(", ")}`);

const html = readFileSync(resolve(root, "web/index.html"), "utf8");
const css = readFileSync(resolve(root, "web/styles.css"), "utf8");
const js = readFileSync(resolve(root, "web/game.js"), "utf8");
const tasksJs = readFileSync(resolve(root, "assets/generated/minecraft-typing-defense/tasks.js"), "utf8");
const vocabBanksJs = readFileSync(resolve(root, "assets/generated/minecraft-typing-defense/vocab-banks.js"), "utf8");

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
  "modeTabs",
  "listenButton",
  "vocabSelect",
  "roundCounter",
  "comboCounter",
  "finalStats",
  "startButton",
  "../assets/generated/minecraft-typing-defense/tasks.js",
  "../assets/generated/minecraft-typing-defense/vocab-banks.js"
]) {
  assert(html.includes(token), `missing html token ${token}`);
}

for (const token of ["side-parallax-left", "side-parallax-right"]) {
  assert(!html.includes(token), `forbidden artificial side parallax token remains in html: ${token}`);
}

for (const token of [
  "card-runtime.js",
  "normalizeHostInit",
  "selectRuntimeCards",
  "learning-loop.js",
  "classifyTypingError",
  "learningStore",
  "recordLearningWrong",
  "recordLearningResult",
  "learningSessionSummary",
  "runtimeMode",
  "hostTasks",
  "applyHostInit",
  "hitMonster",
  "takeDamage",
  "completeRound",
  "endGame(true",
  "lastLetterFeedback",
  "lastMiniArrowCount",
  "findMatchingEnemies",
  "setActiveEnemy",
  "enemySnapshots",
  "__typingDefenseTest",
  "TEST_MODE",
  "learningReviewAvailable",
  "data-reward-action",
  "feedbackRetryVisible"
]) {
  assert(js.includes(token), `missing game token ${token}`);
}

const browserImports = [...js.matchAll(/from\s+["'](\.\/[^"']+)["']/g)].map((match) => match[1]);
assert(browserImports.length >= 4, `missing browser runtime imports: ${JSON.stringify(browserImports)}`);
assert(browserImports.every((importPath) => importPath.endsWith(".js")), `browser imports must use .js files: ${JSON.stringify(browserImports)}`);
for (const importPath of browserImports) {
  assert(exists(`web/${importPath.slice(2)}`), `missing browser module ${importPath}`);
}

for (const forbidden of [
  "--left-pan",
  "--right-pan",
  "side-parallax",
  "explosion-core",
  "explosion-ring",
  "explosion-smoke",
  "playerWrap",
  "iron_golem",
  "铁傀儡"
]) {
  assert(!js.includes(forbidden) && !html.includes(forbidden), `forbidden legacy token remains: ${forbidden}`);
}

for (const token of [
  "horizon_day_back_agnes.png",
  "horizon_day_mid_agnes.png",
  "horizon_day_front_agnes.png",
  "--horizon-back-image",
  "--horizon-mid-image",
  "--horizon-front-image",
  ".typing-feedback",
  ".reward-actions",
  "@media (max-width: 560px)"
]) {
  assert(css.includes(token), `missing current css token ${token}`);
}

assert(tasksJs.includes("__MINECRAFT_TYPING_DEFENSE_TASKS__"), "missing generated vocab global in tasks.js");
assert(vocabBanksJs.includes("__TYPING_DEFENSE_VOCAB_BANKS__"), "missing generated vocab global in vocab-banks.js");

const visualManifest = readJson("assets/generated/typing-defense-assets/manifest.json");
assert(visualManifest.alphaValidation === "ok", `asset alpha validation failed: ${JSON.stringify(visualManifest.alphaValidation)}`);
assert(Array.isArray(visualManifest.assets) && visualManifest.assets.length >= 12, "visual asset manifest is too small");
const visualFiles = [
  ...(visualManifest.assets || []).map((asset) => asset.file),
  ...(visualManifest.animated || []).flatMap((animation) => animation.frames || [])
].filter(Boolean);
for (const relativePath of visualFiles) {
  assert(exists(relativePath), `missing manifest visual asset ${relativePath}`);
}
for (const name of [
  "bow_launcher_agnes",
  "voxel_map_background_dusk_agnes",
  "voxel_ground_foreground_dusk_agnes",
  "voxel_map_background_overcast_agnes",
  "voxel_ground_foreground_overcast_agnes"
]) {
  assert(visualManifest.assets.some((asset) => asset.name === name), `missing visual manifest asset ${name}`);
}

const audioManifest = readJson("assets/generated/audio/manifest.json");
assert(audioManifest.defaultMode === "words", `expected audio defaultMode words, got ${JSON.stringify(audioManifest.defaultMode)}`);
assert(audioManifest.roundGoal === 6, `expected audio roundGoal 6, got ${JSON.stringify(audioManifest.roundGoal)}`);
assert(audioManifest.cues && audioManifest.tasks && audioManifest.sfx, "audio manifest missing cues/tasks/sfx");
assert(audioManifest.voicePresets && audioManifest.voiceAssignments, "audio manifest missing voice metadata");
assert(audioManifest.voiceAssignments.cues === "cnCue" && audioManifest.voiceAssignments.words === "enWord", "audio voice assignments are incomplete");
assert(audioManifest.voiceAssignments.pinyin === "cnCue" && audioManifest.voiceAssignments.letters === "cnCue" && audioManifest.voiceAssignments.numbers === "cnCue", "non-word voice assignments are incomplete");
assert(audioManifest.voicePresets.cnCue?.voice === "zh-CN-XiaoyiNeural", "unexpected Chinese cue voice");
assert(audioManifest.voicePresets.enWord?.voice === "en-US-AnaNeural", "unexpected English word voice");
for (const relativePath of [...Object.values(audioManifest.cues), ...Object.values(audioManifest.tasks), ...Object.values(audioManifest.sfx)]) {
  assert(existsSync(resolveGeneratedResource(relativePath)), `missing manifest audio asset ${relativePath}`);
}
assert(audioManifest.tasks["pinyin:a"], "missing pinyin:a task voice");
assert(audioManifest.tasks["words:cat"], "missing words:cat task voice");

const typingTasks = readJson("assets/generated/minecraft-typing-defense/tasks.json");
const vocabBanks = readJson("assets/generated/minecraft-typing-defense/vocab-banks.json");
const typingManifest = readJson("assets/generated/minecraft-typing-defense/manifest.json");
assert(typingTasks.source?.file, "typing tasks missing authoritative source metadata");
assert(existsSync(resolve(projectRoot, typingTasks.source.file)), `authoritative typing source is missing: ${typingTasks.source.file}`);
assert(typingManifest.source?.file === typingTasks.source.file, `typing manifest source mismatch: ${JSON.stringify(typingManifest.source)}`);
assert(Array.isArray(typingTasks.banks?.words) && typingTasks.banks.words.length >= 15, "typing task bank too small");
for (const length of ["3", "4", "5"]) {
  assert(typingTasks.groupCounts?.[length] >= 4, `missing ${length}-letter typing tasks: ${JSON.stringify(typingTasks.groupCounts)}`);
}
assert(Array.isArray(vocabBanks.banks) && vocabBanks.banks.length >= 3, "vocab bank manifest is too small");
for (const bankId of ["minecraft", "kindergarten", "bridge-pinyin"]) {
  const bank = vocabBanks.banks.find((item) => item.id === bankId);
  assert(bank && Array.isArray(bank.words) && bank.words.length >= 8, `missing usable vocab bank ${bankId}`);
}
assert(/vocab-banks\.json$/.test(String(typingManifest.vocabBanks?.file || "")), "typing manifest missing current vocab bank output metadata");
assert(/vocab-banks\.js$/.test(String(typingManifest.vocabBanks?.runtime || "")), "typing manifest missing current vocab bank runtime metadata");

const legacyPipeline = [
  "tools/build_typing_tasks_from_vocab.cjs",
  "tools/build_vocab_banks.cjs",
  "tools/generate_bow_arrow_assets.py",
  "tools/generate_explosion_shockwave_assets.py",
  "tools/split_gpt_creeper_action_sheet.py",
  "prompts/gpt-creeper-multi-action-sheet.md",
  "assets/vocabs/source/words-0315/manifest.js"
];
const unavailableLegacy = legacyPipeline.filter((relativePath) => !exists(relativePath));
if (unavailableLegacy.length) {
  console.warn(`[legacy pipeline unavailable] ${unavailableLegacy.join(", ")}`);
} else {
  console.log("[legacy pipeline available] historical generation sources are present");
}

console.log("current resources passed: manifest/assets/page contracts");
