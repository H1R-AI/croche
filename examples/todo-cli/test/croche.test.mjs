import assert from 'node:assert/strict';
import test from 'node:test';
import { connect } from '../src/croche.mjs';
import { TodoStore } from '../src/todos.mjs';

for (const outcome of ['answered', 'failed', 'empty', 'agent-error']) test(`SDK adapter: tool dispatch, one request, completed reply, close (${outcome})`, async () => {
  let options, count = 0, closes = 0;
  const store = new TodoStore();
  const defineTool = (manifest, execute) => ({ name: manifest.name, manifest, execute });
  const sdk = { LocalStateStore: class { constructor(dir) { this.dir = dir; } }, LocalBlobStore: class { constructor(dir) { this.dir = dir; } }, defineTool, Croche: { open: async input => {
    options = input;
    return { agent: async id => {
      assert.equal(id, 'dori');
      if (outcome === 'agent-error') throw new Error('fixture');
      return { request: async input => {
        count++;
        assert.deepEqual(Object.keys(input).sort(), ['id', 'input']);
        assert.ok(input.id);
        return { id: input.id, status: outcome === 'answered' || outcome === 'empty' ? 'answered' : 'failed',
          messages: [{ status: 'completed', inReplyTo: [input.id], text: outcome === 'empty' ? '' : 'Added' }] };
      } };
    }, close: async () => { closes++; } };
  } } };
  const connecting = connect({ projectKey: 'fixture-project', developmentKey: 'fixture-private', user: 'test', dataDir: 'test', store }, sdk);
  if (outcome === 'agent-error') { await assert.rejects(connecting); assert.equal(closes, 1); return; }
  const session = await connecting;
  const [todos] = options.tools;
  // Both stores live under the profile's own directory, so deleting it removes all local data.
  assert.deepEqual(options.adapters.map(a => a.dir), ['test', 'test/blobs']);
  const handler = call => todos.execute({ args: {}, ...call }, {});
  assert.equal(todos.manifest.manifestVersion, 1);
  assert.equal(options.bundledConfig.project.defaults.model, 'deepseek/deepseek-v4.1-flash');
  assert.ok(options.bundledConfig.agents.dori.instructions);
  assert.equal(handler({ key: 'add', args: { title: 'Milk' } }).status, 'ok');
  assert.equal(handler({ key: 'complete', args: { id: 't1' } }).status, 'ok');
  assert.equal(handler({ key: 'list' }).tasks[0].done, true);
  assert.equal(handler({ key: '__proto__', args: {} }).status, 'rejected');
  const input = [{ type: 'text', text: 'Add milk' }];
  if (outcome === 'answered') assert.equal(await session.send(input), 'Added');
  else await assert.rejects(session.send(input), /Incomplete reply/);
  assert.equal(count, 1);
  await session.close(); assert.equal(closes, 1);
});
