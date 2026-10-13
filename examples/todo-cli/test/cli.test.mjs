import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { run } from '../src/main.mjs';
import { settings, errorMessage } from '../src/app.mjs';
import { inputFor } from '../src/input.mjs';
import { readImage } from '../src/image.mjs';
import { TodoStore } from '../src/todos.mjs';

const env = { CROCHE_PROJECT_KEY: 'fixture-project', CROCHE_DEBUG_KEY: 'fixture-private' };
function output() {
  let text = '';
  return { stream: new Writable({ write(chunk, _, done) { text += chunk; done(); } }), text: () => text };
}
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

for (const failure of [false, true]) test(`one-shot plain text is shell-testable and closes (failure=${failure})`, async () => {
  const out = output();
  let closed = 0;
  const task = run({ args: ['--prompt', 'Add milk'], env, output: out.stream, open: async options => {
    assert.equal(options.debugKey, 'fixture-private');
    return { store: new TodoStore(), async send(input) {
      assert.deepEqual(input, { text: 'Add milk' });
      if (failure) throw new Error('fixture-private');
      return 'Done';
    }, close: async () => { closed++; } };
  } });
  if (failure) await assert.rejects(task); else await task;
  assert.equal(closed, 1);
  assert.doesNotMatch(out.text(), /fixture-private/);
});

test('plain text has no implicit state; /list supplies current app state', () => {
  const store = new TodoStore(); store.add('Milk');
  assert.deepEqual(inputFor('Hi', store), { text: 'Hi' });
  assert.deepEqual(inputFor('/list', store), { text: 'Show my current tasks.', context: { todos: store.list() } });
});

test('/photo stacks typed image, user text, event and current app state into one send', async t => {
  const dir = mkdtempSync(join(tmpdir(), 'todo-image-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'shopping list.png'); writeFileSync(file, png);
  const out = output();
  let sends = 0;
  const store = new TodoStore(); store.add('Existing task');
  await run({ args: ['--prompt', `/photo ${file}`], env, output: out.stream, open: async () => ({
    store, close: async () => {}, send: async input => {
      sends++;
      assert.deepEqual(input.context, { todos: store.list() });
      assert.equal(input.text, undefined);
      assert.equal(input.images, undefined);
      assert.equal(input.inputs[0].kind, 'user');
      assert.match(input.inputs[0].text, /Add everything/);
      const image = input.inputs[0].images[0];
      assert.equal(image.mime, 'image/png');
      assert.equal(image.resolution, 'high');
      assert.equal(image.data, png.toString('base64'));
      assert.doesNotMatch(image.alt, /todo-image-test/);
      assert.equal(input.inputs[1].kind, 'event');
      return 'Added';
    },
  }) });
  assert.equal(sends, 1);
  writeFileSync(file, 'fixture-private-not-an-image');
  assert.throws(() => readImage(file), /Not a supported image/);
  writeFileSync(file, Buffer.alloc(3 * 1024 * 1024 + 1));
  assert.throws(() => readImage(file), /no larger than 3 MB/);
});

test('configuration and noninteractive usage fail before SDK work; safe errors omit raw values', async () => {
  assert.throws(() => settings({}), /Load the CLI-created/);
  for (const user of ['../another-user', '/tmp', 'a/b']) assert.throws(() => settings({ ...env, TODO_USER: user }));
  const open = () => assert.fail('Must not open the SDK');
  await assert.rejects(run({ args: [], env, input: { isTTY: false }, open }), /--prompt/);
  await assert.rejects(run({ args: ['--prompt', ''], env, open }), /nonempty/);
  const out = output();
  await run({ args: ['--help'], env: {}, output: out.stream, open });
  assert.match(out.text(), /\/photo/);
  assert.doesNotMatch(errorMessage(new Error('fixture-private')), /fixture-private/);
  assert.match(errorMessage({ code: 'invite_required' }), /Activate/);
});

test('the documented Node --env-file flag actually loads private configuration', t => {
  const dir = mkdtempSync(join(tmpdir(), 'todo-env-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, '.env'), 'CROCHE_PROJECT_KEY=fixture-project\nCROCHE_DEBUG_KEY=fixture-private\n', { mode: 0o600 });
  const app = new URL('../src/app.mjs', import.meta.url).href;
  const script = `import {settings} from ${JSON.stringify(app)}; if (settings().debugKey !== 'fixture-private') throw new Error('not loaded'); console.log('configuration present');`;
  const clean = { ...process.env }; delete clean.CROCHE_DEBUG_KEY; delete clean.CROCHE_PROJECT_KEY; delete clean.TODO_USER;
  const result = spawnSync(process.execPath, ['--env-file=.env', '--input-type=module', '-e', script], { cwd: dir, env: clean, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'configuration present');
  assert.doesNotMatch(result.stdout + result.stderr, /fixture-private/);
});
