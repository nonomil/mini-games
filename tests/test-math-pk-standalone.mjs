import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const index = read('games/math-pk/index.html');
const boot = read('games/math-pk/game.js');
const runtime = read('games/math-pk/math-adventure.js');
const legacyRuntime = read('vendor/js/math-pk.js');
const requirements = read('docs/plans/2026-07-28-math-adventure-requirements.md');

assert.match(index, /host\/petbank-host-shim\.js/);
assert.match(index, /\.\/game\.js/);
assert.match(index, /\.\/styles\.css/);
assert.doesNotMatch(index, /DOMContentLoaded/);

assert.match(boot, /MathAdventureGame\.render\(['"]math-pk-container['"]\)/);
assert.match(boot, /URLSearchParams\(window\.location\.search\)/);
assert.match(boot, /mode.*daily/);
assert.match(boot, /minigames_math_adventure_v1/);
assert.match(boot, /minigames_math_daily_pk_v1/);
assert.match(runtime, /minigames_math_adventure_v1/);
assert.match(runtime, /minigames_math_daily_pk_v1/);
assert.match(runtime, /加法篇/);
assert.match(runtime, /乘法篇/);
assert.match(runtime, /今日随机 PK/);
assert.match(runtime, /错题本/);
assert.match(runtime, /几组几个/);
assert.match(runtime, /DAILY_ROUNDS = 5/);
assert.match(legacyRuntime, /MathPKGame/);
assert.match(legacyRuntime, /STORAGE_KEY_DIFFICULTY/);

for (const asset of [
  'assets/pets/poses/dog_idle.webp',
  'assets/arena/math-rivals/robot-mul-v5.webp',
  'assets/arena/math-rivals/robot-easy20-v5.webp'
]) {
  assert.equal(exists(asset), true, `missing Math PK asset: ${asset}`);
}

assert.ok(requirements.trim().length > 0, 'math adventure requirements must not be empty');
assert.match(requirements, /加法篇/);
assert.match(requirements, /乘法篇/);
assert.match(requirements, /每日随机 PK/);
assert.match(requirements, /错题本/);

console.log('math-pk standalone contract: ok');
