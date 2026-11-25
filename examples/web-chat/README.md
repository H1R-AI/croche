# Web chat on your own backend

A Node server with one Croche agent, and a browser page that streams its replies. About 60 lines
of server code and one HTML file.

## Run it

1. In this folder, run `npm install` (Node 22 or later); it installs the SDK declared
   in this example’s `package.json`. For a new app, use `npm install @h1r-ai/croche`
   and commit its lockfile.
2. For development, put your keys in this folder's `.env`, the same way as the CLI and
   [todo-cli](../todo-cli/README.md). From **this example's folder**, run
   `croche projects create --name "Web chat" --json` for the project ID and public key, then
   `croche development-keys create --project PROJECT_ID --dotenv-file .env`. The CLI writes the
   development key directly to `.env`; add `CROCHE_PROJECT_KEY=` with the public project key, preserving
   the private line. [.env.example](.env.example) lists the field names only. `.env` is
   git-ignored; never print it or commit it.
3. Run `npm start` (http://localhost:3000). It runs **`node --env-file=.env server.mjs`**,
   so Node loads the file without printing it; plain `node server.mjs` does not load `.env`.

For a production backend, create a server key in Studio and use this form instead:

```sh
export CROCHE_PROJECT_KEY=…
export CROCHE_SERVER_KEY=…         # secret: backend only
unset CROCHE_DEVELOPMENT_KEY       # never use a development key in a release
NODE_ENV=production node server.mjs   # no .env in production: keys come from your host's environment
```

The app passes `serverKey: process.env.CROCHE_SERVER_KEY`. It suppresses `developmentKey`
when a server key is set or `NODE_ENV=production`; production refuses to start
without a server key. Choose one proof, never both. Neither secret goes to the browser.

## What it shows

- `Croche.open` with a `LocalStateStore` directory (`.croche/`) in `adapters`: the conversation and memory survive
  a restart. `bundledConfig` declares the model and one agent, `chat`, opened with
  `croche.agent('chat')`.
- `agent.send` returns once the input is accepted; the reply arrives through `agent.subscribe` as `message.delta`
  pieces and one final `message.end`, which the server forwards to the page as server-sent events.
- **Every visitor shares one conversation here.** The server opens one `Croche` with
  `user: 'demo-user'` and serves it to every page, so all visitors see one conversation and
  one memory. That keeps the demo short. `user` is an option of `Croche.open`, so a real app
  opens one `Croche` per signed-in person (with their id) and closes it when they leave.

Never commit keys, and never send the development key to a browser.
