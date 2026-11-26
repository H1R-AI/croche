<!-- Generated Croche skill content. -->

# Croche App API

The public App API for every SDK. TS is the reference; Swift, Kotlin and RN have the same shape in native syntax.
The `@h1r-ai/croche` JavaScript package supports Node.js 22.13 or later and workerd only; browsers, Edge and Deno are not supported hosts. React Native uses its separate native package.

**One rule:** every value the app gives below is passed to Core UNCHANGED as JSON. Core (Rust, serde) validates it; the SDK decides nothing.

## The contract

Use the [generated TypeScript reference](https://docs.croche.ai/reference/) for signatures and types. The SDK's own declarations match the installed package. The rules below apply across bindings.

### Values, tools and wiki

- JSON integers must fit within ±(2^53−1). Pass larger IDs as strings. An undefined value inside config, scope or a bind is refused with `invalid_configuration`; it is never silently dropped.
- `defineTool` passes the manifest to Core for validation. Manifest version is 1. Command keys are unique across registered tools. Command routes match `[A-Za-z0-9_-]{1,80}`; routes and aliases are unique within a tool, and at most one command can omit the route and act as the default. Argument names are unique within a command. Opening with an invalid manifest fails with `invalid_tool` and a path.
- The handler receives bound arguments and a call ID matching the agent tool event. It can use `causedBy` to identify the input IDs it serves. Its attachment reader returns a base64 original from the calling instance; a missing attachment is `unknown_id`. Attachment arguments are resolved within that instance before dispatch and cannot be bound.
- On TypeScript and React Native, use `toolResult()` to return a branded result. A plain object is JSON even if it has `json` or `content` keys. Swift uses the tagged `.content` and `.json` cases. Null, undefined and nil are empty results. A `ToolError` message is passed through to the model. Other exceptions give the model fixed `tool_failed` text while the app can see the details.
- Cancel, agent close and runtime teardown signal the handler. A cancelled handler is a cancelled call. Core enforces the configured timeout; SDK teardown fails pending handlers with `tool_unavailable`.
- Tool result images can use base64 bytes or a native file URI. The native host reads file URIs without passing image bytes through JavaScript. Use `attach: true` to retain an original on the final message; omit it for model-only input. Any other explicit value is `invalid_tool_result`. A fitting original can be stored without an image codec.
- Built-in paid tools such as web search are available as `tools.webSearch` in TypeScript and RN and `CrocheTools.webSearch` in Swift and Kotlin. Registration makes the tool available to agents whose scope is all registered tools. Wiki access follows the wiki scope. Tool and wiki scope can be changed for the next turn; reset restores the scope supplied to `agent()`.
- Scope recognizes stable command keys. Unknown tool names, unknown bound arguments, and bind values outside the argument's type or enum give `invalid_configuration`. An agent bind replaces the whole registration bind when present. Tool guidance is ordered manifest, agent config, then tool entry. Wiki guidance is ordered document description, agent config, then every matching scope entry in list order.
- Wiki paths are unique. Each loaded document can contain up to `wikiDocumentMaxBytes` of Markdown (default 64 KiB). A larger document is refused, so split it in your app before registration. The whole wiki is held in memory, never saved: inline bodies, plus file bodies once read. It holds up to `wikiMaxBytes` (default 8 MiB, at most 1 GiB), counting each document's markdown, path and description bytes. Both are `Croche.open` options; `wikiDocumentMaxBytes` is at most `wikiMaxBytes`. The number of documents is not limited. File-backed content is read on demand. Supply the wiki again on each open; mutations are in memory until close and are visible to open agents with matching scope.

### Lists

- `listAttachments` (on Croche and on an agent), `memory.list` and `wiki.list` take `{limit?, cursor?}` and return `{items, cursor?}`. They page as `StateStore.list` does, with the same 128-item bound and an opaque cursor, under their own field names: `items` and `cursor` here, `entries` and `nextCursor` on a store page. A page holds at most 128 items. An omitted `limit` is 128 and a larger one is cut to 128; `limit` must be a positive integer.
- The order is stable: attachments newest first, memory facts by fact id, wiki documents by path. The list is exhausted when the reply has no `cursor`.
- Pass a reply's `cursor` back to the same list on the same owner (the same Croche, or the same agent instance) to continue strictly past that page. An item added or removed between two pages neither repeats nor hides another item.
- A cursor is opaque. A malformed cursor, or one from a different kind of list (attachments, memory, wiki), is refused with `invalid_input`. A cursor is a position, not a capability: Core does not detect an attachment cursor taken from another owner's attachment list, and the reply still holds only the caller's own attachments.
- History positions (`history({before})` and an event's `seq`) are safe non-negative integers. Swift and Kotlin take them as integers.

### Opening, closing and deleting

- In `Croche.open`, `projectKey` identifies the Croche Cloud project. Use a `serverKey` on a trusted backend and a `developmentKey` for customer development. The host also controls the two [History budgets](#history-archive-policy).
- On Node and Workers, a normal open without a `serverKey` or `developmentKey` returns `invalid_configuration` at open. Deletion-only recovery can open without either key.
- A Croche represents one authenticated user. Within one process, opens for the same project and user share a Core session. The last close releases it. Close stops new work and bounded final delivery can continue.
- Open a configured agent with `croche.agent(id)`. Keep the IDs for an agent picker in the app.
- A named instance has its own conversation and memory. Pass its app config again when opening it. Reopening a live instance with the same config or no config returns a handle; changing the config of a live instance is `invalid_configuration`. The default instance takes no app config. An open contending with identity creation can wait about a second before returning `store_busy`. Other same-user admission can also briefly wait. If deletion holds the user when admission reaches it, open gives `store_busy`.
- The bundle provides the base config and Croche Cloud can patch it. An omitted language uses the device locale or the bundle's default on a server. Server keys are for servers. An Android release build refuses a development key.
- A normal `deleteData()` with `agent` deletes all instances of that agent. Pass both `agent` and `instance` for one instance. An instance without an agent is `invalid_configuration`. Omit the scope or pass `{}` to erase the user's declared stores, background enrolment, all registered instances and Croche-owned tool runtime attachments. The installation, other users and undeclared legacy main stores stay. A user-wide delete sends the user's unsent usage reports to Croche Cloud before it resolves, so usage stays billable after the user is gone. This send never makes the delete fail: it stops at the first report Croche Cloud does not accept, or after about 10 seconds. Reports still unsent afterwards are kept, together with the allowance debits Croche Cloud has not yet acknowledged, the user's allowance count for the day and the app's limit, so deletion never makes reported usage unbillable or resets the user's allowance. These rows hold billing facts only, no conversation or app content, and stay until Croche Cloud accepts them or refuses them for good (for example, a revoked runtime or a non-retryable rejection); a later background delivery in the same app can still send them.
- Deletion closes in-scope agents across this user's open handles. A conflicting open, delivery or held store can refuse with `store_busy` before any deletion. If erasure fails partway, enrolment stays until retry completes. Deletion is idempotent. The Croche stays open for fresh work; calling deletion on a closed handle gives `closed`.
- Use the recovery open with `recover: 'delete'` for `store_too_new`, `corrupt_store`, `store_full` or `store_refused`. It avoids decoding the project record, registering credentials, enrolling background work or registering tools. Only `deleteData()`, `deleteData({})` and `close()` are available; other calls give `invalid_request`.
- Recovery deletion discovers stores by user prefix. It refuses with `store_busy` before erasure if an open, delivery or factory is in flight in the process. It can erase the stores it acquires and return `store_busy` for a store held by another process; retry finishes. It removes background enrolment, closes in-scope agents and leaves unparseable project entries alone. An unusable store identity can give `corrupt_store`.
- Both paths delete the user's local content from the SDK's stores. Local SQLite deletion may leave bytes in unused pages. Croche Cloud records have their own lifecycle.

### Background delivery, allowance and debugging

- Register background work at app launch, before the iOS launch callback returns or from Android's `Application.onCreate`. The OS task identifier is `ai.croche.background`. Open enrols the user and config; user-wide deletion removes enrolment. Recorded background events are durable and delivered at least once to the next live sink. A background event's `at` is an ISO 8601 timestamp.
- `wakeTimes` opens no project and omits owners with no scheduled wake. Its wake times, bounds and cursor are in epoch milliseconds. The `after` bound is inclusive; pass `next` as `after`. `deliverDue` opens due instances one at a time for reporting and config delivery. It starts no model turn or app tool and defers work it cannot finish by the deadline.
- `croche.allowance.set(limit)` sets this user's allowance: the most credits the runtime lets this user spend per UTC day; the count resets at 00:00 UTC. One credit equals one USD. `limit` is an absolute value of 0 or more, with at most nine decimal places; a negative or non-finite value is refused with `invalid_input`. It replaces the earlier value and does not add to it. `null` returns the user to Studio's default. Croche stores the value for this user, so it survives close and reopen. The runtime counts this user's spending in its own storage; Croche Cloud keeps no per-user ledger, so a user with two installations has the limit on each. The runtime enforces the smaller of this value and Studio's maximum, so a value above the maximum is kept and capped, not refused, and a later higher maximum applies it in full. When Studio's switch does not let the app set the value, the call is refused with `user_allowance_disabled`; Studio's default then limits every user, and a value stored earlier is not used. Swift and Kotlin take the same value, with `nil`/`null` for the default.
- A debugger attaches over loopback, including forwarded USB loopback, or LAN with a development key. iOS and Android require a debuggable app. Last Croche close detaches it; closing an agent updates the debugger's agent list.
- `croche.verification()` tells the app how Croche Cloud verified this installation, so it can show that state or explain a withheld key. It is read-only and returns `{ status, lastAttestation }`. `status` is `attested` (an App Attest or Play Integrity proof), `server` (a server key), `development` (a development key), `unverified` (no accepted proof) or `unknown` (not registered yet, or Cloud did not say). It follows each check-in. Verification is not access: an attested installation still reads `attested` when its key is withheld for credit or budget, and an unverified one reads `unverified` when a project that requires attested apps withholds its key. `lastAttestation` is the code from the last attestor attempt that gave no usable proof (`attestation_unavailable`, `attestation_unsupported`, `attestation_failed`, `attestation_timeout` or `attestation_unusable`). `null` means no device-side failure was recorded. It does not mean Cloud accepted a proof; read `status` for that. Swift and Kotlin return a `Verification` with the same strings.

### App tools outside conversations

`croche.runTool(name, args, {id})` takes a required ID. Croche keeps only the last call per instance. The same ID and arguments as the last call return its result without buying again; other arguments under that ID give `idempotency_conflict`. Any earlier ID is a new call and is bought again. If the process stopped while a call was running, that ID returns `lost` (`outcome_unknown`) without buying again. The registry must open the command to the app or the call fails with `tool_unauthorized`; no agent tool registration is needed. After handoff, aborting detaches the caller while Core continues receiving, settling and storing the result. Swift and Kotlin take the ID directly as a method argument.

The `runTool()` result type is listed here.

```ts
export type RunToolResult =
  | { id: string; status: 'ok'; output: Json; attachments: Attachment[]; cost: number | null; costStatus: 'reported' | 'unknown' | 'none' | (string & {}) }
  | { id: string; status: 'failed'; code: string; category: ErrorCategory; message: string; cost: number | null; costStatus: 'reported' | 'unknown' | 'none' | (string & {}) }
  | { id: string; status: 'lost'; code: 'outcome_unknown'; category: 'closed'; message: string }
  | { id: string; status: 'unknown'; originalStatus: string; fields: Json }
```

### Sending, observing and retaining inputs

- `send` resolves on acceptance. An abort before acceptance queues nothing. After a Swift or Kotlin send is accepted, cancelling the waiting task or coroutine stops that wait with `aborted`; use `cancel(id)` to cancel the input. Explicit cancel can cross handles and resolves once recorded durably. With no unfinished input by that id, `cancel(id)` resolves and does nothing, for a finished id and a never-seen id alike.
- Croche keeps only the last accepted input ID per instance. Inputs are accepted in the order the sends were made: a send made while an earlier one is still starting is accepted after it. Sending an unfinished input's ID or the last accepted ID again with the same content joins it while it is unfinished and, once it has finished, returns its result with no new turn; if its events were already pruned, that result has no messages and `gap: true`. The same ID with other content gives `idempotency_conflict`. Any earlier finished ID is a new input.
- `request` rejects before acceptance with `CrocheError`. After acceptance it waits for a terminal result, or for idle as well with `wait: 'idle'`. An accepted failure carries its reason in `result.error` and may have no messages. Failed input events always carry an error. Retained failures with no recorded reason use `failure_unrecorded`; queued, seen, answered, no-reply and cancelled inputs do not carry an error.
- After reopen, a send held when the app stopped is terminal and emits `input.dropped` with reason `reopened`. Re-send the input with a new ID.
- After reopen, an accepted input whose request was cut short is terminal: `status: 'failed'` with `error.code: 'interrupted'`. While it is still the last accepted input, resending the same ID and content returns that terminal result without starting another turn. To make a new attempt, use a new ID.
- Assistant text strips channel delimiter tokens outside fenced code, including an unmatched closing tag. Fence literal examples to preserve them. Structured output is unchanged.
- Subscription events run serially, on the UI thread where the SDK provides one. On JavaScript and RN, an async handler's next event waits for its promise. A throw or rejection ends that subscription with `handler_failed`; accepted work continues. A second subscription replaces the first.
- Initial replay defaults to 50 messages. Replay and older pages include both sides of the conversation. Render user text from input events with `kind: 'user'` and final agent text from `message.end`. Resume with the log ID and last sequence, or use `subscription.history()` to receive a `page` on the same callback. Core batches React Native text deltas at 50 ms and delivers them immediately on other hosts. Swift's subscription type is nested under `CrocheAgent`.
- History retention is bounded by bytes. An input can fail with `store_full` if the instance cannot fit the new work within its byte budget. `clearHistory()` publishes `cleared`; empty the displayed conversation. It takes no options (see [History archive policy](#history-archive-policy)).
- Memory deletion, clearing and enabling resolve once recorded durably. During a turn they apply at its end, including edits from a tool in that turn. The tool need not wait for the turn to finish. `list()` reflects the result as soon as the edit resolves; a memory event marks when it took effect.

### Attachment ownership

- Croche app holds belong to the project and user. Agent attachments belong to a single instance. Deleting an agent leaves Croche app holds in place; deleting the instance erases its own blobs. Attachment reads return the base64 original or give `unknown_id`. Listings return app holds, newest first.
- Releasing an instance app hold leaves message holds. Deleting an attachment removes all holds and succeeds when it is already absent. History clear releases message holds. Old message-only originals can be evicted; the current turn's originals stay. Past attachment rows show deletion status at read time while the durable log stays unchanged. Copy out content the app must retain.
- Attachment copy reads from the live source owner within the same Croche and user. It creates no turn or usage charge.
- Store image media types only. Saved originals are verified and metadata-stripped. Generated originals are stored without resizing and have no pixel-side cap at rest. Decode refuses headers above 50 million pixels. Model renditions count toward the conversation budget and obey the model's limits.

### Failed requests

A retained-turn-cap failure can resolve with `status: 'failed'`, `error.code: 'store_full'`
and an empty `messages` array. Read `result.error` first for the code and guidance.
Reply errors describe individual replies.

```ts
const result = await agent.request(input);
if (result.status === 'failed' && result.error?.code === 'store_full') {
  showError(result.error.message);
}
```

## Attachment storage limits

The schema-7 bundle may set `project.attachments` with `maxFileBytes`, `maxTotalBytes`, `maxTurnBytes` and `maxAppHoldBytes`. This is one project policy used by every instance store and this user's Croche-owned store; it is not an agent override. Exact-base Cloud patches may set or unset the individual `/project/attachments/<field>` paths. A selected policy takes effect when Croche is next opened; it does not mutate a live owner's limits.

Each supplied value is a positive integer byte count. Unknown keys are refused with `invalid_configuration`. `maxFileBytes` is at most 16 MiB; each other field is at most 1 GiB. These fixed Core load ceilings may only increase. Omitted limits use the storage defaults: 16 MiB per file, 128 MiB per owner, 48 MiB per turn, and 64 MiB of app holds per instance (128 MiB for a Croche owner). Storage limits never refuse open/apply based on a model reader limit or a missing image PAL. Limits constrain new writes and capacity reservations; lowering a limit never deletes existing files or prevents their read, listing, release or explicit deletion. At model view time, actual images are checked against that model's documented limits; an unknown limit adds no Croche reader cap. Without a PAL, fitting originals are sent unchanged after privacy stripping; a PAL may derive a smaller view. A failed or oversized view keeps its id and description, reports the existing typed error in `turn.viewErrors`, and does not fail the turn or delete the original. A documented request-body cap keeps the newest fitting images and the older id+alt text. Fresh app image intake retains 3 MiB per image and 6 MiB together; fitting inputs need no codec, and above-budget inputs need successful shrinking. These intake budgets do not cap generated-image views.

## Input and scheduling limits

`Croche.open({limits: {userTextChars, appStateChars, toolResultChars, turnImages, pendingSchedules}})` sets app-wide guards for every agent and instance. Limits are guards against abnormal usage, so they are code-owned: a Cloud-delivered bundle or patch cannot raise them, and a bundle that carries `limits` is refused with `invalid_configuration`. Each field is optional. An omitted field uses Core's default. An unknown key or an out-of-range value is `invalid_configuration` at open, before any effect.

| Field | Default | Range |
|---|---|---|
| `userTextChars` | 32,000 | 1,000–200,000 UTF-16 units: total user and app-event text of one send |
| `appStateChars` | 32,000 | 1,000–200,000: total app-state text of one send |
| `toolResultChars` | 200,000 | 1,000–1,000,000: one tool result's value as compact JSON |
| `turnImages` | 4 | 1–16: images in one message or tool result. The per-image size, the 6 MiB per-turn image total and one model request's image bytes stay fixed. |
| `pendingSchedules` | 20 | 1–20: schedule notes waiting at once. Over it, a new note fails with `schedule_full`. |

Text over its limit is refused with `input_too_large` and never truncated.

## Events (`subscribe`)

`turn.cost` is in credits. A reported value is final for that turn. A model or summary call without an observed provider cost can report `unknown` with a null cost, including after cancellation, preemption or interruption. An `estimated` cost, when present, is provisional. The status `none` carries a zero cost. Later balance reconciliation does not rewrite the History event. The optional `provider` label is diagnostic and does not affect routing or billing.

Tool events represent agent calls. Each agent tool call uses the same Core-assigned `turnId:iteration:n` in `ToolEvent.id`, `ToolContext.callId`, and attachment `callId`. Here `n` is the zero-based index in the model response. Updates keep that ID and the first sequence. Core keeps provider IDs in the model messages stored with History. Model memory calls stay private. Ignore or log unknown event types.

| `type` | When |
|---|---|
| `input` | An input was accepted or changed status. App events are `input` with `kind: 'app_event'`. |
| `message.start` / `message.delta` / `message.end` | The agent's reply: its start, its text as it is written (always, because Core always streams), and the END of the reply with its `status`. `message.end.inReplyTo` lists the inputs the reply answers. Text written before a `reads: true` command ("I'll look that up.") is a preface: it ends `completed` with `inReplyTo: []`, and its input is answered by the reply after the read, or ends `no_reply`, `failed` or `cancelled` with the turn. `message.end.markers` lists the registered markers (agent config `markers: {name: description}`) in reply order; `message.end.raw` is always present: the reply before marker removal, equal to `text` when markers did not change it. A stored reply counts `raw` with `text` against the 256 KiB message cap, so a long marker reply has about half the room. Marker registry bounds: at most 32 names, each name 1-32 characters (ASCII letters, digits, `_`, `-`), each description 1-500 characters; `markerGuide` is refused. There is no `turn.completed`. |
| `turn` | One model call was recorded: usage, cost, model and `causedBy`. `purpose: 'summary'` marks a context summary. |
| `state` | `idle` / `running` / `waiting`, the queue length, typing, and the current activity. |
| `snapshot` | The current log id, state and the message being streamed (first on attach). |
| `page` | An older page of messages, after `subscription.history()`. |
| `cleared` | Full `clearHistory()` took effect. Empty the list. |
| `gap` | Events were missed (`afterSeq`..`throughSeq`): redraw from a `page`. |
| `error` / `replaced` | The subscription ended. |

`text.delta` is the legacy runtime and debugger event. It is not an app event.

## Error codes (`CrocheError.code`, with `category`)

`retryAfter` is an integer number of seconds, present only on the hourly app-paid-unit `rate_limited` refusal. It is carried by `CrocheError` for `runTool` and by `EventError` in the terminal `RequestResult` for an accepted send. Send receipts remain immediate; terminal handling follows the existing paused-category path (including budget refusal).
Codes come from Core, the SDK and the Cloud codes Core forwards verbatim.
- **Category:** what the app does about it.
- **Money refusals:** Core refreshes the balances before any money refusal, so retrying after a top-up works.
- **Same everywhere:** Swift, Kotlin and RN surface the same codes.
- **New codes are safe:** Core attaches the category to every code, and a code outside this table is `internal`. An app switches on `category` and may special-case a `code`.

| Category | What the app does | Codes |
|---|---|---|
| `offline` | Retry later; the input is kept | `offline`, `network_error`, `request_timeout`, `gateway_unavailable`, `invalid_cloud_response`, `stale_control`, `http_<status>` (a Cloud error without a valid code) |
| `allowance` | Tell the user that credit or allowance ran out; retry after a top-up | `account_credit_exhausted`, `project_budget_exhausted`, `user_allowance_exhausted`, `development_allowance_exhausted`, `unverified_allowance_exhausted`, `gateway_key_exhausted`, `provider_credit_unavailable` |
| `paused` | Usage is stopped by the project, an account or a rate limit; wait or contact | `usage_paused`, `runtime_blocked`, `project_access_disabled`, `account_disabled`, `server_key_revoked`, `development_key_revoked`, `rate_limited`, `provider_rate_limited`, `development_device_limit` (HTTP 409) |
| `setup` | A developer fix: key, config, model or device identity | `invalid_configuration`, `model_missing`, `model_withdrawn`, `model_unavailable`, `project_key_unknown`, `server_key_invalid`, `development_key_invalid`, `user_required`, `user_allowance_disabled`, `gateway_key_rejected`, `gateway_unsupported`, `schema_unsupported`, `capability_unsupported`, `kind_unsupported`, `invalid_snapshot`, `snapshot_mismatch`, `invalid_tool`, `invalid_wiki`, `installation_unverified`, `attestation_required`, `attestation_rejected`, `attestation_unverifiable`, `attestation_failed`, `attestation_unavailable`, `attestation_unsupported`, `attestation_timeout`, `recovery_required`, `host_unavailable`, `core_unavailable` |
| `closed` | The work stopped; nothing to fix | `closed`, `target_closed`, `runtime_detached`, `cancelled`, `interrupted`, `preempted`, `aborted` (the wait stopped; the input continues), `observation_lost`, `store_busy`, `instance_busy` |
| `invalid` | The app's request cannot run as given | `invalid_input`, `input_too_large`, `invalid_memory`, `invalid_response_format`, `invalid_request`, `tool_unauthorized`, `agent_conflict`, `attachment_storage_full`, `unknown_id`, `idempotency_conflict`, `identity_conflict`, `busy`, `queue_full`, `cursor_reset`, `context_limit`, `output_limit`, `iteration_limit`, `structured_output_unsupported` |
| `internal` | Report it; the turn failed for a reason outside the app | `asset_read_failed`, `stream_incomplete` (distinct from `provider_error`), `provider_error`, `provider_rejected`, `invalid_provider_response`, `invalid_response`, `output_too_large`, `output_invalid`, `empty_response`, `unexpected_tool_call`, `storage_error`, `store_refused`, `store_full`, `corrupt_store`, `store_too_new`, `fresh_reservation_lost`, `archive_unavailable`, `archive_error`, `host_error`, `host_unresponsive`, `thread_unavailable`, `core_error`, `invalid_abi`, `no_lock`, `handler_failed`, `subscriber_overflow` |

**Coordinated state conflicts (reserved; not emitted until coordinated state publication is available).**
`state_conflict` (category `closed`) means state changed elsewhere and this instance stopped: **the pending step did not run; open again to continue; it is safe to redo the step.** Core selects it only when no paid call, app tool handler, or other side-effecting dispatch began in the whole pending operation. If any such dispatch began, or Core cannot establish that it did not, the error is `outcome_unknown` (category `closed`): **do not assume it did not happen**, and do not blindly redo it. Reopening is not a retry of that operation. SDKs pass these errors through; they do not retry, reopen, merge, or resubmit automatically. Storage I/O failures remain `storage_error`; an owned store remains `store_busy` or `instance_busy`, as before.

**Tool failures** are seen on tool events and results, not thrown:
- `tool_failed`, `tool_unavailable`, `no_slot`, `invalid_tool_result`, `tool_timeout`, `tool_limit`, `tool_model_not_allowed`, `invalid_tool_input`, `tool_reference_unavailable`, `tool_privacy_policy_unavailable`;
- a `ToolError`'s own code passes through when it is `[a-z0-9_]{1,80}`.

**Not app errors:**
- **What the model sees as a tool result:** `invalid_arguments`, `not_found`, `read_limit`, `not_run`.
- **Debug and telemetry:** `telemetry_rejected`, `currency_unsupported`, `tool_models_invalid`, `invalid_acknowledgement`, `control_error`, `runtime_error`.
- **Memory-compaction outcomes:** `collapsed`, `unusable_memory`, `empty_memory`.
- **Cloud codes only other Cloud clients see.**

## Decision agents

Call `agent.decide(input)` on Node, the serverless runtime on Workers, React Native,
Swift or Kotlin. Pass an `AbortSignal` in TypeScript. Swift and Kotlin use task
and coroutine cancellation, respectively. Select a named or inline question with
`DecisionQuestionRef.named` or `.inline` in Swift, and `Named` or `Inline` in Kotlin.

The generated reference describes `DecideInput`, `DecisionResult`, `DecisionQuestion`, `DecisionAnswer` and `DecisionConfidence`.

A decision agent evaluates the supplied state without retaining a conversation or answers. Croche Cloud supplies decision model availability. The first call from a fresh store can perform registration. The SDK checks model compatibility before dispatch.

Configure it in `bundledConfig.agents` with `"type": "decision"`:

```jsonc
"judge": {
  "type": "decision",                     // omitted or "chat" = a chat agent; no layer can patch type
  "model": "typesafe/jev-1.13",           // must be a decision model; tunable in Croche Cloud
  "questions": {
    "safety": { "type": "choice", "instructions": "How should this message be routed?",
                "criteria": [ { "id": "allow" }, { "id": "redirect" }, { "id": "block", "description": "…" } ] },
    "warmth": { "type": "score", "instructions": "How warm is the user's last line?", "criteria": ["cold", "neutral", "warm"] },
    "asks":   { "type": "noul", "instructions": "Is the user asking something?" }
  },
  "languages": { "ko": { "questions": { "safety": { "instructions": "…" } } } }
}
```

- A decision agent takes only `type`, `model`, `questions`, `languages` and `defaultLanguage`; any other field is `invalid_configuration`. Language selection is the chat agents' rule.
- It ignores registered tools and wiki: in `agent()`, `tools`/`wiki` may be omitted, `null`, `'all'` or `[]`; a non-empty list is `invalid_configuration`.
- Question and option ids are 1-64 characters of `A-Z a-z 0-9 _ . : -`. At most 64 configured questions; with none, every `decide` must pass inline questions.
- `instructions` (required) and every description are 1-4000 characters. `choice`: an ordered list of 2-255 options with distinct ids. `score`: 2-10 levels, lowest first. `noul`: optional `{true?, false?}` descriptions (Swift/Kotlin: `trueDescription`/`falseDescription`).
- A Croche Cloud patch, a language layer or `instance.config` may change `model` (not a language layer) and the text of instructions and descriptions. None may add, remove, rename or reorder a question or option id, or change a level count: app code branches on them.
- The model must support every configured question type; otherwise `decide` refuses with `model_unavailable` (setup) before any call. Inline questions are checked only at `decide`, so a later model patch can make an inline score question fail; configure the questions you depend on.

**`DecideInput.id` is a correlation id, not a replay key: reusing it after settlement buys a NEW decision.** Reuse while the first call is in flight rejects with `idempotency_conflict`. At most eight decisions may be in flight per agent; the ninth rejects with `busy`. Every call also holds its estimate against the shared allowance while it is in flight.

`cancel(id)` acts only on a decision in flight with that id. With none in flight it is a no-op, for a finished id and a never-seen id alike: Croche keeps no record of past decision ids.

An abort before HTTP handoff rejects with `cancelled` and buys nothing. After handoff it rejects with `outcome_unknown`; a late reported cost still settles, while answers are discarded. `close()` does not wait for a provider reply. Do not retry blindly. A DNS or connection failure after handoff also returns `outcome_unknown`. A malformed successful provider response rejects with an `internal` error; whether it is charged is settled later by Croche Cloud from the provider's own record. Croche Cloud bills the observed cost of a generation that completed normally or was cancelled by the app (including one whose response was malformed), and does not charge a provider-confirmed error. The balance the app sees is reconciled at the next check-in.

## Adapters (0.7)

`Croche.open({..., adapters?: Adapter[]})` selects app-provided kinds. An omitted kind uses its host default. Duplicate or unknown kinds are refused with `invalid_configuration` before effects.

| SDK host | StateStore | BlobStore | ImageAdapter |
| --- | --- | --- | --- |
| Node.js | Built-in `LocalStateStore` (SQLite at `./.croche/state.db`), or supply one | Built-in `LocalBlobStore` (files under `./.croche/blobs/`), or supply one | Optional, supplied by the app |
| Serverless runtime (workerd) | Supply one, such as a SQLite Durable Object adapter | Supply one, such as an R2 adapter | Optional, supplied by the app |
| Swift on iOS | Built-in platform SQLite, or supply one | Built-in app-private files | Built-in OS image support, or supply one |
| Kotlin on Android | Built-in platform SQLite, or supply one | Built-in app-private files | Built-in OS image support, or supply one |
| React Native on iOS or Android | Built-in platform SQLite, or supply one | Built-in app-private files, or supply one | Built-in OS image support, or supply one |

On workerd, pass both stores to `Croche.open`, `Croche.wakeTimes` and `Croche.registerBackground`. A missing store gives `invalid_configuration` before StateStore access. On a Node deployment with ephemeral disk, supply durable stores explicitly.

Kotlin apps use the `dev.croche` SDK. The generated `dev.croche.ffi` bindings are unsupported and carry no compatibility promise.

A `StateStore` uses `kind: 'state'` and stores Agent State, crash flags, and the archive index. `commit` checks one key's version (null means absent) and applies the entire batch atomically. Empty batches and repeated keys are refused. Deleting an absent key succeeds. A committed result carries the guard key's resulting version. A conflict applies no writes. Do not retry or merge a conflicting batch in the store.

`StateStore.list(prefix, options)` returns key/value entries within the prefix at or above the inclusive `start` bound, even when `reverse` is set. Use ascending UTF-8 key order by default and descending order for `reverse`. Each page must fit the requested `limit`, up to 128 entries. Core refuses oversized or invalid pages.

A short page can still have a `nextCursor`. A page with a cursor must contain at least one entry. Use the opaque cursor with the same prefix, start and direction to continue strictly past the previous page. The range is exhausted when the cursor is absent.

Croche owns credential storage. Mobile uses Keychain or Keystore. Node and Workers store credentials in an encrypted slot in the selected StateStore, sealed with the server or development key supplied at open. A rotated key starts a new registration. A `secret` adapter is refused with `invalid_configuration`. Pass the same adapters to background registration as to open. When upgrading from 0.6 or earlier, use a fresh store. Croche does not migrate old registrations.

A `BlobStore` is required and holds raw object bytes. There is no fallback into `StateStore`. Sealed History uses BlobStore. Node exports `LocalBlobStore(dir)` and defaults to plain files under `./.croche/blobs/`. Swift and RN on Apple use the app's Application Support `croche/blobs/` directory. Kotlin and RN on Android use `noBackupFilesDir/croche-pal-v1/blobs/`. Workers and custom hosts without a default must pass a BlobStore in `adapters`, such as one backed by an R2 bucket, or open fails with `invalid_configuration`. Core owns key allocation, budgets and cleanup. Put replaces any bytes at the same key. Get returns null for a missing object, and deleting an absent key succeeds. List orders entries by UTF-8 key and returns an opaque cursor to resume the same prefix.

An `ImageAdapter` uses `kind: 'image'` and declares immutable supported media types and pixel limits. Its `info` describes the encoded media type and orientation-applied first frame, and `resize` uses that same geometry. Unknown alpha stays unknown. Work with owned encoded bytes, keep the result upright and honor cancellation. Resize must preserve alpha, stay within the limits and avoid upscaling. Core verifies the result independently. Optional operations return a typed unsupported result by default.

Image adapters are optional. iOS/Android provide the OS implementation automatically; an app image adapter overrides it. Node and Workers may register any implementation; our Node implementation is a separate optional package, using exactly this interface. No image adapter is bundled into the Node SDK. The optional `@h1r-ai/croche-image-node` package exports `createImageAdapter(): ImageAdapter`; register it with `Croche.open({adapters:[createImageAdapter()]})`. Missing/failed/timed-out derivation falls back to a fitting privacy-stripped original, otherwise id+alt plus viewErrors; it never refuses image tools at open/apply or fails a turn. App intake limits remain separate from model-reader limits. Without an image adapter, app inputs that exceed the intake budget or need orientation/size conversion refuse with `image_unsupported`; a model view that cannot fit the original keeps id+alt and reports `viewErrors` instead of sending an oversized image.

## History archive policy

The app-wide `Croche.open({archive: {maxBytes, notesMaxBytes}})` host option sets budgets separately for each agent instance. `maxBytes` bounds History and defaults to 8 MiB. `notesMaxBytes` bounds the shared archive for retired summary pieces and saved memory facts and defaults to 4 MiB. Both take integer bytes from 64 KiB to 1 GiB. Older archive records can be evicted to honor the budgets. Retired notes are read on demand.

`retentionBytes` sets the live stream log budget per instance. The default is 4 MiB, and the range is 2 MiB to 1 GiB, inclusive. Core removes the oldest eligible records when the log reaches its budget. `instanceMaxBytes` defaults to 32 MiB and sets the total budget for the user's named instances. It is also each instance's budget for finished turns still held in State before History seals them; a send past it gives `store_full`. It takes integer bytes up to 1 GiB. At `Croche.open`, the instance limit must be at least the sum of `retentionBytes`, `archive.maxBytes` and `archive.notesMaxBytes`, including for the main instance. Invalid sizes return `invalid_configuration`. All SDKs pass the options to Core. The options are app-wide host policy.

Physical limits stay fixed: 60 KiB per StateStore key and value, 256 KiB per stored message, and 2 MiB per log record.

History is bounded by bytes only. `clearHistory()` takes no options and clears the whole conversation: partial clear (`before`) and the configuration's `history.retainDays` were removed in 0.7. Passing an option is `invalid_input`; a configuration that sets `history` is `invalid_configuration`.

Read archive size from the existing subscription snapshot's `state.archiveBytes`: committed logical record bytes, in the same unit as the archive byte budget. It excludes manifests, piece overhead, orphan pieces and other stores; it is not physical disk usage. A measured empty archive is zero; an external or unreadable archive that Core cannot measure is null. Archive-only changes publish a fresh snapshot to existing subscribers.
