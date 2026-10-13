import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { errorMessage, openSession, settings } from '../src/app.mjs';

/** Three live turns. Only our unique temporary directory is deleted, even on failure. */
export async function smoke({ options = settings(), open = openSession, report = console.log } = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), 'croche-todo-smoke-'));
  const smokeOptions = { ...options, user: `smoke-${randomUUID()}`, dataDir };
  let session;
  try {
    session = await open(smokeOptions);
    await session.send({ text: 'Add exactly one task titled "Smoke check task" with no deadline.' });
    assert.equal(session.store.list().length, 1);
    const task = session.store.list()[0];
    assert.equal(task.title, 'Smoke check task');
    assert.equal(task.due, null);
    await session.send({ text: `Mark task ${task.id} as complete.` });
    assert.equal(session.store.get(task.id)?.done, true);
    await session.close();
    session = undefined;

    // Reopen the same isolated local profile to verify persisted state.
    session = await open(smokeOptions);
    assert.equal(session.store.get(task.id)?.done, true);
    const reply = await session.send({ text: 'Add a task titled "Ambiguous deadline" with a deadline.' });
    assert.ok(session.store.list().every(t => t.due === null), 'Do not invent a deadline.');
    assert.match(reply, /[?？]/, 'Ask the person for the missing deadline.');
  } finally {
    try { await session?.close(); }
    finally { await rm(dataDir, { recursive: true, force: true }); }
  }
  report('PASS: add, complete, restart, deadline clarification; temporary local data removed.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  smoke().catch(error => { console.error(`Smoke failed. ${errorMessage(error)}`); process.exitCode = 1; });
}
