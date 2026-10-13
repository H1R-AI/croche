# Croche

**Add AI agents that stream replies, remember conversations, and call your app’s tools.**

[Website](https://croche.ai) · [Docs](https://docs.croche.ai) · [Studio](https://studio.croche.ai) · [Hackathon](https://croche.ai/hackathon)

This is Croche’s developer home and coding-agent marketplace. Version 0.5.0 supports
TypeScript web backends and React Native; this repository contains no SDK or Core source.

## Install in 3 steps

1. **Install the plugin for your coding agent.**

   ```sh
   # Claude Code
   claude plugin marketplace add H1R-AI/croche
   claude plugin install croche@croche

   # Codex
   codex plugin marketplace add H1R-AI/croche
   codex plugin add croche@croche
   ```

   Without plugins, copy [the skill folder](plugins/croche/skills/croche) into your
   project’s `.claude/skills/croche/` or `.agents/skills/croche/`.

2. **Install the SDK and CLI, then sign in.** Node 22 or later:

   ```sh
   npm install @h1r-ai/croche@0.5.0
   # React Native apps also need:
   npm install @h1r-ai/croche-react-native@0.5.0
   npm install --global @h1r-ai/croche-cli@0.5.0
   ```

   Sign up in [Studio](https://studio.croche.ai), create a developer key, and run
   `croche login` yourself in your terminal. Its prompt hides the key; never paste
   it into chat. For React Native on iOS, also run `cd ios && pod install`.

3. **Ask your coding agent to build the feature.** For example: “Add a Croche agent
   that can read and update the user’s tasks.” The plugin guides project setup,
   tool handlers, a debug key, and a first live check. Keep secrets out of Git and
   debug keys out of release builds.

## What’s in this repo

| Path | Contents |
| --- | --- |
| [plugins/](plugins/) | Claude Code and Codex marketplace, skills, SDK and CLI references |
| [examples/](examples/) | [Node web chat](examples/web-chat/) and [React Native chat](examples/react-native-chat/) |
| [docs/](docs/) | Platform guides pointing to the release’s bundled references |
| [Issues](https://github.com/H1R-AI/croche/issues) | Bugs, questions, developer experience, cost/quality, and feature requests |

Read the bundled [SDK reference](plugins/croche/skills/croche/references/sdk.md),
[CLI reference](plugins/croche/skills/croche/references/cli.md), or
[release notes](CHANGELOG.md). These docs ship with the plugin.

## Get help

[Open an issue](https://github.com/H1R-AI/croche/issues/new/choose) and choose the
matching [template](.github/ISSUE_TEMPLATE/). Include your SDK version, platform,
and reproduction steps; never post credentials or other users’ data.

Report security issues privately to [security@h1r.ai](mailto:security@h1r.ai),
or use GitHub’s private vulnerability reporting. See [SECURITY.md](SECURITY.md).
