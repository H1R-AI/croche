<!-- Generated from packages/cli/README.md by scripts/build-plugin.ts. Edit the source, then run npm run build:plugin. -->

# Croche CLI

`@h1r-ai/croche-cli` is an independently installable Node 22+ CLI for Croche Cloud accounts and explicitly attached local Runtimes. It has no production npm dependencies and never needs a model provider key.

```sh
npm install --global @h1r-ai/croche-cli
croche --help
croche projects --help --json
```

## Debug a running app

Keep the development app open, then run:

```sh
croche debug
```

The CLI starts or reuses the local control broker, waits briefly for apps to
advertise themselves, and lists available Runtimes. In a terminal, choose a
Runtime by number. The CLI starts or reuses the bundled debugger, attaches that
Runtime through its advertised `debug.attach` capability, and prints a viewer
link filtered to that Runtime. It preserves the existing conversation and any
captures already held by the running debugger. This requires no Cloud account,
developer key, provider key, or separate debugger installation.

For automation, the bare command returns the available Runtime list without
prompting or choosing automatically. Use an explicit ID to connect:

```sh
croche debug runtimes --json
croche debug connect --runtime-id RUNTIME_ID
croche debug disconnect --runtime-id RUNTIME_ID
croche debug status --json
```

`connect` attaches the selected Runtime before returning the standalone server's
viewer URL. Open that URL in your browser to inspect the app. `disconnect`
acknowledges detachment from the selected Runtime; it leaves the debugger server
and retained captures available and does not cancel an active app turn.

The normal Croche Chat development app advertises its debugger capability through
an authenticated development relay. Other apps must attach their existing Runtime
to the local broker with the SDK's debugger adapter. A Runtime without that
capability is listed as unavailable for debugger attachment. Captures begin when
the observer attaches; attaching during a turn can yield an incomplete capture.

Supporting commands:

```sh
croche debug start
croche debug token
croche debug connect --runtime-id RUNTIME_ID --port 8792 --connection-file /private/path/debugger.json
croche debug stop
```

`start` starts or reuses the collector without selecting a Runtime. `status`
never starts a service or prints a token. `connect` explicitly prints the complete
`http://127.0.0.1:8790/#token=...&runtime=...` pairing link; `token` explicitly
reveals the saved pairing token. Treat those two outputs as local credentials.
The standalone viewer can also authenticate an unpaired browser using the token
from `croche debug token`. Chat's development relay currently supports the default
debugger port 8790; other ports require an
app adapter that supports that destination.

`stop` stops the collector `start` launched, selected the same way (`--port`,
`--connection-file`). It asks the collector to shut down with the saved pairing token
(`POST /api/shutdown`), and waits until the port is closed. Its captures are discarded. The
connection file and its pairing token are kept, so the next `start` reuses the token. `start`
also records the collector's process id beside the connection file (`connection.json.pid`); only
if the collector is still running after the request, and itself reports that same process id,
is that process terminated (`method: "terminated"`). A process id it cannot tie to the running
collector is never killed: a port that is closed means "not running", and a port that answers
without the pairing token is refused. Not running is success (exit 0, `stopped: false`); a
collector that could not be stopped is exit 4 (`local_port_occupied` or `debug_stop_failed`).
A collector started by an older CLI has no shutdown request and recorded no process id; stop it
from its terminal or task manager.

### Observing from Studio

```sh
croche debug start                  # also prints a one-time Studio link
croche debug --studio-link          # a fresh link while the collector runs
croche debug start --studio-origin http://localhost:5173   # a dev Studio, set when the collector starts
```

A Studio link looks like
`https://studio.croche.ai/studio#pair=CODE&broker=http://127.0.0.1:8790`. Its code
works once, for 10 minutes, and only from the Studio origin; at most 8 are
outstanding. Studio exchanges it for an observe-only token (6 hours, memory only) and
streams the collector's events over `GET /api/debug/events`
(`docs/DEBUG-PAIRING.md` in croche-runtime). That token cannot send
events, pause or clear, and the link never reveals the pairing token.

Studio receives only events a Runtime stamped `visibility: "runtime"`: the app's own
traffic, without model request bodies, Croche instructions or private facts. Events
stamped `full`, or unstamped (Runtimes before 0.9), are counted but withheld.

To watch an app from Studio, attach its Runtime in the public view:

```sh
croche debug connect --runtime-id RUNTIME_ID --visibility runtime   # or: croche debug --visibility runtime
```

This prints the local viewer link and a one-time Studio link. Without
`--visibility`, `connect` defaults to `runtime`. Public builds refuse `full` even
with a debug key. Explicit `--visibility full` is for owner-only Core builds
with `internal-debug`; never publish those artifacts. Studio withholds those
private entries. See [private builds](../../docs/INTERNAL-DEBUG.md).

The CLI generates credentials once and stores them in private mode-0600 JSON
files under the OS user state directory. On Linux, the default paths are:

- `${XDG_STATE_HOME:-~/.local/state}/croche/debugger/connection.json`
- `${XDG_STATE_HOME:-~/.local/state}/croche/control/connection.json`

On macOS the base is `~/Library/Application Support`; on Windows it is
`LOCALAPPDATA`. In PowerShell the Windows defaults are:

- `$env:LOCALAPPDATA\croche\debugger\connection.json`
- `$env:LOCALAPPDATA\croche\control\connection.json`

Nondefault ports use `connection-PORT.json`. `--connection-file`
selects a debugger file; `--control-connection-file` or
`CROCHE_CONTROL_CONNECTION_FILE` selects a broker file. Existing legacy debugger
files `{url,pairedUrl,pairingToken}` and broker files `{url,token}` are accepted
when private and owned by the current user. Pairing links are rebuilt from the
validated URL/token; arbitrary saved links are not followed. State directory
components must not be symlinks or writable by other users.

On Windows, file modes do not exist: Node reports every writable file and
directory as `0666`, and `0600`/`0700` are not applied. The CLI therefore skips
the owner, mode-0600 and other-writable checks there (symlinks are still
refused), and the connection file relies on the ACL of the user profile
(`LOCALAPPDATA` is under it by default). A `--connection-file` or
`CROCHE_CONTROL_CONNECTION_FILE` outside the profile gets only that folder's ACL.

An existing `CROCHE_CONTROL_TOKEN`/`CROCHE_CONTROL_URL` may identify the same broker;
conflicting saved credentials are refused. When importing a previously running
collector or broker, copy its existing connection file to the selected private
path with mode 0600 before starting. An occupied port with an unknown token is
refused; the CLI never overwrites a service's token or clears captures, and stops only the
collector that answers with the saved pairing token (`croche debug stop`).
Concurrent starts use an exclusive lock. If a process dies while holding that
lock, verify that startup has ended before manually removing the `.lock` file.

Detached child processes receive their token in the environment, never in argv.
They continue running after the CLI exits. Collector captures and broker request
queues remain bounded in-memory data; the private connection file preserves the
credential, not captures across a server restart. `croche debug stop` stops the
collector; no command stops the broker or rotates a token.

## Account and project commands

Create a developer key in an authenticated Studio session. Cloud returns its secret once, stores only a SHA-256 hash, and supports revocation. Run `croche login` yourself once in your terminal; enter the key in its hidden prompt. Coding agents must never run login or ask for the key in chat. `CROCHE_DEVELOPER_KEY` remains an optional environment override. The CLI connects to Croche automatically. Credentials are never command arguments or URL parameters.

```sh
croche auth whoami --json
croche projects list
croche projects create --name "Story companion"
croche projects get PROJECT_ID
croche projects update PROJECT_ID --name "New name" --policy-file policy.json
croche projects operations PROJECT_ID --limit 100
croche projects cost PROJECT_ID --json
croche runtimes list --project-id PROJECT_ID
```

New projects have a $10 monthly production budget and app access enabled.
Change production budgets in web Studio. Use web Studio for server-key issuance/revocation/rotation, security and attestation
settings, allowances, project pause/archive, Runtime blocking and production promotion.
The CLI uses only a `dk_` developer key for Cloud requests; Cloud enforces its agent scope.
An explicit bearer never falls back to a browser cookie. The account remains an evaluation
account; a developer key does not imply a paid subscription.

`projects update --policy-file` accepts only a JSON object with a `routing` field, for
example `{"routing":{"mode":"preferred","providers":["openai"]}}`; `{"routing":null}` clears that override.
Allowance, host budget control, attestation and other policy fields are refused before
HTTP. Routing's provider order and quantizations remain agent-editable until they move
into the snapshot. Cloud validates the routing contents and applies its fixed data policy.

Read-only commands still show project usage, key metadata and attestation settings.
The all-time cost endpoint reports known cost and unresolved operation count;
`charged_cost_usd: null` means a final total is unknown. Developer-key metadata,
issuance and revocation are available only in web Studio.

## App credentials, attestation and usage

Inspect credential metadata, attestation and usage with the developer key.
The coding agent can issue and revoke debug keys with the CLI. Server credentials and attestation changes stay in web Studio.

```sh
# Simulators, emulators and your own devices: a debug key, used as `debugKey` in debug
# builds only. Calls use your weekly development allowance, never Runtime Credit.
croche debug-keys create --project PROJECT_ID
# Writes CROCHE_DEBUG_KEY to ./.env without printing it. Use --env-file PATH to choose
# the destination. Existing values require --force; tracked files are refused.
croche debug-keys list --project PROJECT_ID
croche debug-keys revoke --project PROJECT_ID KEY_ID

# A web app's own backend (one Runtime per end user): a server key, kept on the server.
croche keys server list PROJECT_ID

# Release builds on real devices: App Attest / Play Integrity settings.
croche attestation get PROJECT_ID

# What each end user and each agent cost, and what is left to spend.
croche projects usage PROJECT_ID --period week   # week | month (default) | all
```

These commands run unchanged in PowerShell: `#` starts a comment there too, so the `|` in
the last comment is not a pipe.

Files the CLI reads (`--policy-file`, `--text-file` and the connection
files) are UTF-8, with or without a leading byte order mark (BOM), so a file saved by Windows
PowerShell with `-Encoding UTF8` works as-is. A UTF-16 file, which Windows PowerShell 5.1
writes with `>` or `Out-File`, is refused with `unsupported_encoding` (exit 2): save it as
UTF-8. In PowerShell, keep the JSON in a single-quoted here-string:

```powershell
$json = @'
{"routing":{"mode":"preferred","providers":["openai"]}}
'@
# pwsh 7: Set-Content (and >) write UTF-8.
Set-Content -Path policy.json -Value $json
# Windows PowerShell 5.1: > and Out-File write UTF-16, which is refused. Use -Encoding UTF8:
Set-Content -Path policy.json -Value $json -Encoding UTF8
```

## Opt-in local Runtime control

Set a separate `CROCHE_CONTROL_TOKEN` containing 24–4096 URL-safe characters, then start the loopback broker:

```sh
croche control serve
```

The broker binds `127.0.0.1:8791`. It does not open Runtime storage. Apps explicitly attach an existing Runtime through the SDK and advertise supported capabilities:

```ts
import { attachRuntimeControl } from '@h1r-ai/croche/control';

const connection = await attachRuntimeControl({
  runtime,
  token: localControlToken,
  tools: () => runtime.tools(),
  // Route through your app's normal send path to retain transcript/context rules.
  send: (input, { signal }) => appSend(input, { signal }),
  cancel: () => appCancel(),
});
// On app teardown:
await connection.close();
```

For a browser reload, pass `registrationTimeoutMs: 20000` to wait for the old attachment’s 15-second lease to expire. By default, duplicate attachment fails immediately. This wait only repeats registration; it never repeats a dispatched command.

The helper preserves the existing Runtime identity. A host adapter receives only `{id, text}` and an abort signal. Control cannot inject system context or change a send's kind. Without adapters, send uses public `runtime.send`, and cancellation affects sends initiated by that attachment. Supply app-owned adapters when other application work must also be cancellable. Cancellation never implies that an already executed effect was rolled back.

```sh
croche runtime list --json
croche runtime status --runtime-id RUNTIME_ID
croche runtime tools --runtime-id RUNTIME_ID
croche runtime history --runtime-id RUNTIME_ID --offset 0 --limit 50
croche runtime send --runtime-id RUNTIME_ID --id INPUT_ID --text "Continue the story" --request-id REQUEST_ID
croche runtime cancel --runtime-id RUNTIME_ID
croche runtime sync --runtime-id RUNTIME_ID
croche runtime budget get --runtime-id RUNTIME_ID
croche runtime budget set --runtime-id RUNTIME_ID --amount 1
croche runtime result --request-id REQUEST_ID --json
```

`--text-file PATH` replaces `--text` for multiline input. Local URL precedence is `--control-url`, then `CROCHE_CONTROL_URL`, then `http://127.0.0.1:8791`; only loopback HTTP origins are accepted. Account developer keys do not authenticate local control.

The broker authenticates every request, bounds request/response memory, and disables CORS by default. Browser apps must explicitly allow their exact origin with `croche control serve --allow-origin https://your-development-origin.example`; several origins are comma-separated, and in PowerShell the list must be quoted (`--allow-origin 'https://a.example,https://b.example'`), because an unquoted `a,b` is an array that PowerShell passes as two arguments. Alternatively, use a trusted same-origin development relay with the helper's injected `fetch`. An HTTPS page cannot directly fetch plain HTTP loopback in every browser. Do not add control transport to production automatically or embed the token in a public bundle.

The broker's queue and result receipts are in memory, bounded to 1,000 requests and 8 MiB. Finished receipts expire after 30 minutes. A disconnected in-flight action is reported as uncertain and is never automatically delivered again. Use `runtime result` after a CLI timeout. If the broker restarts, use the same durable **input ID** when deliberately resubmitting; the SDK and app's normal persisted receipt rules determine replay. Reusing an input ID with changed input is rejected. A broker request ID is distinct from that durable input ID.

## Automation and development

`--json` emits one object: `{ok:true,data}` or `{ok:false,error:{code,message,details?}}`. Help works without credentials. Errors never silently retry an action. Exit codes are 0 success, 1 remote failure, 2 usage/configuration, 3 authentication/authorization, and 4 transport/timeout (a timed-out control request may still be running).

<!-- studio-cli-json:start -->
### Frozen Cloud JSON fields

The hackathon CLI freezes the field paths and JSON types below, from
[studio-cli-json.json](../../vectors/studio-cli-json.json). Additions are free;
renames/removals require a new path alongside the old one. `[]` means every
array member; `|null` marks a nullable value. Empty lists have no members.
Config content follows the project-config grammar, so its application fields
are not required on every document. Local `debug`, `control` and `runtime`
commands use their separate local protocols and are outside this Cloud freeze.
Human-only `login` and `logout` are also outside the agent-callable freeze.

Success is `{ok:true,data}`; refusal is `{ok:false,error:{code,message,details?}}`.
Exit classes stay 0 success, 1 remote failure, 2 usage/configuration,
3 authentication/authorization and 4 transport/timeout. Cloud human-only
operations continue to refuse agent authority with `human_session_required`.
Default agent-callable Cloud output never contains a one-time secret. Credential metadata
uses `prefix`; project `public_key` is returned only in project views.
`decryption_key` must never appear, even when attestation is configured.

| Shape | Relative paths and JSON types |
| --- | --- |
| `project` | `id`: string; `name`: string; `created_at`: string; `public_key`: string; `status`: string; `app_access_enabled`: boolean; `budget`: object; `budget.limit_usd`: number; `budget.period`: string; `budget.used_usd`: number; `runtime_policy`: object; `runtime_policy.default_user_allowance_usd`: number; `runtime_policy.host_budget_control_enabled`: boolean; `runtime_policy.max_user_allowance_usd`: number; `runtime_policy.max_single_adjustment_usd`: number; `runtime_policy.attestation`: string; `allowed_models`: array; `allowed_models[]`: string |
| `account` | `access`: string; `id`: string; `name`: string; `email`: string; `admin`: boolean; `plan`: object\|null; `credit_balance_usd`: number; `outstanding_key_limits_usd`: number; `spent_usd`: number |
| `plan` | `plan_id`: string; `name`: string; `ends_at`: string |
| `routing` | `mode`: string; `providers`: array; `providers[]`: string; `quantizations`: array; `quantizations[]`: string |
| `key_metadata` | `id`: string; `name`: string; `prefix`: string; `created_at`: string; `last_used_at`: string\|null; `revoked_at`: string\|null; `installations`: number |
| `development_key` | `follow_draft`: boolean; `warning`: string\|null |
| `server_key` | `spent_usd`: number |
| `cost` | `project_id`: string; `currency`: string; `period`: string; `scope`: string; `charged_cost_usd`: number\|null; `known_charged_cost_usd`: number; `unknown_operations`: number; `operations`: number |
| `development_usage` | `scope`: string; `week_start`: string; `calls`: number; `unknown_calls`: number; `known_percent`: number\|null; `used_percent`: number\|null; `remaining_percent`: number\|null |
| `usage` | `project_id`: string; `period`: string; `since`: string\|null; `project`: object; `project.limit_usd`: number; `project.used_usd`: number; `project.remaining_usd`: number; `project.period_start`: string; `development`: object; `by_user`: array; `by_agent`: array |
| `usage_row` | `calls`: number; `runtime_usd`: number; `subscription_calls`: number; `subscription_percent`: number\|null; `unsettled_calls`: number; `prompt_tokens`: number; `cached_tokens`: number; `completion_tokens`: number; `last_call_at`: string |
| `operation` | `agent_instance_id`: string\|null; `operation_id`: string; `project_id`: string; `operation_type`: string; `name`: string; `status`: string; `model`: string\|null; `provider`: string\|null; `error_code`: string\|null; `parent_operation_id`: string\|null; `cost_status`: string; `duration_ms`: number; `started_at`: string; `user_id`: string; `agent_id`: string; `runtime_instance_id`: string; `session_id`: string; `turn_id`: string; `generation_id`: string\|null; `billed_to`: string; `access_path`: string; `charged_cost_usd`: number\|null; `installation_id`: string\|null |
| `operation_metadata` | `prompt_tokens`: number; `cached_tokens`: number; `completion_tokens`: number; `ttft_ms`: number; `gateway_status`: number; `streamed`: boolean; `purpose`: string; `finish_reason`: string |
| `runtime` | `runtime_instance_id`: string; `user_id`: string; `user`: string; `attested_by`: string; `access_path`: string; `attestation_outcome`: string\|null; `attestation_reason`: string\|null; `attestation_platform`: string\|null; `app_version`: string\|null; `sdk`: string; `sdk_version`: string; `status`: string; `last_seen_at`: string; `spent_usd`: number |
| `ios` | `team_id`: string; `bundle_id`: string; `allow_development`: boolean |
| `android` | `package_name`: string; `certificate_sha256`: array; `certificate_sha256[]`: string; `verification_key`: string; `decryption_key_set`: boolean; `recent_failures`: array; `recent_failures[].reason`: string; `recent_failures[].installs`: number; `recent_failures[].last_at`: string |
| `unverified_path` | `enabled`: boolean; `limit_usd`: number; `key_status`: string; `spent_usd`: number; `spent_this_period_usd`: number; `remaining_usd`: number; `installs`: number; `unknown_cost_calls`: number |
| `draft` | `revision_id`: string; `schema`: number; `document`: object; `document.schema`: number; `document.config`: object; `updated_by`: string; `updated_at`: string |
| `version` | `project_id`: string; `version`: number; `revision_id`: string; `kind`: string; `from_version`: number\|null; `note`: string\|null; `released_by`: string; `released_at`: string; `applied_7d`: number |
| `unverified_install` | `installation_id`: string; `attestation_outcome`: string\|null; `attestation_reason`: string\|null; `platform`: string\|null; `sdk`: string; `sdk_version`: string; `app_version`: string\|null |
| `debug_key` | `warning`: string\|null |

| Command / variant | Frozen paths (relative to the JSON envelope) |
| --- | --- |
| `auth whoami` / account | `ok`: boolean; `data`: object; `data.account`: object; `data.credential.source`: string; `data.credential.prefix`: string; `data.account` → `account`; `data.account.plan` → `plan` |
| `projects list` / projects-list | `ok`: boolean; `data`: object; `data.projects`: array; `data.projects[]` → `project` |
| `projects create` / project-create | `ok`: boolean; `data`: object; `data.project`: object; `data.project` → `project` |
| `projects get` / project-get | `ok`: boolean; `data`: object; `data.project`: object; `data.project` → `project` |
| `projects update` / project-update | `ok`: boolean; `data`: object; `data.project`: object; `data.project.runtime_policy.routing`: object; `data.project` → `project`; `data.project.runtime_policy.routing` → `routing` |
| `projects operations` / operations | `ok`: boolean; `data`: object; `data.operations`: array; `data.has_more`: boolean; `data.next_cursor`: object\|null; `data.operations[]` → `operation`; `data.operations[]` → `operation_metadata` |
| `projects operations` / operations-pagination | `ok`: boolean; `data`: object; `data.operations`: array; `data.has_more`: boolean; `data.next_cursor`: object; `data.next_cursor.started_at`: string; `data.next_cursor.operation_id`: string; `data.operations[]` → `operation`; `data.operations[]` → `operation_metadata` |
| `projects operations` / operation-production-cost | `ok`: boolean; `data`: object; `data.operations`: array; `data.has_more`: boolean; `data.next_cursor`: object\|null; `data.operations[].provider_cost_usd`: number\|null; `data.operations[]` → `operation`; `data.operations[]` → `operation_metadata` |
| `projects operations` / operations-unverified-failure | `ok`: boolean; `data`: object; `data.operations`: array; `data.has_more`: boolean; `data.next_cursor`: object\|null; `data.operations[].unverified`: object\|null; `data.operations[].error_detail_code`: string; `data.operations[]` → `operation`; `data.operations[]` → `operation_metadata`; `data.operations[].unverified` → `unverified_install` |
| `projects cost` / cost-unresolved | `ok`: boolean; `data`: object; `data.cost`: object; `data.cost.charged_cost_usd`: null; `data.cost` → `cost` |
| `keys development list` / development-keys | `ok`: boolean; `data`: object; `data.debug_tokens`: array; `data.debug_tokens[]` → `key_metadata`; `data.debug_tokens[]` → `development_key` |
| `keys server list` / server-keys | `ok`: boolean; `data`: object; `data.server_keys`: array; `data.server_keys[]` → `key_metadata`; `data.server_keys[]` → `server_key` |
| `projects usage` / usage-week | `ok`: boolean; `data`: object; `data.usage`: object; `data.usage.by_user[].user_id`: string; `data.usage.by_user[].user`: string; `data.usage.by_agent[].agent_id`: string; `data.usage` → `usage`; `data.usage.development` → `development_usage`; `data.usage.by_user[]` → `usage_row`; `data.usage.by_agent[]` → `usage_row` |
| `projects usage` / usage-month | `ok`: boolean; `data`: object; `data.usage`: object; `data.usage.by_user[].user_id`: string; `data.usage.by_user[].user`: string; `data.usage.by_agent[].agent_id`: string; `data.usage` → `usage`; `data.usage.development` → `development_usage`; `data.usage.by_user[]` → `usage_row`; `data.usage.by_agent[]` → `usage_row` |
| `projects usage` / usage-all | `ok`: boolean; `data`: object; `data.usage`: object; `data.usage.by_user[].user_id`: string; `data.usage.by_user[].user`: string; `data.usage.by_agent[].agent_id`: string; `data.usage` → `usage`; `data.usage.development` → `development_usage`; `data.usage.by_user[]` → `usage_row`; `data.usage.by_agent[]` → `usage_row` |
| `attestation get` / attestation | `ok`: boolean; `data`: object; `data.attestation`: object; `data.attestation.ios`: object\|null; `data.attestation.android`: object\|null; `data.attestation.unverified_path`: object; `data.attestation.ios` → `ios`; `data.attestation.android` → `android`; `data.attestation.unverified_path` → `unverified_path` |
| `runtimes list` / runtimes | `ok`: boolean; `data`: object; `data.runtimes`: array; `data.runtimes[]` → `runtime` |
| `config get` / config-get-draft | `ok`: boolean; `data`: object; `data.schema`: number; `data.config`: object |
| `config get` / config-get-revision | `ok`: boolean; `data`: object; `data.schema`: number; `data.config`: object |
| `config get` / config-get-version | `ok`: boolean; `data`: object; `data.version`: number; `data.revision`: string; `data.config`: object |
| `config get` / config-get-output | `ok`: boolean; `data`: object; `data.file`: string; `data.revision_id`: string\|null |
| `config get` / config-get-version-output | `ok`: boolean; `data`: object; `data.file`: string; `data.revision_id`: string\|null; `data.version`: number |
| `config save` / config-save | `ok`: boolean; `data`: object; `data.revision_id`: string; `data.created`: boolean |
| `config list` / config-list | `ok`: boolean; `data`: object; `data.versions`: array; `data.draft`: object\|null; `data.versions[]` → `version`; `data.draft` → `draft` |
| `auth whoami` / account-no-plan | `ok`: boolean; `data`: object; `data.account`: object; `data.account.plan`: null; `data.credential.source`: string; `data.credential.prefix`: string; `data.account` → `account` |
| `projects operations` / empty-operations | `ok`: boolean; `data`: object; `data.operations`: array; `data.has_more`: boolean; `data.next_cursor`: null |
| `keys development list` / empty-development-keys | `ok`: boolean; `data`: object; `data.debug_tokens`: array |
| `keys server list` / empty-server-keys | `ok`: boolean; `data`: object; `data.server_keys`: array |
| `runtimes list` / empty-runtimes | `ok`: boolean; `data`: object; `data.runtimes`: array |
| `projects cost` / cost-known | `ok`: boolean; `data`: object; `data.cost`: object; `data.cost.charged_cost_usd`: number; `data.cost` → `cost` |
| `projects usage` / empty-usage | `ok`: boolean; `data`: object; `data.usage`: object; `data.usage` → `usage`; `data.usage.development` → `development_usage` |
| `attestation get` / empty-attestation | `ok`: boolean; `data`: object; `data.attestation`: object; `data.attestation.ios`: null; `data.attestation.android`: null; `data.attestation.unverified_path`: object; `data.attestation.unverified_path` → `unverified_path` |
| `config get` / empty-config-get | `ok`: boolean; `data`: null |
| `config get` / empty-config-output | `ok`: boolean; `data`: object; `data.file`: string; `data.revision_id`: null |
| `config list` / empty-config-list | `ok`: boolean; `data`: object; `data.versions`: array; `data.draft`: null |
| `projects list` / empty-projects-list | `ok`: boolean; `data`: object; `data.projects`: array |
| `debug-keys create` / debug-keys-create | `ok`: boolean; `data`: object; `data.debug_key`: object; `data.env_file`: string; `data.debug_key` → `key_metadata`; `data.debug_key` → `debug_key` |
| `debug-keys list` / debug-keys-list | `ok`: boolean; `data`: object; `data.debug_keys`: array; `data.debug_keys[]` → `key_metadata`; `data.debug_keys[]` → `debug_key` |
| `debug-keys revoke` / debug-keys-revoke | `ok`: boolean; `data`: object; `data.debug_key`: object; `data.debug_key` → `key_metadata`; `data.debug_key` → `debug_key` |

| Refusal / exit class | Frozen paths |
| --- | --- |
| remote / 1 | `ok`: boolean; `error`: object; `error.code`: string; `error.message`: string |
| draft-conflict / 1 | `ok`: boolean; `error`: object; `error.code`: string; `error.message`: string; `error.details`: object; `error.details.head`: string |
| usage / 2 | `ok`: boolean; `error`: object; `error.code`: string; `error.message`: string |
| authentication / 3 | `ok`: boolean; `error`: object; `error.code`: string; `error.message`: string |
| transport / 4 | `ok`: boolean; `error`: object; `error.code`: string; `error.message`: string |

<!-- studio-cli-json:end -->

### PowerShell (Windows)

Coding agents on Windows usually call the CLI through PowerShell. The forms below follow
PowerShell's documented rules; they have not yet been run on Windows.

```powershell
# Configuration is process environment, as with export in sh. Take secrets from your secret
# manager rather than typing them on the command line.

# Exit status of the last native command (0-4, see above). $? is only true or false.
croche projects list --json
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

# Parse --json output. Set UTF-8 first: PowerShell decodes native output with the console
# code page, which garbles non-ASCII names such as Korean project names.
[Console]::OutputEncoding = [Text.UTF8Encoding]::new()
$result = croche projects list --json | ConvertFrom-Json
$result.data

# A Windows path for --connection-file.
croche debug connect --runtime-id RUNTIME_ID --port 8792 --connection-file "$env:LOCALAPPDATA\croche\debugger\connection-8792.json"

# Stop the local debugger. Not running is also exit 0; check stopped in the output.
$stop = croche debug stop --json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$stop.data.stopped
croche debug stop --port 8792 --connection-file "$env:LOCALAPPDATA\croche\debugger\connection-8792.json"
```

- **Quoting.** Single quotes are literal strings and double quotes expand `$`.
  `--name "Story companion"` works unchanged. No flag takes JSON on the command line; JSON
  input is always a file (`--policy-file`), written as shown above.
- **Text that contains `"`.** In pwsh 7.3 and later, `--text 'She said "go"'` reaches the
  CLI intact. Windows PowerShell 5.1 and pwsh 7.2 or earlier
  (`$PSNativeCommandArgumentPassing` is `Legacy`) do not escape embedded double quotes. There, write
  `\"` (`--text 'She said \"go\"'`), or better, put the text in a file and pass `--text-file PATH`.
  Prefer `--text-file` for any text with quotes, line breaks or `& | < > ^ %`.
- **`croche.cmd`.** npm installs `croche.ps1` and `croche.cmd`. If the execution policy blocks
  `croche.ps1`, calling `croche.cmd` works, but its arguments then pass through `cmd.exe`,
  which interprets `& | < > ^ %` and `"`. Use `--text-file` for free text.
- **Chaining.** pwsh 7 supports `a && b`. Windows PowerShell 5.1 does not; use
  `a; if ($LASTEXITCODE -eq 0) { b }`.
- **Stopping on Windows.** `debug stop` sends the same authenticated request as on Linux and
  macOS. Its fallback, for a collector that does not exit and reports the recorded process id,
  uses Node's `process.kill`, which on Windows ends the process at once (no signal handler
  runs). This path has been tested only with `process.platform` stubbed on Linux.
- **Paths in output.** `connectionFile` in `debug status --json`, `debug start --json` and `debug stop --json` is a
  native path (`C:\...\connection.json` on Windows). JSON escapes each backslash, and
  `ConvertFrom-Json` restores it.

From this repository, run `npm run test --workspace @h1r-ai/croche-cli`, `npm run typecheck --workspace @h1r-ai/croche-cli`, and `npm run build --workspace @h1r-ai/croche-cli`. Build/prepack compiles the current standalone debugger sources into `dist/debugger/server` and copies its static viewer into `dist/debugger/public`. The installed tarball has no production npm dependencies or monorepo lookup. Cloud key isolation tests are in `apps/cloud/tests/developer-keys.test.ts`. They use only in-memory accounts and never contact a provider.

## Project configuration

Set `CROCHE_DEVELOPER_KEY` and `CROCHE_PROJECT` (or pass `--project ID`).

```sh
croche config get -o draft.json
croche config save draft.json --note "Update instructions"
croche config list
croche config get --version 1 -o bundled.json
```

Each save creates a content-addressed draft revision. `get` remembers the draft
head in the local CLI state directory, separately for each project and Cloud
origin; `save` uses that base unless `--base REVISION` is supplied. A conflicting
save names the new head and stops. Read the draft again and reconcile your edit.
The state contains revision ids only, and `CROCHE_CLI_STATE_DIR` may select an
absolute directory. `--base null` explicitly starts from an empty draft.

`get --revision REVISION` reads historical content. `get --version N` exports
`{version, revision, config}` for bundling and preserves the saved draft base.
Production versions are immutable and numbered. Release a candidate or roll back
by releasing older content as a new higher version in web Studio; these approvals
are human-only. Drafts are delivered only to development-key
Runtimes whose key follows drafts. Other Runtimes receive the highest compatible
released version above their bundled version, at their next open.

### Human credential setup

Sign up in Studio, create a developer key, then run `croche login` once in
your terminal. The prompt hides the key; redirected stdin is also supported.
Never put a key in command arguments or a chat conversation. Coding agents
must ask the user to run login themselves; agents must never run login.
The CLI validates the key against Cloud before saving it.

Saved credentials live in `croche/credentials.json` beneath `$XDG_CONFIG_HOME`
(or `~/.config`) on Linux, `~/Library/Application Support` on macOS, and
`%APPDATA%` inside your user profile on Windows. POSIX directories are 0700
and credential files are created 0600, with atomic replacement.
`CROCHE_DEVELOPER_KEY` overrides the saved key. `croche auth whoami --json`
shows the account, credential source (`env` or `stored`), and prefix only.
`croche logout` removes the saved credential; an environment key remains set.
