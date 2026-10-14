---
name: croche
description: Build an app with Croche from requests such as "use Croche", "build this with Croche", or "Croche로 개발해줘", in an empty or existing app repository. Own onboarding, CLI project/debug-key setup, SDK integration and first-turn verification; combine missing app purpose and unresolved platform choice with signup, one account key and user-run croche login. Not for unrelated AI integrations.
---

<!-- Generated Croche skill content. -->

# Build with Croche

Croche helps developers put useful AI into their apps. The app supplies the agent's purpose,
its actions and UI; Croche handles running the agent and remembering conversations.
Do the code and checks yourself. Guide the user through the few steps that need their
Studio account or secrets, rather than handing them a manual.

## Plugin installation, only if needed

If the user asks how to install this plugin, give the matching terminal commands below.
Use only the public `H1R-AI/croche` marketplace. If this skill is already loaded from the plugin,
continue the app task; do not reinstall or add another onboarding step. Public marketplace
availability still needs verification before claiming installation works.

**Claude Code**, in your terminal:

```sh
claude plugin marketplace add H1R-AI/croche
claude plugin install croche@croche
```

**Codex**, in your terminal:

```sh
codex plugin marketplace add H1R-AI/croche
codex plugin add croche@croche
```

## Start from the request, not a questionnaire

For “use Croche”, “build this with Croche”, or “Croche로 개발해줘”, begin the integration.

**The CLI comes first.** Before any other Croche step (project, key file, SDK code), confirm the
CLI runs (`croche --version`) and install it if missing
(below). Croche keys reach the app only through the CLI. If it cannot be installed or run, stop
and report that release blocker. Never build with a key pasted into chat, an account key in app
code or a hand-written `.env` instead.

Inspect the repository, the user's request and active shell yourself. Preserve a platform
already stated by the user or revealed by the repository; **do not ask it again**.
Use these repository signals for the target app; an explicit platform in the prompt wins:

| Repository signal | Platform; do not ask again |
| --- | --- |
| `react-native` dependency | React Native |
| `*.xcodeproj` or `Package.swift` | Swift (iOS) |
| `build.gradle` or `build.gradle.kts` with the Android plugin | Kotlin (Android) |
| `vite`, `express` or `next` in `package.json` | Web (Node backend) |

If neither reveals the platform, ask **web (Node backend) / React Native / Swift (iOS) /
Kotlin (Android)**. Do not silently choose Node or rewrite an existing app into another stack.
In an empty repo, also obtain the app's purpose if missing; in an existing app, infer it.
Missing purpose/platform choices belong with the human login setup in **one question,
not a separate round**. If already logged in, the unresolved platform question may stand
alone. Asking when the prompt or repo already reveals it is a failure. Omit every part already answered. Do not ask for project name,
persona, tool list or credentials. Use the repo/app name for the project. Required tool/install
approvals remain separate permission boundaries, not another onboarding questionnaire.

Choose the matching path:

- **Node script or web backend:** `@h1r-ai/croche`, Node.js 22+ on macOS/Linux.
- **React Native:** `@h1r-ai/croche` + `@h1r-ai/croche-react-native`; same project/agent API.
- **Native Swift/Kotlin SDKs are published as 0.5.3**, including the shared `Croche.open` project API.
  Read the `croche-platforms` iOS/Android reference for installation and the first turn.
  Verify package resolution and native execution in the target app; publication is not a test pass.
  If its exact release is unavailable, offer TypeScript/React Native as an alternative, not an
  automatic rewrite of a native app. Never invent native snippets.
- **Windows:** verification pending; command forms are not a support claim. Use the
  detected shell rather than assuming Bash; `croche-cli` has PowerShell guidance.

The TypeScript SDK, React Native SDK and CLI **0.5.3 are published on npm**. Use
`npm install @h1r-ai/croche` and `npm install -g @h1r-ai/croche-cli` without version suffixes;
for React Native, install `@h1r-ai/croche` and `@h1r-ai/croche-react-native` together. Commit
the project lockfile to record resolved versions. Check the installed version and command help. Publication alone does not prove the user's platform or first turn.
TODO verify: the matching release's first-turn and login workflows. The examples use
`debugKey`, Studio **Debug keys**, and automatic connection setup; do not substitute a
source build or guessed package. Native project API availability remains a separate gate.

Use a focused companion skill only when that task arises (if installed): `croche-cli` for
CLI commands, `croche-config` for drafts/language, `croche-platforms` for mobile/web setup,
`croche-troubleshoot` for errors. Without one, consult the matching public SDK/CLI docs or
installed package help; never guess an API.

## Install the CLI, then make one combined request

Install a missing CLI yourself with appropriate permission: `npm install -g @h1r-ai/croche-cli`.
In PowerShell, use plain `croche` too. If it is refused because running scripts is disabled, that
is a human step: fold `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` (run once) into the
login request below; never change the policy yourself. See `croche-cli`'s PowerShell reference.
Use the host approval mechanism when required, not a setup questionnaire. Check `croche --help`
for the matching release. **Do not run `croche login`**, even to start a prompt for the user.
If account access is already configured, re-check with `croche auth whoami --json` and skip login.
Capture CLI JSON privately and show only the authentication result, never raw output or a key prefix.

Ask **once, in one combined request**, using the matching case below. Skip login when already
confirmed; still obtain missing app purpose or an unresolved platform in the same question.

### Empty repo: missing purpose/platform + human setup, together

> What should this app do, and which platform: web (Node backend), React Native,
> Swift (iOS), or Kotlin (Android)? Sign up at https://studio.croche.ai, create one account key under
> **Account → Account keys** (under **Personal**), then run **`croche login` yourself in a private
> terminal on this machine and OS user account**. Paste the key only into its hidden prompt,
> never into chat. If PowerShell refuses `croche` because running scripts is disabled, run
> **`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`** once first.
> Tell me the missing app choices and when login is complete; I will handle the rest.

Omit the platform choice when already stated or visible in the repo; omit the purpose when
already supplied. These are parts of one request, not successive questions.

### Existing app: human setup, plus platform only if unresolved

> Sign up at https://studio.croche.ai, create one account key under **Account → Account keys**
> (under **Personal**), then run **`croche login` yourself in a private terminal on this
> machine and OS user account**. Paste the key only into its hidden prompt, never into chat.
> If PowerShell refuses `croche` because running scripts is disabled, run
> **`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`** once first.
> Tell me when login is complete; I will handle the project, SDK and first-turn check.

If this existing repo and request do not reveal a platform, prepend the same four-way platform
choice to this request; otherwise ask only the human setup. An existing app already supplies its purpose.

### Project: new or existing

The person picks the project by answering you; no key is part of this exchange.

- **Already logged in:** run `croche projects list --json` first (captured; use only names and
  IDs). If projects exist, the combined request also asks:
  > Should I create a new project **<app name>**, or use one of yours: **<name>**, **<name>**?

  With no projects, say you will create **<app name>**.
- **Not logged in yet:** add one line to the combined request:
  > If this app already has a Croche project, tell me its name; otherwise I'll create **<app name>**.

  After “done”, list projects and use the named one. If it does not exist, or no name was given,
  create **<app name>** and say so. Do not ask a second question.

Skip already-completed steps. The user redeems an invitation privately if needed. Do not ask
for a service endpoint, public project key, SDK debug key (`cdt_`), account key, shell export or
agent restart. The agent creates the project (or uses the one picked) and its debug key through
the CLI; no key is a user input.
Stored login works across terminals for that OS account. A remote/container agent has a different credential
context; explain that genuine mismatch without collecting or transporting the secret yourself.

**Login workflow — TODO verify:** hidden prompt, validation before storage and
cross-terminal reuse against the matching published CLI. Package `@h1r-ai/croche-cli` provides
the `croche` executable. If the command is unavailable, report the release blocker instead of
inventing a login command or asking for a key in chat. Do not invent an `npx` form. Login is
user-run only, accepts no key argument, and stores a protected credential; never read that file
into the transcript. `croche-cli` covers logout and the CI-only environment alternative.

Never print **any part of a key**: no prefixes, suffixes, masked substrings or previews.
For a key check, output only its variable name and presence/length. Never dump the environment,
print a private file or capture a secret screen. CLI identity/debug-key JSON can include prefixes:
capture that output in the subprocess and emit only allowlisted non-key fields (success, account
ID, project ID, destination path), never raw JSON/stderr. Do not log `.credential.prefix` or
`.debug_key.prefix`. The CLI and app may load secret files directly without showing them to you.

## After the human says done: re-check and continue now

On “done”, “했어”, or equivalent, **re-check**, do not reuse an earlier missing-file/auth result.
Run `croche auth whoami --json` with captured, filtered output to confirm authentication. Then
check whether the selected private key file exists (`.env`, Debug `.xcconfig`, or `local.properties`)
and whether `CROCHE_DEBUG_KEY` is present/nonempty, without printing any value or substring.
Login authenticates the CLI; a missing app key file is work for **you**, not another human step.
Create/reuse the project and create the private key file if missing, then verify it again.

Continue installation, code/config, syntax/build checks and the **first live turn in the same
turn**, under the requested usage permission. Do not stop with “keys are missing”, `.env.example`
copy instructions or an offer to run the test later when the user just completed setup. A real
auth error, unavailable release, missing platform answer or required approval is a valid blocker:
report its safe error code/action instead of inventing success or requesting a secret.

## The agent does the rest

Use the selected platform; infer stable user identity and storage from the app and purpose already given.
Do not ask a second setup/product question when the combined request is answered, or request another credential. Use `croche-cli` if
available for command details. After user-confirmed login, verify the intended account with
`croche auth whoami --json` with private output capture (success/account only). Before creating a debug key, verify the env-file
path is not already tracked by Git; do not expose it with a diff or file read. Then, within the
requested app setup, run these CLI operations with captured/filtered JSON rather than echoing
raw output into the transcript:

```sh
croche auth whoami --json
croche projects create --name "My app" --json
croche debug-keys create --project PROJECT_ID --json
```

Project creation returns its ID and **public project key**. Replace `PROJECT_ID` with that ID;
put the public key into app configuration yourself. For a picked existing project, take its ID and
public key from `croche projects list --json`; do not create a duplicate. The account `dk_` key never goes into app code or the SDK's `debugKey`.

**CLI workflow — TODO verify:** debug-key commands are implemented; check the installed
release’s help and verify its behavior before use. If unavailable, report the release blocker; do not improvise a secret-
printing command or make the user paste another key. The command writes **`CROCHE_DEBUG_KEY`**
(`cdt_`) to **`./.env`**, returns key metadata and file location (filter out any prefix), creates the file with
**0600 permissions** for a new file on POSIX, and adds the destination to `.gitignore` in Git.
An existing file keeps its permissions; check those without displaying its contents.
`--env-file PATH` chooses another file; verify that path is ignored too. Windows protection is
unverified. An existing nonempty value is refused without `--force`: stop for explicit approval,
not an automatic overwrite. Never use a secret-print mode or display the file.

### Create a project

`croche projects create --name "<app name>" --json` creates one (ID and public project key in
its output). In Studio the same is **Projects → New project**. Either way the agent then runs
`croche debug-keys create --project PROJECT_ID`, which writes the debug key (`CROCHE_DEBUG_KEY`) into `.env`.

### Wire the private file into the actual stack

**Writing `.env` does not load it.** Node and React Native do not automatically put its values
in the app. `croche login` authenticates the CLI only; it does not supply the SDK's `debugKey`.

- **Node:** run `node --env-file=.env app.mjs` (the flag exists from Node 20.6; Croche requires
  Node 22+), or use the project's **existing** dotenv setup before `Croche.open`. For our sample,
  run `node --env-file=.env first-turn.mjs`, not plain `node first-turn.mjs`. Use the actual
  selected env-file path. Fail locally if `CROCHE_DEBUG_KEY` is missing, without printing it.
- **Web:** load credentials only in the server process, including local development. Keep
  `Croche.open` and `debugKey` on the backend; the browser calls your app endpoint. Never put
  a secret into browser code, a public-prefixed variable or a client bundle.
- **React Native:** wire `CROCHE_DEBUG_KEY` through the app's existing **debug-only build config**
  to `debugKey: __DEV__ ? developmentKey : undefined`. Neither `process.env` nor `.env` loads
  it automatically. Refuse a missing value in a debug build; exclude the secret at build time
  from release artifacts, not just at runtime. Read `croche-platforms` for the app-specific path.

Do this wiring yourself; do not ask for another key. Do not add a dotenv/build dependency
without permission, source the file into a shell, or display its contents. `croche-cli` also
covers `debug-keys list` and `debug-keys revoke`; check final arguments before acting.

## Choose the model in code

The app can choose its model through `Croche.open`'s `config.model`. Set it explicitly:

```ts
const config = { model: 'deepseek/deepseek-v4.1-flash', instructions: 'Help this user with the app.' };
// Pass config in Croche.open alongside the existing project/storage/credential options.
```

Prefer `deepseek/deepseek-v4.1-flash` for text and images; `openai/gpt-6-luna` is an alternative.
Text-only apps may choose `deepseek/deepseek-v4-flash-0731` for cheaper output. Infer image use
from the requested app, and preserve an explicit user model choice.

`model` can appear at project, project-language, agent and agent-language levels; an omitted
override inherits its base. The unset default is
`deepseek/deepseek-v4.1-flash`, with `openai/gpt-6-luna` fallback only at reasoning `default` or
`off` (not `low`, `medium`, or `high`). Set the project model explicitly when you need a particular choice.
Read `croche-config` or the online [Models page](https://docs.croche.ai/models.md) for the full
allowed list and fallback limits. Use [llms.txt](https://docs.croche.ai/llms.txt) to discover public
Markdown docs. Do not tell the user model choice is unavailable.

## Markers: expressions and scenes without a tool call

The model can drive presentation from inside its reply. It writes a marker `:name:` (ASCII
letters, digits, `_` and `-`); Croche removes it from the text, and the app reacts: a character's
expression, a scene or background change, a sound. There is no tool call and no extra model
round trip. Markers never execute anything; actions that change app state stay tools.

- **Tell the model which markers exist** with `markerGuide` in the agent config: `config.markerGuide`
  in `Croche.open`, per agent under `config.agents`, or in the project config in Studio.
- **Read them on `message.end`:** `event.markers` lists the names in reply order. Markers never
  appear in `message.delta` or the message text. Every `:name:` that fits the syntax counts, so
  ignore names the app does not know. Messages replayed before `snapshot` carry their markers too.
- Structured turns (`responseFormat`) produce no markers.

```ts
const config = {
  instructions: 'You are Mina, a cheerful guide.',
  markerGuide: 'Show feelings with :happy: or :sad:. Change the scene with :scene-beach: or :scene-night:.',
};
// Pass config in Croche.open alongside the existing options; then, for the agent:
agent.subscribe({ onEvent(event) {
  if (event.type !== 'message.end') return;
  for (const name of event.markers as string[]) {   // setExpression/setScene: app UI functions
    if (name === 'happy' || name === 'sad') setExpression(name);
    if (name.startsWith('scene-')) setScene(name.slice('scene-'.length));
  }
} });
```

## Implement, then prove it

1. Check installed versions and obtain required install permission. For Node, adapt
   [first-turn.md](references/first-turn.md); for RN/web, use `croche-platforms`.
2. Open one `Croche` project per user, then `croche.agent()`. Keep it open for the app session.
   Use new input IDs for new messages; retain an ID and identical payload for delivery retries.
3. When the app needs actions, read [tools.md](references/tools.md). Add declarations and
   matching handlers; enforce permissions and user approval in the handler/UI.
   For current web facts, turn on the built-in web search in the project's Studio config instead
   of writing your own: [web-search.md](references/web-search.md).
4. Write the app's code config and integration code yourself; do not hand the user a list of
   implementation chores. For streaming, multiple agents or memory UI, read [agents.md](references/agents.md).
5. Run local syntax/type checks first. With live-usage authorization, make one small request.
   This is the first-turn check for the requested integration, not permission for repeated paid
   experimentation. Confirm a completed reply, not merely a send receipt. Never manufacture a success transcript.
6. Report the completed reply or real blocker, files changed and exact run command. Tell the
   user how to verify in **Monitoring → Logs** (development filter if needed); reports can lag.
   Development traffic does not appear in **Monitoring → Activity**. Reopen the same store and
   subscribe to read the replayed history, not another paid message, to verify persistence. Test any app action once and
   a refused action without an unintended state change.

The completion report covers files changed, checks actually run, completed reply/error status,
and this verification pointer: **Studio → select the project → Monitoring → Logs → development
filter**. Say whether a real turn ran; never claim a log was seen unless checked. Development
traffic is not in Monitoring → Activity. Do not end with only local run commands.
Do not silently spend repeatedly, raise budgets, release a config, or delete stored data to
make a check pass. Stop at the error and use `croche-troubleshoot`.

## Watch it in Studio (development only)

The local debugger shows a running app's turns, tools and costs in Studio. It is off by default:
the app opts in, in a **development build only**, never a release build.

- **Collector:** `croche debug start` starts it on `127.0.0.1:8790`. Start it **before**
  starting or restarting the app; events sent before the collector runs are lost. Delivery is best effort, with no retry.
- **Pairing token:** a local credential. Read it in the development host from
  `croche debug token`, or from `pairingToken` in the connection file, never printed or
  committed:
  - macOS: `~/Library/Application Support/croche/debugger/connection.json`;
  - Linux: `${XDG_STATE_HOME:-~/.local/state}/croche/debugger/connection.json`;
  - Windows: `%LOCALAPPDATA%\croche\debugger\connection.json`.

  Never put it in a browser bundle; a browser app needs a server-side relay (`DEBUGGER.md`).
- **Wiring, project agents:**

  ```ts
  import { createLocalDebugger } from '@h1r-ai/croche/debug';
  const debug = createLocalDebugger({ token: pairingToken, appName: 'My app' });
  const croche = await Croche.open({ /* existing options */ onDebugEvent: debug.onEvent });
  ```

  For a raw runtime: `runtime.setDebugObserver({ onDebugEvent: debug.onEvent, visibility: 'runtime' })`.
  These entries are stamped `visibility: 'runtime'`, which is what Studio shows.
- **Open it:** `croche debug --studio-link` prints a fresh Studio link; open it. Counters at 0 after a turn mean the app is not wired, or
  started before the collector.
