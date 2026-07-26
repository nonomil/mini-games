import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(root, process.argv[2] || 'dist');
const rootPrefix = `${root}${path.sep}`;

if (output === root || !output.startsWith(rootPrefix)) {
  throw new Error(`[assemble-pages-artifact] output must stay inside repository: ${output}`);
}

function copyTree(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(sourcePath, destinationPath);
    else if (entry.isFile()) fs.copyFileSync(sourcePath, destinationPath);
  }
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const file of ['index.html', 'app.js', 'bridge.js', 'styles.css']) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
for (const directory of ['data', 'assets', 'games', 'host', 'vendor']) {
  copyTree(path.join(root, directory), path.join(output, directory));
}
fs.writeFileSync(path.join(output, '.nojekyll'), '', 'utf8');

const files = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(full);
    else files.push(full);
  }
}
collect(output);
const bytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0);
console.log(JSON.stringify({ output: path.relative(root, output), fileCount: files.length, bytes }, null, 2));
