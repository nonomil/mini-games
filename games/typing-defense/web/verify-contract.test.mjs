import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const webRoot = dirname(fileURLToPath(import.meta.url));

test("verify validates current resources while reporting the unavailable legacy pipeline", () => {
  const result = spawnSync(process.execPath, [resolve(webRoot, "verify.mjs")], {
    cwd: resolve(webRoot, "..", ".."),
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /current resources passed/);
  assert.match(`${result.stdout}\n${result.stderr}`, /legacy pipeline unavailable/);
});

test("browser entry imports MIME-safe JavaScript module files", () => {
  const gameSource = readFileSync(resolve(webRoot, "game.js"), "utf8");
  const imports = [...gameSource.matchAll(/from\s+["'](\.\/[^"']+)["']/g)].map((match) => match[1]);

  assert.ok(imports.length >= 4, `expected browser entry imports, got ${JSON.stringify(imports)}`);
  assert.ok(imports.every((value) => value.endsWith(".js")), `browser imports must use .js MIME-safe files: ${JSON.stringify(imports)}`);
  assert.ok(imports.every((value) => existsSync(resolve(webRoot, value))), `browser imports must resolve: ${JSON.stringify(imports)}`);
});

test("test pages expose module-load diagnostics without adding production globals", () => {
  const gameSource = readFileSync(resolve(webRoot, "game.js"), "utf8");

  assert.match(gameSource, /__typingDefenseDiagnostics/);
  assert.match(gameSource, /unhandledrejection/);
  assert.match(gameSource, /new URLSearchParams\(window\.location\.search\)\.has\("test"\)/);
});
