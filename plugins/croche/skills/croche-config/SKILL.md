---
name: croche-config
description: Edit or diagnose Croche project config, model selection, Studio drafts and releases, app tool declarations, or language selection. Use when instructions differ after restart, a draft removes tools, or user locale selects the wrong config. Not for CLI installation or unrelated app localization.
---

<!-- Generated Croche skill content. -->

# App configuration

Work on the app-visible config, not service implementation. Determine whether the requested
change is bundled app config, a development draft, or a production release before editing.
Use `Croche.open({ config, handlers, ... })` for project configuration.

## Choose a model in app config

**Your app can choose the model.** Set `model` inside the `config` passed to `Croche.open`,
not as a top-level open option:

```ts
const config = {
  model: 'deepseek/deepseek-v4.1-flash',
  instructions: 'You are a friendly guide. Keep replies brief.',
};
// Use this as the config option in your existing Croche.open call.
```

| Scope | Config field |
| --- | --- |
| Project | `config.model` |
| Project language | `config.languages.<tag>.model` |
| Agent | `config.agents.<agentId>.model` |
| Agent language | `config.agents.<agentId>.languages.<tag>.model` |

For the selected agent and language, later applicable levels override earlier ones in that
order: project → project language → agent → agent language. Omitting `model` at one level
inherits the preceding applicable value. Modes do not declare `model`.

## Recommended models

| Model | When to use it | USD / 1M tokens (input / output) | Latency in the comparison below |
| --- | --- | --- | --- |
| `deepseek/deepseek-v4.1-flash` | Recommended default for text + images and low-latency chat | $0.2002 / $0.9856 | Median **0.9 s**, p90 **1.6 s**; observed **~$0.00013/turn** |
| `openai/gpt-6-luna` | Text + image alternative; fallback subject to the reasoning limits below | $0.1114 / $0.5571 | Not measured in this comparison |
| `deepseek/deepseek-v4-flash-0731` | Text-only apps seeking cheaper output than V4.1; not for image input | $0.1773 / $0.6584 | Not measured in this comparison |
| `xiaomi/mimo-v2.6-flash` | Low token cost, but only background or latency-tolerant work | $0.14 / $0.29 | Median **11.2 s**, p90 **23.5 s**, max **54 s** |
| `anthropic/claude-opus-5.5` | Work/productivity where quality justifies higher cost; not recommended for entertainment/chat companions | $4.5455 / $22.7273 | Not measured in this comparison |
| `openai/gpt-6.1-sol` | Work/document agents that accept higher cost for quality; not recommended for entertainment/chat companions | $2.2286 / $11.1429 | Not measured in this comparison |

Prices are estimates from the Studio catalog's **2026-10-05** snapshot, in USD per million
input/output tokens, not a fixed per-turn charge. MiMo has the lowest output price in this
shortlist, but the lowest token price is not the fastest response.

Latency and observed turn cost above come from **one 32-turn Croche Chat comparison on
2026-10-13**, not a service guarantee or a general benchmark. Prompt size, output length and
workload affect both time and cost. Measure your app; do not extrapolate those timings to the
models marked unmeasured.

Set **project-level `config.model` explicitly**. Infer image use from the requested feature or
existing code; do not add a setup question when that is clear. Preserve the user's explicit
model choice. Do not use the text-only option for an app that sends images.

The default when no applicable config level sets `model` is
**`deepseek/deepseek-v4.1-flash`**, with **`openai/gpt-6-luna`** as fallback.
That fallback applies only when `reasoning` is **`default` or `off`**. With `low`, `medium`,
or `high`, the fallback is dropped; do not promise an automatic switch to the alternative.

This default is live. Set `config.model` explicitly when your app needs a particular model.
Listing an alternative is not a guarantee that every explicit model choice automatically
falls back to it. Public SDK package availability remains a separate release check.

Read the online [Models page](https://docs.croche.ai/models.md) for recommendations and the
[documentation index](https://docs.croche.ai/llms.txt) to discover other public pages. The
[full allowed list](references/models.md) is included offline and is also available in Studio.
Do not invent a model name or say model choice is unavailable.

## Rules that prevent broken apps

- A Studio AI config, draft or release, **replaces the app's code config as a whole**. It does
  not merge with the bundled config. Preserve instructions, tools, agents and other app fields.
- A downloaded config applies at the **next open after a sync**, never in the active session.
  Restarting once before the download finishes can still use the old config; allow sync and
  reopen again. Do not promise that saving a draft changes an already-open agent.
- Drafts reach only installs using a **debug key (`debugKey`)**. Every debug key
  follows drafts by default; there is **no toggle** to enable this.
- A config declaring a tool the app does not register is **not delivered**. Keep declaration
  names and app handler registration consistent; handlers stay in code.
- **A draft must include every tool the app uses, or the agent loses those tools at next open.**
  Export/read the whole current draft before an edit, not just the instructions field.
- `CrocheRuntime.create` never uses Studio config; only `Croche.open` does. Do not suggest
  switching a draft to fix a low-level single-agent integration.

## Agent authors; human reviews in Studio

Studio is not a draft editor. Make a requested config edit through the CLI, not an imaginary
Draft tab or Save draft button. Get the current draft before editing so save checks its base:

```sh
croche config get --project PROJECT_ID --output croche.config.json
# Edit croche.config.json, preserving the complete config and every required tool.
croche config save croche.config.json --project PROJECT_ID
```

Preserve the full project document. If no draft exists, prepare `schema: 2` with the complete
app config in `config`, not the returned `null`. Use `schema: 3` when `crocheTools` sets an object for
`web.search` (see the `croche` skill's web-search.md). Use `schema: 4` when setting
`temperature`: number 0–2, absent uses a tuned default, null = omit. This field requires SDK 0.5.3+
and structured calls always omit it. Preserve schema 4 when later editing web tools;
never downlabel a document carrying temperature. On a conflict, keep the local edit, fetch the
latest draft separately and reconcile; do not force an empty base or blindly overwrite.
Saving affects debug-key apps, not production: every debug key follows drafts. Verify all tool
handlers, allow sync and reopen; the change applies on the **next open after sync**, never
mid-session. Test the behavior and check **Monitoring → Logs**.

For production, the **human** opens **Build → AI config → Running config**, reviews the draft's
readable cards and diff against the released config, and chooses **Release…**. The human types
the project name and chooses **Approve and publish**. Production installs apply the released
config on their next open after sync; release alone does not prove application. Never release,
roll back or change spending limits as a side effect of a draft edit.

App-code reports may say **“Running config reports are not available yet.”** Do not promise
those reports: draft review and release remain available below. Missing reports do not prove
app health or which config is currently effective.

## Language: the user, not the config author

`language` passed to `Croche.open` is **the user's language**, a BCP-47 tag. It selects the
matching translated config branch, `config.languages.<tag>`: exact tag first, then primary
subtag. If none matches, the base config is used **as is**. An English-only config still serves
a Korean user.

`config.defaultLanguage` is the language the **base config is written in** (default `en`),
not the user's language and not a fallback language assigned to the user. It belongs at the
project config root, not among the `Croche.open` host options or inside an agent override.

When the app passes no `language`, SDKs use the device/browser locale: browser
`navigator.language`; automatic RN/Swift/Kotlin device locale is targeted for **0.5.1**.
TODO verify mobile 0.5.1 behavior before relying on it. On earlier RN versions, pass the app's
known user locale explicitly. On a Node backend, pass the authenticated user's app locale;
the server has no browser/device locale for that person.

The model is **not told this language value**. It replies in the language the user writes
unless instructions say otherwise. Selecting a config branch neither translates app data nor
forces the reply language. Do not set `defaultLanguage` from each user's preference.

```ts
const config = {
  model: 'deepseek/deepseek-v4.1-flash',
  defaultLanguage: 'en',
  instructions: 'You are a friendly guide.',
  languages: { ko: { instructions: 'You are a friendly guide for our Korean edition.' } },
};
// In Croche.open: { ...hostOptions, language: 'ko-KR', config }
// ko-KR selects ko here. With no ko branch, the English base stays unchanged.
```

Keep translations limited to fields whose content actually differs; do not duplicate a whole
config for every locale without need. Whole Studio-config replacement is a separate rule from
choosing a language branch within that config.
