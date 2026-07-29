# Math Adventure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current math PK landing page with a clear addition/multiplication adventure flow and a separate daily random PK, while preserving the existing legacy PK runtime for other imported hosts.

**Architecture:** Keep `vendor/js/math-pk.js` unchanged as the legacy pet-vs-robot implementation. Add a small standalone runtime at `games/math-pk/math-adventure.js` that owns chapter data, progress, wrong-answer storage, daily question selection, stage play, and the simplified daily PK screen. `games/math-pk/game.js` only boots the runtime; `index.html` loads the new runtime instead of the legacy lobby.

**Tech Stack:** Native HTML/CSS/JavaScript, browser `localStorage`, Node `node:assert` contract tests, static Node server, Playwright/browser inspection.

---

### Task 1: Define the new runtime contract

**Files:**
- Create: `tests/test-math-adventure.mjs`
- Modify: `tests/test-math-pk-standalone.mjs`
- Modify: `tests/contract.mjs`

**Step 1: Write the failing test**

Assert that the new runtime exposes addition and multiplication chapters, stage progression, deterministic daily question selection, shared wrong-answer storage, five-round daily PK, and the new boot contract. Assert that the page no longer loads the legacy lobby as its primary renderer.

**Step 2: Run the focused test**

Run: `node tests/test-math-adventure.mjs`

Expected: FAIL because `games/math-pk/math-adventure.js` and its public runtime contract do not exist yet.

**Step 3: Keep the failure scoped**

Do not change production files until the failure proves the missing new contract rather than a test typo.

### Task 2: Implement pure math adventure domain data

**Files:**
- Create: `games/math-pk/math-adventure.js`
- Test: `tests/test-math-adventure.mjs`

**Step 1: Implement chapter and stage definitions**

Add independent addition and multiplication stage definitions matching the approved requirements. Addition is the default chapter; multiplication begins with “几组几个”. Each stage has an id, title, topic, question generator, and unlock order.

**Step 2: Implement progress helpers**

Implement `createInitialProgress`, `readProgress`, `writeProgress`, `completeStage`, `recordWrongAnswer`, `resolveWrongAnswer`, and `getStageStatus`. Use `minigames_math_adventure_v1` for main progress and `minigames_math_daily_pk_v1` for daily state. Storage failures must fall back to in-memory defaults.

**Step 3: Implement bounded question generation**

Implement deterministic question generation for each stage. Addition questions must stay inside the stage range. Multiplication questions must expose `groups`, `groupSize`, `answer`, and a readable prompt. The daily question generator must accept a date seed and only draw from unlocked stages.

**Step 4: Run the focused test**

Run: `node tests/test-math-adventure.mjs`

Expected: PASS for data, progress, wrong-answer, and deterministic question assertions.

### Task 3: Implement the standalone adventure UI flow

**Files:**
- Modify: `games/math-pk/math-adventure.js`
- Modify: `games/math-pk/game.js`
- Modify: `games/math-pk/index.html`
- Modify: `games/math-pk/styles.css`

**Step 1: Render the home screen**

Render a single main panel with the current chapter, chapter tabs, a five-node level map, continue action, daily PK entry, and wrong-answer count. Do not render a global difficulty-card grid or support-card chooser.

**Step 2: Render stage play**

Render a stable top progress row, one question, three answer buttons, three hearts, and short result feedback. On wrong answers, record the item and keep the stage playable. On completion, unlock the next stage and show “错题再战” and “返回地图”.

**Step 3: Render the shared wrong-answer book**

Group wrong answers by chapter, allow a focused retry run, and remove an item after it is answered correctly in the retry flow.

**Step 4: Wire the standalone boot**

Make `game.js` call `MathAdventureGame.render('math-pk-container')`, provide the standalone home fallback, and expose only the new runtime boot API. Remove the legacy `vendor/js/math-pk.js` script from this page while leaving that file available to the importer and other hosts.

**Step 5: Run focused tests**

Run: `node tests/test-math-adventure.mjs && node tests/test-math-pk-standalone.mjs`

Expected: PASS with the new HTML, boot, storage, chapter, and UI selectors.

### Task 4: Implement the daily random PK

**Files:**
- Modify: `games/math-pk/math-adventure.js`
- Modify: `games/math-pk/styles.css`
- Test: `tests/test-math-adventure.mjs`

**Step 1: Implement the five-round match model**

Use the original PK shape: five rounds, same question for player and robot, robot deadline, correct-before-deadline wins the round, wrong answers allow continued attempts, and final score/round summary. Questions must be selected from unlocked addition/multiplication stages using a date seed.

**Step 2: Implement daily completion and rewards**

Store the date and result in the daily key. Prevent repeat daily rewards on the same date. Use `GameRewardReceipts`/`PetBankPoints` when available and record a lightweight activity entry. A lost match still records completion and wrong answers.

**Step 3: Add PK UI and return paths**

Render pet, robot, round score, question, answer buttons, robot timer, and a compact result view. Provide actions for “再看错题”, “返回冒险”, and “明天再来”.

**Step 4: Run focused tests**

Run: `node tests/test-math-adventure.mjs`

Expected: PASS for five-round rules, bounded daily selection, date reset, and reward de-duplication.

### Task 5: Verify the full project and browser behavior

**Files:**
- Check: `games/math-pk/index.html`
- Check: `games/math-pk/game.js`
- Check: `games/math-pk/math-adventure.js`
- Check: `games/math-pk/styles.css`
- Check: `tests/test-math-adventure.mjs`
- Check: `tests/test-math-pk-standalone.mjs`
- Check: `tests/contract.mjs`

**Step 1: Run static checks**

Run: `npm test`

Expected: all existing and new contract tests pass.

**Step 2: Start the server**

Run: `npm run serve -- --port 7014`

Expected: `http://127.0.0.1:7014/` serves the project without changing the existing port.

**Step 3: Verify desktop and mobile flows**

Open `games/math-pk/` at desktop and 390x844. Verify home, chapter switching, stage entry, correct/wrong answers, wrong-answer retry, daily PK, daily result, and no horizontal overflow. Check the console for uncaught errors and missing assets.

**Step 4: Run final regression**

Run: `npm test`

Expected: exit code 0 with no failed tests. Report any unrelated pre-existing worktree changes separately; do not revert them.
