<!-- Generated Croche skill content. -->

# Messages, agents and memory in 0.6

Open a declared agent by ID: `await croche.agent('helper')`. Register its config
under `bundledConfig.agents.helper`. There is no no-argument default-agent call.

## Messages and UI

`send(input)` returns acceptance `{requestId,status,seq}`, not a completed reply.
`request(input)` waits for the input's result; `{wait:'idle'}` also waits for idle.
Subscribe once for streamed replies and replayed history:

```ts
import type { Agent } from '@h1r-ai/croche';

export function observe(agent: Agent) {
  return agent.subscribe({initialMessages: 50, onEvent(event) {
    if (event.type === 'message.delta') console.log(event.id, event.text);
    if (event.type === 'message.end') console.log(event.id, event.status, event.text);
    if (event.type === 'error') console.error(event.code, event.message);
  }});
}
```

Render by message ID; `inReplyTo` correlates a terminal reply to its receipt.
An unrelated `message.end` is not completion of this request. Check final status,
not only nonempty text. A send may yield several replies and later tool results.

The subscription replays recent messages, then a `snapshot`. Request older pages
with `await subscription.history({limit:50, before})`; the result arrives as a
`page` event. `history` returns no page directly. Handle gaps, `cleared`, and
`replaced` in a complete UI. A second subscription replaces the first on that
agent. Close subscriptions on UI teardown and Croche on app-session teardown.

## Named conversations

```ts
import type { Croche } from '@h1r-ai/croche';

export async function documentAgent(croche: Croche) {
  return croche.agent('helper', {
    instance: {id: 'document-42', config: {instructions: 'Help with this document.'}},
    tools: [], wiki: ['documents/**'],
  });
}
```

A named instance has its own history and memory. Its optional app config patch
is not persisted: pass it on every open. No `instance` means the default instance
with bundle plus Cloud patch and no app override. Do not share instances across
app users or open concurrent writers. Closed instances are subject to the fixed
installation storage budget; they are not an archival database.

`setTools(list)` and `setWiki(list)` act from the next turn, selecting from ALL
registered items, so they may widen the opening scope. `resetTools/resetWiki`
restore that opening scope. Omitted/null/`'all'` at open selects all; `[]` none.
Setters accept a list or `'all'`, not null. Wiki entries are paths/globs or
`{doc,guide?}`. Tools use names or `{tool,commands?,bind?,guide?}`.

## Memories, documents and deletion

Memory supports `list()`, `delete(id)`, `clear()` and `enabled(on)`. Use the IDs
returned by `list`; there is no public keyed-fact setter. `agent.clearHistory()`
starts over: it clears the conversation history AND the agent's memories, so a new
conversation recalls nothing from the old one. Only the `enabled(on)` setting is
kept. To keep facts across a fresh start, the app must carry them itself.

App wiki originals belong to Croche, not an agent: supply `{path,description,
markdown}` or `{path,description,file}` in `open({wiki:[...]})`. Use
`croche.wiki.put(doc)`, `remove(path)`, and `list()`. Changes affect matching open
agents, last only until close, and must be supplied again on reopen. Files are
read lazily through the platform; descriptions form the model's catalog.

For user-requested stored-data deletion, call
`await croche.deleteData({agent:'helper', instance:'document-42'})` on the opened Croche.
Omit `instance` for that agent's stores; omit the scope for this user's declared stores and
registered instances. Core closes affected agents; acquire a fresh agent afterward. An agent
store can be deleted even when that agent cannot open. If Croche itself cannot open, use
`Croche.open(openOptions, {recover:'delete'})`; that recovery handle accepts only whole-user
`deleteData()` / `deleteData({})` and `close()`. It preserves other users and the installation
record and deletes no Cloud data. External locks refuse with `store_busy`; recovery can make
partial progress before refusing. Never clear data to conceal a failure.

## App state and images

Send one ordered `input` array with text and image elements. A text element may
have `kind:'user'`, `'app_event'` or `'app_state'`; app state is opaque text, not
a JSON delta. The app still validates tool effects against authoritative state.
Images carry `data` (base64) or `uri`, optional `mediaType` and `alt`. Do not use
legacy File/Blob/image fields. Platform acquisition and codec support differ:
verify on the actual target. Input size failures are typed, never truncation.
An oversized tool result fails the turn rather than being sent to the model.
