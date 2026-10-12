<!-- Generated from packages/runtime/docs/SKILL.md by scripts/build-plugin.ts. Edit the source, then run npm run build:plugin. -->


# Croche

Croche gives an app a **scoped agent**: an AI with a clear purpose that acts through the app's
own commands. The Runtime (a Rust Core inside the SDK) already does the hard, generic part:
conversation history, long-term memory, the model and how it is called, the tool loop,
spending limits and reporting. **You write only
what is specific to this app.** This page is enough for most apps. Do not read the SDK
sources or its `.d.ts` files; open a reference only when a step below points to it.

## Do not build these (the Runtime does them)

History, windowing, summaries, memory files, retries of model calls, a tool loop, a model
client, provider choice, prompt caching. Every one of them is already correct in the Runtime,
and a second copy costs tokens on every call. Never call the model provider yourself.

## What you need first

Ask for anything you do not have; never invent a value.

- Croche Cloud URL and the project's **public project key**.
- The SDK file `h1r-ai-croche-0.4.0.tgz` (install that file; it is not on npm). For
  React Native, also `h1r-ai-croche-react-native-0.4.0.tgz` (the native Core is inside;
  see the [SDK reference](../skills/croche/references/sdk.md), React Native).
- In development (Node, simulator, browser): a **development key** (`cdt_…`) passed as
  `debugToken`. Release builds on phones use platform attestation instead; web apps run the
  Runtime on their backend with a server key (`csk_…`). See [SDK reference](../skills/croche/references/sdk.md)
  only if you are in one of those cases.

## The recommended setup

One `Croche` project per user, opened once for the app's lifetime, and its agents
(Node shown; React Native is the same API):

```ts
import { Croche } from '@h1r-ai/croche';
import { FileStorage } from '@h1r-ai/croche/node';

const croche = await Croche.open({
  cloudUrl, projectKey, debugToken,             // from .env; never hard-code or log keys
  user: playerId,                               // your app's id for this person
  storage: new FileStorage(join(dataDir, 'croche')),  // one directory for the whole project
  config: { instructions: PIP, tools: [shop] }, // who the agent is (short: paid on every call), and the app's actions, below
  handlers: { shop: runShop },                  // one handler per tool, by tool name
});                                             // leave every other option at its default

const pip = await croche.agent();               // the project's agent
const result = await pip.request({ id: messageId, text: userText, context: appState() });
```

- **`request`** resolves when the input is answered, with its `messages`; the reply is the
  `message.end` among them. **`send`** returns at once with a receipt. To show replies as they
  stream, `subscribe({ onEvent })` once and render `message.delta` (provisional) and
  `message.end` (final) events.
- **Several agents:** declare them under `config.agents` (`{ helper: { instructions: … } }`)
  and open each with `croche.agent('helper')`. A separate conversation of one agent, such as a
  save slot, is `croche.agent(id, { instance: 'save-2' })`; `{ fresh: true }` starts a new one.
  Each has its own history and memory.
- `CrocheRuntime.create` (one agent, no project) still works and the
  [SDK reference](../skills/croche/references/sdk.md) documents it. New apps use `Croche`.

- **`instructions`:** the character only: who, voice, what they care about, in a few short
  paragraphs, in English (the persona's example lines may be in the user's language). No
  command list, no app state, no rules the tool set already enforces.
- **Reply length and tone are yours.** The Runtime says nothing about how the agent talks. If
  replies should be short (a task app, a store), say it in `instructions` ("one to three short
  sentences unless asked for more"); a character may need more room. Measured: a brevity line
  halves reply length and cuts cost on task apps, but flattened an NPC's voice.
- **`context`:** the current app state on **every** message: what most turns need to answer
  (cart, balance, open tasks, today's schedule, recent orders). Rich state here saves a lookup
  call on most turns and keeps the agent from answering without checking. Keep it bounded:
  cap long lists and add a hint such as `"more": "use orders list"`. Kept earlier turns are
  resent exactly as they were sent, earlier states included. Send the current state on every
  message, even when unchanged: Croche sends only what changed.
- **Money:** per-user and project spending limits are the Runtime's and Cloud's; do not wrap or
  gate the SDK's `fetch` to meter calls. To show or record usage, use `onUsage`: one event for
  every paid call, including memory upkeep that belongs to no message.
- **Storage:** durable, one per project; the Runtime keeps each agent's store inside it.
  Reopening with the same storage restores every conversation and memory.
- **Time in context:** Core adds the permanent conversation number and short local
  time before the input channels, with a zone at the start and after reduction.
  Kept messages are never re-dated. Do not add a time channel or `timeContext`;
  that removed setting is refused by name.
- **The Runtime's own behaviour is tuned by Croche,** not by the app. Set `memory.policy` only
  if this app must keep something specific.
- **Clock:** the Node/web host schedules the Runtime's upkeep. Only with `CrocheRuntime` and
  an app clock of its own (tests, simulations): pass `clock` and call `runtime.maintain()` once
  `clock()` reaches `runtime.wakeAt()` (epoch ms, like the clock).

## Commands: the app's actions

Each capability is a **command** of a grouped tool. Write per command: a one-line `summary`
saying what it does **and when to use it**, with the allowed values when they are few; typed
flags with `enum`, `minimum`/`maximum`, `required`.

**Say when each state-changing command may run.** A Croche agent acts on its own judgement by
default; limiting that is your app's call, and it takes one line. For every command that changes
something, put in its `summary` (or in `toolGuide`) whether it runs only when the person asks for
that change, e.g. "Change the cart only when the shopper asks for that change, not because an item
seems suitable or while answering a question." Without it, a shop agent answering "would the
notebook still fit?" may add the notebook (measured 2026-09-29: 17% of such questions changed the
cart; with that one line 0%, and requested changes still ran).

**Actions that need the person's agreement** (delete, refund, anything that spends or can't be
undone) are approved in your app, not by Croche. Croche has no approval step: a command with a
`confirm` field is refused (`invalid_configuration`). The tool's handler asks the person in your
UI and returns a value the agent reads, such as `{ status: 'waiting_for_approval' }`; once they
approve, a later call runs. Return a value, not an exception: an exception after the handler
starts ends the turn. Don't return `{ ok: false }` for a wait either: it tells the agent the
command failed. The SDK reference has the example ("Approval in your app").

**Every command that only reads (list, get, search, status, menu) must have `reads: true`.** Not
optional: the agent replies together with its commands, and without the mark a lookup can end
the turn on "let me check" before the answer.

```ts
import type { ToolDeclaration, ToolHandler } from '@h1r-ai/croche';

const shop: ToolDeclaration = {             // goes in config.tools
  name: 'shop',
  summary: 'The inn shop.',
  commands: [
    { key: 'shop_sell', name: 'sell', summary: 'Sell food or drink the player asks for: stew, bread, ale (evenings only).',
      flags: [{ name: 'item', type: 'string', enum: ['stew', 'bread', 'ale'], required: true },
              { name: 'qty', type: 'integer', minimum: 1, maximum: 5 }] },
    { key: 'shop_menu', name: 'menu', summary: 'List today\'s menu and prices.', reads: true },
  ],
};
const runShop: ToolHandler = ({ key, args }, context) => {   // goes in handlers.shop
  // Enforce everything here: this is the real boundary, not the prompt.
  const out = app.run(key, args, context.user);
  return out.ok ? out.value : { status: 'rejected', reason: out.reason };   // return, never throw
};
```

- The declaration is data (a released config can replace it); the handler is code and stays in
  the app. `context` names the `agentId`, the `user` and what caused the call.
- The model sees each command's usage line and `summary`. The tool's own `summary` (`'The inn
  shop.'`) appears only in `help` output, so put rules in command summaries or `toolGuide`,
  never only in the tool summary.
- Summaries have no length limit of their own and are never cut. The whole tool list is capped
  at 256,000 bytes of JSON, and each `help` text at 32,000 bytes. Keep each summary to one line.

- `key` is global across all tools (and becomes the function name under `functions`): prefix
  it with the tool name (`shop_sell`), never a bare `list` or `get`.
- If the app already has JSON-schema tool specs, map each to one command (property ->
  flag, keeping `type`, `enum`, `minimum`, `maximum`, `required`, `description`) in a small
  loop. Do not hand-write them twice.
- A rejected result teaches the model the rule at the moment it needs it; you do not need to
  describe every rule in prose. Say what to do instead, in plain words, and name arguments as
  the model writes them (`--order-id`).

**Good commands, in one minute.** Croche renders the usage line, reads forgivingly and answers
mistakes with the exact usage, so you only declare:
- a group noun and short verbs: `tasks add|list|done|delete`, `shop search|add-to-cart`;
- required arguments first: they may be written without their flag, in order
  (`tasks done t5`, `shop cart-add notebook 2`);
- `enum` for allowed values. The usage line lists them only when there are at most 12 and they
  fit in 120 characters; otherwise it shows a placeholder (`--item ITEM`), so name the values
  in the summary or give a read command that lists them;
- `list: true` for several values (`--tags work,home`); the handler gets an array;
- `default` on a flag or positional: the handler's `args` has it filled in when the model omits
  the argument;
- `aliases` for verbs a model may mix up (`update` also `edit`, `upgrade`), shown only in help.
Do not handle spelling variants yourself: a missing group, `_` for `-`, or an unquoted multi-word
value are accepted when unambiguous (and counted as `command.repaired` debug events).
- Money, inventory and progress live in the app, never only in what the model was told.
- The Runtime keeps a dated record of what each command did, for when the conversation has moved
  on. A handler may add `record: 'one line of what happened'` to its result; otherwise the command
  line is recorded.

## Tool interface

A `setTools` filter never changes the system prompt. `toolGuide` is app text,
verbatim at the start of `run_tool`'s **App tools:** section, after the compiled
base guide and **Croche tools:** section. It is not in the system prompt. App
command summaries are shown in full, within the registry's byte cap.

Use project config `crocheTools` for the built-in library: `memory.save` is on
when memory is on, `wiki` requires visible documents, and `schedule` defaults
off. Set a switch to `false` to remove that tool from both the description and
dispatch. These config fields are removed and refused at every layer (project,
`agents.X`, `languages.Y`, `agents.X.languages.Y`): `memory.keys`,
`memory.commands`, `memory.recall`, `memory.deltas`, `schedule.commands`,
`memoryRecall`, `timeContext`, and `defaultLanguage` anywhere below the project
root. All are refused by name except `memory.deltas` and a nested
`defaultLanguage`, which are refused as unknown fields. The `crocheTools` switch `"memory.recall"` is not that field: it turns the
model's `memory recall` command on or off. Only the model writes monotonic memory ids with `memory
save` or `memory replace`; the app can list, export, delete by id or clear them,
but cannot set keyed facts. A replacement retains its earlier version.
`memory history <tN>` reads bounded archived-turn text and `memory recall <words>`
searches every memory, each when enabled. Nothing is recalled automatically: the
model reads only what it asks for. Conversation summaries are not memory items: deleting or
clearing memories preserves the summary and does not rewrite kept or archived
turns. `clearHistory()` or `Croche.deleteStore()` removes the summary.

**Croche's own tools and modes, in config:**

```ts
config: {
  toolGuide: 'Phone effects are rare: use them only when the person asks.',   // app text for run_tool
  crocheTools: { 'memory.save': true, 'memory.history': true, 'memory.recall': true, wiki: true, schedule: false },
  modes: {
    room: { tools: [room], toolGuide: 'In the room, place items only where the person says.' },
  },
}
// later: await agent.setMode('room'); … await agent.setMode(null);
```

- `crocheTools` is a flat object with these five dotted keys and boolean values; a nested
  `{ memory: { save: true } }` is refused. Defaults: `memory.save`, `memory.history` and `wiki`
  on (memory tools only while memory is on; `wiki` only while the agent sees a document),
  `memory.recall` follows `memory.save`, `schedule` off. `memory replace` is on exactly when
  `memory.save` is.
- `toolGuide` and `crocheTools` are allowed at every config layer, applied in this order:
  project → `languages.Y` → `agents.X` → `agents.X.languages.Y` → the `config` your code
  passes to `croche.agent(id, { config })` (this agent only), so an agent's value beats a
  project language's. `toolGuide` from a later layer replaces the
  earlier one. `crocheTools` merges per key: a later layer changes only the keys it names
  (project `{ wiki: false, schedule: true }` plus agent `{ schedule: false }` gives
  `{ wiki: false, schedule: false }`). Neither has its own size limit; the whole config is
  capped at 256 KiB.
- `modes.<name>` takes only `tools` and `toolGuide`. While a mode is on, each one it sets
  **replaces** the agent's (no merge); what it leaves out stays. `setMode(null)` turns it off,
  and a `setTools` filter still applies on top.

Tool-list changes are announced in the conversation. A changed app guide is
also a tool-description change, applied at the next turn; it does not edit the
system prompt. A changed description can prevent prefix reuse; this is not a
promise about how much the provider will cache.

The agent runs your commands as command lines. If your live check shows the same command
rejected with `invalid_arguments` again and again, fix that command (required arguments,
`enum`, `list`, `aliases`, a clearer summary).

## A store from an older build

An agent store written by an older build with keyed memory is refused before any write:
`croche.agent(id)` rejects with a `CrocheError` whose `code` is `memory_store_too_old`.
`Croche.open` itself succeeds, and other agents open normally. To recover:

```ts
let agent;
try {
  agent = await croche.agent();
} catch (error) {
  if ((error as CrocheError).code !== 'memory_store_too_old') throw error;
  await croche.close();                                         // simplest: delete with nothing open
  await Croche.deleteStore({ ...openOptions, agent: 'default' }); // the default agent's id
  croche = await Croche.open(openOptions);
  agent = await croche.agent();
}
```

This deletes that agent's conversation, memory, user wiki, archive and message log for
that user; other agents and the project record stay. In the Core's words: "This agent's store
was written by an older Croche build whose memory this Core cannot read or convert. Nothing was
changed. To continue, delete this agent's store and reopen; this permanently loses this agent's
conversation and memories for this user. Only an older build that still runs can export them
first." After an app update the older build no longer runs, so tell the person before deleting.
If your app tracks the input ids it sent (pending sends, a retry queue), drop the ones the old
store accepted: their final status never comes. React Native has the same calls.

## Check it

- One short live session is the check: a real command changed app state, a restart restores
  the conversation, and a refused action comes back as a rejection, not a crash. Test your own
  handlers as you would any app code; do not test the Runtime.
- Report failures and costs as they are. Never fake an AI result, and never put a provider,
  development or server key in a bundle, a repository or a log.

That is the whole integration. Stop there unless a measured problem sends you to
[Coding-agent guidance](../skills/croche/references/coding-agent.md) (why each default is what it is) or the
[SDK reference](../skills/croche/references/sdk.md) (streaming, several agents, markers, web backends, mobile).

## CLI

`croche --help` lists everything. The ones an integration usually needs:

```sh
croche projects list
croche keys development list <project-id>
croche keys server list <project-id>
croche attestation get <project-id>
croche projects usage <project-id> --period week
croche debug                                                          # attach the local debugger
```

Full reference: [CLI](../skills/croche/references/cli.md).
