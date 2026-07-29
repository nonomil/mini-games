import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'games/learning-arcade/game.js'), 'utf8');

const movementBlock = source.match(/function wordShooterMovementDirection\(key\) \{[\s\S]*?\n  \}/)?.[0] || '';
assert.match(movementBlock, /arrowup:\s*'up'/);
assert.match(movementBlock, /arrowdown:\s*'down'/);
assert.match(movementBlock, /arrowleft:\s*'left'/);
assert.match(movementBlock, /arrowright:\s*'right'/);
for (const key of ['w', 'a', 's', 'd']) {
  assert.doesNotMatch(movementBlock, new RegExp(`${key}:`), `word-shooter must not map ${key} to movement`);
}
assert.doesNotMatch(source, /shouldTreatWordShooterLetterAsTyping/);

const shooterKeyboardBlock = source.match(/document\.addEventListener\('keydown',[\s\S]*?\n  \}\);/)?.[0] || '';
assert.match(shooterKeyboardBlock, /state\.activeGame === 'word-shooter' && movementDirection/);
assert.match(shooterKeyboardBlock, /state\.activeGame === 'word-shooter' && letterKey[\s\S]*?event\.preventDefault\(\);[\s\S]*?if \(event\.repeat\) return;[\s\S]*?inputWordLetter\(letterKey\)/);
assert.match(shooterKeyboardBlock, /state\.activeGame === 'word-cannon'[\s\S]*?inputWordCannonLetter\(key\)/);

const keyButtonBlock = source.match(/const keyButton = event\.target\.closest\('\[data-key\]'\);[\s\S]*?\n    const snakeAction/)?.[0] || '';
assert.match(keyButtonBlock, /inputWordLetter\(keyButton\.dataset\.key\)[\s\S]*?restoreActiveGameInputFocus\(\)/);

const shooterTouchMarkup = source.match(/function wordShooterTouchControlsMarkup\(\) \{[\s\S]*?\n  \}/)?.[0] || '';
assert.match(shooterTouchMarkup, /data-shooter-direction=/, 'word-shooter needs touch direction buttons');
assert.match(shooterTouchMarkup, /min-width:44px/);
assert.match(shooterTouchMarkup, /min-height:44px/);
for (const direction of ['up', 'down', 'left', 'right']) {
  assert.match(shooterTouchMarkup, new RegExp(`\\['${direction}',`));
}
assert.doesNotMatch(shooterTouchMarkup, /data-shooter-direction="[^"]+"[^>]*data-key=/);

const shooterTouchPointerBlock = source.match(/document\.addEventListener\('pointerdown',[\s\S]*?document\.addEventListener\('pointercancel',[\s\S]*?\n  \}\);/)?.[0] || '';
assert.match(source, /data-shooter-direction/);
assert.match(source, /function setWordShooterTouchDirection[\s\S]*?moveInput\[direction\] = pressed/);
assert.match(shooterTouchPointerBlock, /setWordShooterTouchDirection\(event, true\)/);
assert.match(shooterTouchPointerBlock, /setWordShooterTouchDirection\(event, false\)/);
assert.match(shooterTouchPointerBlock, /pointerup/);
assert.match(shooterTouchPointerBlock, /pointercancel/);

const cannonInputBlock = source.match(/function inputWordCannonLetter\(letter\) \{[\s\S]*?\n  \}/)?.[0] || '';
for (const [key, direction] of [['a', 'left'], ['d', 'right'], ['w', 'up'], ['s', 'down']]) {
  assert.match(cannonInputBlock, new RegExp(`key === '${key}'`));
  assert.match(cannonInputBlock, new RegExp(`moveWordCannonPlayer\\('${direction}'\\)`));
}

for (const boundary of [
  /wordCannon:\s*\(\)\s*=>\s*wordCannonSnapshot\(\)/,
  /selectWordCannonMap,/,
  /tickWordCannonFrame:/,
  /hanziPool:/,
  /ensureGameData\(gameId\)/
]) {
  assert.match(source, boundary, `PINYIN boundary is missing: ${boundary}`);
}

const difficultyTuningBlock = source.match(/const WORD_DIFFICULTY_TUNING = \{[\s\S]*?\n  \};/)?.[0] || '';
assert.match(difficultyTuningBlock, /basic:[\s\S]*?shooter:\s*\{[^}]*roundGoal:\s*6/);
assert.match(difficultyTuningBlock, /intermediate:[\s\S]*?shooter:\s*\{[^}]*roundGoal:\s*7/);
assert.match(difficultyTuningBlock, /full:[\s\S]*?shooter:\s*\{[^}]*roundGoal:\s*8/);
assert.doesNotMatch(difficultyTuningBlock, /shooter:\s*\{[^}]*roundGoal:\s*(?:9|10|11|12)/);

const shooterStateBlock = source.match(/wordShooter:\s*\{[\s\S]*?\n    \},\n    wordCannon:/)?.[0] || '';
assert.match(shooterStateBlock, /targetResults:\s*\[\]/);
assert.match(shooterStateBlock, /roundStatus:\s*'idle'/);
assert.match(shooterStateBlock, /paused:\s*false/);
for (const tag of ['missed-target', 'slow-completion', 'first-character-error', 'spelling-error']) {
  assert.match(source, new RegExp(`['"]${tag}['"]`), `missing shooter error tag: ${tag}`);
}

const shooterEnemyBlock = source.match(/function createWordShooterEnemy\(laneIndex = 0\) \{[\s\S]*?\n  \}/)?.[0] || '';
assert.match(shooterEnemyBlock, /wordData\.image/);
assert.match(shooterEnemyBlock, /wordData\.audio/);
assert.match(shooterEnemyBlock, /operationWindowMs/);
assert.match(shooterEnemyBlock, /errorTags:\s*\[\]/);

assert.match(source, /function recordWordShooterTargetResult\([\s\S]*?targetResults\.some/);
assert.match(source, /wordShooterResolvedTargetCount\(\)\s*>=\s*ws\.roundGoal/);
assert.match(source, /function wordShooterRoundSummaryPayload\(/);
assert.match(source, /data-shooter-review/);
assert.match(source, /roundAction\?\.dataset\.roundAction === 'review'/);
assert.match(source, /function toggleWordShooterPause\(/);
assert.match(source, /ws\.moveInput\s*=\s*\{\s*up:\s*false,\s*down:\s*false,\s*left:\s*false,\s*right:\s*false\s*\}/);

const retryStateBlock = source.match(/retryState:\s*\{[\s\S]*?\n      \},/)?.[0] || '';
assert.match(retryStateBlock, /active:\s*false/);
assert.match(retryStateBlock, /status:\s*'idle'/);
assert.match(source, /function enterWordShooterRetryState\(/);
assert.match(source, /function retryWordShooterTarget\(/);
assert.match(source, /function skipWordShooterTarget\(/);
assert.match(source, /roundStatus\s*=\s*'retry'/);
assert.match(source, /data-shooter-action="retry"/);
assert.match(source, /data-shooter-action="skip"/);
assert.match(source, /retryWordShooterTarget\(\)/);
assert.match(source, /skipWordShooterTarget\(\)/);
assert.match(source, /enterWordShooterRetryState\([\s\S]*?roundStatus\s*=\s*'retry'/);
assert.match(source, /retryWordShooterTarget\([\s\S]*?ws\.enemies\.push\(enemy\)/);
assert.match(source, /skipWordShooterTarget\([\s\S]*?recordWordShooterTargetResult\(enemy, 'missed'/);
assert.match(source, /function wordShooterDifficultyAdjustment\(/);
assert.match(source, /difficultyAssistLevel/);
assert.match(source, /consecutiveErrors/);
assert.match(source, /reducedDifficultyEvents/);
assert.match(source, /retryCount/);
assert.match(source, /skippedTargets/);
assert.match(source, /targetResults\.some[\s\S]*alreadyRecorded/);
assert.match(source, /retryState:[\s\S]*targetResults:/);
assert.match(source, /wordShooterRoundSummaryPayload\([\s\S]*?重试次数/);
assert.match(source, /wordShooterMarkInputError\([\s\S]*?difficultyAssistLevel/);

const shooterSnapshotBlock = source.match(/function wordShooterSnapshot\(\) \{[\s\S]*?\n  \}/)?.[0] || '';
assert.match(shooterSnapshotBlock, /targetResults:/);
assert.match(shooterSnapshotBlock, /roundStatus:/);
assert.match(shooterSnapshotBlock, /errorTags:/);
assert.match(shooterSnapshotBlock, /retryState:/);
assert.match(shooterSnapshotBlock, /difficultyAssistLevel/);

console.log('PASS shooter runtime boundary and keyboard contract');
