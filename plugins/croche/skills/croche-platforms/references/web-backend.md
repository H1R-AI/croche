<!-- Generated Croche skill content. -->

# Web: keep app secrets on the backend

Never put a debug key or server key in the browser, **including local development**. Run
`Croche.open` in your Node backend and let the page call your authenticated app endpoint.
Do not expose secrets through frontend `VITE_`, `NEXT_PUBLIC_` or similar public build variables.

## Local development: use the CLI-created private file on the server

The agent creates the debug-key `.env` through the core skill's CLI flow. Load it into the
**server process** with `node --env-file=.env server/app.mjs`, substituting the actual server
entry point/file path, or use the project's existing server-side dotenv setup before opening
Croche. Plain Node does not load it automatically. The flag exists from Node 20.6; Croche
requires Node 22+. Use its value as `debugKey` on that local backend, never in browser code.
Refuse a missing server-process value locally without printing it. The user does not need to
create a second credential for this first-turn check; `croche login` does not populate SDK values.

## Production: server credential setup

Ask the user to open project **Settings → Keys → Server keys**, create/copy the `csk_` server
key privately, and set `CROCHE_SERVER_KEY` in their server's secret environment. No chat paste.
For a private local server terminal:

```bash
export CROCHE_SERVER_KEY="<server key>"
```
```powershell
$env:CROCHE_SERVER_KEY="<server key>"
```

PowerShell is syntax guidance only; Windows verification is pending. Do not use frontend
`VITE_`, `NEXT_PUBLIC_` or similar public build variables for secrets.

```ts
import { Croche } from '@h1r-ai/croche';
import { FileStorage } from '@h1r-ai/croche/node';

// userId comes from a verified app session; userStoragePath is an app-owned isolated path.
const croche = await Croche.open({
  projectKey: process.env.CROCHE_PROJECT_KEY!,
  serverKey: process.env.CROCHE_SERVER_KEY!,
  user: userId,
  language: userLocale,
  storage: new FileStorage(userStoragePath),
  config: { model: 'deepseek/deepseek-v4.1-flash', instructions: 'Help this person use our app.' },
});
const agent = await croche.agent();
```

Reuse one open project per authenticated user; do not open overlapping writers to the same
store or share one conversation across visitors. Do not accept a browser-supplied user ID as
authentication or interpolate it unchecked into a storage path. Apply your app's access controls
and anonymous-user limits before a paid request. Stream public message events through your own
endpoint, not the project's credentials. Close the project on session/service shutdown.

Croche runs the model for you; production usage is charged to your project's credit.
Guide the user to **Settings → Budget & limits** if app access or spending is blocked; never
increase limits on their behalf just to pass a test. Studio config applies at next open after
sync; a backend using a server key receives released versions, not development drafts.
