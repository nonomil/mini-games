import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

class MemoryStorage {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(String(key)) ? this.values.get(String(key)) : null;
  }

  setItem(key, value) {
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(String(key));
  }
}

const sandbox = {
  console,
  Date,
  Math,
  localStorage: new MemoryStorage(),
  setTimeout,
  clearTimeout
};
sandbox.window = sandbox;
vm.runInNewContext(read('games/math-pk/math-adventure.js'), sandbox, {
  filename: 'games/math-pk/math-adventure.js'
});

const adventure = sandbox.MathAdventureGame;
assert.ok(adventure, 'math adventure runtime should expose MathAdventureGame');
assert.deepEqual(Object.keys(adventure.CHAPTERS), ['addition', 'multiplication']);
assert.equal(adventure.CHAPTERS.addition.stages.length, 5);
assert.equal(adventure.CHAPTERS.multiplication.stages.length, 6);
assert.equal(adventure.CHAPTERS.multiplication.stages[0].id, 'mul-groups');
assert.equal(adventure.DAILY_ROUNDS, 5);

const initial = adventure.createInitialProgress();
assert.equal(initial.chapters.addition.unlockedStage, 0);
assert.equal(initial.chapters.multiplication.unlockedStage, 0);
assert.equal(initial.wrongAnswers.length, 0);

const completed = adventure.completeStage(initial, 'addition', 'add-5');
assert.equal(completed.chapters.addition.unlockedStage, 1);
assert.equal(adventure.getStageStatus(completed, 'addition', 'add-5'), 'completed');
assert.equal(adventure.getStageStatus(completed, 'addition', 'add-10'), 'unlocked');
assert.equal(adventure.getStageStatus(initial, 'addition', 'add-10'), 'locked');

const wrongQuestion = {
  id: 'add-5:2+3',
  chapterId: 'addition',
  stageId: 'add-5',
  prompt: '2 + 3 = ?',
  answer: 5,
  options: [4, 5, 6]
};
const withWrong = adventure.recordWrongAnswer(initial, wrongQuestion);
assert.equal(withWrong.wrongAnswers.length, 1);
assert.equal(withWrong.wrongAnswers[0].answer, 5);
const resolvedWrong = adventure.resolveWrongAnswer(withWrong, wrongQuestion.id);
assert.equal(resolvedWrong.wrongAnswers.length, 0);

const multiplicationQuestion = adventure.createQuestion('mul-groups', 11);
assert.equal(multiplicationQuestion.answer, multiplicationQuestion.groups * multiplicationQuestion.groupSize);
assert.match(multiplicationQuestion.prompt, /组/);
assert.equal(new Set(multiplicationQuestion.options).size, 3);

const dailyProgress = adventure.completeStage(
  adventure.completeStage(initial, 'addition', 'add-5'),
  'multiplication',
  'mul-groups'
);
const dailyA = adventure.createDailyQuestions('2026-07-29', dailyProgress, adventure.DAILY_ROUNDS);
const dailyB = adventure.createDailyQuestions('2026-07-29', dailyProgress, adventure.DAILY_ROUNDS);
assert.equal(JSON.stringify(dailyA), JSON.stringify(dailyB), 'same date and progress should produce the same daily questions');
assert.equal(dailyA.length, adventure.DAILY_ROUNDS);
for (const question of dailyA) {
  assert.ok(['add-5', 'add-10', 'mul-groups', 'mul-2'].includes(question.stageId));
}

const laterDaily = adventure.createDailyQuestions('2026-07-30', dailyProgress, adventure.DAILY_ROUNDS);
assert.notEqual(JSON.stringify(laterDaily), JSON.stringify(dailyA), 'a new date should rotate the daily question set');

const index = read('games/math-pk/index.html');
const boot = read('games/math-pk/game.js');
assert.match(index, /math-adventure\.js/);
assert.doesNotMatch(index, /vendor\/js\/math-pk\.js/);
assert.match(boot, /MathAdventureGame\.render\(['"]math-pk-container['"]\)/);
assert.match(boot, /minigames_math_adventure_v1/);

console.log('math adventure contract: ok');
