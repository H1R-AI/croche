<!-- Generated from packages/runtime/docs/CODING-AGENT.md by scripts/build-plugin.ts. Edit the source, then run npm run build:plugin. -->

# Build an app using only the public SDK

## What the Runtime does for you, and what you should not rebuild

Croche's Runtime owns two things. Leave both to it.

1. **Context management.** The Runtime keeps the conversation and the long-term memory, and
   decides what the agent sees on each turn. Do not summarise, trim, window or re-send history
   yourself, and do not put app state in `instructions`. Send the current app state with each
   message as `context`.
2. **Commands.** Every app capability is a command of a grouped tool. You describe the
   commands once (`name`, a one-line `summary`, flags); the Runtime describes them to the agent
   and serves `help` on demand. Write only what the AI needs to choose and call a command
   correctly: what it does and when to use it. Do not document every parameter in prose, do
   not register one function per capability, and do not repeat the command list in
   `instructions`. Validation errors from your handler (returned, not thrown) teach the model
   the details at the moment it needs them.

   The Runtime already tells the agent how to act through commands. It says how to act, never
   whether: when an agent acts is your app's policy. So:
   - Write each command's `summary` as what it does and when to use it, including allowed values
     where they are few ("Sell food or drink: stew, bread, ale, honey_cake (evenings only)").
   - Keep `instructions` to the character: who they are, how they talk, what they care about.
     A few short paragraphs. Every character you add is paid on every call.
   - Put stable content the model must quote (a menu, a price list) in the command result, not
     in `instructions`, unless the model needs it on most turns.
   - Put what most turns need to answer (the user's open tasks, cart, balance, today's
     schedule; a compact summary) in each message's `context`. It saves a lookup round trip on
     most turns. Kept earlier turns are resent exactly as they were sent, earlier states
     included. Send the current state on every message, even when unchanged: Croche sends only what changed, and resends it in full after older turns are folded.
   - Mark lookups (lists, status, search) with `reads: true`: their result is the answer, so the
     agent always replies after seeing it. Do not tell the agent to "speak only after the
     commands".

   Where guidance goes (founder, 2026-09-28): what is common to every Croche app (how to run
   commands, memory) is the Runtime's; everything specific to your app is yours.
   Agents may act on their own judgement by default. To keep an agent reactive ("act only when
   the user asks"), say so in `toolGuide`; the real boundary is the tool set you expose and the
   validation in your handlers, not prompt wording. Write `instructions`, `toolGuide` and
   command summaries in English; write the persona's voice and example lines in the user's
   language when that is what the user hears.


Start with the package README. The distributable coding-agent skill/plugin is
`plugins/croche` in the release checkout. Use `croche --help` for account and local
Runtime control; authenticate account requests with `CROCHE_DEVELOPER_KEY` from
Studio, never with an app public key. Do not copy Croche Chat's model loop; the app has
none. Do not call a model provider, add an orchestration framework, or read SDK internals
to connect an ordinary character app.

1. Install `@h1r-ai/croche` from npm into the app. Supply Cloud URL
   and a Studio project's public key. The project must allow anonymous enrollment
   and have an account allocation and active budget.
2. Open one `CrocheRuntime` with a durable storage adapter and personality
   instructions. Keep the returned handle for the application lifecycle.
3. Define grouped Tools with typed CLI commands and one real callback per Tool.
   The Runtime describes the commands to the agent and answers help. Validate
   application permissions, update authoritative app storage, and return actual
   outcomes. Check the cancellation signal before side effects. Return known
   rejections as JSON (for example, `{ status: 'rejected', reason: 'occupied' }`)
   so the model can correct its action. Any throw after a handler starts ends the
   turn because effects may be unknown; a validation-related error code does not
   authorize a retry.
4. Save input message IDs before `send`. Send current app state in `context` (a JSON
   object or text) on every message; the agent sees it as the app's state for that message.
   Append `text.delta.text` by `turnId` across model rounds and replace that same
   assistant row with the final `TurnResult.text`. Render nonempty text even for
   failed, cancelled and interrupted results. Check `status` separately for
   success indicators and application progression; do not infer success from
   visible text, a marker or a tool-start event.
5. Use `history()` to restore conversation display. Keep explicit app memories,
   unlock state and UI preferences separately. A successful response with
   `causedBy` identifies precisely which message completed. Startup interruption
   retains saved assistant prefaces without rerunning tools or observer events;
   cached input replay returns the saved result, so do not depend on deltas alone.
6. Supply `markerGuide` and map markers to presentation; emotion is not a Tool.
   Update available capabilities with `setTools`. If a hidden feature must stay
   unknown to the character, omit its tool, prompt text and context while locked.
7. On cancellation, pass an aborted signal or call `close()`. An explicit retry
   after failure needs a new message ID; same-ID delivery returns the saved result.
8. Prove a real tool action, restart restoration, failed/cancelled input behavior,
   and actual operations in Studio. Clearly distinguish injected transport tests
   from live model calls.

Croche chooses the model for the project. If connection/credit setup is absent, report the
concrete missing setting.
Do not fabricate successful AI results or expose a provider key to make a demo work.

The Runtime has one current user/session per handle. Multiple characters can use
different `storageKey` values and instructions; they receive independent sessions.
Local user allowance is not globally synchronized across copied
stores or devices. Cloud project/account limits remain the financial authority.
