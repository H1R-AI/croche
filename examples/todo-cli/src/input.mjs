import { readImage } from './image.mjs';

// Ordinary chat stays text-only. Commands supply extra ingredients only when needed.
export function inputFor(text, store) {
  if (text === '/list') return { text: 'Show my current tasks.', context: { todos: store.list() } };
  if (text.startsWith('/photo ')) return {
    context: { todos: store.list() },
    inputs: [
      { kind: 'user', text: 'Add everything on this list as tasks.', images: [readImage(text.slice(7).trim())] },
      { kind: 'event', text: 'The user attached a photo from the CLI.' },
    ],
  };
  return { text };
}
