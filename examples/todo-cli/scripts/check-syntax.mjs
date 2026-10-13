// This JavaScript example needs no transpilation; build checks syntax, not live SDK behavior.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = new URL('../', import.meta.url);
for (const folder of ['src/', 'scripts/']) {
  for (const file of readdirSync(new URL(folder, root)).filter(name => name.endsWith('.mjs'))) {
    const result = spawnSync(process.execPath, ['--check', fileURLToPath(new URL(folder + file, root))], { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
}
console.log('JavaScript syntax checked; no SDK install or live requests.');
