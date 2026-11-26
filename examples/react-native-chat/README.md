# React Native chat

One screen with one Croche agent: open a `Croche`, send, and render streamed replies. It is
`App.tsx` plus the two files that keep the development key out of Release builds:
`scripts/croche-dev-key.mjs` and `babel.config.js`. Both are copied verbatim from the
[development-key recipe](https://docs.croche.ai/sdks/react-native/#development-key-in-debug-never-in-release).

## Run it

1. Create an app and install the packages from npm:

   ```sh
   npx @react-native-community/cli init CrocheChat
   cd CrocheChat
   npm install @h1r-ai/croche@^0.7.0 @h1r-ai/croche-react-native@^0.7.0   # the native Core is inside
   cd ios && pod install && cd ..
   ```

2. Copy `App.tsx`, `babel.config.js` and `scripts/croche-dev-key.mjs` from this folder into the
   app, replacing its `App.tsx` and `babel.config.js`. If your `babel.config.js` already has
   plugins, keep them in both branches. Create `src/`, and add this folder's `.gitignore` lines
   (`.env`, `src/croche-dev-key.generated.ts`) to the app's `.gitignore`.
3. Add these scripts to the app's `package.json`, so the key module exists before any bundle:

   ```json
   "postinstall": "node scripts/croche-dev-key.mjs",
   "prestart": "node scripts/croche-dev-key.mjs",
   "preios": "node scripts/croche-dev-key.mjs",
   "preandroid": "node scripts/croche-dev-key.mjs"
   ```

4. Put your **public** project key in `PROJECT_KEY` in `App.tsx`. It is not a secret. From the
   app root, run `croche development-keys create --project PROJECT_ID`. The CLI writes the
   secret development key to `./.env` (mode 0600, git-ignored); never print it. Then run
   `node scripts/croche-dev-key.mjs`, which writes the git-ignored
   `src/croche-dev-key.generated.ts`.
5. `npm run ios` or `npm run android` (Debug).

Before shipping, prove that the Release bundle holds no key:

```sh
npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output /tmp/rel.js
node scripts/croche-dev-key.mjs --check /tmp/rel.js
```

For a native Release build, run `--check` on the `.app` or `.apk` instead (see the recipe).

## What it shows

- `Croche.open` with the defaults for React Native: storage on the device, and platform
  attestation for release builds. The development key reaches only Debug builds. Every
  non-development Metro bundle replaces the generated key module with `undefined`, and
  the bundle fails if a key appears anywhere else in the source. `__DEV__` alone does not
  remove an imported string.
  `bundledConfig` declares the model and one agent, `chat`, opened with `croche.agent('chat')`.
- `agent.send` returns once the input is accepted; the reply arrives through `agent.subscribe` as `message.delta`
  pieces and one final `message.end`.
- `close()` on the `Croche` when the screen goes away.

A release build should be verified as a genuine install: configure App Attest (iOS) and Play
Integrity (Android) for your project;
see the [skill](../../plugins/croche/skills/croche/SKILL.md) for the release checklist. Never
ship a development key.
