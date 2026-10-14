import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
test('package pins SDK 0.5.2, uses native env loading and ignores credentials/data', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.dependencies, { '@h1r-ai/croche': '0.5.2' });
  assert.equal(pkg.scripts.start, 'node --env-file=.env src/main.mjs');
  assert.equal(pkg.scripts.smoke, 'node --env-file=.env scripts/smoke.mjs');
  const ignored = readFileSync(join(root, '.gitignore'), 'utf8').split('\n');
  for (const name of ['.env', '.env.*', '!.env.example', '.data/']) assert.ok(ignored.includes(name));
  const sample = readFileSync(join(root, '.env.example'), 'utf8');
  for (const line of sample.split('\n').filter(l => l.startsWith('CROCHE_'))) assert.ok(line.endsWith('='));
  assert.equal(readFileSync(join(root, 'src/croche.mjs'), 'utf8').trim().split('\n').length, 29);
});
test('no real credentials, internal endpoints or retired SDK names in example source', () => {
  const retired = ['debug' + 'Token', ['CROCHE', 'CLOUD', 'URL'].join('_'), 'cloud' + 'Url'];
  for (const entry of readdirSync(root, { recursive: true }).filter(p => /\.(?:mjs|md|json)$/.test(p) && !p.startsWith('node_modules/'))) {
    const text = readFileSync(join(root, entry), 'utf8');
    assert.doesNotMatch(text, /(?:cdt_|dk_|sk_)[a-f0-9]{32,}/i, entry);
    for (const term of retired) assert.ok(!text.includes(term), `${entry}: ${term}`);
    assert.doesNotMatch(text, /H1R-AI\/croche-runtime|api-dev\.|studio-dev\./, entry);
  }
});

test('published setup uses Account key, one-time PowerShell policy and JSON only for agent-parsed project creation', () => {
  const guide = readFileSync(join(root, 'README.md'), 'utf8');
  assert.match(guide, /published `@h1r-ai\/croche` 0\.5\.2/);
  assert.match(guide, /Account → Account keys/);
  assert.match(guide, /Set-ExecutionPolicy -Scope CurrentUser RemoteSigned/);
  assert.match(guide, /uses plain `croche`/);
  assert.doesNotMatch(guide, /not (?:yet )?published|candidate|developer[\s-]+key|CLI keys/i);
  assert.ok(!guide.includes(['croche', 'cmd'].join('.')));
  assert.equal((guide.match(/--json/g) ?? []).length, 1);
  assert.match(guide, /coding agent can use `croche projects create[^`]+--json` and parse/);
  assert.doesNotMatch(guide, /croche login[^`\n]*--json/);
});
