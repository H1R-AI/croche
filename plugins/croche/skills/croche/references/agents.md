<!-- Generated Croche skill content. -->

# Messages, agents and memory

Use only for the relevant SDK task. The examples use an already-open `croche` project.

## Messages and UI

`const agent = await croche.agent()` opens the default agent. `agent.request(input)` waits
for the result and its final messages. `agent.send(input)` returns a receipt, not a reply.
For streaming, subscribe once and render messages by their IDs:

```ts
const subscription = agent.subscribe({ onEvent(event) {
  // App UI functions, not Croche APIs. Delta text is provisional; end text is authoritative.
  if (event.type === 'message.delta') appendText(event.id, event.text);
  if (event.type === 'message.end') finishMessage(event.id, event.text, event.status);
} });
await agent.send({ id: messageId, text: userText });
// On UI teardown: subscription.close(); on app-session teardown: await croche.close();
```

A subscription replays the latest stored messages (`initialMessages`, default 50) before its
`snapshot`, without another model request; `history({ limit, before? })` asks that open
subscription for an older `page`. One subscription per agent: a second `subscribe` on the same
agent replaces the first, which receives a final `{ type: 'replaced' }` event. Do not
render a send receipt as an assistant message. Check final statuses and preserve input IDs
across delivery retries. A new ID is a new attempt and can produce another app action.

## Multiple conversations

Declare named agents in `config.agents`, for example
`{ helper: { instructions: 'Help with this app.' } }`, then `await croche.agent('helper')`.
Use `croche.agent('helper', { instance: 'save-2' })` for a named conversation or
`{ fresh: true }` for a new one. Keep instances tied to the current app user.
`agent.setTools(names)` filters available tools; `agent.setTools(null)` removes the filter.
`agent.setMode(name)` selects a configured mode; `agent.setMode(null)` leaves it.

## App-visible memories

The app can read or remove AI-written memories, not set keyed facts:

- `await agent.memory.list()` is the current list; use memory IDs, not invented keys.
- `await agent.memory.export()` exports memory data for a user-requested export.
- `await agent.memory.delete(id)` removes an item and its earlier versions.
- `await agent.memory.clear()` removes all memory items.
- `await agent.memory.enabled(false)` disables memory; `true` enables it again.
- `agent.memory.onChanged(callback)` signals that the UI should re-read `list()`; it is a hint,
  not a complete event log. Awaiting the read works for both TS and RN.

Deleting memories does not erase conversation history. Use `agent.clearHistory()` only for
an explicitly requested conversation reset. Never promise that clearing one surface deletes
all user data. Exported conversations and memories are private user data; do not paste them
into a bug report. For `memory_store_too_old`, use `croche-troubleshoot` before touching storage.

## Optional app state and images

Most turns contain only a user message. `context` is optional app state, kept apart from
that message. It costs tokens each time it is included and is useful when the request needs
app state: a command or button acting on app data, or after that state changed. An image
can share the input when needed. Without context, an input carries only the message;
earlier states stay as sent until older turns are folded. Tools check current app data,
not an old snapshot. This optional photo path combines state and inputs in **one** request.
The input shape is either top-level `text`/`images` or an `inputs` stack, not both:

```ts
const result = await agent.request({
  id: crypto.randomUUID(),
  context: { todos: currentTodos },
  inputs: [{ kind: 'user', text: 'Add these items.',
    images: [{ data: photoBase64, mime: 'image/jpeg',
      alt: 'Photo of a handwritten shopping list', resolution: 'high' }] }],
});
```

Use base64 with its MIME type (PNG, JPEG, WebP or GIF); at most four images per message,
3 MB each and 6 MB total. With `request`, set resolution on each image, not in request
options. Choose an image-capable model; otherwise the request fails with
`images_unsupported`. A useful `alt` describes the image when its bytes are no longer in
the active conversation. See the [Models page](https://docs.croche.ai/models.md).
