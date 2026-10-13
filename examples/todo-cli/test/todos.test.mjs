import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TodoStore } from '../src/todos.mjs';
import { INSTRUCTIONS } from '../src/agent.mjs';

test('app-owned add, list and complete; missing deadline stays absent', () => {
  const store = new TodoStore();
  assert.equal(store.add('Buy milk').status, 'ok');
  assert.equal(store.get('t1').due, null);
  assert.equal(store.complete('t1').status, 'ok');
  assert.equal(store.complete('t1').status, 'rejected');
  assert.equal(store.complete('missing').status, 'rejected');
  assert.equal(store.list()[0].done, true);
});

test('invalid inputs and impossible dates are rejected without mutation', () => {
  const store = new TodoStore();
  for (const [title, due] of [[''], [123], ['a'.repeat(201)], ['x', 'tomorrow'],
    ['x', '2026-02-30'], ['x', '2025-02-29']]) assert.equal(store.add(title, due).status, 'rejected');
  assert.deepEqual(store.list(), []);
  assert.equal(store.add('Leap day', '2028-02-29').status, 'ok');
  assert.match(INSTRUCTIONS, /missing or ambiguous, ask for the date instead of guessing/);
});

test('state survives restart; returned snapshots cannot mutate it; IDs stay unique', t => {
  const dir = mkdtempSync(join(tmpdir(), 'todo-store-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, 'todos.json');
  const first = new TodoStore(file);
  first.add('Keep me');
  first.get('t1').title = 'do not keep this';
  first.list()[0].done = true;
  const second = new TodoStore(file);
  assert.equal(second.get('t1').title, 'Keep me');
  assert.equal(second.get('t1').done, false);
  assert.equal(second.add('Another').task.id, 't2');
  if (process.platform !== 'win32') assert.equal(statSync(file).mode & 0o777, 0o600);
});
