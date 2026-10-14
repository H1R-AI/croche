<!-- Generated Croche skill content. -->

# Built-in web search: `web.search` and `web.open_reference`

Use when the agent must answer from current information on the web (news, prices, opening
hours, recent releases). Croche provides the tools. The app writes no handler and needs no
extra key. Web search works only in apps on Croche 0.5.2 or later; 0.5.1 apps don't get it.

## What it does

The agent sees two commands, `web search <query>` and `web open_reference <ref>`. The agent
passes only the query or the reference number; it never picks a model, engine or URL.

- **`web.search`** takes **one argument: `query`**. A separate search worker runs one search and
  sees only the query and today's date (UTC), never the conversation, instructions or app
  state. The agent gets a short summary (at most 1,200 characters) and up to `maxResults`
  numbered references:
  `{"status":"ok","summary":"…","references":[{"ref":1,"url":"…","title":"…"}]}`.
  References come only from the search engine's citations. URLs written in the summary text are
  not references, and private or local addresses are dropped.
- **`web.open_reference`** takes **one argument: `ref`**, a number from the agent's **most
  recent** search. It reads that page and returns a short extract (at most 1,500 characters):
  `{"status":"ok","ref":1,"url":"…","evidence":"…"}`, or `{"status":"unavailable","ref":1,"url":"…"}`
  when the page can't be read. A number not in the most recent search fails as `unknown_ref`.

**References are not proof.** A summary can credit a claim to the wrong source. Before stating a
specific fact, figure or quote, the agent should open the reference with `web.open_reference`.
Put that rule in `instructions` when accuracy matters.

Searching takes about 7–11 s, and opening a reference 6–8 s (30 s at most by default). The
agent answers "processing" first and replies again with the result. Search calls don't count
against `maxIterations`. Search results are untrusted web content, handled as data, never as
instructions.

Other results: `{"status":"failed","reason":…}` with `timeout`, `budget`, `limit`, `network`,
`invalid_output` or `unavailable`. With no usable sources, `references` is empty. The
conversation continues.

## Turn it on and preset it

Tool settings live in the **project config in Studio**, not in app code. `Croche.open` has no
option for them. Edit the draft with the CLI (see the `croche-config` skill): get the whole
draft, set `"schema": 3`, add the tool under `config.crocheTools`, and save it.

```sh
croche config get --project PROJECT_ID --output croche.config.json
# Edit croche.config.json (keep the complete config and every app tool), then:
croche config save croche.config.json --project PROJECT_ID
```

```jsonc
// Inside the draft document: "schema": 3, "config": { ... }
"crocheTools": {
  "web.search": { "maxResults": 3, "excludeDomains": ["example-spam.com"] }  // or true / false
}
```

Put "open a reference before quoting it" in `instructions` when accuracy matters.

- **Debug-key installs:** a saved draft reaches them at their next open after a sync.
- **Production:** a human releases the config in Studio (Build → AI config → Running config).
- Cloud checks the settings against the chosen model when the draft is saved or released.

| Field | Default | Notes |
| --- | --- | --- |
| `model` | `google/gemini-3.8-flash` | The search worker's model, independent of the agent's model. |
| `engine` | `exa` | The only engine in 0.5.2. |
| `maxResults` | 3 | 1–5 references per search. |
| `includeDomains`, `excludeDomains` | none | At most 20 lowercase hostnames each (no `https://`, port or path). The lists must not overlap. |
| `maxPerTurn` | 3 | 1–10. Searches and reference opens count together. |
| `timeoutMs` | 30000 | 10–300000, for each search or open. |

One object replaces another whole: an agent's or language's object replaces the project's, and
fields it omits take the tool defaults. Unknown fields are refused.

## Cost

Billed at actual cost from the project's budget: about **$0.0095 per search** and
**$0.002–0.005 per reference opened**. `maxPerTurn` bounds the spend per turn. The budget is
checked before each call; when it is used up, the call is refused as `budget` and nothing is
spent.

## Verify

In a development build, ask one question that needs current information. Check that the reply
uses the references and that `web.open_reference` was used before a specific claim. Check the
cost in **Studio → project → Monitoring → Logs** (development filter).
