<!-- Generated Croche skill content. -->

# Node: one real reply

Use for a Node script or the first local check before adding UI. Node.js 22.13+ on macOS/Linux;
Windows verification pending. For a pinned development bundle, use the main
Croche skill's local SDK and CLI tarball instructions. Check both versions against
the bundle and keep its configured dev origin.

For ordinary public installs, use the SDK version that matches the CLI:

```sh
npm install @h1r-ai/croche@latest
```

Never install a 0.6 or older package for a 0.7 app.

The user completes only signup, one account key and user-run `croche login`. You obtain the
public project key from CLI project creation and use the `development-keys create` command to write the SDK development key
into `.env` without exposing it.
Insert the **public** project key into the placeholder below; do not open or print `.env`.
Do not use the account `CROCHE_ACCOUNT_KEY` as an SDK option. Node requires a `developmentKey` or
`serverKey` at open; without one, open fails with `invalid_configuration`. Node stores State and
blobs under `./.croche/` by default: ignore it as private app data and verify `.env` is ignored;
preserve existing ignore rules.

Save as `first-turn.mjs`:

```js
import { randomUUID } from 'node:crypto';
import { Croche } from '@h1r-ai/croche';

if (!process.env.CROCHE_DEVELOPMENT_KEY) throw new Error('Load the private CLI-created env file.');
const croche = await Croche.open({
  projectKey: '<public project key returned by CLI>',
  developmentKey: process.env.CROCHE_DEVELOPMENT_KEY,
  user: 'local-demo-user', // replace with your authenticated app user's stable ID
  bundledConfig: {
    schema: 7,
    project: { defaults: { model: 'deepseek/deepseek-v4.1-flash' }, languages: { default: 'en', supported: ['en'] } },
    agents: { helper: { instructions: 'You are a friendly guide. Reply in one or two sentences.' } },
  },
});
try {
  const agent = await croche.agent('helper');
  const result = await agent.request({ id: randomUUID(), input: [{ type: 'text', text: 'Hello! What can you do?' }] });
  const replies = result.messages.filter(message => message.inReplyTo.includes(result.id));
  if (result.status !== 'answered' || result.gap || replies.length === 0 ||
      replies.some(reply => reply.status !== 'completed' || !reply.text?.trim())) {
    const error = result.error ?? replies.find(reply => reply.error)?.error;
    console.error('First turn did not complete:', result.status,
      error ? `${error.code}: ${error.message}` : 'no_reply');
    process.exitCode = 1;
  } else {
    for (const reply of replies) console.log(reply.text);
  }
} finally {
  await croche.close();
}
```

**Node does not load `.env` automatically.** Plain `node first-turn.mjs` leaves `developmentKey`
unset unless the process already has that variable. A successful CLI login does not populate it.
Check syntax first, then use the real env-file loader for one authorized live turn:

```sh
node --check first-turn.mjs
node --env-file=.env first-turn.mjs
```

`--env-file` exists in Node 20.6+; Croche still requires Node 22.13+. The project's existing dotenv
setup is an alternative only if it loads the chosen file before `Croche.open`; do not install
another loader without permission. For another entry point, use `node --env-file=.env app.mjs`.
Use the selected file path if it differs. The missing-key guard fails locally before opening;
check presence, never the value. Node loads the file directly without printing it. Do not source
it or paste it into chat. A completed, nonempty reply is the check; neither a successful open
nor a queued receipt proves the model answered. Report error codes without dumping options,
environment variables, or whole error objects that may contain private data.

## Reconcile the first turn in development

Read cost in your existing subscription callback. A second `agent.subscribe()`
ends the first subscription, including its chat events. Before sending the
request, create its input ID and a recorder. Call that recorder from your
existing `onEvent` handler, alongside your chat rendering.

```js
/**
 * @param {string} requestId
 * @returns {(event: import('@h1r-ai/croche').AgentEvent) => void}
 */
export function makeTurnCostRecorder(requestId) {
  const seen = new Set();
  return event => {
    if (event.type !== 'turn' || !event.inputs.includes(requestId) || seen.has(event.id)) return;
    seen.add(event.id);
    console.log({ requestId, turnId: event.id, cost: event.cost, costStatus: event.costStatus });
  };
}
```

Set `const recordCost = makeTurnCostRecorder(requestId)`, call
`recordCost(event)` in the existing callback, and pass the same `requestId`
as the `id` in `agent.request`. One input can produce several model calls.
No matching event means no local usage was observed. A null cost is unknown,
an `estimated` cost is provisional, and `reported` with cost zero is a reported zero.

For a development-key turn, check the matching project and development purpose:

```sh
croche projects cost PROJECT_ID --purpose development --json
```

Use the project ID, and run this with the CLI for the same origin. The command
shows the total cost across received reports for that purpose. Compare before and
after on an otherwise idle test project, or use Studio's development Logs to
inspect individual reports. Reporting is asynchronous. An empty result can mean
delivery is pending. The default CLI purpose is production.

## Verify persistence

For a persistence check, reopen with the same options and subscribe instead of sending another
message. The subscription replays the latest stored messages (`initialMessages`, default 50)
before its `snapshot` event; confirm the earlier reply's `message.end` is among them, then close
the subscription and the project. `history()` is not this check: it returns nothing, needs an
open subscription, and only delivers an older `page` event to it. In an app, substitute authenticated user IDs, give each
user isolated durable storage, and reuse the open project rather than opening per message.

If a Studio draft already exists, its patch may change this sample's config after a sync and next
open. Read `croche-config` before trying to debug an apparent instruction mismatch.
