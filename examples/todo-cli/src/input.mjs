import { readImage } from './image.mjs';

// Ordinary chat stays text-only. Commands supply extra ingredients only when needed.
// App state is opaque text with kind 'app_state'; it is kept apart from the person's words.
const state = store => ({ type: 'text', kind: 'app_state', text: JSON.stringify({ todos: store.list() }) });
export function inputFor(text, store) {
  if (text === '/list') return [state(store), { type: 'text', text: 'Show my current tasks.' }];
  if (text.startsWith('/photo ')) return [
    state(store),
    { type: 'text', text: 'Add everything on this list as tasks.' },
    readImage(text.slice(7).trim()),
    { type: 'text', kind: 'app_event', text: 'The user attached a photo from the CLI.' },
  ];
  return [{ type: 'text', text }];
}
