<!-- Generated Croche skill content. -->

# Croche 0.6 App API

The public App API for every SDK. TS is the reference; Swift, Kotlin and RN have the same shape in native syntax.

**One rule:** every value the app gives below is passed to Core UNCHANGED as JSON. Core (Rust, serde) validates it; the SDK decides nothing.

## The contract

```ts
// ---------- Values ----------
// One Json type on every SDK. Integers are exact within ±(2^53-1); Core refuses one outside it (invalid_configuration /
// invalid_input / invalid_tool_result by location), so pass large ids as strings. `undefined` is NOT Json: an SDK
// serializer that meets undefined inside a scope or config throws invalid_configuration and never drops the key.
export type Json = null | boolean | number | string | Json[] | { [k: string]: Json }

// ---------- Tools: a definition = manifest (a JSON file, the same on every SDK) + execute ----------
// The manifest is Json, validated by Core. The interface is documentation:
// today's grammar includes arg, list, minimum/maximum, minLength/maxLength, aliases, reads, timeoutMs, description.
export interface ToolManifest {
  manifestVersion: 1 | (number & {})                // 1 today; widened so a JSON-module import type-checks (Core validates)
  name: string
  summary: string
  guide?: string                                   // how the tool works (the tool author's text)
  commands: Array<{ key: string; summary: string; name?: string; aliases?: string[]; timeoutMs?: number; positionals?: ToolArg[]; flags?: ToolArg[] }>
  // key = unique across every tool registered on the project; ToolCall.key identifies it.
  // name = the command's route, [A-Za-z0-9_-]{1,80}. Routes and aliases are unique within the tool, and at most ONE
  // command omits name (the tool's default route), so a tool with 2+ commands names all but one.
}
export interface ToolArg {
  name: string                                     // unique within a command; a duplicate = invalid_tool at open
  type: 'string' | 'integer' | 'number' | 'boolean' | 'duration' | (string & {})   // editor hints kept; Core validates
  required?: boolean; enum?: Json[]; default?: Json; description?: string
}
export declare function defineTool(manifest: ToolManifest, execute: ToolExecute): ToolDefinition   // typed for authoring; passed to Core unchanged
export interface ToolDefinition { readonly name: string }   // name read by Core; an invalid manifest = invalid_tool with a path

export type ToolExecute = (call: ToolCall, ctx: ToolContext) => ToolResult | Json | undefined | Promise<ToolResult | Json | undefined>
export interface ToolCall { key: string; args: Record<string, Json> }          // bound args already merged in
export interface ToolContext {
  callId: string // same stable id as the agent-origin tool event
  agentId: string
  instance: string | null                          // null = the default instance (on a server: per user)
  user: string | null
  causedBy: string[]                               // the input ids this call works for (avoid buying twice)
  signal: AbortSignal                              // Swift: Task cancellation; Kotlin: coroutine cancellation.
                                                   // It fires on cancel, agent close and runtime teardown.
}
export type ToolResult = { content: ToolContent[] } | { json: Json }
export type ToolContent =
  | { type: 'text'; text: string }
  | { type: 'image'; mediaType: string; data: string }   // base64
  | { type: 'image'; mediaType: string; uri: string }    // file://, read by the native PAL; the bytes never enter JS
export declare function toolResult(value: string | Json | ToolContent[]): ToolResult   // BRANDED: only its return is a ToolResult; any other object = Json
// Swift mapping: ToolResult.content([...]) / .json(...), no helper.
export declare class ToolError extends Error {}  // its message reaches the model VERBATIM
// Results:
// - undefined / null / nil = the empty result;
// - a thrown ToolError = its message to the model;
// - any other throw = one fixed text to the model (tool_failed), and the details to the app;
// - a cancelled execute = a CANCELLED call, never a tool error.
// Core times an unanswered execute out at timeoutMs (Core's timer). SDK teardown (an RN reload, process death)
// fails every pending call with tool_unavailable.
// Croche tools (ours: they run in Core and are BILLED) ship in the same package:
//   import { tools } from '@h1r-ai/croche'; tools.webSearch     (RN: '@h1r-ai/croche-react-native'; Swift/Kotlin: CrocheTools.webSearch)
// Registering one gives it to EVERY agent whose tools list is omitted. The wiki tool is governed by the wiki scope;
// memory is config tuning.

// ---------- Wiki: documents the app registers ----------
export type WikiDoc =                             // path is the unique key; a duplicate = invalid_configuration
  | { path: string; description: string; markdown: string }
  | { path: string; description: string; file: string }   // an app asset/file path; Core reads it lazily through the PAL

// ---------- One list grammar. Omitted, null/nil or 'all' = ALL registered; [] = none ----------
// The same tool, or the same path/glob, twice in one list = invalid_configuration.
export interface ToolEntryOptions<T> {
  tool: T
  bind?: Record<string, Json>                      // by arg name, for every command that has it; hidden from the model.
                                                   // Validated: an unknown arg or a wrong type/enum = invalid_configuration.
  commands?: string[]                              // narrow to these commands
  guide?: string                                   // the app's advice
}
export type ToolRegistration = ToolDefinition | { tool: ToolDefinition; bind: Record<string, Json> }   // Croche.open: the bind applies to
                                                                                  // every agent; no commands or guide here
export type ToolScope = Array<string | ToolEntryOptions<string>>                   // agent()/setTools: ONE ENTRY = ONE TOOL; string = the name.
                                                                                   // An unknown name = invalid_configuration.
// bind: an agent entry WITH bind REPLACES the registration bind as a whole (no per-arg merge); no bind key = the
// registration bind stays. WARNING: leaving out an arg bound at registration makes it visible to the model again.
export type WikiScope = Array<string | { doc: string; guide?: string }>            // ONE ENTRY = ONE path or glob, e.g. 'faq/**'
// Guides add up, and nothing replaces anything:
// - tools: manifest.guide (shown to the model with the tool) -> agent config toolGuide (agent instructions, Cloud-tunable,
//   per agent) -> agent entry guide (per tool per agent);
// - wiki: doc description -> config wikiGuide -> the guides of every matching entry, in list order.

export interface AgentOptions {
  instance?: {                    // omitted = the agent's default instance: bundle + Cloud patch, no app config
    id: string                    // a separate copy with its own conversation and memory (on a server: per user)
    config?: Json                 // a patch over the agent config (agent fields only). NOT saved: pass it on every open.
  }                               // agent() on an instance that is already open: the same or no config = a handle to it;
                                  // a DIFFERENT config = invalid_configuration.
  tools?: ToolScope | 'all' | null   // omitted, null or 'all' = ALL registered; [] = none
  wiki?: WikiScope | 'all' | null    // the same
}

// ---------- Croche: the shared-resource factory for one user's session ----------
export interface Attachment {
  id: string
  kind: 'image' | (string & {})
  origin: 'user' | 'tool' | 'app' | (string & {})
  mediaType: string; bytes: number; sha256: string
  width?: number; height?: number; alt?: string; callId?: string; deleted?: true
  deletedReason?: 'evicted' | 'deleted' | 'cleared' | (string & {})
}
export type RunToolResult =
  | { id: string; status: 'ok'; output: Json; attachments: Attachment[]; cost: number | null; costStatus: 'reported' | 'unknown' | 'none' | (string & {}) }
  | { id: string; status: 'failed'; code: string; category: ErrorCategory; message: string; cost: number | null; costStatus: 'reported' | 'unknown' | 'none' | (string & {}) }
  | { id: string; status: 'lost'; code: 'outcome_unknown'; category: 'closed'; message: string }
  | { id: string; status: 'unknown'; originalStatus: string; fields: Json }

export interface OpenOptions {
  projectKey: string
  user?: string                   // servers; a Croche is ONE user's session
  language?: string               // default: the device locale; on servers, bundledConfig.project.languages.default
  bundledConfig: Json             // the base bundle {project, agents}; the Cloud patch changes its values
  tools?: ToolRegistration[]      // what exists in this app
  wiki?: WikiDoc[]
  storage?: StoragePal            // the platform default when omitted. Node: pass new FileStorage(directory)
                                  // (exported only by the Node entry); Node logs the resolved path once at open().
  platform?: PlatformHandle       // Android: the Context (required there); absent elsewhere
  serverKey?: string              // servers only
  debugKey?: string               // development builds only; refused at open in an Android release build
}
export declare class Croche {
  // One app tool path, outside every conversation. id is required; the same id and args recover its result.
  // tool_unauthorized (invalid): a registry command not opened to the app. App registration is not required.
  // Aborting detaches this caller; after handoff Core continues receiving, settling and storing the result.
  // Kotlin: runTool(name: String, args: JsonObject, id: String). Swift: runTool(_:args:id:).
  runTool(name: string, args: Record<string, Json>, options: { id: string; signal?: AbortSignal }): Promise<RunToolResult>
  // Open twice for the same (projectKey, user) = the SAME Core Croche, ref-counted; the last close() releases it.
  static open(options: OpenOptions): Promise<Croche>
  // Kotlin: data class RecoveryOptions(val recover: String), Croche.open(options, RecoveryOptions(recover = "delete")).
  // Swift uses RecoveryOptions too. SDKs serialize {"recover":...}; Core alone validates (invalid_request).
  // RECOVERY OPEN. For when open(options)
  // fails with store_too_new or corrupt_store (the project record), or with store_full / store_refused (a store write
  // refused, e.g. a full store). It works on a healthy store too, with the same result. It parses no project record,
  // mints nothing, enrols nothing and registers no tools. Only deleteData() / deleteData({}) and close() work. Every
  // other member (including the methods of member objects such as wiki and debugger), and deleteData with {agent} or
  // {agent, instance} (they need the record), rejects invalid_request.
  static open(options: OpenOptions, recovery: { recover: 'delete' }): Promise<Croche>
  // NORMAL handle (from open(options)). {agent} = that agent's default instance and every named one; {agent, instance}
  // = one; {instance} alone = invalid_configuration. {} or omitted = this user's declared main stores, every registered
  // instance, and the Croche's tool runtime with its Croche-owned attachments.
  // Undeclared legacy main stores, the install record and other users stay. In-scope agents of every handle of this
  // (projectKey, user) in this process are closed first. store_busy (retryable): another process holds a store, or an
  // open or delivery is in flight; NOTHING is deleted. A failure on store k of n rejects with enrolment intact, and a
  // retry finishes. Background un-enrolment moves with {} unchanged. Idempotent. The Croche stays open; the next
  // agent() starts fresh. A closed handle rejects closed. The static form is removed (no alias).
  // RECOVERY handle: {} deletes every store under this user's namespace by key prefix, never parsing the record. An
  // open, delivery or factory in flight in THIS process rejects store_busy first, with nothing deleted. A
  // store another process holds is KEPT with store_busy, the others ARE deleted, then the call rejects; a retry
  // finishes (PARTIAL progress, unlike the normal handle). This user's instance ENTRIES inside an unparsable record
  // remain (the build that wrote it collects them). A corrupt store identity, when the prefix needs it, rejects
  // corrupt_store (a documented gap). It also removes this (projectKey, user)'s background enrolment (a deletion, so a
  // later wake never opens a deleted store). In-scope agents of this process's other handles are closed first, as above.
  // Both handles: LOCAL storage only. It never reaches Cloud's records.
  deleteData(scope?: { agent?: string; instance?: string }): Promise<void>
  // Background (0.6: a wake delivers records and syncs config; no turns, no tools). open() enrols its
  // (projectKey, user, bundledConfig) and deleteData() un-enrols it. Call at launch (iOS: before didFinishLaunching
  // returns; Android: Application.onCreate). The OS identifier is ai.croche.background. Core keeps BackgroundEvents
  // durably and delivers each AT LEAST ONCE to the sink at the next registration in a live runtime.
  static registerBackground(options?: { sink?: { onEvent(event: BackgroundEvent): void }; storage?: StoragePal }): void   // Kotlin: registerBackground(context, options?); storage = the one open() uses
  // Servers and serverless cron: when deliverDue is next needed; opens no project. Epoch ms.
  // after: inclusive epoch ms; pass next as after
  static wakeTimes(options: OpenOptions, query?: { before?: number; after?: number; limit?: number }): Promise<{ wakes: Array<{ user: string | null; at: number }>; next?: number }>
  // Delivery and config sync only: opens due instances one at a time and starts no step it cannot finish by its deadline.
  deliverDue(options?: { signal?: AbortSignal }): Promise<{ ran: boolean; delivered: number
    deferred: Array<{ user: string | null; agent: string; instance: string | null; code: 'deadline' | 'cancelled'; message: string }> }>
  agent(id: string, options?: AgentOptions): Promise<Agent>
  readonly agentIds: readonly string[]
  readonly wiki: {                // the project's original documents, IN MEMORY for this Croche: not persisted. The app
                                  // supplies them at every open (OpenOptions.wiki); put/remove last until close().
    put(doc: WikiDoc): Promise<void>; remove(path: string): Promise<void>; list(): Promise<WikiDoc[]>
  }                               // open agents whose scope matches see a change at once
  readonly debugger: {            // the local debugger: loopback (adb reverse, iproxy), or LAN with the debug key.
                                  // iOS and Android: refused unless the OS treats the app as debuggable
    attach(options: DebugAttachOptions): Promise<AttachedDebugger>   // GLOSSARY "attached debugger"
    detach(): Promise<void>                    // last Croche close detaches; individual agent closes only update the roster
  }
  close(): Promise<void>          // resolves once new work has stopped; the bounded final delivery continues
}

// ---------- Agent: one instance, self-contained ----------
export type SendInput = string | { id?: string; input: Array<TextInput | ImageInput> }   // an app may give its own id
// Visible assistant text gets one projection removing Croche's channel delimiter tokens outside fenced code (inline ticks do not exempt them); structured JSON is unchanged.
// An unfenced </channel> is removed even without a matching opener; fence literal XML/RSS examples to preserve that closing tag.
export interface TextInput { type: 'text'; text: string; kind?: 'user' | 'app_event' | 'app_state' }
export interface ImageInput { type: 'image'; mediaType?: string; data?: string; uri?: string; alt?: string }
export interface SendOptions { signal?: AbortSignal; responseFormat?: ResponseFormat }   // signal = sugar for cancel(id); Swift/Kotlin: cancel the Task/coroutine
export type ResponseFormat =
  | { type: 'json_schema'; json_schema: { name: string; schema: Json; strict?: boolean; description?: string } }
  | { type: 'json_object' }
export type InputDisposition = 'queued' | 'seen' | 'answered' | 'no_reply' | 'failed' | 'cancelled' | (string & {})
// error is always present when failed; absent for queued/seen/answered/no_reply/cancelled.
// Statuses added later may carry it. Core projects categories for retained events too.
// A failed input whose reason was not recorded has failure_unrecorded (internal).
export interface EventError { code: string; category: ErrorCategory; message: string; retryAfter?: number }
export interface SendReceipt { requestId: string; status: InputDisposition; seq: number; error?: EventError }
export interface RequestResult {
  id: string; status: InputDisposition; messages: MessageEnd[]; gap?: true
  error?: EventError
}

export declare class Agent {
  readonly id: string
  readonly instance: string | null
  // Resolves when Core has ACCEPTED the input, not when the reply ends. An abort before acceptance = never queued.
  send(input: SendInput, options?: SendOptions): Promise<SendReceipt>
  // Failures before acceptance reject with CrocheError; they do not return a RequestResult.
  // Resolves when the input is final; with wait: 'idle', when the agent is idle too.
  request(input: SendInput, options?: SendOptions & { wait?: 'idle' }): Promise<RequestResult>
  subscribe(options: {
    onEvent: (event: AgentEvent) => void          // serial; on the UI thread where the platform has one
                                                   // serial = the next event waits until this handler FINISHES: its return, or in JS/RN
                                                   // the settlement of a returned promise. A throw or rejection ends THIS
                                                   // subscription with `handler_failed`; accepted work and other subscriptions are unaffected.
    initialMessages?: number                       // replay the last N messages first (default 50): a redraw after relaunch
    after?: { logId: string; seq: number }         // or resume after a gap
    deltaMs?: number                               // Core batches message.delta; omitted = Core's platform default (RN 50)
  }): Subscription
  cancel(id?: string): Promise<void>               // the one cross-handle cancel; resolves once Core has durably recorded it
  clearHistory(): Promise<void>                    // the app empties its list on the `cleared` event
  readonly memory: {
    list(): Promise<MemoryItem[]>; delete(id: string): Promise<void>; clear(): Promise<void>; enabled(on: boolean): Promise<void>
  }
  // delete/clear/enabled resolve once Core has DURABLY recorded them; during a turn they apply at its end (even when called from that turn's tool, which never waits). list() already shows the result; a `memory` event marks when it applied.
  // setTools(list)/setWiki(list) = exactly as if agent() had opened with that list (tools, commands, bind, guide), from the
  // NEXT turn. They choose from ALL REGISTERED, so they may widen past agent()'s scope (e.g. a chat app adds room tools).
  // 'all' = all registered; null = invalid_configuration. Most apps never call these four.
  setTools(scope: ToolScope | 'all'): Promise<void>
  resetTools(): Promise<void>                      // back to agent()'s open scope
  setWiki(scope: WikiScope | 'all'): Promise<void>
  resetWiki(): Promise<void>                       // back to agent()'s open scope
  close(): Promise<void>
}
export interface Subscription {                  // Swift: CrocheAgent.Subscription (Combine has a Subscription)
  history(options: { before?: number; limit: number }): Promise<void>   // older pages, as `page` events on the same onEvent
  close(): void
  readonly ended: boolean
}
export interface MemoryItem { id: string; text: string; [k: string]: Json }
export interface MessageEnd {
  type: 'message.end'; id: string; seq: number; firstSeq: number; at: string
  status: 'completed' | 'failed' | 'cancelled' | 'interrupted'   // the END OF A REPLY
  text: string; markers: string[]; causedBy: string[]; inReplyTo: string[]
  output?: Json                                    // the parsed structured result (responseFormat)
  error?: EventError
}
// turn.provider: serving-provider label reported in the response, subject to Core diagnostic filtering;
// absent without a usable label. Diagnostic only: it does not select a provider or change usage, pricing or settlement.
// The last member carries any type this SDK does not know (Swift/Kotlin: unknown(type, fields)). Ignore it or log it.
export type AgentEvent =
  | { type: 'input'; id: string; seq: number; firstSeq: number; kind: 'user' | 'app_event' | 'app_state'; status: InputDisposition; text?: string; at: string; error?: EventError }
  | { type: 'message.start'; id: string; seq: number; firstSeq: number; at: string }
  | { type: 'message.delta'; id: string; text: string }
  | MessageEnd
  // Emitted costStatus: reported | unknown | none. Unknown cost is null; readers remain open.
  | { type: 'turn'; id: string; inputs: string[]; causedBy: string[]; usage: Json; cost: number | null; /* credits; null = unknown */ costStatus: string; model: string; at: string; purpose?: 'summary'; provider?: string }
  // AI-called tools only. One row per callId; updates retain firstSeq. Memory calls remain private.
  | { type: 'tool'; id: string; seq: number; firstSeq: number; origin: 'agent'; requestedBy?: string; causedBy: string[]; tool: string; key: string; args: Json; status: string; delivered?: { text: string; images?: Array<{ mediaType: string; bytes: number; attachment?: string }> }; outputs?: { attachments: Array<{ id: string; mediaType: string; bytes: number }> }; cost: number | null; costStatus: string; startedAt: string; at: string }
  | { type: 'state'; status: 'idle' | 'running' | 'waiting'; queued: number; typing: boolean; activity: string | null; tools?: string[] }
  | { type: 'snapshot'; logId: string; state: Json; streaming: Json }
  | { type: 'page'; messages: Array<AgentEvent>; reachedFloor: boolean; logId: string; clearedSeq: number }
  | { type: 'cleared'; id: string; at: string }
  | { type: 'memory'; id: string; op: 'delete' | 'clear' | 'enabled'; at: string; item?: string; enabled?: boolean; removed?: number }
  | { type: 'gap'; afterSeq: number; throughSeq: number; reason: string }
  | { type: 'error'; code: string; message: string; poisoned?: boolean }   // the subscription ended
  | { type: 'replaced' }                                                   // the subscription ended
  | { type: 'unknown'; originalType: string; fields: Json }               // generated; Core never emits 'unknown' itself
export type BackgroundEvent = { type: 'delivered' | 'deadline' | 'cancelled' | 'skipped' | (string & {}); at: string; reason?: string; [k: string]: Json }   // skipped: reason 'storage_unavailable' | 'os_registration_failed'
export type DebugCapability = 'agents.list' | 'status' | 'history' | 'send' | 'cancel' | 'tools' | (string & {})
export interface DebugAttachOptions { url: string; token: string }
export interface AttachedDebugger { debuggerId: string; capabilities: DebugCapability[] }   // debuggerId = the CLI/broker wire's attachmentId (same value); Core emits it
export interface StoragePal { /* key-value read/write, platform-provided */ }
export type PlatformHandle = unknown               // Android Context
export declare class CrocheError extends Error { readonly code: string; readonly category: ErrorCategory; readonly retryAfter?: number }
export type ErrorCategory = 'offline' | 'allowance' | 'paused' | 'setup' | 'closed' | 'invalid' | 'internal'   // the ONE closed set

// ---------- REMOVED from the public API (no shims, no aliases) ----------
// CrocheRuntime; createAgent/listChildren (use instances); handlers on open or agent() (use defineTool); setMode and
// modes; .with(); commandPresets; Agent.history (history is on the Subscription); sync() (Core refreshes balances
// before any money refusal, so a retry after a top-up works); userBudget and the budget commands; streaming;
// backgroundSync; maintenanceIntervalMs; syncIntervalMs; maintenanceBackoffMs; Croche.open({scheduler});
// onDebugEvent (use debugger.attach); onUsage (the turn event carries usage and cost); SendOptions.onEvent (use
// subscribe); config tools/modes/crocheTools/wiki/limits/heartbeat; scope:'user' wiki docs; the RN closure form of
// registerBackground; request()'s legacy flag; the settledBeforeUpgrade input status.
```

## Events (`subscribe`)

| `type` | When |
|---|---|
| `input` | An input was accepted or changed status. App events are `input` with `kind: 'app_event'`. |
| `message.start` / `message.delta` / `message.end` | The agent's reply: its start, its text as it is written (always, because Core always streams), and the END of the reply with its `status`. There is no `turn.completed`. |
| `turn` | One model call was recorded: usage, cost, model and `causedBy`. `purpose: 'summary'` marks a context summary. |
| `state` | `idle` / `running` / `waiting`, the queue length, typing, and the current activity. |
| `snapshot` | The current log id, state and the message being streamed (first on attach). |
| `page` | An older page of messages, after `subscription.history()`. |
| `cleared` | `clearHistory()` took effect: empty the list. |
| `gap` | Events were missed (`afterSeq`..`throughSeq`): redraw from a `page`. |
| `error` / `replaced` | The subscription ended. |

`text.delta` is the legacy runtime and debugger event. It is not an app event.

## Error codes (`CrocheError.code`, with `category`)

[proposed] `retryAfter` is an integer number of seconds, present only on the hourly app-paid-unit `rate_limited` refusal. It is carried by `CrocheError` for `runTool` and by `EventError` in the terminal `RequestResult` for an accepted send. Send receipts remain immediate; terminal handling follows the existing paused-category path (including budget refusal).
Codes come from Core, the SDK and the Cloud codes Core forwards verbatim.
- **Category:** what the app does about it.
- **Money refusals:** Core refreshes the balances before any money refusal, so retrying after a top-up works.
- **Same everywhere:** Swift, Kotlin and RN surface the same codes.
- **New codes are safe:** Core attaches the category to every code, and a code outside this table is `internal`. An app switches on `category` and may special-case a `code`.

| Category | What the app does | Codes |
|---|---|---|
| `offline` | Retry later; the input is kept | `network_error`, `request_timeout`, `gateway_unavailable`, `invalid_cloud_response`, `stale_control`, `http_<status>` (a Cloud error without a valid code) |
| `allowance` | Tell the user that credit or allowance ran out; retry after a top-up | `account_credit_exhausted`, `project_budget_exhausted`, `user_allowance_exhausted`, `development_allowance_exhausted`, `unverified_allowance_exhausted`, `gateway_key_exhausted`, `provider_credit_unavailable` |
| `paused` | Usage is stopped by the project, an account or a rate limit; wait or contact | `runtime_blocked`, `project_access_disabled`, `account_disabled`, `server_key_revoked`, `debug_token_revoked`, `rate_limited`, `provider_rate_limited`, `debug_device_limit` [proposed] |
| `setup` | A developer fix: key, config, model or device identity | `invalid_configuration`, `model_missing`, `model_withdrawn`, `model_unavailable`, `project_key_unknown`, `server_key_invalid`, `debug_token_invalid`, `user_required`, `allowance_grants_disabled` (0.6.3), `gateway_key_rejected`, `gateway_unsupported`, `schema_unsupported`, `capability_unsupported`, `invalid_snapshot`, `snapshot_mismatch`, `invalid_tool`, `invalid_wiki`, `installation_unverified`, `attestation_required`, `attestation_rejected`, `attestation_unverifiable`, `attestation_failed`, `attestation_unavailable`, `attestation_unsupported`, `attestation_timeout`, `recovery_required`, `host_unavailable`, `core_unavailable` |
| `closed` | The work stopped; nothing to fix | `closed`, `target_closed`, `runtime_detached`, `cancelled`, `interrupted`, `preempted`, `aborted` (the wait stopped; the input continues), `observation_lost`, `store_busy`, `instance_busy` |
| `invalid` | The app's request cannot run as given | `invalid_input`, `input_too_large`, `invalid_memory`, `invalid_response_format`, `invalid_request`, `agent_conflict`, `unknown_id`, `idempotency_conflict`, `identity_conflict`, `busy`, `queue_full`, `cursor_reset`, `context_limit`, `output_limit`, `iteration_limit`, `structured_output_unsupported` |
| `internal` | Report it; the turn failed for a reason outside the app | `stream_incomplete` (distinct from `provider_error`), `provider_error`, `provider_rejected`, `invalid_provider_response`, `invalid_response`, `output_too_large`, `output_invalid`, `empty_response`, `unexpected_tool_call`, `storage_error`, `store_refused`, `store_full`, `corrupt_store`, `store_too_new`, `fresh_reservation_lost`, `archive_unavailable`, `archive_error`, `host_error`, `host_unresponsive`, `thread_unavailable`, `core_error`, `invalid_abi`, `no_lock`, `handler_failed`, `subscriber_overflow` |

**Tool failures** are seen on tool events and results, not thrown:
- `tool_failed`, `tool_unavailable`, `no_slot`, `invalid_tool_result`, `tool_timeout`, `tool_limit`, `tool_model_not_allowed`, `invalid_tool_input`, `tool_reference_unavailable`, `tool_privacy_policy_unavailable`;
- a `ToolError`'s own code passes through when it is `[a-z0-9_]{1,80}`.

**Retired in 0.6, with what they belonged to:**
- `tool_shape_mismatch` (tools leave config);
- `invalid_amount`, `allowance_exhausted`, `host_budget_disabled` and the tool code `budget` (`userBudget`);
- `store_too_old`, `memory_store_too_old` (no 0.5 migration).

**Not app errors:**
- **What the model sees as a tool result:** `invalid_arguments`, `not_found`, `read_limit`, `not_run`.
- **Debug and telemetry:** `telemetry_rejected`, `currency_unsupported`, `tool_models_invalid`, `invalid_acknowledgement`, `control_error`, `runtime_error`.
- **Memory-compaction outcomes:** `collapsed`, `unusable_memory`, `empty_memory`.
- **Cloud codes only other Cloud clients see.**

**Not covered:**
- Codes built at run time are covered only by the pass-through rules.
- The Cloud config codes reached through project lookup, and the iOS/Android host codes, were not traced.
