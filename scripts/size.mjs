// The built package as an app ships it: minified (as the Angular CLI does in production) and
// gzipped. Fails when a file is over its budget, so the package does not grow by accident; raise
// a budget on purpose, in the same change that needs it.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { transformSync } from 'esbuild';

/** [file in dist/ng-tel-input, loader, budget in bytes] */
const budgets = [['fesm2022/stefankuburovic-ng-tel-input.mjs', 'js', 3000]];

let over = false;
for (const [file, loader, budget] of budgets) {
  const source = readFileSync(`dist/ng-tel-input/${file}`, 'utf8');
  const { code } = transformSync(source, { loader, minify: true });
  const size = gzipSync(code, { level: 9 }).length;
  const ok = size <= budget;
  over ||= !ok;
  console.log(`${ok ? 'ok  ' : 'OVER'} ${file.padEnd(50)} ${String(size).padStart(5)} B  (budget ${budget} B)`);
}
if (over) {
  process.exitCode = 1;
}
