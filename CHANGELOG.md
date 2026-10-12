# Release notes

## 0.5.0 (draft, not released)

0.5.0 is the first release built on the rebuilt Core. Every package and the Core share one
version: `@h1r-ai/croche`, `@h1r-ai/croche-react-native`, `@h1r-ai/croche-cli` and the `croche`
coding-agent plugin. Install the packages from npm: `@h1r-ai/croche`,
`@h1r-ai/croche-react-native` and `@h1r-ai/croche-cli`.

**Upgrading from 0.3.x is a breaking change.** Read [Removed in 0.5.0](#removed-in-050) and
[Stores from an older build](#stores-from-an-older-build) before you upgrade.

### New

- **Projects and agents.** `Croche.open(...)` opens a project; `croche.agent(id)` opens an agent
  declared under `config.agents` (the main agent when no id is given). One project config holds
  every agent, with `languages` and per-agent layers.
- **Instances.** `croche.agent(id, { instance })` is a separate conversation of the same agent
  (a save slot, a document); `{ fresh: true }` creates a new one.
- **Per-agent code override.** `croche.agent(id, { config })` layers a partial config over the
  declared one, in memory only.
- **Streaming conversation API.** `send` (returns a receipt at once), `request` (resolves with
  the answer), `subscribe` (`snapshot`, `input`, `message.start` / `message.delta` /
  `message.end`, `state`), `history`, `cancel` and `clearHistory`.
- **Memory the model owns.** The model saves, replaces and recalls memories with its own
  commands. Your app reads and manages them through `agent.memory`: `list()`, `delete(id)`,
  `clear()`, `export()`, `enabled(on)` and `onChanged(listener)`. Conversation summaries are
  separate from memory and are removed by `clearHistory()` or `Croche.deleteStore()`.
- **Built-in tools you switch per key.** `crocheTools` turns `memory.save`, `memory.recall`,
  `memory.history`, `wiki` and `schedule` on or off at any config layer.
- **Deleting local data.** `Croche.deleteStore({ ...openOptions, agent? })` deletes one agent's
  store, or every declared agent's.
- **React Native has the full project API**, and the release package carries the native Core
  for iOS and Android.
- **Per-user AI allowances** are tied to your app's own user id (`user`), so two accounts on one
  phone keep separate balances.
- **Usage events.** `onUsage` reports one event per paid call, including memory upkeep that
  belongs to no message.
- **The `croche` plugin** for Claude Code and Codex: a skill that walks a coding agent through a
  Croche integration, with the SDK and CLI references.

### Changed

- The packages are renamed: `@croche/runtime` is now `@h1r-ai/croche`,
  `@croche/react-native` is now `@h1r-ai/croche-react-native`, and the CLI is
  `@h1r-ai/croche-cli`.
- The Runtime calls the model directly with a key that Croche Cloud issues per install of your
  app (verified as a genuine install when you configure App Attest or Play Integrity). The 0.2 Cloud relay is gone.
- Croche tunes its own prompt behaviour: temperature, time in context, reply commands, the
  action record and context deltas are no longer app options.
- `reasoning` is now one level: `default`, `off`, `low`, `medium` or `high`. The 0.3 object
  (`{ enabled, effort, maxTokens, exclude }`) is refused with `invalid_configuration`.
- The CLI manages project names, routing and config drafts with your development key, and reads
  usage and metadata. Key issuance and rotation, budgets, access, attestation settings and config
  release move to Croche Studio.

### Removed in 0.5.0

**Config fields.** These are refused at every layer (project, `agents.X`, `languages.Y`,
`agents.X.languages.Y`). Remove them from your config before you open a project:

| Field | What to do instead |
| --- | --- |
| `memory.keys` | Nothing: the model decides what to remember. |
| `memory.commands` | Use `crocheTools` (`memory.save`, `memory.recall`, `memory.history`). |
| `memory.recall` | Nothing is recalled automatically. Use the `crocheTools` switch `"memory.recall"` to give the model its `memory recall` command. |
| `memory.deltas` | Nothing: one memory model. |
| `schedule.commands` | Use the `crocheTools` switch `schedule`. |
| `memoryRecall` | As `memory.recall`. |
| `timeContext` | Nothing: the Core adds the time itself. Do not add a time channel. |
| `defaultLanguage` below the project root | Set it only at the project root. |

Most are refused by name. `memory.deltas` and a nested `defaultLanguage` are refused as unknown
fields.

**Command fields.**

| Field | What to do instead |
| --- | --- |
| `confirm` on a command | Remove it: approval belongs to the app. Ask the person in your own UI, or check in your handler, before the action runs. 0.5.0 refuses the whole tool declaration with `Unknown command field: confirm`. |

**API.**

- Apps can no longer write keyed memory facts. The app can list, export, delete and clear
  memories; only the model writes them.
- Automatic recall: the model reads only what it asks for.
- Account labels. Pass your app's `user` instead.
- These runtime options, now Croche's own and refused: `replyWithCommands`, `actionRecord`,
  `contextDeltas`, `temperature` and `timeContext`.
- The CLI commands for keys, budgets, access, attestation, runtime blocking, and config release
  and rollback (now in Studio).

### Stores from an older build

A store written by 0.3.x (keyed memory) is refused before anything is written:
`croche.agent(id)` rejects with `memory_store_too_old`. `Croche.open` itself succeeds, and other
agents open normally. The Core cannot read or convert that memory. To continue, delete that
agent's store with `Croche.deleteStore({ ...openOptions, agent })` and reopen. This permanently
deletes that agent's conversation and memories for that user, so tell the person first. The
[skill](plugins/croche/skills/croche/SKILL.md) has the recovery code.

### Known limits

- Native Swift and Kotlin SDKs are not in 0.5.0; they are planned for 0.5.1, with the same
  `Croche.open` API.
