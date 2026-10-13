# React Native chat

One screen with one Croche agent: open a project, send, and render streamed replies. It is a
single `App.tsx` you drop into a new React Native app.

## Run it

1. Create an app and install the packages from npm:

   ```sh
   npx @react-native-community/cli init CrocheChat
   cd CrocheChat
   npm install @h1r-ai/croche@0.5.0 @h1r-ai/croche-react-native@0.5.0   # the native Core is inside
   cd ios && pod install && cd ..
   ```

2. Copy `App.tsx` from this folder over the app's `App.tsx`.
3. Copy `croche.config.example.json` to `croche.config.json`, fill in your project key
   and debug key, and add `croche.config.json` to `.gitignore`.
4. `npx react-native run-ios` or `npx react-native run-android`.

## What it shows

- `Croche.open` with the defaults for React Native: storage on the device, and platform
  attestation for release builds. The debug key is used only in `__DEV__` builds.
- `agent.send` returns at once; the reply arrives through `agent.subscribe` as `message.delta`
  pieces and one final `message.end`.
- `project.close()` when the screen goes away.

A release build should be verified as a genuine install: configure App Attest (iOS) and Play
Integrity (Android) for your project;
see the [skill](../../plugins/croche/skills/croche/SKILL.md) for the release checklist. Never
ship a debug key.
