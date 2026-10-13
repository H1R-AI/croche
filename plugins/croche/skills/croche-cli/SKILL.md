---
name: croche-cli
description: Use the Croche CLI to create an app project and private debug-key file, inspect account/project metadata, edit a draft config, or attach the local debugger. Trigger on croche terminal commands or CLI setup, including PowerShell. Not for writing SDK app code or approving Studio-only actions.
---

<!-- Generated Croche skill content. -->

# Croche CLI

Do the permitted CLI work and explain the next user action. Node.js 22+ on macOS/Linux;
Windows verification pending. Check `croche --help` and installed version before relying on
a command. CLI 0.5.1 is published on npm; platform and login verification remain separate.
With installation permission:

```sh
npm install -g @h1r-ai/croche-cli
croche --help
```

The package is `@h1r-ai/croche-cli`; its executable is `croche`.

## Capture command output before it reaches the transcript

The CLI operations below may return credential prefixes. Use a capturing subprocess or shell
variable, parse the JSON privately, and output only required non-key fields (success, account ID,
project ID, destination path). Never echo raw JSON, stderr, `.credential.prefix` or `.debug_key.prefix`.
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

Use the same capture-and-allowlist pattern for project/debug-key commands. Do not print a
subprocess exception containing captured output. Use the PowerShell reference for that shell;
this example is not a Windows execution claim.

## Authenticate without collecting a secret

After installing the CLI, if the account is not already configured, make the same **one combined
request** as `croche`: sign up in Studio, create one account key (`dk_`) under **Account → Account
keys** (under **Personal**), then run **`croche login` themselves in any private terminal on the
same machine and OS account**, entering the key only at its hidden prompt (PowerShell that refuses
`croche` because scripts are disabled: the human first runs `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once). For an empty app repo,
combine missing app purpose with that request. If neither the request nor repo reveals the platform,
add web/Node, React Native, Swift/iOS or Kotlin/Android to that same question. A known
platform already answers that choice. In an existing app, infer its purpose. Do not add a separate credential or project-choice questionnaire. Ask for completion,
not the key. The account key is different from the SDK debug key (`cdt_`).

**Never run login as the agent**, feed a key to its stdin, put one in argv, or open stored
credentials into the transcript. The user runs login; no shell export or agent restart is required.
TODO verify: the login/logout/identity contract against the matching released CLI:

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

If login is unavailable, report a release blocker, not a guessed `npx` form or a secret-printing
workaround. An agent on another machine/container has a separate credential context; never copy
keys through chat to connect it. Then run `croche projects list --json`; reuse a project only
when the app clearly identifies it. Otherwise create an app-specific project in the requested
setup instead of asking the user to fetch/select keys. A **project ID** is not a public project key.

## Create the app setup without exposing the debug key

After the user completes signup, developer-key creation and `croche login`, do the rest:

```sh
croche projects create --name "My app" --json
croche debug-keys create --project PROJECT_ID --json
```

Use the returned project ID and public project key; do not ask the user to retrieve them.
Before writing a secret, check that the chosen env-file path is not already tracked by Git;
never run a broad diff that could expose its contents. Project creation returns `data.project.id`
and `data.project.public_key` with `--json`. Reuse an existing intended project when appropriate
and keep account identity out of unnecessary reports.

**Candidate commands — TODO verify** against the matching published CLI:

- `croche debug-keys create --project PROJECT_ID --json` writes `CROCHE_DEBUG_KEY` (`cdt_`)
  to `./.env`. Use only `data.debug_key.id` and `data.env_file` from privately captured
  JSON result, **never a secret or prefix**. Do not treat this SDK credential as the CLI account key.
- `--env-file PATH` selects another file in an existing directory. A new file is **0600** on
  POSIX; an existing file preserves its permissions and warns if too permissive. Check/fix
  permissions without printing contents. Windows protection is unverified. The destination
  is added to `.gitignore` in a Git repo, including custom paths; verify it is not tracked.
- An existing nonempty value is refused without `--force`. Preserve the existing file and
  ask before replacing that credential; do not force, clear or retry creation automatically.
- `croche debug-keys list --project PROJECT_ID --json` returns `data.debug_keys` metadata.
- `croche debug-keys revoke --project PROJECT_ID KEY_ID --json` revokes the selected ID;
  `data.debug_key` is the result metadata. Revoke only that explicitly authorized key, not
  other keys or every key in the project. Check the installed help matches this candidate.

Never use `--print`: that is a human-only private-terminal option.
Do not use an older CLI's secret output as a workaround. If creation times out, inspect safe
metadata before retrying; do not assume it failed. Load the file directly into the app process,
for example `node --env-file=.env first-turn.mjs`, without exposing it in chat or shell output.

## Common work

| Task | Command (replace `PROJECT_ID` locally) |
| --- | --- |
| Project details | `croche projects get PROJECT_ID --json` |
| Usage and remaining allowance | `croche projects usage PROJECT_ID --period week --json` |
| Recent reported operations | `croche projects operations PROJECT_ID --limit 20 --json` |
| Debug-key metadata | `croche debug-keys list --project PROJECT_ID --json` |
| Server-key metadata | `croche keys server list PROJECT_ID --json` |
| App verification settings | `croche attestation get PROJECT_ID --json` |
| Draft to a local file | `croche config get --project PROJECT_ID -o draft.json` |
| Save requested draft edits | `croche config save draft.json --project PROJECT_ID --note "Update instructions"` |
| Draft and released versions | `croche config list --project PROJECT_ID` |

For config edits, load `croche-config` if installed: drafts replace the entire config and
reach development installs. Read the draft before editing; preserve its other fields. On
`draft_conflict`, get the current draft into a **different file**, reconcile with the user's
edit, and save deliberately. Do not force an empty base or blindly retry. The human reviews
cards and diff at **Build → AI config → Running config**, chooses **Release…**, and types the
project name to approve. Production installs apply the release on their next open after sync.
Studio is not a draft editor.

Debug-key creation/list/revoke use the candidate CLI flow above. Guide the user to Studio for
account developer-key or server-key administration, app verification, budgets, project
pause/archive or production release. A `dk_` credential does not authorize bypassing human-only approval.

## Debug the app already running

`croche debug` lists running apps for the user to choose. For an agent/noninteractive session,
use `croche debug runtimes --json`, then `croche debug connect --runtime-id RUNTIME_ID` after
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
