import { randomUUID } from 'node:crypto';
import { INSTRUCTIONS } from './agent.mjs';

// Croche's two ingredients: an app-owned tool, and a send that waits for the reply.
export async function connect({ projectKey, developmentKey, user, dataDir, store }, sdk) {
  const { Croche, LocalStateStore, LocalBlobStore, defineTool } = sdk ?? await import('@h1r-ai/croche');
  const actions = { add: a => store.add(a.title, a.due ?? null), complete: a => store.complete(a.id), list: () => ({ tasks: store.list() }) };
  const todos = defineTool({ manifestVersion: 1, name: 'todos', summary: 'Read and change the person’s task list.', commands: [
    { key: 'add', name: 'add', summary: 'Add a task only when asked; ask about an unclear deadline.', flags: [
      { name: 'title', type: 'string', required: true }, { name: 'due', type: 'string', description: 'Confirmed YYYY-MM-DD only.' }] },
    { key: 'complete', name: 'complete', summary: 'Complete a task only when asked.', flags: [{ name: 'id', type: 'string', required: true }] },
    { key: 'list', name: 'list', summary: 'Read the current tasks and IDs.', reads: true },
  ] }, ({ key, args }) => Object.hasOwn(actions, key) ? actions[key](args ?? {}) : { status: 'rejected' });
  const croche = await Croche.open({ projectKey, developmentKey, user, adapters: [new LocalStateStore(dataDir), new LocalBlobStore(`${dataDir}/blobs`)], tools: [todos],
    bundledConfig: { schema: 7, project: { defaults: { model: 'deepseek/deepseek-v4.1-flash' }, languages: { default: 'en', supported: ['en'] } },
      agents: { dori: { instructions: INSTRUCTIONS } } },
  });
  try {
    const agent = await croche.agent('dori');
    return { close: () => croche.close(), async send(input) {
      const result = await agent.request({ id: randomUUID(), input }); // One send; waits for its answer.
      const reply = result.messages.findLast(m => m.inReplyTo.includes(result.id));
      if (result.status !== 'answered' || reply?.status !== 'completed' || !reply.text?.trim()) throw new Error('Incomplete reply.');
      return reply.text;
    } };
  } catch (error) { await croche.close(); throw error; }
}
