---
name: croche-cli
description: Use the Croche CLI to create an app project and private development-key file, inspect account/project metadata, edit a draft config, or attach the local debugger. Trigger on croche terminal commands or CLI setup, including PowerShell. Not for writing SDK app code or approving Studio-only actions.
---

<!-- Generated Croche skill content. -->

# Croche CLI

Do the permitted CLI work and explain the next user action. Node.js 22+ on macOS/Linux;
Windows verification pending. Check `croche --help` and installed version before relying on
a command. Install `@h1r-ai/croche-cli@latest` and confirm it is a 0.7 release. Report the
blocker if that release is unavailable.
With installation permission:

```sh
npm install --global @h1r-ai/croche-cli@latest
croche --help
```

Alternatively install locally with `npm install @h1r-ai/croche-cli@latest`, then prepend
`$PWD/node_modules/.bin` to PATH. From the app directory the human uses
`./node_modules/.bin/croche login` (or `npx --no-install croche login`); don't let npx
fetch a substitute. For either install, resolve `CROCHE_CLI_BIN="$(command -v croche)"`,
run `"$CROCHE_CLI_BIN" --version` before using it. Compare it with the app's installed `@h1r-ai/croche` (`npm ls @h1r-ai/croche`): both must be 0.7.x,
and on web and Node, where both install at `@latest`, they must be equal.
A stale PATH command is not proof the installed CLI is broken; stop and select the right binary.

The package is `@h1r-ai/croche-cli`; its executable is `croche`.

## Ask the user to complete Studio-only actions

Ask the user to do these in Studio and wait for their confirmation:

- Account keys, including listing them
- Server key changes
- Invites and attestation changes
- Project budget, settings other than name or routing, and project deletion
- The unverified-limit reset and the project-key switch
- Config publish and rollback

## Capture command output before it reaches the transcript

The CLI operations below may return credential prefixes. Use a capturing subprocess or shell
variable, parse the JSON privately, and output only required non-key fields (success, account ID,
project ID, destination path). Never echo raw JSON, stderr, `.credential.prefix` or `.development_key.prefix`.
For a key presence check, emit only its variable name and presence/length; never masked substrings.
A successful user login is a signal to re-check now, not reuse an earlier failed check.

For a POSIX Node host, this identity check captures both streams and emits only a boolean:

```js
import { spawnSync } from 'node:child_process';
const check = spawnSync('croche', ['auth', 'whoami', '--json'], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
});
let authenticated = false;
try { authenticated = check.status === 0 && JSON.parse(check.stdout).ok === true; }
catch { /* Report only the safe status, never raw output. */ }
console.log(JSON.stringify({ authenticated }));
process.exitCode = authenticated ? 0 : 1;
```

Use the same capture-and-allowlist pattern for project/development-key commands. Do not print a
subprocess exception containing captured output. Use the PowerShell reference for that shell;
this example is not a Windows execution claim.

## Authenticate without collecting a secret

After installing the CLI, if the account is not already configured, make the same **one combined
request** as `croche`: sign up in Studio using the invite code from their invitation if asked,
create one account key (`dk_`) under **Account → Account keys** (under **Personal**), then run
**`croche login` themselves in any private terminal on the same machine and OS account**, entering the key only at its hidden prompt (PowerShell that refuses
`croche` because scripts are disabled: the human first runs `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once). For an empty app repo,
combine missing app purpose with that request. If neither the request nor repo reveals the platform,
add web/Node, React Native, Swift/iOS or Kotlin/Android to that same question. A known
platform already answers that choice. In an existing app, infer its purpose. Do not add a separate credential or project-choice questionnaire. Ask for completion,
not the key. The account key is different from the SDK development key (`cdt_`).

**Never run login as the agent**, feed a key to its stdin, put one in argv, or open stored
credentials into the transcript. The user runs login; no shell export or agent restart is required.
The login/logout/identity contract (check `croche login --help` on the installed CLI):

- `croche login` validates the key before storing it and prints the account. Non-TTY login can
  read stdin but never argv; that is for user-controlled private automation, not agent collection.
- Storage is in the OS config directory: XDG on Linux, `~/Library/Application Support` on macOS,
  `%APPDATA%` on Windows; POSIX file mode **0600**, Windows user-only ACL. Windows is unverified.
- `croche auth whoami --json` returns account and credential metadata. Capture JSON privately;
  emit only success, account ID and optionally source (`env` or `stored`), never raw output.
  Do not print any part of a key, including prefixes/suffixes or masked previews.
  Use it to verify the intended account; do not repeat private profile details unnecessarily.
- User-run `croche logout` removes stored credentials, not any environment value. For CI only,
  secret-manager-provided `CROCHE_ACCOUNT_KEY` takes precedence over stored login. Do not print
  its value or introduce an export as another onboarding step.

If login is unavailable, report a release blocker, not a substitute release or a secret-printing
workaround. An agent on another machine/container has a separate credential context; never copy
keys through chat to connect it. Then run `croche projects list --json`; reuse a project only
when the app clearly identifies it. Otherwise create an app-specific project in the requested
setup instead of asking the user to fetch/select keys. Leave unrelated projects untouched; create a separate project for this app.
A **project ID** is not a public project key. The public project key is safe to commit;
account, development and server keys are private and must not be committed.

## Create the app setup without exposing the development key

After the user completes signup, account-key creation and `croche login`, do the rest:

```sh
croche projects create --name "My app" --json
croche development-keys create --project PROJECT_ID --json
```

Use the returned project ID and public project key; do not ask the user to retrieve them.
Before writing a secret, check that the chosen env-file path is not already tracked by Git;
never run a broad diff that could expose its contents. Project creation returns `data.project.id`
and `data.project.public_key` with `--json`. Reuse an existing intended project when appropriate
and keep account identity out of unnecessary reports. If project details return `key_format: legacy`,
ask the user to switch the project key in Studio before shipping the app. The user selects
**Project key (public)** → **Rotate project key**. Give the user Studio's confirmation warning:

> If you already shipped a 0.7 app with the old key format, updating to an app version with the new key resets the Croche data on your users’ devices, and they register as new installations.

See [Upgrading from 0.6](https://docs.croche.ai/updating/) for the migration cases. Wait for user
confirmation before re-reading the project details.

**Commands** (check each one's `--help` on the installed CLI):

- `croche development-keys create --project PROJECT_ID --json` writes `CROCHE_DEVELOPMENT_KEY` (`cdt_`)
  to `./.env`. Use only `data.development_key.id` and `data.dotenv_file` from privately captured
  JSON result, **never a secret or prefix**. Do not treat this SDK credential as the CLI account key.
- `--dotenv-file PATH` selects another file in an existing directory. A new file is **0600** on
  POSIX; an existing file preserves its permissions and warns if too permissive. Check/fix
  permissions without printing contents. Windows protection is unverified. The destination
  is added to `.gitignore` in a Git repo, including custom paths; verify it is not tracked.
- An existing nonempty value is refused without `--force`. Preserve the existing file and
  ask before replacing that credential; do not force, clear or retry creation automatically.
- `croche development-keys list --project PROJECT_ID --json` returns `data.development_keys` metadata.
- `croche development-keys revoke --project PROJECT_ID KEY_ID --json` revokes the selected ID;
  `data.development_key` is the result metadata. Revoke only that explicitly authorized key, not
  other keys or every key in the project. Check the installed help before acting.

Never use `--print`: that is a human-only private-terminal option.
Do not use an older CLI's secret output as a workaround. If creation times out, inspect safe
metadata before retrying; do not assume it failed. Load the file directly into the app process,
for example `node --env-file=.env first-turn.mjs`, without exposing it in chat or shell output.

## Common work

| Task | Command (replace `PROJECT_ID` locally) |
| --- | --- |
| Project details | `croche projects get PROJECT_ID --json` |
| Account development allowance and per-user/agent usage | `croche projects usage PROJECT_ID --period week --json` |
| Project production cost | `croche projects cost PROJECT_ID --purpose production --json` |
| Project development cost | `croche projects cost PROJECT_ID --purpose development --json` |
| Recent reported operations | `croche projects operations PROJECT_ID --limit 20 --json` |
| Development-key metadata | `croche development-keys list --project PROJECT_ID --json` |
| Server-key metadata | `croche keys server list PROJECT_ID --json` |
| App verification settings | `croche attestation get PROJECT_ID --json` |
| Draft and released versions | `croche config list --project PROJECT_ID --bundled-base BUNDLE_REVISION` |

`projects cost` shows all-time reported operation cost; usage your runtimes did not report is not included.
Development credits are consumption of the development allowance, not extra charges.
Read `data.cost.purpose`, `period`, `charged_cost_usd`, `known_charged_cost_usd`,
`unknown_operations` and `operations`. A null total means an unknown amount;
zero operations means no received reports, not free usage. The default purpose is
production. `projects usage` remains the account allowance view; it has no purpose flag.
For a per-call figure in the SDK, read the `turn` event's `cost` (`turn.cost`);
do not treat an unknown amount as zero.

## Preview a config draft

Use a test project on the app's Cloud, with a logged-in CLI. Export the exact schema-7
`bundledConfig` passed to `Croche.open` as `./croche.config.json`. This example uses
Bash and `jq` and assumes the bundle declares a chat agent named `support`. Run the
same test prompt once before the change so you can compare replies.

```bash
set -euo pipefail
PROJECT_ID=prj_your_test_project
PREVIEW_DIR=$(mktemp -d)

uploaded=$(croche config push-base ./croche.config.json --project "$PROJECT_ID" --json)
BUNDLE_REVISION=$(jq -er '.data.base.base_revision' <<<"$uploaded")
current=$(croche config get --project "$PROJECT_ID" --bundled-base "$BUNDLE_REVISION" \
  -o "$PREVIEW_DIR/before.json" --json)
DRAFT_HEAD=$(jq -r '.data.config.revision_id // "null"' <<<"$current")

jq --arg base "$BUNDLE_REVISION" --arg path '/agents/support/instructions' '
  (. // {schema: 7, base: $base, set: {}, unset: []})
  | .set[$path] = "Answer support questions. Begin each reply with Preview:."
  | .unset = ((.unset // []) | map(select(. != $path)))
' "$PREVIEW_DIR/before.json" > "$PREVIEW_DIR/draft.json"
saved=$(croche config save "$PREVIEW_DIR/draft.json" --project "$PROJECT_ID" \
  --bundled-base "$BUNDLE_REVISION" --base "$DRAFT_HEAD" --note "Preview support wording" --json)
PREVIEW_REVISION=$(jq -er '.data.config.revision_id' <<<"$saved")

issued=$(croche development-keys create --project "$PROJECT_ID" --name "Draft preview" \
  --dotenv-file "$PREVIEW_DIR/preview.env" --json 2>/dev/null)
PREVIEW_KEY_ID=$(jq -er '.data.development_key.id' <<<"$issued")
```

`--bundled-base` identifies the app build. `--base` is the draft revision read by
`get`, or `null` when that build has no draft. On `draft_conflict`, read the new
head into a different file and reconcile before saving again.

New development keys have `follow_draft` enabled by default. Load `preview.env` into the
test app and pass its `CROCHE_DEVELOPMENT_KEY` as `developmentKey` to `Croche.open`. For Node,
run `node --env-file="$PREVIEW_DIR/preview.env" app.mjs` from a shell without an
existing `CROCHE_DEVELOPMENT_KEY`. Open `support` and let it sync. The local debugger's
`config.delivered` event can confirm that the revision was stored for the next open.
Close and reopen the app, open `support`, and let it sync again. While signed in to Studio, open
`/api/studio/projects/PROJECT_ID/config/applied` on the same Studio origin. Find
your preview Runtime and check `applied.source === "draft"` and
`applied.revision_id === PREVIEW_REVISION`. Then send the same test prompt in a
fresh conversation and check that the reply starts with `Preview:`.

- **Promote.** In Studio, open **Build → AI config → Running config → Config by build base**.
  Select the build base, confirm the draft revision and diff, then have a signed-in person
  choose **Release…** and type the project name to approve.
- **Discard the preview.** Leave the draft unpublished. With approval, revoke the preview
  key using `croche development-keys revoke --project "$PROJECT_ID" "$PREVIEW_KEY_ID"` (capture
  its output privately). Revoking ends this preview and leaves the saved draft in Studio.
  If you need to undo edits to a pre-existing draft, save `before.json` with
  `--base "$PREVIEW_REVISION"`; reconcile first if someone has saved a newer draft.

Use the CLI commands above to issue, list and revoke development keys. If a command returns
`human_session_required`, explain the required Studio action and ask the user to do it. Wait for
confirmation. A `dk_` credential does not authorize doing the action yourself through the CLI, an
API call, or the user's browser session.

## Debug the app already running

`croche debug` lists running apps for the user to choose. For an agent/noninteractive session,
use `croche debug runtimes --json`, then `croche debug connect --attachment-id ATTACHMENT_ID` after
selecting the intended app. No account key is needed for this local debugger path. Keep the
printed viewer/pairing link private. Do not attach an unrelated app, expose the local viewer
publicly, or send/reset user conversations merely to obtain a trace.

## Read results correctly

`--json` gives `{ok:true,data}` or `{ok:false,error:{code,message,details?}}`.
Exit classes: **0** success, **1** remote failure, **2** usage/configuration,
**3** authentication/authorization, **4** transport/timeout. A timeout is not proof a write failed.
Stop on errors; consult `croche-troubleshoot` if available. Report only necessary, redacted data.

For PowerShell encoding, exit handling and quoting, read
[powershell.md](references/powershell.md). Do not replace an unverified command with a guess.
