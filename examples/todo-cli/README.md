# To-do CLI: send a message, let a tool act

A small conversation with an app-owned task list. **Send** supplies the person's words;
**tools** let the agent add or complete real tasks. The whole Croche connection is
[29 lines](src/croche.mjs); terminal handling and JSON storage live separately.

These are the two ingredients (excerpt; `store` is the app's task store):

```js
const tools = [{ name: 'todos', summary: 'Read and change tasks.', commands: [
  { key: 'add', name: 'add', summary: 'Add a task only when asked.',
    flags: [{ name: 'title', type: 'string', required: true }] },
  { key: 'complete', name: 'complete', summary: 'Complete a task only when asked.',
    flags: [{ name: 'id', type: 'string', required: true }] },
  { key: 'list', name: 'list', summary: 'Read tasks and IDs.', reads: true },
] }];
const actions = {
  add: args => store.add(args.title),
  complete: args => store.complete(args.id),
  list: () => ({ tasks: store.list() }),
};
const project = await Croche.open({
  projectKey, debugKey, user, storage: new FileStorage(dataDir),
  config: { model: 'deepseek/deepseek-v4.1-flash', instructions, tools },
  handlers: { todos: ({ key, args }) => Object.hasOwn(actions, key)
    ? actions[key](args ?? {}) : { status: 'rejected' } },
});
const agent = await project.agent();
const result = await agent.request({ id: crypto.randomUUID(), text: 'Add buy milk.' });
```

`request` is the send-and-wait convenience: one input, then its completed reply.
`agent.send` instead returns a receipt for streaming UIs. The runnable connection checks
reply status and closes the project; the tool handler validates current app data.

## Run in three commands

**Node 22+ on macOS/Linux. Windows verification pending.** The example pins
**published `@h1r-ai/croche` 0.5.2**. TODO verify: live text/image requests and
file protections in your own app environment. Publication is not a live integration test.
The offline tests need only Node, not an SDK installation or account.

From this folder, after the account/project setup below:

```sh
npm install
npm test
npm start
```

Try `Add buy milk`, then `Complete t1`. Dori replies in your language. A request such as
`Add a report task with a deadline` prompts for the missing date instead of inventing one.
The app rejects invalid dates and task IDs. It supports adding, listing and completing;
editing and deleting tasks are intentionally outside this small example.

### Account setup: human login, agent does the rest

Your only account step is to sign up at [Studio](https://studio.croche.ai), create an Account
key under **Account → Account keys**, and run **`croche login` yourself** in a private terminal
on the same machine/account as the coding agent. The agent can install the
`@h1r-ai/croche-cli` package first with permission. The hidden login prompt is the only
place you paste the key—never into agent chat or a command argument.

For PowerShell, the human runs this once, then uses plain `croche`:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

This changes only the current-user policy; follow your organization's policy on a managed
device. CLI login has been run on Windows; this example's SDK workflow remains unverified there.

The coding agent can use `croche projects create --name "Todo CLI" --json` and parse the
response for the project ID and public key, then `croche debug-keys create --project PROJECT_ID --env-file .env` from
**this example's folder**. The CLI writes the debug key directly to `.env`. The agent adds
`CROCHE_PROJECT_KEY` using the returned public project key, preserving the private line.
The Account key belongs to CLI login, not to this app.

CLI JSON can contain key prefixes: agent subprocesses capture it privately and report only
success/project ID/path, not raw output or any part of a key. An existing private env file
is preserved; replacement needs consent. `.env` must be ignored and untracked before the
CLI writes it, with private file permissions. [.env.example](.env.example) contains only
blank field names, not keys. [Full guided setup](https://docs.croche.ai/quickstart/).

`npm start` runs **`node --env-file=.env src/main.mjs`**: Node loads the file without printing
it. Plain `node src/main.mjs` does not load `.env`. Neither keys nor `.data/` belong in Git.
This is a local development app, not a release build or browser app. Each `TODO_USER`
profile has its own private task/conversation directory; one process per profile.

## When you need app state or an image

Ordinary input is **text only**, with no automatic state or image attachment.

| Input | What goes into one request |
| --- | --- |
| `Add buy milk` | Just the person's text |
| `/list` | A request to show tasks, plus the current list in `context` |
| `/photo /path/to/shopping-list.jpg` | Current list in `context`, user text + image, and an optional app event |
| `/quit` | Exits locally; no model request |

The photo command uses this shape in [input.mjs](src/input.mjs):

```js
const input = {
  context: { todos: store.list() },
  inputs: [
    { kind: 'user', text: 'Add everything on this list as tasks.', images: [photo] },
    { kind: 'event', text: 'The user attached a photo from the CLI.' },
  ],
};
// photo = { data: base64, mime: 'image/jpeg', alt: '...', resolution: 'high' }
// The same agent.request({ id, ...input }) sends all of this together.
```

`context` is app state, kept apart from the person's words. It is useful when the request
needs app state: a command or button acting on app data, or after that state changed.
Without it, an input carries only the message; earlier states stay as sent until older
turns are folded. They are not a live view of the task list; tools read current app data.

Use a photo you are allowed to share. The CLI reads one PNG/JPEG/WebP/GIF of at most 3 MB,
checks its signature, and supplies base64, MIME, useful alt text and **per-image** `high`
resolution for handwriting. It does not upload a filename or read an arbitrary text file.
The default model supports images. Unclear handwriting or deadlines call for clarification.
One input can involve several tool/model calls; it is not a one-charge guarantee.

## Shell checks and verification

- One message without a terminal UI: `npm start -- --prompt "Add buy milk"`.
- Current app state: `npm start -- --prompt "/list"`.
- A photo: `npm start -- --prompt "/photo /path/to/shopping-list.jpg"`.
- Offline checks: `npm test` (no network, account or usage charges); `npm run build` checks JavaScript syntax without downloading or executing the SDK.
- With usage permission, `npm run smoke` makes **three live requests**: add, complete,
  restart, then ask for a missing deadline. It uses a unique temporary profile and removes
  **only its own local test data in a finally block**, including failure paths. Your normal
  `.data/` is untouched. Remote usage/reports are not deleted. Image recognition is a
  separate manual check using your own photo; offline fixtures do not prove it works live.

A real completed reply and the app's task state are the first checks. In Studio, select
this project → **Monitoring → Logs** → **Usage type: Development · Subscription**. Reports
can arrive later. Development traffic is not in Monitoring → Activity.

Studio drafts replace the whole app config at the next open after sync. For this example,
a fresh project avoids unrelated drafts; a draft used here needs this complete `todos`
tool declaration. [Config behavior](https://docs.croche.ai/concepts/config/).
