---
name: croche-config
description: Edit or diagnose Croche config bundles, Cloud patches, explicit model selection, agent wording, or language selection. Not for tool registration, CLI installation, or unrelated app localization.
---

<!-- Generated Croche skill content. -->

# App configuration

The app supplies a bundle in the [current configuration schema](https://docs.croche.ai/concepts/config.md)
to `Croche.open({bundledConfig,...})`. The Cloud supplies a patch over that bundle. Tools and wiki documents are registered
in app code, never in config. Do not reconstruct a 0.5 flat config or silently
substitute a legacy SDK to make an example pass. The example uses a schema-7 bundle.

```ts
import type { Json } from '@h1r-ai/croche';

export function bundle(selectedModel: string): Json {
  return {
    schema: 7,
    project: {
      defaults: {model: selectedModel, context: {turnTokens: 8000}},
      languages: {default: 'en', supported: ['en', 'ko']},
    },
    agents: {
      helper: {
        instructions: 'Help this person use our app.',
        languages: {ko: {instructions: 'Help with the Korean edition of this app.'}},
      },
    },
  };
}
```

The app must choose its project model explicitly in `project.defaults.model`.
Preserve that choice; no SDK model constant or Cloud default supplies it. Agent
run settings may override inherited project defaults. Language entries contain
wording (`instructions`, `toolGuide`, `wikiGuide`), not model or
other run settings. The authored default must be in the supported language set.
Do not reuse the old project/language model hierarchy.

Use `project.defaults.context.turnTokens` to set the shared target average input
tokens per model call. An agent can override it at `agents.<id>.context.turnTokens`.
Use `project.defaults.maxIterations` to set the model-call limit for a turn.
Override it at `agents.<id>.maxIterations`. The default is 5 and the accepted
range is 1–32 inclusive. Late tool results also count against the call budget
since the last outside input. When the limit prevents another call, the turn
reports `iteration_limit` and keeps effects already completed.

Unknown authoring fields are errors.
`context.turnTokens` and `context.memoryShare` are used exactly as written. If
they cannot fit the agent's instructions and tools, opening the agent fails with
`invalid_configuration` and the message names the value that works. The most one
call may hold is not configured: it is 100,000 tokens, or 80% of the model's
context length when that is smaller. Keep input/output and tool-result limits
separate; input limits never authorize silent truncation. Reasoning/output settings affect both
quality and cost. Explicit `fallbacks`, if used, are run parameters; they are
not an SDK-selected chain. Verify the chosen model on the actual app workload rather
than treating a historical price/latency table as a guarantee.

## Instances and app-owned access

`await croche.agent('helper')` opens its default instance with bundle + Cloud
patch and no app config override. An app patch is allowed only for a named
instance: `{instance:{id:'document-42',config:{instructions:'Help here.'}}}`.
It is not saved: pass it on every open. Do not put the patch beside `instance`,
persist it in a user store, or add a configurable instance byte budget.

Scopes belong to agent options, not config: `tools` and `wiki` are lists,
`'all'`, null or omitted. Only an empty list means no access. Runtime setters
accept lists or `'all'`, may widen from the opening scope, and take effect from
the next turn. Resets restore the opening scope. Bind belongs to tool entries;
bound args are hidden from the model, not an authorization guarantee.

Guides supplement, rather than replace, app-owned tools/documents. Tool guide
order is manifest guide, agent config `toolGuide`, then agent tool-entry guide.
Wiki order is document description, config `wikiGuide`, then matching scope
guides in list order. Register documents again on every Croche open; wiki
originals are memory-only for that session.

## Cloud drafts and production

Use a CLI version compatible with the app SDK. Read its current command help and the project's existing
draft before editing; preserve the document's base/revision and patch envelope.
Do not fabricate an old schema-2/3/4 document or overwrite a whole bundle when
the operation expects a patch. Resolve a revision conflict against the latest
draft without discarding someone else's edit.

Development-key installations follow development drafts; production uses the released
patch. A config download/release alone is not evidence of application: reopen
the agent with the synchronized config and verify behavior and reported identity.
A production release, rollback or spending change needs the human's approval;
it is not a side effect of editing a draft. Keep tool handlers, manifests,
document registration and access scopes in the app when changing config.

## Language and verification

`Croche.open({language,...})` takes the user's language. Supported languages and
the authored default live at `project.languages`; translated wording lives in
`agents.<id>.languages`. On a server, pass the app user's locale or deliberately
use the bundle's default; do not substitute the server operator's locale.
Selecting wording does not translate app data or force the model's reply language.

Validate JSON with Core, open the named agent, verify one authorized completed
reply, and inspect config identity without logging credentials. A successful
open or missing cost report does not prove a successful model response.
