import assert from 'node:assert/strict';
import test from 'node:test';
import { connect } from '../src/croche.mjs';
import { TodoStore } from '../src/todos.mjs';

for (const outcome of ['answered', 'failed', 'empty', 'agent-error']) test(`SDK adapter: tool dispatch, one request, completed reply, close (${outcome})`, async () => {
  let options, count = 0, closes = 0;
  const store = new TodoStore();
  const sdk = { FileStorage: class {}, Croche: { open: async input => {
    options = input;
    return { agent: async () => {
      if (outcome === 'agent-error') throw new Error('fixture');
      return { request: async input => {
        count++;
        assert.deepEqual(Object.keys(input).sort(), ['id', 'text']);
        assert.ok(input.id);
        return { status: outcome === 'answered' || outcome === 'empty' ? 'answered' : 'failed',
          messages: [{ status: 'completed', text: outcome === 'empty' ? '' : 'Added' }] };
      } };
    }, close: async () => { closes++; } };
  } } };
  const connecting = connect({ projectKey: 'fixture-project', debugKey: 'fixture-private', user: 'test', dataDir: 'test', store }, sdk);
  if (outcome === 'agent-error') { await assert.rejects(connecting); assert.equal(closes, 1); return; }
  const session = await connecting;
  const handler = options.handlers.todos;
  assert.equal(options.config.model, 'deepseek/deepseek-v4.1-flash');
  assert.equal(handler({ key: 'add', args: { title: 'Milk' } }).status, 'ok');
  assert.equal(handler({ key: 'complete', args: { id: 't1' } }).status, 'ok');
  assert.equal(handler({ key: 'list' }).tasks[0].done, true);
  assert.equal(handler({ key: '__proto__', args: {} }).status, 'rejected');
  if (outcome === 'answered') assert.equal(await session.send({ text: 'Add milk' }), 'Added');
  else await assert.rejects(session.send({ text: 'Add milk' }), /Incomplete reply/);
  assert.equal(count, 1);
  await session.close(); assert.equal(closes, 1);
});
