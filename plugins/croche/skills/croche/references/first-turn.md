<!-- Generated Croche skill content. -->

# Node: one real reply

Use for a Node script or the first local check before adding UI. Node.js 22+ on macOS/Linux;
Windows verification pending. Install the SDK at the same exact version as the CLI, with permission:

```sh
npm install @h1r-ai/croche@latest
```

Never install a 0.5 package for a 0.6 app.

The user completes only signup, one account key and user-run `croche login`. You obtain the
public project key from CLI project creation and use the `debug-keys create` command to write the SDK debug key
into `.env` without exposing it.
Insert the **public** project key into the placeholder below; do not open or print `.env`.
Do not use the account `CROCHE_ACCOUNT_KEY` as an SDK option. Ignore `.croche/` as private
app data and verify `.env` is ignored; preserve existing ignore rules.

Save as `first-turn.mjs`:

```js
import { randomUUID } from 'node:crypto';
import { Croche, FileStorage } from '@h1r-ai/croche';

if (!process.env.CROCHE_DEBUG_KEY) throw new Error('Load the private CLI-created env file.');
const croche = await Croche.open({
  projectKey: '<public project key returned by CLI>',
  debugKey: process.env.CROCHE_DEBUG_KEY,
  user: 'local-demo-user', // replace with your authenticated app user's stable ID
  storage: new FileStorage('./.croche'),
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
    console.error('First turn did not complete:', result.status,
      replies.find(reply => reply.error)?.error?.code ?? 'no_reply');
    process.exitCode = 1;
  } else {
    for (const reply of replies) console.log(reply.text);
  }
} finally {
  await croche.close();
}
```

**Node does not load `.env` automatically.** Plain `node first-turn.mjs` leaves `debugKey`
unset unless the process already has that variable. A successful CLI login does not populate it.
Check syntax first, then use the real env-file loader for one authorized live turn:

```sh
node --check first-turn.mjs
node --env-file=.env first-turn.mjs
```

`--env-file` exists in Node 20.6+; Croche still requires Node 22+. The project's existing dotenv
setup is an alternative only if it loads the chosen file before `Croche.open`; do not install
another loader without permission. For another entry point, use `node --env-file=.env app.mjs`.
Use the selected file path if it differs. The missing-key guard fails locally before opening;
check presence, never the value. Node loads the file directly without printing it. Do not source
it or paste it into chat. A completed, nonempty reply is the check; neither a successful open
nor a queued receipt proves the model answered. Report error codes without dumping options,
environment variables, or whole error objects that may contain private data.

For a persistence check, reopen with the same options and subscribe instead of sending another
message. The subscription replays the latest stored messages (`initialMessages`, default 50)
before its `snapshot` event; confirm the earlier reply's `message.end` is among them, then close
the subscription and the project. `history()` is not this check: it returns nothing, needs an
open subscription, and only delivers an older `page` event to it. In an app, substitute authenticated user IDs, give each
user isolated durable storage, and reuse the open project rather than opening per message.

If a Studio draft already exists, its patch may change this sample's config after a sync and next
open. Read `croche-config` before trying to debug an apparent instruction mismatch.
