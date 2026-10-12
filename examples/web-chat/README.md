# Web chat on your own backend

A Node server with one Croche agent, and a browser page that streams its replies. About 60 lines
of server code and one HTML file.

## Run it

1. In this folder, run `npm install` (Node 22 or later); it installs `@h1r-ai/croche` from npm.
2. Set your project's values (from Croche Studio or the `croche` CLI) in the environment:

   ```sh
   export CROCHE_CLOUD_URL=…          # your Croche Cloud URL
   export CROCHE_PROJECT_KEY=…        # the project key
   export CROCHE_DEBUG_TOKEN=…        # a development key: development only, never in a release
   npm start                          # http://localhost:3000
   ```

## What it shows

- `Croche.open` with a `FileStorage` directory (`.croche/`): the conversation and memory survive
  a restart.
- `agent.send` returns at once; the reply arrives through `agent.subscribe` as `message.delta`
  pieces and one final `message.end`, which the server forwards to the page as server-sent events.
- **Every visitor shares one conversation here.** The server opens one project with
  `user: 'demo-user'` and serves it to every page, so all visitors see one conversation and
  one memory. That keeps the demo short. `user` is an option of `Croche.open`, so a real app
  opens one project per signed-in person (with their id) and closes it when they leave.

Never commit keys, and never send the development key to a browser.
