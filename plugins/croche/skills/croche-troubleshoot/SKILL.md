---
name: croche-troubleshoot
description: Diagnose a failed Croche SDK turn, CLI command, Studio config update, or persisted store using its error code and guide the user to the next safe action. Use for missing credentials, exhausted credit or allowance, invite activation, unavailable model access, draft conflicts, or memory-store recovery.
---

<!-- Generated Croche skill content. -->

# Diagnose, then guide the user

Collect only the SDK/CLI version, platform/shell, failed step, error **code**, final status and
approximate time. Ask for redacted output, not keys, invite codes, environment dumps, full user
conversations, or Studio secret screenshots. For SDK requests, inspect both thrown errors and
final `message.end` errors; a receipt is not a completed turn.

Do read-only/local checks first. Do not loop paid requests, repeatedly replay a tool mutation,
raise a budget, switch identity, revoke keys, or delete a store as an automatic repair.
Tell the user where to act, then retry once only after the cause changes and retry is authorized.

| Error / symptom | What to check or do | What to tell the user |
| --- | --- | --- |
| `invite_required` | Account activation is incomplete. | “Sign in to Studio and redeem your invite privately. Do not send me the code.” |
| CLI account command: `missing_credentials` | Capture `auth whoami` privately and report authentication status only, never prefixes, stored files or environment values; `cdt_` is not an account key. | “Sign up, create an account key at Account → Account keys (under Personal), then run `croche login` yourself and enter it at the hidden prompt.” Login remains pending verification; the agent never runs it. Local-control credentials are separate; do not substitute the account key for them. |
| `account_credit_exhausted` | Production Runtime credit is unavailable. Stop further paid checks. | “Check your account → Billing → Runtime credits. Decide yourself whether to add credit; I will not purchase or raise limits.” |
| `development_allowance_exhausted` | The Studio development allowance is exhausted. | “Check account → Billing → Studio plan for the allowance shown. A total cap does not necessarily reset next week; don't create more keys to bypass it.” |
| `project_budget_exhausted` | Read project budget and app access status. | “Check project → Settings → Budget & limits. Only change the budget if that is your intended spending decision.” |
| `unverified_allowance_exhausted` | The allowance for installs without platform proof is exhausted. | “Check Settings → App verification and Budget & limits. Another install/key is not a reset; completing the proper app-verification path is a separate release task.” |
| `gateway_unavailable` | Model access is unavailable. Check Studio project status; wait for sync before one authorized retry. | “Croche could not run the model right now. If it persists, send support the redacted error code, project ID and time.” Do not ask for another kind of model-service credential. |
| `human_session_required` | This action requires the signed-in human. | “Please complete this in Studio.” Do not try a different credential or endpoint to bypass approval. |
| `draft_conflict` | Preserve the local edit; fetch the latest draft into another file, compare and reconcile. | “Someone changed the draft. I will show the difference before saving the combined edit.” |
| `unsupported_encoding` | The CLI input file is UTF-16 instead of UTF-8. | “Save it as UTF-8; in Windows PowerShell 5.1 use `Set-Content ... -Encoding UTF8`.” Windows execution remains unverified. |
| `invalid_configuration` | Validate option names/types, declarations and handlers; remove invented options, not requested capabilities. | Explain the specific invalid field using the installed SDK's API. For replacement/locale rules use `croche-config`. |
| `memory_store_too_old` | Opening this agent was refused without changing its data. | Read [recovery.md](references/recovery.md); obtain informed consent before a destructive reset. |
| `store_busy` | Another owner still has the store open. | Close the correct app/project before reopening; do not delete lock/storage files or an unrelated process. |
| `idempotency_conflict` | A prior input ID was reused with different content. | Restore the original ID/payload for delivery retry; use a new ID only for an explicitly new request, after checking prior effects. |

## Debug-key setup failures

Candidate CLI errors below still need verification against the installed release. Never use
secret output as a fallback.

- `tracked_env_file`: choose an untracked, ignored destination; do not write into source control.
- `debug_key_exists`: no key was issued; preserve the existing value. `--force` needs explicit
  consent, not an automatic retry.
- `invalid_env_file`: use an existing destination directory and a regular non-symlink file;
  duplicate SDK key assignments are refused. Do not display the file to diagnose it.
- `env_write_failed`: a key may already have been issued; use the reported `key_id` to identify
  it, explain the failure and revoke only that key when authorized, with
  `croche debug-keys revoke --project PROJECT_ID KEY_ID --json`. Do not blindly create another.

If the command is missing, report the release blocker rather than asking the user to create
and paste a debug key. If an existing different `.env` value is refused, preserve it and ask
before `--force`; do not display either value. If the file is not ignored or protected, fix
only the file metadata/ignore rule without reading secrets into the transcript. After a timeout,
inspect key metadata before retrying creation. Node should load the private file directly with
`node --env-file=.env app.mjs` (or existing dotenv); plain Node does not load `.env`.
For web, fix the server's loader, never a browser variable. For RN, fix the debug-only build
config, rebuild the debug app and ensure release artifacts exclude the key. Successful CLI
login does not supply SDK values. A missing SDK variable is not a reason to request its value.

## No error, but the result looks wrong

- **Draft not visible:** `Croche.open`, development `debugKey`, sync then next open, full config
  and all registered tools. A server-key production install does not receive drafts.
- **Wrong language:** `language` is the user's locale and selects config, not reply language.
  A missing translation uses the base unchanged. Read `croche-config` before changing defaults.
- **No Studio activity:** development turns appear in **Monitoring → Logs**, not Activity;
  allow reporting time and choose the development usage filter.
- **Tool says it will check but never answers:** confirm the read-only command has `reads: true`.
  Validate handler output; do not mock the action and report success.
- **Timed-out mutation:** an effect may already exist. Inspect the result/app state before any
  resend. Keep the original input ID and payload for delivery retry; a new ID can duplicate work.

Report what was observed, what changed, what was actually rerun, and what the user still needs
to do. A syntax check, package install, or Studio sign-in alone is not a successful SDK turn.
