import { randomUUID } from 'node:crypto';
import { INSTRUCTIONS } from './agent.mjs';

// Croche's two ingredients: an app-owned tool, and a send that waits for the reply.
export async function connect({ projectKey, debugKey, user, dataDir, store }, sdk) {
  const { Croche, FileStorage } = sdk ?? {
    ...await import('@h1r-ai/croche'), ...await import('@h1r-ai/croche/node'),
  };
  const tools = [{ name: 'todos', summary: 'Read and change the person’s task list.', commands: [
    { key: 'add', name: 'add', summary: 'Add a task only when asked; ask about an unclear deadline.', flags: [
      { name: 'title', type: 'string', required: true }, { name: 'due', type: 'string', description: 'Confirmed YYYY-MM-DD only.' }] },
    { key: 'complete', name: 'complete', summary: 'Complete a task only when asked.', flags: [{ name: 'id', type: 'string', required: true }] },
    { key: 'list', name: 'list', summary: 'Read the current tasks and IDs.', reads: true },
  ] }];
  const actions = { add: a => store.add(a.title, a.due), complete: a => store.complete(a.id), list: () => ({ tasks: store.list() }) };
  const project = await Croche.open({ projectKey, debugKey, user, storage: new FileStorage(dataDir),
    config: { model: 'deepseek/deepseek-v4.1-flash', instructions: INSTRUCTIONS, tools },
    handlers: { todos: ({ key, args }) => Object.hasOwn(actions, key) ? actions[key](args ?? {}) : { status: 'rejected' } },
  });
  try {
    const agent = await project.agent();
    return { close: () => project.close(), async send(input) {
      const result = await agent.request({ id: randomUUID(), ...input }); // One send; waits for its answer.
      const reply = result.messages.at(-1);
      if (result.status !== 'answered' || reply?.status !== 'completed' || !reply.text?.trim()) throw new Error('Incomplete reply.');
      return reply.text;
    } };
  } catch (error) { await project.close(); throw error; }
}
