<!-- Generated from packages/runtime/README.md by scripts/build-plugin.ts. Edit the source, then run npm run build:plugin. -->

# Croche Runtime SDK

Build an AI character or assistant by supplying instructions, application state,
and JavaScript functions. The SDK runs the model/tool loop, persists conversations
and causal results, enforces per-user allowances, and reports every call to Croche
Cloud. Your app needs no backend of its own.

**How calls flow.** Every turn runs in the Runtime, inside your app. Croche Cloud is not on
the path of a turn: it registers the installation, delivers its credentials, holds balances,
and receives a report of every call in the background. **A Cloud outage does not stop a turn.**

The shared Rust Core owns conversations, command routing, receipts, spending and
Cloud synchronization. This package embeds its WebAssembly build for browsers,
Node, and WebViews. Native iOS (Swift) and Android (Kotlin) SDKs are planned for
0.5.1, with the same `Croche.open` API.
For React Native, install `@h1r-ai/croche-react-native` beside this package; it carries
the native Core ([React Native](#react-native)).
Croche chooses and tunes the model for your project; the app does not configure it.

## Install

From npm (an app; no Rust and no Croche checkout needed):

```sh
npm install @h1r-ai/croche
```

To build the tarball yourself, from the Croche repository:

```sh
npm install
npm run build:core
npm run build --workspace @h1r-ai/croche
mkdir -p artifacts
npm pack --workspace @h1r-ai/croche --pack-destination artifacts
```

The tarball contains compiled JavaScript, TypeScript declarations and an embedded
WASM Core, with no runtime npm dependencies. Consuming apps need no Rust compiler
or source checkout. Rust is needed only to rebuild the Core from source. A strict
browser CSP must include `script-src 'self' 'wasm-unsafe-eval'`; JavaScript `eval`
and `new Function` remain unnecessary.
The package has not been published to the public npm registry.

## Projects and agents

New apps open a **project** once per user and get its **agents** from it. One project holds
the app's config (instructions, tools, several agents), one storage and one set of tool
handlers; each agent has its own conversation, history and memory.

```ts
import { Croche, type ToolDeclaration, type ToolHandler } from '@h1r-ai/croche';
import { FileStorage } from '@h1r-ai/croche/node';

const shop: ToolDeclaration = {
  name: 'shop',
  summary: 'The inn shop.',
  commands: [
    { key: 'shop_sell', name: 'sell', summary: 'Sell food or drink the player asks for: stew, bread, ale.',
      flags: [{ name: 'item', type: 'string', enum: ['stew', 'bread', 'ale'], required: true }] },
    { key: 'shop_menu', name: 'menu', summary: "List today's menu and prices.", reads: true },
  ],
};
const runShop: ToolHandler = ({ key, args }, context) => {
  const out = app.run(key, args, context.user);           // the real boundary: enforce here
  return out.ok ? out.value : { status: 'rejected', reason: out.reason };
};

const croche = await Croche.open({
  projectKey, debugKey,                       // debugKey: development only
  user: playerId,
  storage: new FileStorage(join(dataDir, 'croche')),      // one directory for the whole project
  config: {
    instructions: PIP,
    tools: [shop],
    agents: { helper: { instructions: HELPER } },         // more agents, each a partial override
  },
  handlers: { shop: runShop },                            // by tool name; code, never in config
  onUsage: event => record(event),                        // one event per paid call
});

const pip = await croche.agent();                         // the main agent ("default")
const result = await pip.request({ id: 'm1', text: 'Some stew, please.', context: appState() });
const reply = result.messages.at(-1);                     // { type: 'message.end', text, causedBy, ... }

const subscription = pip.subscribe({ onEvent: event => {
  if (event.type === 'message.delta') render(String(event.text));  // provisional, by message id
  if (event.type === 'message.end') render(String(event.text));    // final
} });
await pip.send({ id: 'm2', text: 'And some bread.' });     // returns a receipt at once
subscription.close();
await croche.close();
```

- **`send(input)`** queues the input and returns `{ id, status, seq }`. **`request(input)`**
  resolves when that input is answered, with its `messages`. Input ids are yours and unique.
- **`subscribe({ onEvent, initialMessages? })`** delivers a `snapshot` first, then `input`
  (status changes: `queued`, `seen`, `answered`, `no_reply`, `failed`, `cancelled`),
  `message.start` / `message.delta` / `message.end`, and `state` (`idle`, `running`,
  `waiting`). `history({ limit, before? })` adds an older `page`; `clearHistory()` writes
  `cleared`. `cancel(id?)` cancels one input, or the running turn.
- **Agents:** `croche.agent('helper')` opens an agent declared under `config.agents`; an id
  the config does not declare is `invalid_configuration`. The same call while it is open
  returns the same object.
- **Instances:** `croche.agent(id, { instance: 'save-2' })` is a separate conversation of the
  same agent (a save slot, a document); `{ fresh: true }` creates a new one with a generated
  key. `agent.instance` and `agent.created` say which, and whether this open created it.
- **Per-agent code override:** `croche.agent(id, { config: { … } })` layers a partial config
  over the declared one, in memory only.
- **Tools at run time:** `agent.setTools(visible | null)` and `agent.setMode(name | null)`
  (modes are declared in config) take effect at the next model call.
- **Deleting local data:** `Croche.deleteStore({ ...openOptions, agent? })` deletes that
  agent's store, or every declared agent's; it refuses with `store_busy` while the project is
  open. The project record is kept.
- **Handlers** receive `context` with `agentId`, `user`, `crocheUserId`, `causedBy` (the input
  ids) and `origin` (`app` or `agent`).

`CrocheRuntime.create` below is the same Core for one agent without a project, and the rest of
this reference shows it. Its behaviour (memory, documents, streaming, markers, errors) is the
same for project agents; its agent options (`instructions`, `tools`, `memory`, `wiki`, …) are
fields of `config`, and its host options (`storage`, `user`, …) are options of
`Croche.open`.

## First conversation

Create a project in Studio, enable anonymous app access, and copy its **public
project key**. The public key is an application enrollment identifier; it does not
provide Studio access.

An installation receives a model key only once it has proved it runs your app.
Phones prove it with App Attest or Play Integrity (the native SDKs do this). A browser,
Node, a simulator or an emulator cannot, so during development issue a **development
key** (`cdt_…`) in Studio → Debug keys and pass it as `debugKey`. Development
usage is billed to your weekly development allowance, never to the project's Runtime
Credit. Never ship a debug key in a release build.

```ts
import { CrocheRuntime, WebStorage } from '@h1r-ai/croche';

const runtime = await CrocheRuntime.create({
  projectKey: 'YOUR_PUBLIC_PROJECT_KEY',
  debugKey: 'cdt_…', // development only: a browser cannot attest
  storage: new WebStorage(),
  instructions: 'You are Pip, a small, dry-witted but considerate companion. Keep replies brief.',
});

const result = await runtime.send({
  id: crypto.randomUUID(),
  text: 'What can you do?',
});

if (result.text) console.log(result.text);
if (result.status !== 'completed') {
  console.error(result.error?.message);
}

// Reopening with the same origin, project key and storage restores the session.
console.log(runtime.history());
console.log(runtime.userBudget.get());
await runtime.close();
```

The SDK connects to Croche automatically; no service URL setup is needed.

## Web apps: run the Runtime on your backend

A browser cannot prove it runs your app, so a web app keeps a small backend of its own and
runs the Runtime **there**, on Node. Issue a **server key** (`csk_…`) in Studio; Cloud admits
your backend as a production install, billed to the project's Runtime Credit. Your web page
talks only to your backend.

```ts
import { CrocheRuntime } from '@h1r-ai/croche';
import { FileStorage } from '@h1r-ai/croche/node';

// One Runtime per end user, keyed by your own stable user id.
async function runtimeFor(userId: string) {
  return CrocheRuntime.create({
    projectKey: process.env.CROCHE_PROJECT_KEY!,
    serverKey: process.env.CROCHE_SERVER_KEY!,          // a server secret
    user: userId,                                       // one Croche user and allowance per end user
    storage: new FileStorage(`./runtime-state/${userId}`),
    instructions: 'You are Pip, a concise, considerate companion.',
  });
}
```

- The server key, and the model key the Runtime receives with it, are secrets like any
  provider key: keep them on the server, never send them to the browser. The SDK refuses
  `serverKey` in a browser.
- Rotate a server key without downtime: issue a new one, deploy it, then revoke the old one.
- Every new user gets the project's default allowance, so your backend decides who is a user:
  never take the user id from anything the client can forge (sign your session cookie), and
  limit new anonymous users per client address, or require sign-in first. `apps/web-backend`
  is a complete reference.
- Stream to your page from your backend (for example Server-Sent Events) by forwarding the
  `text.delta` and `marker` events of `send`.

## Give the character a real action

Register a grouped Tool with typed CLI commands and one application callback.
The agent runs your commands as command lines (`memo save "Orion 73"`). The Runtime
describes them to the agent, answers `help`, `<tool> --help` and `<tool> <command> --help`
itself, and calls your callback only with a validated command. The app never implements a
second agent loop. A command string is parsed as data; Croche never invokes a system shell.

The command line is built to be easy for a model to write without reasoning:
- **Required flags may be given in order without their flag:** `tasks done t5`.
- **A few things are accepted when the intent is unambiguous:**
  - a command without its group (`order-lookup o1`, when only one tool has it);
  - `_` for `-`;
  - a command `key` for its name;
  - an unquoted multi-word value (`--title Buy milk`).
- **Declared names are accepted too:** `aliases` on commands and flags (e.g. `edit` for `update`).
- **Several values:** `list: true` flags (`--tags work,home`).

Each of these forgiving reads emits a `command.repaired` debug event with its rule. A rejected
line goes back to the agent with what was wrong, and it corrects the line in the same turn.
A handler's failure text that names an argument by its handler name (`order_id`) reaches the
agent as the flag (`--order-id`).

```ts
import { CrocheRuntime, WebStorage, type RuntimeTool } from '@h1r-ai/croche';

// Application data is separate from Runtime conversation data.
const appStorage = new WebStorage();
const memoTool: RuntimeTool = {
  name: 'memo',
  summary: 'Explicit notes saved in this app.',
  commands: [{
    key: 'memo_save',
    name: 'save',
    summary: 'Save a short note when the user asks you to remember it.',
    positionals: [{ name: 'text', type: 'string', required: true, minLength: 1, maxLength: 300 }],
  }],
  async execute({ args }, context) {
    const key = `memo:${context.userId}:${context.callId}`;
    const existing = await appStorage.getItem(key);
    if (existing) return JSON.parse(existing);
    if (context.signal.aborted) return { status: 'cancelled' };
    const memo = {
      id: context.callId,
      text: args.text,
      sourceMessageId: context.messageId,
      createdAt: new Date().toISOString(),
    };
    await appStorage.setItem(key, JSON.stringify(memo));
    return memo;
  },
};

const runtime = await CrocheRuntime.create({
  projectKey: 'YOUR_PUBLIC_PROJECT_KEY',
  storage: new WebStorage(),
  instructions: 'You are Pip. Offer to remember explicit notes. Confirm only actual tool results.',
  tools: [memoTool],
});

const result = await runtime.send({
  id: crypto.randomUUID(),
  text: 'Remember that my fictional spaceship is called Orion 73.',
  context: { screen: 'chat', availableFeatures: ['memo save'] },
}, {
  onEvent(event) {
    if (event.type === 'tool.started') console.log('Doing:', event.name);
    if (event.type === 'turn.completed') console.log(event.result.text);
  },
});
```

The agent can run `memo save "Orion 73"` or ask
`memo save --help`. Group more commands under `memo` and route by the invocation's
stable `key`. `context.callId`, `messageId` and `userId` come from the
Core, not model arguments.

Flags and positionals support `string`, `integer`, `number` and `duration`
(`30m`, `2h`); flags also support `boolean`. Declarations can include defaults,
enums, numeric limits and string lengths. `arg` maps a CLI flag such as
`inventory-item-id` to the callback's `inventoryItemId`. Quote text containing
spaces, or use `--` before positional text that begins with a dash. Quoted
`"--help"` is literal data; only an unquoted help flag requests help.

Add matching search/list/delete tools to give users control of their saved notes.
The SDK does not secretly extract personal memories. Historical context, explicit
application notes, and authoritative application state are separate responsibilities.
Do not add sensitive notes without the product's disclosed user interaction.

`setTools([...])` changes the tool list without clearing the conversation. It
validates at once (a refused list changes nothing) and the model sees the new list
from the next turn: at once when idle, otherwise after what is already running or
waiting, in call order. Revocation applies at once: a command the new list removes
or changes answers `withdrawn` for the rest of the current turn without running its
handler, and a call announced before the change is not dispatched. Already executed
actions cannot be undone by revocation or cancellation. Keep tool authorization
checks in application handlers as well as in the visible list.

## Public API at a glance

| API | Result |
| --- | --- |
| `CrocheRuntime.create(options)` | Register/synchronize and restore one persistent user/session |
| `runtime.send({id,text,kind?,context?}, {onEvent?,signal?})` | One durable `TurnResult`, including all internal tool/model iterations |
| `runtime.send(input, {responseFormat})` | Structured output: `result.output` is the reply as JSON, checked against the format (see "Structured output") |
| `runtime.send({id,inputs:[{kind?,text?,images?}],context?})` | A stack: several inputs that arrived together, answered as **one** turn and one model call |
| `runtime.history()` | Cloned display messages with `turnId`, kind, timestamps and status |
| `runtime.status()` | Non-secret identity, model, pending report count and unresolved operations |
| `runtime.setTools(tools)` | Atomically validate and replace grouped Tools; the model sees them from the next turn, revocation applies at once |
| `runtime.setDebugObserver({onDebugEvent,visibility})` | Attach diagnostics and emit a current snapshot without reopening; call with no argument to detach |
| `runtime.tools()` | Current serializable Tool and command declarations |
| `runtime.memory()` | Read-only long-term memory: `{enabled, text, updatedAt, compactedTurns, items}` |
| `runtime.memory.{list,delete,clear,enabled,export}` | The app reads and deletes AI-written memories by id; it cannot write them. Summary context is separate and survives memory deletes. Writes resolve once durable, or `{ deferred: true }` during a turn. `memory.onChanged(fn)` is an at-most-once durable hint; `list()` is the source of truth. |
| `runtime.wiki.{set,put,remove,list,read,search}` | The app's documents (see "Documents the character can look up"). `set` answers `{documents, bytes, digest}`; `list`/`read`/`search` show exactly what this agent sees |
| `runtime.userBudget.get()` | This user's allowance, the project's remaining money and unreported spend, in USD |
| `runtime.userBudget.add({amount, id?})` | Ask Cloud to raise the user's allowance within your ceilings; `id` makes a retry safe |
| `runtime.userBudget.set({amount, id?})` | Ask Cloud to set the user's allowance within your ceilings |
| `runtime.maintain({force?})` | Background upkeep now: deliver call reports, then sync balances, policy and the model key. Runs by itself after each turn and every `maintenanceIntervalMs`; call it when the app returns to the foreground |
| `runtime.sync()` | Sync with Cloud now (waits for Cloud; prefer `maintain`) |
| `runtime.flush()` | Deliver pending call reports now (waits for Cloud; prefer `maintain`) |
| `runtime.clearHistory()` | Explicitly reset conversation/session while retaining financial state |
| `runtime.close()` | Cancel active work, await its settlement and release ownership |

`kind: 'event'` is an application-triggered turn. It can let a character announce
a newly unlocked feature; it uses the same model loop and incurs real cost. The
result's `causedBy` identifies the triggering input. Count a completed user turn
once per message ID; never count internal tool iterations or application events.

**Stack what arrives together.** When the person sends several messages quickly, or the app has
its own note for this moment ("this is their 100th message"), send them as one stack instead of
several turns: one turn and one model call instead of several, in the order given, with the
person's words kept apart from the app's.

```ts
await runtime.send({ id, context, inputs: [
  { kind: 'user', text: 'this is my 100th message!' },
  { kind: 'event', text: 'This is their 100th message: celebrate it.' },
] });
```

A `user` input is what your app says the person said; an `event` input is your app's own note.
An app-only stack is one proactive turn.

Core prefixes the stack's channels with a permanent conversation number and short
local time (`t7 · 09/14 21:16`). It states the zone once at the start and after
context reduction, and never edits a kept message's header. No separate time
channel or `timeContext` option is needed; that removed field is refused by name.
App state/events stay app-sourced; Core memory/wiki announcements are Croche-sourced.
The tag form is `<channel="app" type="state">` or `<channel="user">`, closed
by `</channel>`. Carried inputs joining a turn already running have only channels,
no new number/time line. Existing kept messages keep their bytes, and image and
history readers accept the older `<channel source="X">` form too.

**Images** go in a stack input: `images: [{ data, mime, alt }]` (base64 with its mime, or a
`data:` URL) or `[{ url, alt }]` (https). PNG, JPEG, WebP or GIF; at most 4 per message, 3 MB
each, 6 MB together. A message with images goes to a model that can see them; if the project
has none, `send` fails with `images_unsupported` and nothing is sent or dropped. Images stay in
context while the conversation is active; after that, the conversation keeps each image's `alt`
and date in its place, so write a useful `alt`. The Runtime stores no image bytes past that, and
the turn record keeps only a digest.

Each image is sent at one of two resolutions:
- **standard** (the default): at most 512 px on the longest side. The image is never upscaled,
  and it is re-encoded as PNG or JPEG, whichever is smaller. Transparency is kept as PNG, and a
  GIF becomes its first frame. This is enough for photos and most scenes, and it costs far
  fewer tokens.
- **high**: the original as given, within the limits above. Use it for text, screenshots and
  dense detail.

Choose per image with `resolution: 'standard' | 'high'`, or for a whole send with
`send(input, { imageResolution: 'high' })`; an image's own choice wins. An https `url` image is
never changed. Re-encoding uses the platform's codec (in a browser, canvas; in the native SDKs,
ImageIO and Android's Bitmap); where there is none (Node without `imageCodec`), images are sent
as given.

**Images from commands (H3).** A tool returns images beside its value with
`toolResult(value, { images, imageResolution })`: the same kinds and limits as a message's (at
most 4, 3 MB each, 6 MB together), prepared the same way. A plain value is never looked inside:
an `images` field in your JSON is only JSON. An invalid image list fails that call alone with
`invalid_tool_result`; the model reads the failure and the turn goes on. The images follow the
round's results in a message of their own (`<channel="tool" type="image">`, naming the
command and call), decided once, when that message is added: with no image model each is shown
as `[image not shown: <alt> …]`, and past 4 images or 6 MB in one message the rest are too. A
result that arrives after the wait (H2) keeps its images until a turn takes it; results still
waiting hold at most 4 images and 6 MB together, and a result past that keeps its value while
its images are left out. The turn result counts what was left out as `imagesOmitted` (debug:
`tool.images_omitted`, with each reason: `no_vision`, `over_limit` or `pending_limit`). Command
images stay while the conversation holds them, as a message's do. Stores written with them are
version 11: an older Core refuses them (`store_too_new`) rather than misread them.

`context` is the current trusted app state. Supply it on each turn. The agent sees it as
the app's state for that moment, kept apart from the person's words and from app events,
and neither can pose as the other. Authoritative values (gold, inventory, permissions) live
in your app and its tools, not in what the agent is told: a tool must check them itself.

Model and tool history is retained. Each turn sees as much recent conversation as fits
`maxContextTokens`, in whole turns; your instructions, your tools' declarations and the entire
current turn are always kept. If those alone do not fit, the turn fails with `context_limit` before creating
another paid operation. Earlier costs and completed tool effects remain recorded and are not
repeated. Older turns remain in `history()`, and what leaves the agent's view is folded into
long-term memory (below) rather than silently forgotten.

The default limits are 8 model iterations (`maxIterations`), 2,048 output tokens per request
(`maxOutputTokens`), a 12,000-token context window (`maxContextTokens`, 250–16,777,216), 90
seconds per network request, and 30 seconds per tool (individually configurable).

Context and memory budgets are **estimated tokens**, so a Korean or Japanese conversation gets
the same window as an English one rather than a quarter of it. The Runtime has no tokenizer: it
scores text by character class with per-model coefficients Croche Cloud delivers, and learns a
correction from the input tokens the model reports. Estimates are not bounds; the hard limits
stay the request size, message count and spending caps. The former character options
(`maxContextCharacters`, `memory.maxCharacters`, `memory.keepVerbatimCharacters`,
`memory.foldMinCharacters`, `memory.recallCharacters`) are refused with their new names. Call reports are the
charge and are never dropped, and a turn never waits for Cloud. Browser storage quota may be
lower than the store needs; a storage error stops further paid work until the store is
repaired.

## Commands that read, and what the agent did

**Mark every lookup command `reads: true`** (a command whose result is the answer). The agent
always answers after seeing a lookup's result. For other commands it may answer in the same
message: if every command succeeds that reply stands and the turn ends. If one is rejected or
fails, the reply stays as shown and the agent continues after the results in the same turn:
it corrects what it said, retries differently or explains what happened. Text already
streamed is never taken back. A turn that ends on a failure (a handler that threw, a cancel)
keeps what was shown too; its status and the command's result say what did not happen.

A handler may return a `record` string with its result (`{ ...result, record: 'ordered 2 linen
notebooks, $28 (order_1005)' }`): one line saying what the command did. The agent keeps a dated
record of what its commands changed, so it can tell what it did long after the conversation
itself has been folded into memory. Without `record`, the command line itself is kept.
`clearHistory()` clears it.

## Language selection

The project's `config.defaultLanguage` is the single default language tag
(default `"en"`). Its base configuration is written in that language; `languages`
contains alternate app configurations. `language` on `Croche.open()` is the app's
preference for the current user. If omitted, a browser supplies `navigator.language`;
otherwise Core uses the project's default. It never detects language from user text
or translates app data or Croche's English mechanics. The language selects the
configuration only; the model is not told it, so a reply's language follows your
instructions and the user's own message.

The former host `defaultLanguage` option is removed and refused by name. Put the
default inside project config, not in `CrocheRuntime.create()` or project host
options. Legacy single-agent callers provide their already-selected app instructions.

## Long-term memory

A project agent opened with `Croche.open()` → `croche.agent()` exposes the same `agent.memory` API as its host `CrocheRuntime.memory`.

Only the model writes memories, through `memory save [--ref tN,…] <fact>` and
`memory replace <mN> [--ref tN,…] <fact>`. Core assigns increasing `m1…` ids,
turn numbers, timestamps and optional turn references. A replacement has a new
id; the earlier fact stays marked with its successor. The retained store is a
FIFO of 2,000 current and replaced facts. At the cap a save drops the oldest;
ids are never reused, including after deletion or `clearHistory()`.

At a reduction, the first user message shows a separate conversation summary
and the newest current memories within the memory budget, oldest first.
Memories from kept turns are not duplicated there: their save calls are already
visible in those unchanged turns. Leaving that prompt list never deletes a
stored memory. Summary calls update only the conversation summary, not memories.

Built-in exposure is project config: `crocheTools` accepts boolean
`memory.save`, `memory.recall`, `memory.history`, `wiki`, and `schedule`
switches. Save/replace and history are on by default when memory is on.
Recall defaults to the save switch; explicitly setting `memory.recall: true`
keeps earlier memories readable even when saving is off.
`memory history <tN>` reads the turn archive as bounded labelled text, including
every person/event channel, tool calls/results and image metadata (never image
bytes). A missing turn says "tN is no longer kept on this device."; a host with
no archive says "Earlier turns are not kept on this device." Long reads end
"… (cut: tN is longer than one read)". Save guidance never names history when
that tool is off.

`memory recall <words>` searches saved facts, including current facts outside
the opening list and replaced versions. Results are oldest first; a replaced
match is shown with its successor, never on its own. Recall and history use
`memory.recallTokens`, at most a tenth of the context window. For recall that
share bounds full memory lines. For cut results it bounds the fact text only;
the compact header and fixed cut/more-matches notices are extra framing, counted
in the normal request estimate. For history it bounds the whole
labelled result, including its cut notice. Nothing is
automatically recalled from user text, and there is no extra raw-turn copy.
In a cut recall line only, refs are shown as a count (`64 refs`) so the
metadata cannot hide the matched fact. Full lines keep their individual refs.
Upgrading an empty-memory v12 store drops its obsolete raw-turn recall copy;
the retained conversation, archive, log and accepted inputs remain intact.

`memory.keys`, `memory.commands` and `schedule.commands` are removed and
refused by name. The app memory `set()` API, keys, pins and `memory forget`
are removed. Fixed app facts belong in app state or app instructions.

`memory.delete(id)` removes that memory and its earlier versions;
`memory.clear()` removes every memory. The summary of earlier conversation is
part of the conversation, not memory: `clearHistory()` or
`Croche.deleteStore()` removes it. Kept turns and the turn archive are not
rewritten by memory deletes. `memory.export()` contains AI-written facts only,
not the conversation summary.

`memory.changed` is an at-most-once hint emitted only after its write is
durable. A crash between the write acknowledgment and notification can lose the
hint. **`memory.list()` is the source of truth; the event is a hint.** A write
while another operation runs resolves with `{ deferred: true }` and applies
in call order at the boundary.

### Legacy stores

A nonempty keyed/text memory store is refused before any write with
`memory_store_too_old`. An empty legacy memory store opens and keeps its
conversation, queued inputs, receipts, log and enabled choice. For a refused
store:

This agent's store was written by an older Croche build whose memory this Core cannot read or convert. Nothing was changed. To continue, delete this agent's store and reopen; this permanently loses this agent's conversation and memories for this user. Only an older build that still runs can export them first.

For project stores, call
`Croche.deleteStore({ …projectOptions, agent: 'your-agent' })` and reopen.
This deletes that agent's conversation, memory, user wiki, archive and message
log; other agents are unchanged. Do not delete a whole project or storage file
as a substitute.

The single-agent TypeScript `CrocheRuntime` has no delete method. With its
default storage key, the measured recovery is the same project call, using
`config: {instructions: '…'}`, `agent: 'default'` (or the
original `agentId`), and the same `projectKey`, `user`, `serverKey`
and storage object. Only an older build that still runs can export first. A custom `storageKey` is not
addressed by that call: no public helper is bound for it. Use the storage owner's
scoped recovery procedure, including its log/archive/secrets; do not erase a
whole storage file or sibling agents. Single-agent RN/native recovery is not
verified through this project call.

| Option | Default | Meaning |
| --- | --- | --- |
| `memory.enabled` | `true` | Enable memory and summary work for this person |
| `memory.maxTokens` | `maxContextTokens / 5`, at most 800 | Memory list budget; the separate summary budget is half (125–16,777,216) |
| `memory.policy` | omitted | App-only retention guidance (≤ 4,000 characters); unset or `""` adds no app-labelled text |
| `memory.keepVerbatimTokens` | `1000` | Newest whole turns kept at a reduction, also bounded by `keepVerbatimTurns` (0–16,777,216, at most half the window) |
| `memory.keepVerbatimTurns` | `20` | Most turns kept verbatim (1–200), at least one |
| `memory.foldMinTokens` | `2500` | Least older conversation an idle fold removes to justify its call (125–16,777,216) |
| `memory.recallTokens` | `300` | Full recall memory-line bound; cut fact-text bound (compact header and fixed notices are extra framing); history whole-result bound (50–16,777,216, at most a tenth of the window) |

- `wakeAt()` returns the next upkeep time. Web/Node background upkeep sets a timer;
  mobile hosts call `maintain()` on foreground. An injected clock drives it explicitly.
- Summary work is a paid model call with purpose `summary`; failed or
  collapsed summaries keep the prior summary and do not delete memories.
- A cold turn answers before upkeep when its stored history fits; otherwise
  inline summarization runs before admission. Kept model I/O stays byte-identical.
- `clearHistory()` clears memories and the summary while preserving the id
  counter and the person's enabled choice.
- Memories and summaries are data, never instructions.

## Streamed replies

Replies stream by default: `text.delta` events arrive while the model is still
writing, instead of all at once after it finishes. Nothing else changes — the same
events, the same `TurnResult`.

```ts
let shown = '';
const result = await runtime.send({ id, text }, { onEvent: event => {
  if (event.type === 'text.delta') render(shown += event.text);
  if (event.type === 'marker') react(event.name);
} });
render(result.text); // authoritative
```

- **Deltas are provisional; `turn.completed` is authoritative.** If a turn fails or is
  cancelled mid-reply, the unfinished reply is not part of `result.text`. Replace what
  you streamed with `result.text` when the turn completes.
- Marker syntax never reaches `text.delta`. A possible marker (`:hap…`) is held until it
  is decided, so English arrives roughly word by word; Korean and most punctuation
  arrive immediately.
- However the network splits the reply, the concatenated deltas and marker order are
  exactly what a non-streamed reply produces. Tool calls still run only after the
  complete reply arrives.
- `streaming: false` asks for whole replies. Memory work is never streamed.
- Streams are assembled by the shared Core, so web, iOS, Android and React Native behave
  identically. Each streamed call reports its time to first token.

## Structured output

Pass `responseFormat` (OpenAI's shape) when the app needs data, not prose. The turn's
`result.output` is the reply as JSON that the Core has checked against the format; the
app never receives unchecked JSON. Without `responseFormat` nothing changes.

```ts
const result = await runtime.send({ id, text: 'Two tins of blend 3, as a gift' }, { responseFormat: {
  type: 'json_schema',
  json_schema: { name: 'order', strict: true, schema: {
    type: 'object', additionalProperties: false, required: ['item', 'qty', 'gift'],
    properties: { item: { type: 'string' }, qty: { type: 'integer', minimum: 1 }, gift: { type: 'boolean' } },
  } },
} });
if (result.status === 'completed') placeOrder(result.output); // { item: 'blend 3', qty: 2, gift: true }
```

Swift: `runtime.send(input, responseFormat: format)`. Kotlin: `runtime.send(input, responseFormat = format)`.
React Native: the same option as the web. Rust: `SendOptions { response_format: Some(format), .. }`.

- **The reply is checked, then kept as written.** It must parse and match the schema. One
  that does not is never kept: the Core sends the same request once more, and if that reply
  fails too the turn fails `output_invalid` (the message names the rule and the schema path,
  never the reply). The accepted reply enters history exactly as the model wrote it, and
  `text`/`raw` hold it too (`text` without leading whitespace).
- **No text events.** A structured turn emits no `text.delta` and no markers (`:name:` can
  occur inside JSON), and its calls are not streamed. One `output` event arrives just before
  `turn.completed`, after the result is stored.
- **Commands still run** in a structured turn; only the final reply is the output.
- **Only models that honour the format are called.** When none can, the turn fails
  `structured_output_unsupported` before anything is generated or charged.
- **Schemas the Core accepts: a deliberately narrow subset**, close to OpenAI's strict mode.
  Accepting more later is compatible; accepting less later would break apps. A schema outside
  it fails the send with `invalid_response_format` before any call, and the message names the
  schema path (`schema.properties.items.anyOf: at most 10 alternatives`).
  - Keywords: `type`, `properties`, `required`, `additionalProperties`, `items`, `enum`,
    `const`, `anyOf`, `$ref` (to `#` or `#/$defs/...`), `$defs` (at the root), `minItems`,
    `maxItems`, `minLength`, `maxLength`, `minimum`, `maximum`, `exclusiveMinimum`,
    `exclusiveMaximum`, `description`, `title`. Any other, `pattern` and `format` included,
    is refused: the Core never claims a check it does not run.
  - **No recursion:** no schema may contain itself through `$ref` (a tree of unbounded depth
    cannot be expressed; give it a fixed depth).
  - Limits: the schema at most 8 KB serialized; a value inside at most 5 objects or arrays;
    100 properties in all; 10 alternatives per `anyOf`; 200 `enum` values in all; 1,000
    schema nodes. Counts follow every `$ref`, so a `$defs` entry counts once per use. The
    whole `responseFormat` is at most 16 KB.
  - Numbers compare by value: `1.0` matches `const: 1`, and an integer bound is exact.
- `{type: 'json_object'}` asks only for some JSON object. Prefer a schema: a `json_object`
  reply can be valid JSON and still useless.
- The same message `id` with a different format is `idempotency_conflict`.
- **Do not rely on property order.** The order of fields in the reply is not guaranteed to
  follow the schema, so a "reasoning before answer" schema does not sequence the model.
- **A structured turn can cost more than a plain one**, and each retry is a separate paid call.

## Several characters for one user

Give each character an `agentId`. Each gets its own store, session, history and
memory, so a user can talk to two characters at once. Without it, a second Runtime
for the same user shares the first one's store and fails with `store_busy`.

```ts
const luna = await CrocheRuntime.create({ ...common, agentId: 'luna', instructions: lunaPersona });
const sol  = await CrocheRuntime.create({ ...common, agentId: 'sol',  instructions: solPersona });
```

- Tools receive `context.agentId`, and `status().agentId` reports it, so one tool
  implementation can serve every character.
- A store belongs to one agent: opening it as another agent, or with no agent,
  fails with `identity_conflict` rather than mixing two characters' conversations.
- Omitting `agentId` keeps the exact identity, store and status an app had before
  agents existed — existing users' conversations open unchanged.
- `agentId` is 1–200 characters of `A–Z a–z 0–9 _ . : -`.
- Every call report names its agent, so Studio attributes usage per agent.
- Each agent still has its own Runtime registration. Sharing one registration
  per installation is the next step.

## Documents the character can look up

Give the Runtime the app's documents (menu, rules, guides, lesson content). Bodies never
enter the conversation by themselves: the agent sees a short catalog of paths and titles, and
reads what it needs with the built-in `wiki search`, `wiki read` and `wiki list` commands,
which the Runtime answers without calling your code. Documents live in memory and are never
stored, so pass them on every open.

```ts
const brann = await CrocheRuntime.create({
  ...common,
  agentId: 'brann',
  wiki: {
    docs,                                  // [{path: 'menu/stew.md', markdown, agents?}]
    include: ['gate/**', 'town/**'],       // what this agent sees (all when absent)
    exclude: ['town/secret-*.md'],         // never, even when included
  },
});
const { digest } = brann.wiki.set(docs);  // replace everything; sha256 of what is installed
brann.wiki.put({ path: 'rumors/quest.md', markdown: '# The quest\n...', agents: ['mara', 'pip'] });
```

- `wiki: docs` is shorthand for `wiki: { docs }`.
- Load a folder of markdown with `wikiFromDirectory('wiki')` from `@h1r-ai/croche/node`.
  A web app with no file system uses its bundler's glob:
  `wikiFromModules(import.meta.glob('./wiki/**/*.md', { query: '?raw', import: 'default', eager: true }))`.
  Both take only `.md` files, in path order, with paths relative to the folder.
- A document exists for an agent only when both its `agents` and the agent's
  `include`/`exclude` allow it. `agents` comes from the frontmatter (`agents: [mara]`) or
  from `put`, which wins. A document an agent cannot see is absent from its catalog,
  search, list and read.
- Globs: `*` and `?` stay within one folder; `**` spans folders. At most 50 globs in each list,
  and 256 bytes of globs in both together, each glob counting its length plus one.
- The title is the first `#` heading. Frontmatter may also set `summary` and `keywords`.
- Limits: 2,000 documents, 64 KB each, 8 MB in all. The agent reads long documents in parts.
- A document added mid-conversation is searchable at once and announced to the agent
  once; the catalog itself updates when the conversation goes quiet.

The user's own documents (saved recipes, lesson notes, a quest they unlocked) are
`scope: 'user'`. Unlike the app's, they are stored with the user's state, so a put
resolves once it is durable, and a reopened Runtime has them without the app passing
them again.

- **`user/` is reserved for them.** A user's document must be under `user/`, and the app's
  may not use it: `set` and `put` refuse it with `invalid_wiki`, so a wiki folder with a
  `user/` subfolder fails when it is loaded. So a
  user's document never replaces one of the app's, and the catalog tells the agent which
  documents are the user's.
- An agent's `include`/`exclude` globs choose among the app's documents. They do not apply
  under `user/`: those are already this agent's own.
- Each user can hold at most 200 of their own documents, 256 KB in all as stored (paths,
  markdown and `agents`, as JSON), because their state is rewritten on every step.

```ts
await runtime.wiki.put({ path: 'user/notes/recipe.md', markdown, scope: 'user' });
await runtime.wiki.remove('user/notes/recipe.md', { scope: 'user' });
// Removes every one of the user's own documents. clear_history does not: it clears the
// conversation and memory, and the user's own documents stay.
await runtime.wiki.clear({ scope: 'user' });
// Each character's Runtime has its own store: share by putting to each one.
await CrocheRuntime.shareWiki([mara, pip], { path: 'user/rumors/quest.md', markdown, agents: ['mara', 'pip'] });
```

A put replaces by path, so retrying a failed `shareWiki` is safe.

## Users and the allowance

Pass `user` as the app's exact user identity: 1–200 UTF-16 code units, without
padding, control characters or lone surrogates. A device's identity is scoped to
its project and installation; a verified server key selects a server user in the
project, independently of installation. A server key requires `user`.
Omit `user` on a device for an anonymous installation user. Each app user gets
its own default local store and Cloud balance; server key rotation keeps them.

`status().userId` and `context.userId` are the opaque id Cloud issues (empty until
registration). `accountLabel` and the old `userId` open option are refused.

- The allowance lives in Cloud, per user, across every agent and device registration.
  Each sync adopts Cloud's balance. `userBudget.add` and `userBudget.set` ask Cloud,
  which applies the developer's ceilings and answers with what it applied
  (`limitedBy` names the ceiling). Pass `{ amount, id }` to make a retry safe: Cloud
  applies one id once.
- A user whose allowance is spent gets `allowance_exhausted` before any model call.
  The local balance is Cloud's figure from the last sync minus this device's spend
  since, so a user cannot overspend by going offline.

## Durable results, retries and cancellation

Use a globally unique input `id` and preserve it with the same text, kind and
context when retrying delivery. A completed, failed, cancelled or interrupted
input ID returns its saved result without re-running the model or tools. Changing
the payload under that ID produces `idempotency_conflict`.

For an explicit new attempt after failure, generate a **new** message ID. Effects
from the previous attempt may already have happened. A stable tool `callId`
deduplicates one delivery, not a semantically similar new model request; use an
application operation ID for business-level idempotency when necessary.

The SDK persists intent before a paid call and before tool dispatch. If the
process dies during a turn, reopening returns `interrupted` for that input and
restores assistant text and markers from saved model responses. Recovery does
not dispatch tools, request another model response or replay observer events.
Uncertain tools are not automatically replayed.

Invalid tool arguments and unavailable tools rejected by the Runtime before
handler execution are returned to the model for correction within the same
bounded turn. A handler can likewise return JSON such as
`{ status: 'rejected', reason: 'occupied' }` for a known application outcome;
the model receives that result and may choose a corrected action. Return the
actual outcome, including any effects already completed.

### Approval in your app

Croche has no approval step: a command with a `confirm` field is refused. When an action needs the
person's agreement (delete, refund, anything that spends or can't be undone), your handler asks in
your UI and returns a value the agent reads; once they approve, a later call runs.

```ts
const approved = new Set<string>(); // order ids the shopper approved in your UI

const ordersTool: RuntimeTool = {
  name: 'orders',
  summary: "The shopper's orders.",
  commands: [{
    key: 'orders_refund',
    name: 'refund',
    summary: 'Refund an order. The shopper approves it in the app first.',
    positionals: [{ name: 'order_id', type: 'string', required: true }],
  }],
  async execute({ args }) {
    if (!approved.delete(args.order_id)) {
      showRefundApproval(args.order_id); // your UI: "Refund order 1042?" [Approve] [Cancel]
      return {
        status: 'waiting_for_approval',
        record: `asked to approve refunding ${args.order_id}; not refunded yet`,
      };
    }
    const refund = await refundOrder(args.order_id);
    return { ...refund, record: `refunded ${args.order_id}` };
  },
};

// When the shopper taps Approve, tell the agent; its next call to refund runs.
async function onApproved(orderId: string) {
  approved.add(orderId);
  await runtime.send({ id: crypto.randomUUID(), inputs: [
    { kind: 'event', text: `The shopper approved refunding ${orderId}.` },
  ] });
}
```

Return a value, not an exception: an exception after the handler starts ends the turn (below).
Give the waiting result a `record`; without one, the agent's record of what it did keeps the
command line itself, which reads as if the refund happened.

A tool timeout or an invalid result fails that call alone: the model reads it and the turn
goes on (H2, H3). A cancellation or any exception after the handler starts ends the turn
because its effects may be unknown. Throwing a
`CrocheError` with a validation-related code does not make a dispatched handler
safe to repeat. Report known, correctable rejections as returned JSON instead.

The model may send several commands in one message; they run at the same time, so calls in
one response may take effect in any order. One command's rejection or failure does not stop the
others, and the model reads every result in call order. An action that depends on another
("equip" after "buy") belongs in a later message, once the model has seen the first result, or
in one app command that does both. Croche's own commands (memory, wiki, schedule) run one after
another, in call order.

A Runtime runs at most 8 of the app's commands at once. A command waits for a free slot within
its own time limit, counted from when the message's commands were dispatched; one that gets no
slot in time is not run, and the model is told so (`no_slot`) and goes on. A handler that never
returns keeps its slot until it does, even after its command timed out. Only the Runtime says a
command did not run: an error a handler throws, whatever its code, means the command may have
had its effect.

A turn that fails or is cancelled after commands ran keeps them in the conversation: the next
turn's model sees what already happened. A turn that fails before any command ran leaves no
history.

A model response with no visible reply is recovered once inside the same turn, without
running commands or repeating completed effects; both calls' costs belong to that turn. If
the recovery is empty too, the turn fails explicitly. Truncated responses remain failures.

Pass `AbortController.signal` to `send` to stop a turn. Tool handlers must inspect
`context.signal` immediately before effects and cooperate while doing asynchronous
work. JavaScript cannot forcibly unwind foreign code; late completions are fenced,
but cancellation is not rollback. Host callbacks must not block the event loop.

**Commands that outlast the wait (H2).** A turn waits up to 3 seconds for its round of commands. A command still running then is answered to the model as *processing* (its result comes later; don't call the command again or state its result), and the turn goes on. When the command returns, its result is recorded and arrives as an input of its own (`<channel="tool">`): it leads the next message's turn when their response formats match, and otherwise starts a turn by itself, with no caller; read that turn in `history`. The command's deadline (`timeoutMs`) still applies: past it, the call is reported `tool_timeout` in the same way. A timeout is the model's to read and never fails the turn. A cancelled turn's result never starts a turn: the next turn of the same response format carries it. `clearHistory()` discards the old conversation's results, including those of commands still running. `close()` gives running commands 2 seconds; any still running are recorded as interrupted (effect unknown), and that notice arrives after the next open. A turn a late result leads names that result's original message in `causedBy`, beside its own. Late turns are not new messages: together with the turn that started them they stay within `maxIterations` model calls, counted from the last message from outside, and once that is spent the results wait for the next message, which carries them. None of this is an app event: your tool knows what it ran (debug only: `tool.late`, `tool.results_accepted`, and `tool.completed`/`tool.failed` with `late: true`).

Operations run one at a time, in call order: a `send`, `sync` or `flush` called while
another runs waits for it (beyond 64 waiting, or 4 MB of them, it is refused `queue_full`).
A message sent from inside a tool handler therefore waits for the handler's own turn to
end: **start it, don't await it**. Awaiting it no longer deadlocks: after the 3-second wait
the handler's turn goes on without it, the message runs next, and the handler's result arrives
after that. A command whose `timeoutMs` is shorter than the wait reaches its deadline first:
it is reported `tool_timeout`, and when a message sent during the tool is still waiting then,
that answer adds a hint about this; the Runtime cannot tell who sent it. Messages sent while a turn runs are held, never refused, and the ones waiting together run as **one** next turn, each input its own channel (a `responseFormat` send runs alone, in its place); each such send resolves with that turn's result, `causedBy` naming them all. A held message is stored before `input.queued` says so, and survives the app being killed or closed: the next open runs what was still held as the next turn, before any new send, with no callback (re-send the same `id` to get its result). Every held message comes back, even past the 64-waiting bound (new sends are refused `queue_full` while that backlog is over it), and one whose turn could not be stored (`storage_error`) stays held for the open after. If it is refused before it can run there (the store is full, or the gateway cannot take its images or `responseFormat`), that refusal is kept as its outcome: no model call, no cost, `history` shows the input with `status: 'failed'`, `refused: true` and the `error`, and re-sending the same `id` answers that same result. `clearQueued()` drops what is held (`input.dropped`, `cleared`), and so does `clearHistory()`; a held send's own cancellation drops just it (`cancelled`).

`clearHistory()` deliberately ends the old receipt/idempotency window. Keep using
globally unique input IDs after a reset. Export valuable history before clearing.

## Cost-first control, and what a Cloud outage does

**Every paid call, in one place.** `onUsage` receives one event per model call once its cost is
known, whatever caused it: a message's calls (`purpose: 'model'`) or summary work (`'summary'`,
including the prepare during upkeep, which no `send()` result owns). Use it to display or record
usage; limits are already enforced here and in Cloud, so never gate the SDK's `fetch` yourself.
Delivery is at least once (a crash between settling and saving re-settles on reopen): dedupe by
`operationId`.

```ts
const seen = new Set<string>();
CrocheRuntime.create({ /* ... */ onUsage: e => { if (!seen.has(e.operationId)) { seen.add(e.operationId); ledger.add(e.operationId, e.costUsd); } } });
```

Before every call the Runtime decides from local state only: the user's allowance, the
project's remaining money, and a model key. It never waits for Cloud to approve a call.
When the local answer is no, it asks Cloud once (a top-up may be waiting) and, if Cloud
is unreachable, the local answer stands; it does not ask again until the upkeep retry
time.

A call's reported cost is applied once to both local counters. When a call ends
without one (a timeout, a cut stream, a cancel, the process dying mid-call), the call is
charged a conservative estimate (the project's `max_operation_usd`, default $0.05) and
reported as `estimated`; Cloud settles it. A call refused before generating
costs nothing. Cloud's balance is authoritative and replaces the local one at each sync,
minus this device's spend that Cloud has not received yet.

| During a Cloud outage | What happens |
| --- | --- |
| Turns of an installation that holds a key | Work, until the local allowance or the key's limit runs out |
| Opening the Runtime | Works; nothing on the way to the first turn needs Cloud |
| Call reports | Kept in the outbox and delivered by upkeep when Cloud returns |
| First registration of a new installation | Waits for Cloud, and fails with a retryable error |
| Allowance changes by the app | Wait for Cloud |

When an installation's credentials run out, the Runtime syncs once and retries the call
once. When Cloud withholds them it says why, and the turn fails with that reason (for
example `development_allowance_exhausted` or `project_budget_exhausted`).

Call reports carry call metadata (ids, model, token counts, cost, timings), never prompt or
output text. That is a consequence of keeping Cloud off the turn path, not a privacy promise:
the model provider still processes the content under its own policies.

## Events and markers

Events are `turn.started`, `text.delta`, `marker`, `tool.started`,
`tool.completed`, `tool.failed`, `output` (structured turns only, see *Structured output*), and
exactly one `turn.completed` for a newly executed input. Cached replay returns the result without replaying observer events.
Observer exceptions do not corrupt execution.

`text.delta` events stream while the model writes (see *Streamed replies*); with
`streaming: false` they break the completed reply into
presentation segments instead. Either way, append their `text` by `turnId`; deltas span all model rounds and include a newline
between nonempty assistant responses. The returned `TurnResult`/`turn.completed`
contains the aggregate. Replace the same assistant row with that final text,
including on cached replay, so deltas and the result do not create duplicates.

Render nonempty `result.text` for failed, cancelled and interrupted turns as well
as completed turns. An earlier preface remains spoken even if a later model call
or tool fails. Use `status` for the outcome indicator and application success
rules, independently of text visibility. `history()` preserves these assistant
entries for restart restoration; recovery does not replay their text events.

Markers use exact ASCII syntax `:[A-Za-z0-9_-]+:`. `:pleased:` produces a marker
event and is removed from display text; unknown names and duplicates are retained.
`raw` retains the original content and `text` is not trimmed. Markers never execute
tools. Use registered commands for movement, storage and other actions.
Provide a `markerGuide` in Runtime options to explain app-specific expressions;
map marker events to presentation callbacks. Never add an emotion Tool.

## Local Runtime debugger

With the release CLI installed and Croche Chat open in development, run:

```sh
croche debug
```

Pick the currently advertised Runtime, then open the CLI's already-paired
standalone debugger server URL in a separate browser tab. The CLI ensures the
local broker and bundled debugger are running. The viewer is filtered to your
selection and receives an immediate `runtime.ready` snapshot; no copied token
or extra model turn is needed. Chat has no debugger link or pairing screen.
Its passive development adapter supports session reconnection in the same HTTPS
Chat tab. The relay keeps the broker credential on the server and exposes only
status and debugger attach/detach automatically. Full CLI control remains an
explicit, separately authorized attachment.

Use `croche debug disconnect --runtime-id RUNTIME_ID` to detach diagnostics.
It closes that event transport without stopping the debugger server, deleting
captured history, cancelling a turn or closing the Runtime. Chat's Developer desk
retains a generic local discovery opt-out and separate full CLI control settings.

Chat uses the existing local debugger on port 8790. Authenticated running services
and their captures are preserved; an occupied port with an unknown credential is
refused. The CLI needs no provider or Cloud developer key for this workflow.
Other SDK apps must register their own adapter for the existing Runtime; see the
[complete example](docs/DEBUGGER.md#attach-another-javascripttypescript-app).

The dynamic observer API is:

```ts
// debug is a createLocalDebugger(...) transport configured by your dev adapter.
runtime.setDebugObserver({ onDebugEvent: debug.onEvent, visibility: 'runtime' });
const delivery = await debug.flush(); // delivers the immediate runtime.ready snapshot

// Detach diagnostics only. The conversation and any active turn keep running.
runtime.setDebugObserver();
await debug.close();
```

`setDebugObserver` attaches or replaces an observer without reopening, cancelling,
or clearing the Runtime. It emits current non-secret status and tool metadata,
then observes future events. It does not replay past prompts, speech, markers or
tool effects. Attaching during a turn can produce a partial capture.

Diagnostics are absent by default. `visibility: 'runtime'` includes app inputs,
context, tools, results, markers and usage summaries. The current CLI development
workflow uses `'runtime'` in public builds. Untyped `'full'` requests fail with
`invalid_configuration` naming `debugVisibility` before effects, including observer
replacement. A debug key cannot enable it. Private builds explicitly enable
the default-off Core `internal-debug` feature to capture full model exchanges,
without a key. [Internal-build recipes and artifact gates](../../docs/INTERNAL-DEBUG.md)
keep those libraries out of public packages and app-store builds. This removes the
flag-only extraction path, not access by a determined device owner.
Runtime visibility needs no debug key and works in release builds.
Authentication headers, Runtime bearer credentials and
provider keys are excluded. Keep pairing links and tokens out of prompts and
repository files; full traces deliberately contain private application content.

The `/debug` transport queues isolated snapshots, sends only to loopback, reports
losses, and never retries paid work. Removing the observer does not close that
transport: close it explicitly after detaching. At app shutdown, close the
control attachment and diagnostic transport before closing the Runtime.

This discovery adapter targets JavaScript/TypeScript development hosts. It does
not establish Swift/Kotlin automatic discovery or validated Windows automatic
relay support. See [the event and delivery contract](docs/DEBUGGER.md) for the
adapter, visibility and retention details.

## Node and mobile storage adapters

```ts
import { CrocheRuntime } from '@h1r-ai/croche';
import { FileStorage } from '@h1r-ai/croche/node';

const runtime = await CrocheRuntime.create({
  projectKey: process.env.CROCHE_PROJECT_KEY!,
  storage: new FileStorage('./private-runtime-state'),
  instructions: 'You are Pip, a concise, considerate companion.',
});
try {
  console.log(await runtime.send({ id: crypto.randomUUID(), text: 'Hello.' }));
} finally {
  await runtime.close();
}
```

`FileStorage` atomically renames private files. One process owns its directory:
lock records beside the state (`<key hash>.lock.<n>`, each published whole and
exclusively, holding the owner's pid) make a second process fail with
`store_busy`. A released lock (one small `free` record stays after the last
release, including at a clean process exit) is taken at the next open. Nothing
is ever taken over because of its age: no clock decides anything.

**One store directory per container (or per host process tree); never share a
`FileStorage` directory across containers.** A pid means something only inside
one PID namespace, on one boot of one host. Each record names that scope and
its OS. On Linux the scope is the host, the boot id and the PID namespace (from
`/proc`), and the record also holds the owner's start time. On macOS the scope
is the boot session (`kern.bootsessionuuid`) alone: macOS has no PID
namespaces, and a Mac's hostname follows the network it is on. A held record is
checked, and taken over, only when it was written in the opener's own scope:
- its pid no longer exists (the system answers "no such process"): taken over
  (a process that crashed). Any other answer, including a failed check, is not
  proof of death and stays `store_busy`;
- (Linux) it has the opener's own pid but another start time: an earlier
  process that had this pid, taken over;
- it has the opener's own pid and start time, or on macOS (which records no
  start time) the opener's own pid: this process (another copy of the SDK, or
  a worker thread), never taken over.

A held record from any other scope is never taken over: another host (Linux),
another boot, another PID namespace, another OS (a directory shared between a
Mac and a Linux container), or a record or opener that cannot tell its scope
(Windows, or a failed `/proc` read or `sysctl`). Two containers can both be pid 1 with the same hostname, so
a pid seen from another namespace proves nothing about its owner. **A
consequence:** a container that crashes and is started again (a new PID
namespace) may find its own old lock and get `store_busy` until it is
recovered by hand. A clean shutdown releases the lock, so only a crash leaves
one. On macOS a lock left by a crashed or killed process is taken over at the
next open, as on Linux. Only on Windows is it recovered by hand.

**When `store_busy` names another host, another scope, or an unreadable
record.** A record that cannot be read can only come from disk damage or a
foreign writer: records are written in full and fsynced before they appear, so
a crash never leaves one half-written. None of these is taken over
automatically, because its owner may still be running where this process
cannot check. The error message names the record file. The supported recovery:
stop **every** process that uses the store (every container, SDK copy and
worker), then remove the store's `<key hash>.lock.*` records named in the
message. The `.json` value beside them stays.
`WebStorage` uses browser/WebView storage, with Web Locks preventing concurrent
owners where supported. Custom adapters implement asynchronous `getItem`,
`setItem`, `removeItem`; a write must atomically replace a complete value. For
example, adapt Capacitor Preferences without adding an agent loop. Apps control
storage backup, deletion and encryption. Runtime bearer tokens are sensitive even
though they are not provider keys. Do not share local stores across devices or
users, and do not operate the same namespace concurrently where Web Locks are absent.

**The turn archive.** Every finished turn is also kept in full on the device: its messages,
tool calls and results, and image references with their `alt` text (never image bytes).
`FileStorage` writes it beside the store, one file of JSON lines per 100 turns; `WebStorage`
over `localStorage` writes it to IndexedDB; `MemoryStorage` keeps it in memory. Past
`archive: { maxBytes }` (default 8 MiB) the oldest file of 100 turns is deleted, and
`clearHistory()` deletes it all. A custom adapter keeps none unless it adds the optional
`archive` capability (`appendLine`, `readLines`, `replaceLines`, `remove`, `entries`); everything else works
without it. A store that has kept an archive remembers it: reopened with a storage that has no
`archive` capability (say `WebStorage(localStorage, null)`), its `clearHistory()` fails with
`archive_unavailable` and clears nothing, because the archive it kept would survive. Reopen
with the archive to clear.

With `crocheTools: { schedule: true }`, the agent can leave itself notes. While a
Runtime is open and holds its store's lock (`FileStorage`, or Web Locks in a
browser), it arms one timer at the earliest note and calls `deliverDue()` then,
never before the note's time; a note that fell due while closed is delivered at
the next open. Without a lock it arms nothing, reports the debug event
`schedule.degraded` with reason `no_lock`, and delivers only when the app calls
`deliverDue()`. The timer never keeps a Node process alive.

With `heartbeat: { everyMs }` (15 minutes to 24 hours; off by default), the app gives
the agent a regular check-in: a turn at most once per period, delivered by the same
timer and `deliverDue()`, in the same turn as any due notes. The next one is a period
after the last delivery, so after a long gap it runs once, not once per missed period.
It is the app's, not the agent's: never in `schedule list`, never counted toward its
20 notes, not cancellable by the agent; remove the option to stop it.
`runtime.schedules()` reports it as `heartbeat: { at, due }`. What each platform can
promise about either is in `docs/SCHEDULE-PLATFORMS.md`.

For React, open one Runtime in application lifecycle code and close it on cleanup.
Development Strict Mode can mount twice; serialize create/close or hold a single
app-level initialization promise. `store_busy` indicates an existing owner.

On Windows, another program (antivirus, the search indexer, a sync agent) can hold a
`FileStorage` file open for a moment, so its atomic rename fails with EPERM, EBUSY or
EACCES. That rename is retried for about 0.8 s, then fails as `storage_error` with the
original error as `cause`; the previous value is kept.

## React Native

The same project API, including instances (`instance`, `fresh`) and `Croche.deleteStore`,
with the shared Core compiled natively for iOS and Android. React Native 0.76+ with
the New Architecture; iOS 15.1+, Android API 26+.

```sh
npm install @h1r-ai/croche @h1r-ai/croche-react-native
cd ios && pod install
```

The React Native package carries the native Core (the iOS xcframework and the Android
libraries for arm64-v8a, armeabi-v7a and x86_64), so the app needs no Rust toolchain and no
Croche checkout. Android needs no further step.

```ts
import { Croche } from '@h1r-ai/croche-react-native';

const croche = await Croche.open({ projectKey, debugKey: __DEV__ ? devKey : undefined,
  user: playerId, config: { instructions: MARA, tools: [inventory] }, handlers: { inventory: runInventory } });
const mara = await croche.agent();
```

- **No `storage`, `secretStorage` or `serverKey`:** the package keeps stores in the app's files
  and secrets in the Keychain or Keystore.
- **Real phones attest themselves** (App Attest, Play Integrity). For Play Integrity, pass
  `android: { cloudProjectNumber }`, the Google Cloud project linked in Play Console.
  Simulators and emulators cannot attest: use a debug key as `debugKey`, and never
  ship one in a release build.
- The package's own README covers its options, background delivery and
  errors.

## Account CLI and local Runtime control

Install the CLI globally with `npm install --global @h1r-ai/croche-cli`, then create a developer key in
**Studio → Developer keys**. Cloud stores its hash and shows the secret once.

```sh
export CROCHE_DEVELOPER_KEY='YOUR_DEVELOPER_KEY'
croche auth whoami
croche projects list --json
croche --help
```

The developer key identifies your account for project/Studio management. It is
separate from the public project key passed to an app and from local Runtime
control pairing. Keep it out of application bundles and model prompts.

The automatic `croche debug` workflow above advertises diagnostics only. For
explicit full development control, start `croche control serve` with
`CROCHE_CONTROL_TOKEN` set to a separate random token. Attach an existing Runtime:

```ts
import { attachRuntimeControl } from '@h1r-ai/croche/control';

const control = await attachRuntimeControl({
  runtime,
  token: 'YOUR_LOCAL_CONTROL_TOKEN',
  tools: () => runtime.tools(),
});
// Close the attachment before closing the Runtime.
await control.close();
```

Run `croche runtime list`, then use `--runtime-id` to target status, history,
send, cancel, sync, budget and tools commands. Apps with their own transcript
workflow should supply the helper's `send` and `cancel` adapters; keep original
input context for same-ID delivery retries. The control broker cannot open or
edit Runtime storage. The passive debugger remains on its own connection.

Read [the coding-agent checklist](docs/CODING-AGENT.md) before implementing a new
app. Croche Chat in this repository is a full reference, not a required dependency.
