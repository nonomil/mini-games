import { chromium } from "playwright";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const url = `${pathToFileURL(resolve(here, "index.html")).href}?test=1`;
const browserCandidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function snapshot(page) {
  return page.evaluate(() => window.__typingDefenseTest.snapshot());
}

async function solveRound(page) {
  const before = await snapshot(page);
  await page.keyboard.type(String(before.target || "").slice(String(before.typed || "").length));
  await page.waitForFunction((hits) => {
    const snap = window.__typingDefenseTest.snapshot();
    return (snap.hits > hits && !snap.hitLock) || snap.state === "win";
  }, before.hits);
  return snapshot(page);
}

async function openFreshPage(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(url);
  await page.waitForLoadState("domcontentloaded");
  return page;
}

const executablePath = browserCandidates.find((candidate) => existsSync(candidate));
const browser = await chromium.launch(executablePath ? { executablePath } : {});

try {
  const page = await openFreshPage(browser);

  const hasTestApi = await page.evaluate(() => Boolean(window.__typingDefenseTest));
  assert(hasTestApi, "missing window.__typingDefenseTest in ?test=1 mode");

  const initial = await snapshot(page);
  assert(initial.activeMode === "words", `expected default mode words, got ${JSON.stringify(initial)}`);
  assert(initial.selectedVocabId === "auto-graded", `expected auto graded default vocab, got ${JSON.stringify(initial)}`);
  assert(initial.autoVocabEnabled, `default vocab should enable auto grading, got ${JSON.stringify(initial)}`);
  assert(initial.vocabTitle.includes("幼儿园"), `default vocab should start at kindergarten, got ${JSON.stringify(initial)}`);
  assert(initial.vocabWordCount >= 200, `kindergarten word pool should come from the real graded bank, got ${JSON.stringify(initial)}`);
  assert(initial.modeConfiguredSpeedMs >= 20000, `word mode should keep a calm timer, got ${JSON.stringify(initial)}`);

  const openingEnemies = await page.evaluate(() => window.__typingDefenseTest.enemySnapshots());
  assert(openingEnemies.every(enemy => enemy.route && Number.isFinite(enemy.route.startX) && Number.isFinite(enemy.route.endX)), `each creeper needs an individual pursuit route, got ${JSON.stringify(openingEnemies)}`);
  assert(openingEnemies.length === 1 || new Set(openingEnemies.map(enemy => `${enemy.route.startX}:${enemy.route.endX}:${enemy.route.curve}`)).size > 1, `creepers should not share one fixed route, got ${JSON.stringify(openingEnemies)}`);
  assert(openingEnemies.every(enemy => enemy.route.groundStart >= 0.45 && enemy.route.groundEnd <= 0.9), `creeper routes must stay grounded, got ${JSON.stringify(openingEnemies)}`);
  const spawnWaves = await page.evaluate(() => Array.from({ length: 12 }, (_, index) => window.__typingDefenseTest.previewEnemyWave((index % 6) + 1)));
  assert(new Set(spawnWaves.map(wave => wave.length)).size > 1, `enemy waves should vary between one and three creepers, got ${JSON.stringify(spawnWaves)}`);
  assert(spawnWaves.every(wave => wave.length >= 1 && wave.length <= 3), `enemy waves should remain child-manageable, got ${JSON.stringify(spawnWaves)}`);
  assert(spawnWaves.some(wave => wave.some(enemy => enemy.route.spawnAt > 0)), `extra creepers should enter with staggered timing, got ${JSON.stringify(spawnWaves)}`);
  const stagedWaves = await page.evaluate(() => [1, 2, 3, 4, 5, 6].map(round => window.__typingDefenseTest.previewEnemyWave(round)));
  assert(JSON.stringify(stagedWaves.map(wave => wave.length)) === JSON.stringify([1, 1, 2, 2, 2, 3]), `waves should progress from warmup to pursuit to climax, got ${JSON.stringify(stagedWaves)}`);

  const menuState = await page.evaluate(() => ({
    title: document.querySelector("#startSummaryTitle")?.textContent?.trim() || "",
    startAction: document.querySelector("#overlayStart")?.textContent?.trim() || "",
    overlayText: document.querySelector("#overlayText")?.textContent?.trim() || "",
    selectedTab: document.querySelector(".mode-tab.is-selected")?.textContent?.trim() || ""
  }));
  assert(/年级单词/.test(menuState.title), `menu summary should foreground grade words, got ${JSON.stringify(menuState)}`);
  assert(/开始幼儿园 年级单词|开始年级单词|开始幼儿园/.test(menuState.startAction), `start action should describe grade word mode, got ${JSON.stringify(menuState)}`);
  assert(/幼儿园词库/.test(menuState.overlayText), `overlay copy should mention the current vocab bank, got ${JSON.stringify(menuState)}`);
  assert(menuState.selectedTab === "年级单词", `default selected tab should be grade word mode, got ${JSON.stringify(menuState)}`);

  await page.locator("#overlayStart").click();
  const letterBefore = await snapshot(page);
  await page.keyboard.press(letterBefore.target[0]);
  await page.waitForFunction((before) => window.__typingDefenseTest.snapshot().lastMiniArrowCount > before, letterBefore.lastMiniArrowCount);
  const letterAfter = await snapshot(page);
  const enemiesAfterLetter = await page.evaluate(() => window.__typingDefenseTest.enemySnapshots());
  assert(letterAfter.lastLetterFeedback === "step", `a correct partial word should give immediate hit feedback, got ${JSON.stringify(letterAfter)}`);
  assert(enemiesAfterLetter.some(enemy => enemy.recoil > 0), `a correct letter should push its creeper back, got ${JSON.stringify(enemiesAfterLetter)}`);
  if (!letterAfter.hitLock) await page.keyboard.press('Backspace');
  await solveRound(page);
  await solveRound(page);
  const autoRound3 = await snapshot(page);
  assert(autoRound3.roundIndex === 3, `expected round 3 after two clears, got ${JSON.stringify(autoRound3)}`);
  assert(autoRound3.activeVocabId === "elementary-lower", `round 3 should promote to elementary-lower, got ${JSON.stringify(autoRound3)}`);
  assert(autoRound3.vocabTitle.includes("小学低年级"), `round 3 should expose elementary-lower vocab, got ${JSON.stringify(autoRound3)}`);
  const autoSounds = await page.evaluate(() => window.__typingDefenseTest.soundEvents());
  assert(autoSounds.includes("sfx:gradeup"), `grade promotion should emit gradeup sound, got ${JSON.stringify(autoSounds)}`);
  await page.close();

  const manualPage = await openFreshPage(browser);
  await manualPage.locator("#vocabSelect").selectOption("elementary-upper");
  const manualMenu = await snapshot(manualPage);
  assert(manualMenu.activeMode === "words", `manual grade selection should stay in words mode, got ${JSON.stringify(manualMenu)}`);
  assert(manualMenu.vocabTitle.includes("小学高年级"), `manual selection should switch vocab title, got ${JSON.stringify(manualMenu)}`);
  assert(manualMenu.vocabWordCount >= 50, `elementary-upper bank should expose its full grade pool, got ${JSON.stringify(manualMenu)}`);

  await manualPage.locator("#overlayStart").click();
  const collectedTargets = new Set();
  for (let i = 0; i < 8; i += 1) {
    const current = await snapshot(manualPage);
    collectedTargets.add(current.target);
    await manualPage.locator("#skipButton").click();
    await manualPage.waitForTimeout(40);
  }
  const targetLengths = [...collectedTargets].map((word) => String(word).length);
  assert(targetLengths.some((length) => length > 5), `word mode should no longer be capped at 5 letters, got ${JSON.stringify([...collectedTargets])}`);
  await manualPage.close();

  const rewardPage = await openFreshPage(browser);
  await rewardPage.locator("#vocabSelect").selectOption("kindergarten");
  await rewardPage.locator("#overlayStart").click();
  for (let i = 0; i < 6; i += 1) {
    await solveRound(rewardPage);
  }
  const rewardState = await snapshot(rewardPage);
  assert(rewardState.state === "win", `manual kindergarten run should reach win state, got ${JSON.stringify(rewardState)}`);
  const rewardLabels = await rewardPage.evaluate(() => Array.from(document.querySelectorAll("[data-reward-action]")).map((node) => ({
    action: node.getAttribute("data-reward-action") || "",
    text: node.textContent?.trim() || ""
  })));
  assert(rewardLabels.some((item) => item.action === "next-grade" && /小学低年级/.test(item.text)), `win rewards should suggest the next grade bank, got ${JSON.stringify(rewardLabels)}`);
  await rewardPage.locator('[data-reward-action="next-grade"]').click();
  const nextGradeState = await snapshot(rewardPage);
  assert(nextGradeState.activeMode === "words", `next-grade action should stay in word mode, got ${JSON.stringify(nextGradeState)}`);
  assert(nextGradeState.selectedVocabId === "elementary-lower", `next-grade action should switch selected vocab, got ${JSON.stringify(nextGradeState)}`);
  assert(nextGradeState.vocabTitle.includes("小学低年级"), `next-grade action should start elementary-lower run, got ${JSON.stringify(nextGradeState)}`);
  await rewardPage.close();

  const pinyinPage = await openFreshPage(browser);
  await pinyinPage.locator("#vocabSelect").selectOption("bridge-pinyin");
  await pinyinPage.locator('[data-mode="pinyin"]').click();
  await pinyinPage.locator('[data-pinyin-tier="phrase"]').click();
  const pinyinState = await snapshot(pinyinPage);
  assert(pinyinState.activeMode === "pinyin", `expected pinyin mode, got ${JSON.stringify(pinyinState)}`);
  assert(pinyinState.activePinyinTier === "phrase", `expected phrase pinyin tier, got ${JSON.stringify(pinyinState)}`);
  const pinyinBadges = await pinyinPage.evaluate(() => Array.from(document.querySelectorAll(".enemy-task-badge .enemy-task-main")).map((node) => node.textContent?.trim() || ""));
  assert(pinyinBadges.some((text) => text.length >= 2), `phrase pinyin mode should show multi-character prompts, got ${JSON.stringify(pinyinBadges)}`);
  await pinyinPage.close();

  const mathPage = await openFreshPage(browser);
  await mathPage.locator('[data-mode="mathEasy20"]').click();
  const easy20Guide = await mathPage.evaluate(() => ({
    title: document.querySelector("#mathGuideTitle")?.textContent?.trim() || "",
    fit: document.querySelector("#mathGuideFit")?.textContent?.trim() || "",
    rules: Array.from(document.querySelectorAll("#mathGuideRules .math-guide-rule")).map((node) => node.textContent?.trim() || "")
  }));
  assert(/加减起步/.test(easy20Guide.title), `math guide should match easy20 title, got ${JSON.stringify(easy20Guide)}`);
  assert(easy20Guide.rules.includes("20以内"), `math guide should explain easy20 range, got ${JSON.stringify(easy20Guide)}`);
  await mathPage.locator("#overlayStart").click();
  const easy20State = await snapshot(mathPage);
  const easy20Prompt = await mathPage.evaluate(() => document.querySelector("#hintText .prompt-primary")?.textContent?.trim() || "");
  assert(easy20State.activeMode === "mathEasy20", `expected mathEasy20 mode, got ${JSON.stringify(easy20State)}`);
  assert(/^\d+$/.test(String(easy20State.target)), `easy20 answer should be numeric, got ${JSON.stringify(easy20State)}`);
  assert(/^[0-9]+[+-][0-9]+$/.test(easy20Prompt), `easy20 should show add/sub prompt, got ${JSON.stringify({ easy20State, easy20Prompt })}`);

  await mathPage.reload();
  await mathPage.waitForLoadState("domcontentloaded");
  await mathPage.locator('[data-mode="mathEasy100"]').click();
  await mathPage.locator('[data-math-support="slow_enemy"]').click();
  await mathPage.locator("#overlayStart").click();
  const easy100State = await snapshot(mathPage);
  const easy100Prompt = await mathPage.evaluate(() => document.querySelector("#hintText .prompt-primary")?.textContent?.trim() || "");
  assert(easy100State.activeMode === "mathEasy100", `expected mathEasy100 mode, got ${JSON.stringify(easy100State)}`);
  assert(/^\d+$/.test(String(easy100State.target)), `easy100 answer should be numeric, got ${JSON.stringify(easy100State)}`);
  assert(/^[0-9]+[+-][0-9]+$/.test(easy100Prompt), `easy100 should show add/sub prompt, got ${JSON.stringify({ easy100State, easy100Prompt })}`);
  assert(easy100State.activeMathSupportId === "slow_enemy", `easy100 should carry selected slow support, got ${JSON.stringify(easy100State)}`);

  await mathPage.reload();
  await mathPage.waitForLoadState("domcontentloaded");
  await mathPage.locator('[data-mode="mathMul"]').click();
  await mathPage.locator('[data-math-support="show_array"]').click();
  await mathPage.locator("#overlayStart").click();
  const mathMulState = await snapshot(mathPage);
  const mathMulPrompt = await mathPage.evaluate(() => document.querySelector("#hintText .prompt-primary")?.textContent?.trim() || "");
  const mathMulHelper = await mathPage.evaluate(() => document.querySelector("#hintText .prompt-secondary")?.textContent?.trim() || "");
  assert(mathMulState.activeMode === "mathMul", `expected mathMul mode, got ${JSON.stringify(mathMulState)}`);
  assert(/^\d+$/.test(String(mathMulState.target)), `mathMul answer should be numeric, got ${JSON.stringify(mathMulState)}`);
  assert(/^[0-9]+[+×-][0-9]+$/.test(mathMulPrompt), `mathMul should show arithmetic prompt, got ${JSON.stringify({ mathMulState, mathMulPrompt })}`);
  assert(mathMulHelper.length > 0, `mathMul should show helper copy, got ${JSON.stringify({ mathMulState, mathMulPrompt, mathMulHelper })}`);
  assert(mathMulState.activeMathSupportId === "show_array", `mathMul should activate show_array support, got ${JSON.stringify(mathMulState)}`);

  await mathPage.reload();
  await mathPage.waitForLoadState("domcontentloaded");
  await mathPage.locator('[data-mode="mathEasy20"]').click();
  await mathPage.locator('[data-math-support="retry_once"]').click();
  await mathPage.locator("#overlayStart").click();
  await mathPage.evaluate(() => window.__typingDefenseTest.forceDamage());
  await mathPage.waitForTimeout(450);
  const retryState = await snapshot(mathPage);
  assert(retryState.activeMathSupportId === "retry_once", `retry_once should activate in easy20, got ${JSON.stringify(retryState)}`);
  assert(retryState.mathRetryUsed === true, `retry_once should mark itself used after one rescue, got ${JSON.stringify(retryState)}`);
  assert(retryState.hp === 3, `retry_once should preserve hp on the first failure, got ${JSON.stringify(retryState)}`);
  await mathPage.close();

  console.log("simulate.mjs passed");
} finally {
  await browser.close();
}
