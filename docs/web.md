# Croche on the web: the Runtime on your backend

A browser cannot prove it runs your app, so a web app keeps a small backend of its own and
runs the Runtime **there**, on Node. Issue a **server key** (`csk_…`) in Studio; Cloud admits
your backend as a production install, billed to the project's Runtime Credit. Your web page
talks only to your backend.

```ts
import { CrocheRuntime } from '@croche/runtime';
import { FileStorage } from '@croche/runtime/node';

// One Runtime per end user, keyed by your own stable user id.
async function runtimeFor(userId: string) {
  return CrocheRuntime.create({
    cloudUrl: process.env.CROCHE_CLOUD_URL!,
    projectKey: process.env.CROCHE_PROJECT_KEY!,
    serverKey: process.env.CROCHE_SERVER_KEY!,          // a server secret
    installationId: userId,                             // one Croche user and allowance per end user
    storage: new FileStorage(`./runtime-state/${userId}`),
    instructions: 'You are Pip, a concise, considerate companion.',
  });
}
```

- The server key, and the model key the Runtime receives with it, are secrets like any
  provider key: keep them on the server, never send them to the browser. The SDK refuses
  `serverKey` in a browser.
- Rotate a server key without downtime: issue a new one, deploy it, then revoke the old one.
- Every new user gets the project's default allowance, so your backend decides who is a user:
  never take the user id from anything the client can forge (sign your session cookie), and
  limit new anonymous users per client address, or require sign-in first. `apps/web-backend`
  is a complete reference.
- Stream to your page from your backend (for example Server-Sent Events) by forwarding the
  `text.delta` and `marker` events of `send`.

The full reference implementation is `apps/web-backend` in the Croche code (shared with beta participants on request).
