import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { smoke } from '../scripts/smoke.mjs';
import { TodoStore } from '../src/todos.mjs';

for (const failAt of ['none', 'open', 'turn', 'close']) test(`smoke cleans only its own data, including ${failAt} failure`, async t => {
  let smokeDir;
  let calls = 0;
  const unrelatedDir = mkdtempSync(join(tmpdir(), 'todo-person-data-'));
  t.after(() => rmSync(unrelatedDir, { recursive: true, force: true }));
  const keep = join(unrelatedDir, 'keep.txt');
  writeFileSync(keep, 'real user data');
  const action = smoke({ options: { projectKey: 'fixture-public', debugKey: 'fixture-private', user: 'real-user' },
    report: () => {}, open: async options => {
      smokeDir = options.dataDir;
      assert.match(options.user, /^smoke-/);
      assert.notEqual(options.user, 'real-user');
      if (failAt === 'open') throw new Error('fixture');
      const store = new TodoStore(join(smokeDir, 'todos.json'));
      return { store,
        close: async () => { if (failAt === 'close') throw new Error('fixture'); },
        send: async () => {
          if (failAt === 'turn') throw new Error('fixture');
          calls++;
          if (calls === 1) store.add('Smoke check task');
          if (calls === 2) store.complete('t1');
          return calls === 3 ? 'What date should it be due?' : 'OK';
        },
      };
    },
  });
  if (failAt === 'none') await action; else await assert.rejects(action);
  assert.ok(smokeDir);
  assert.equal(existsSync(smokeDir), false);
  assert.equal(readFileSync(keep, 'utf8'), 'real user data');
});
