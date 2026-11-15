---
name: croche-config
description: Edit or diagnose Croche 0.6 config bundles, Cloud patches, explicit model selection, agent wording, or language selection. Not for tool registration, CLI installation, or unrelated app localization.
---

<!-- Generated Croche skill content. -->

# App configuration in 0.6

The app supplies a schema-7 bundle to `Croche.open({bundledConfig,...})`. The
Cloud supplies a patch over that bundle. Tools and wiki documents are registered
in app code, never in config. Do not reconstruct a 0.5 flat config or silently
substitute a legacy SDK to make an example pass.

```ts
import type { Json } from '@h1r-ai/croche';

export function bundle(model: string): Json {
  return {
    schema: 7,
    project: {
      defaults: {model},
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
wording (`instructions`, `markerGuide`, `toolGuide`, `wikiGuide`), not model or
other run settings. The authored default must be in the supported language set.
Do not reuse the old project/language model hierarchy.

Use only fields accepted by the schema. Unknown authoring fields are errors.
`context.maxTokens` is an explicit config cap, not a fraction of a model's
advertised window. Keep input/output and tool-result limits separate; input
limits never authorize silent truncation. Reasoning/output settings affect both
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

Use a matching 0.6 CLI. Read its current command help and the project's existing
draft before editing; preserve the document's base/revision and patch envelope.
Do not fabricate an old schema-2/3/4 document or overwrite a whole bundle when
the operation expects a patch. Resolve a revision conflict against the latest
draft without discarding someone else's edit.

Debug-key installations follow development drafts; production uses the released
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
