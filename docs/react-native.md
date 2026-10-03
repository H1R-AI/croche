# @croche/react-native

Put an AI character or assistant into a React Native app, on iOS and Android, with **no
backend of your own**. You write instructions and JavaScript tools. Croche runs the
model and tool loop, streams replies, remembers across sessions, keeps per-user
allowances, and calls the model provider directly with a key that Croche Cloud gives only
to a genuine install of your app.

The shared Rust Core makes every decision. On iOS it runs through the Swift SDK
(`sdk/swift`) and on Android through the Kotlin SDK (`sdk/kotlin`). This package is a thin
bridge, and its API has the same shape as `@croche/runtime` on the web.

> Status (2026-09-27): the JS layer is tested against the real Core and the real Cloud.
> The native bridges are written and type-checked but have **not yet been compiled in an
> app**. The first builds happen on the Mac; report every build error as an issue.

## Requirements

- React Native 0.76 or later with the New Architecture (TurboModules). iOS 15.1+,
  Android API 26+.
- The Rust toolchain on the build machine (the Core is built from source until packages
  are published): `rustup`, the iOS and Android targets, `cargo-ndk`, Xcode, Android
  Studio with an NDK. Exact commands: `docs/MAC-HANDOFF.md`.

## Install (from the repository, until npm publishing)

```sh
# 1. Build the Rust Core into this package (again after any change under crates/ or sdk/)
packages/react-native/scripts/vendor-native.sh all      # or: ios | android

# 2. In your app
npm install /path/to/croche-runtime/packages/react-native
cd ios && pod install
```

In a monorepo, point Metro at the package (`watchFolders`) so it resolves `src/index.ts`.

## Development keys, simulators and devices

An install receives a model key only after it proves it runs your app:
- **Real iPhones and Android phones** prove it with App Attest / Play Integrity. The SDK
  does this automatically. Their usage is billed to the project's Runtime Credit.
- **Simulators and emulators cannot.** Issue a **development key** (`cdt_…`) in Croche
  Studio → Development keys and pass it as `debugToken`. Development usage is billed to your
  weekly development allowance, never to Runtime Credit.

A phone with a development key still attests first; the key is only the fallback. A
release build that carries a `debugToken` logs a loud warning: never ship one.

## First conversation

```tsx
import { CrocheRuntime, type RuntimeEvent } from '@croche/react-native';

const runtime = await CrocheRuntime.create({
  cloudUrl: 'https://your-croche-cloud.example',   // local: see "Local Cloud" below
  projectKey: 'pk_…',                               // public; safe to ship
  debugToken: __DEV__ ? 'cdt_…' : undefined,        // simulators and emulators only
  instructions: 'You are Mara, the innkeeper of the Lantern Inn. Answer in one or two sentences.',
  markerGuide: ':smile: warm; :wink: playful',
});

let shown = '';
const result = await runtime.send(
  { id: `msg-${Date.now()}`, text: 'Hello!' },
  { onEvent: (event: RuntimeEvent) => {
      if (event.type === 'text.delta') setText(shown += event.text);   // streams as the model writes
      if (event.type === 'marker') playAnimation(event.name);         // :smile: never appears as text
  } },
);
setText(result.text);   // authoritative: replace what you streamed
if (result.status !== 'completed') showError(result.error?.code, result.error?.message);
```

Open one Runtime per character when the app starts, and close it when the app no longer
needs it (`await runtime.close()`). Reopening with the same options restores the session,
history and memory.

## Tools: let the character act

The model sees one function and calls your commands through it. The Core validates every
argument against your declaration before your code runs, and feeds rejections back to the
model so it can correct itself.

```ts
const runtime = await CrocheRuntime.create({
  // ...
  tools: [{
    name: 'inventory',
    summary: "The player's inventory",
    commands: [
      { key: 'inventory_give', name: 'give', summary: 'Give the player an item',
        positionals: [{ name: 'item', type: 'string', required: true, enum: ['ale', 'bread', 'key'] }] },
      { key: 'inventory_list', name: 'list', summary: 'List what the player carries' },
    ],
    async execute(invocation, context) {
      if (context.signal.aborted) return { status: 'cancelled' };
      if (invocation.key === 'inventory_give') return game.give(invocation.args.item);
      return { items: game.items() };
    },
  }],
});
```

- Return what actually happened, as JSON. Return `{ status: 'rejected', reason }` for an
  outcome the model can correct; **throw** only when the effect's state is unknown (that
  ends the turn and is never retried automatically).
- `context` carries `callId`, `turnId`, `messageId`, `userId`, `agentId`, `accountLabel`
  and an abort `signal`.
- Tool results are data, never instructions to the model.

## Several characters, or several roles

Give each one an `agentId`. Each gets its own store, history and memory, and they can
stream at the same time. Every one of them shares the installation's user and allowance.

```ts
const mara = await CrocheRuntime.create({ ...common, agentId: 'mara', instructions: maraPersona });
const pip  = await CrocheRuntime.create({ ...common, agentId: 'pip',  instructions: pipPersona });
await Promise.all([mara.send({ id: 'a1', text: 'Hi' }), pip.send({ id: 'b1', text: 'Hi' })]);
```

For roles inside one app (a planner and a critic), the app routes: pass one agent's
result to another as an app event, `send({ id, text, kind: 'event' })`, or as trusted
`context`.

## App events and trusted context

- `send({ id, text, kind: 'event' })` is a turn your app starts ("night fell", "the quest
  is complete"). It costs a model call like any turn.
- `send({ id, text, context: { screen: 'cart', items: 3 } })` gives the model the current
  app state for this turn only. It is trusted and never replayed as history.

## Users and money

- Croche issues the user, one per app installation, with no login. `status().userId` is
  that id.
- `accountLabel` is your own name for whoever is signed in. It is attribution and a
  separate local store. It never selects credit.
- Each user has an allowance, held in Cloud. Your app can raise or set it within the
  ceilings you configure in Studio (turn on app-controlled allowances for the project:
  `host_budget_control_enabled`, with a maximum per adjustment and per user; otherwise
  `userBudget.add` fails with `host_budget_disabled`), for example after an in-app purchase:
  `await runtime.userBudget.add({ amount: 0.5, id: purchaseId })`. The `id` makes a retry
  safe: Cloud applies each id once. `runtime.userBudget.get()` shows the balance.
- `runtime.history()` and `runtime.memory()` show the conversation and what the character
  remembers; `runtime.clearHistory()` starts over (money and identity stay).
- When the allowance is spent, `send` returns `allowance_exhausted` before any model
  call. Show it; don't retry.

## Background upkeep and outages

The Runtime delivers its call reports and syncs balances, policy and the model key in the
background: after each turn and every minute (`backgroundSync`, default `true`;
`maintenanceIntervalMs`). A turn never waits for it. Call it when the app returns to the
foreground:

```ts
AppState.addEventListener('change', state => { if (state === 'active') void runtime.maintain(); });
```

If Croche Cloud is down, turns keep working on the key the install holds; reports wait in
the outbox. Only a first registration and allowance changes need Cloud.

## Cancel, retry, restart

- `runtime.cancel()` stops the current turn. What was already shown stays in
  `result.text`, and the status is `cancelled`.
- Retrying `send` with the **same** `id` and the same content returns the saved result
  without calling the model again. For a new attempt, use a new `id`.
- If the app is killed during a turn, reopening returns `interrupted` for it. Tools are
  never re-run on reopen, and a call that was in flight is charged a conservative estimate.

## Errors you will see

`result.error.code` on a failed turn (or the thrown `CrocheError.code` from `create`):

| Code | Meaning | What the app does |
| --- | --- | --- |
| `allowance_exhausted` | This user's AI allowance is spent | Offer a top-up (`userBudget.add`) or wait |
| `project_budget_exhausted` | The project's money is spent | Tell the user; the developer raises the budget in Studio |
| `account_credit_exhausted` | The developer's Runtime Credit is spent | Tell the user; the developer tops up Runtime Credit |
| `development_allowance_exhausted` | The weekly development allowance is used up (development keys) | Wait for Monday (UTC) or top up in Studio |
| `installation_unverified` | This install proved nothing: no attestation and no `debugToken` | On a simulator, set `debugToken` |
| `debug_token_invalid` / `debug_token_revoked` | The development key is wrong or revoked | Issue a new one in Studio |
| `attestation_unavailable` / `attestation_failed` | The platform could not attest (e.g. a simulator without a `debugToken`) | Use a real device, or set `debugToken` in development |
| `attestation_rejected` (registration) | Cloud checked the attestation against the project's settings and it failed | Check the Team ID and bundle id, or the package, signing certificate and Play keys, in Studio |
| `attestation_required` / `attestation_unverifiable` (registration) | The project requires attestation, and none was sent, or the project has no settings for this platform | Send an attestation from a real device, or add the platform's settings in Studio |
| `gateway_unavailable` | No model key yet (first registration still pending) | Retry when online |
| `gateway_key_exhausted` | The model key hit its limit and no new one came back | Retry later |
| `provider_rate_limited`, `provider_error`, `provider_rejected`, `provider_credit_unavailable` | The model provider refused or failed | Retry later; report persistent ones |
| `network_error`, `request_timeout` | The request did not complete | Retry with a new `id` |
| `cancelled`, `interrupted` | Stopped by the app, or by the process ending | Nothing, or offer to continue |
| `output_limit`, `context_limit`, `iteration_limit` | A bound was reached | Shorten, or continue in a new turn |
| `store_busy` | This store is already open (two Runtimes for one agent) | Open each agent once |
| `host_budget_disabled` (from `userBudget.add/set`) | App-controlled allowances are off for the project | Turn them on in Studio |

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `cloudUrl`, `projectKey`, `instructions` | required | Where Cloud is, your public project key, the character |
| `debugToken` | none | Development key for simulators and emulators |
| `agentId` | none | Which character this is, when there are several |
| `accountLabel` | none | Your name for the signed-in person (attribution only) |
| `tools`, `markerGuide` | none | Commands the character can use; what your markers mean |
| `memory` | on | `{ enabled, maxCharacters, policy }`: long-term memory by compaction |
| `streaming` | `true` | Stream replies as `text.delta` |
| `backgroundSync`, `maintenanceIntervalMs` | `true`, 60000 | Background upkeep |
| `maxIterations`, `maxOutputTokens`, `maxContextCharacters`, `requestTimeoutMs` | 8, 2048, 48000, 90000 | Bounds |
| `attestation` | `"platform"` | `"off"` never attests (then only a `debugToken` admits the install) |
| `android.cloudProjectNumber` | none | The Google Cloud project linked to the app in Play Console (Play Integrity) |
| `storageKey` | derived | Override the local store name |

The model is not an option: the project's main and fallback models are configured in
Croche Cloud.
