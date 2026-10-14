<div align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/croche-logo-dark.svg">
    <img src="assets/croche-logo.svg" alt="Croche" width="320">
  </picture>
  <p><strong>AI agents that stream replies, remember conversations, and call your app’s tools.</strong></p>
  <p>
    <a href="https://www.npmjs.com/package/@h1r-ai/croche"><img src="https://img.shields.io/npm/v/%40h1r-ai%2Fcroche?style=flat-square&amp;color=6c3fc4" alt="npm version: @h1r-ai/croche"></a>
    <a href="docs/SDK-LICENSE.md"><img src="https://img.shields.io/badge/SDK_license-Croche_(beta)-6c3fc4?style=flat-square" alt="Croche SDK License (beta)"></a>
    <a href="https://docs.croche.ai"><img src="https://img.shields.io/badge/docs-online-6c3fc4?style=flat-square" alt="Online documentation"></a>
  </p>
  <p>
    <a href="https://croche.ai">Website</a> ·
    <a href="https://docs.croche.ai">Docs</a> ·
    <a href="https://studio.croche.ai">Studio</a> ·
    <a href="https://croche.ai/hackathon">Hackathon</a>
  </p>
</div>

**Early Access:** Croche is in Early Access. Studio and the Cloud are open to
invited developers; [request access](https://croche.ai/en#waitlist)
([Korean](https://croche.ai/#waitlist)).

This is Croche’s developer home and coding-agent marketplace. Version 0.5.3 supports
TypeScript web backends, React Native, native Swift, and Kotlin; this repository contains
no SDK or Core source.

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

   Claude Code installs to user scope by default. To install for the current app
   project instead, run `claude plugin install croche@croche --scope project` in
   that project’s directory. Codex’s verified `plugin add` command has no scope
   flag; use the project skill-copy option below for project-only guidance.

   Without plugins, copy all five folders from [the skills directory](plugins/croche/skills/)
   into your project’s `.claude/skills/` or `.agents/skills/`.

2. **Install your platform’s SDK and the CLI, then sign in.** The CLI requires
   Node 22 or later. Choose the SDK for your app:

   ```sh
   npm install @h1r-ai/croche
   # React Native apps install both:
   npm install @h1r-ai/croche @h1r-ai/croche-react-native
   npm install --global @h1r-ai/croche-cli
   ```

   Without a global CLI install, run
   `npx --package @h1r-ai/croche-cli croche <command>` instead. For example,
   the user can run `npx --package @h1r-ai/croche-cli croche login`.
   In Windows PowerShell, run this once, then use plain `croche` and `npx`:

   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```

   Native Swift: choose **Up to Next Minor Version** from **0.5.3** in Xcode,
   or add this dependency in `Package.swift`:

   ```swift
   .package(url: "https://github.com/H1R-AI/croche-swift", .upToNextMinor(from: "0.5.3"))
   ```

   Native Kotlin: add the Maven repository to the existing
   `dependencyResolutionManagement` block in `settings.gradle.kts`, then add the
   library in `app/build.gradle.kts`:

   ```kotlin
   // settings.gradle.kts
   dependencyResolutionManagement {
       repositories {
           google()
           mavenCentral()
           maven { url = uri("https://maven.croche.ai") }
       }
   }
   // app/build.gradle.kts
   dependencies {
       implementation("ai.croche:croche-android:0.5.+")
   }
   ```

   npm installs the latest published version; commit your project’s lockfile to
   pin its resolved dependencies. Because 0.x minor releases may break compatibility,
   native dependencies stay within 0.5.x with the ranges above.

   With an invite, sign in to [Studio](https://studio.croche.ai) and create an
   account key. Run
   `croche login` yourself in your terminal. Its prompt hides the key; never paste
   it into chat. An environment override uses `CROCHE_ACCOUNT_KEY`;
   `CROCHE_DEVELOPER_KEY` is still read. If both are set and differ, the CLI refuses
   with `invalid_configuration`. For React Native on iOS, also run
   `cd ios && pod install`.

3. **Ask your coding agent to build the feature.** For example: “Add a Croche agent
   that can read and update the user’s tasks.” The plugin guides project setup,
   tool handlers, a debug key, and a first live check. Keep secrets out of Git and
   debug keys out of release builds.

## What’s in this repo

| Path | Contents |
| --- | --- |
| [plugins/](plugins/) | Claude Code and Codex marketplace, skills, SDK and CLI references |
| [examples/](examples/) | [To-do CLI](examples/todo-cli/), [Node web chat](examples/web-chat/) and [React Native chat](examples/react-native-chat/) |
| [docs/](docs/) | Platform guides pointing to the release’s bundled references |
| [Issues](https://github.com/H1R-AI/croche/issues) | Bugs, questions, developer experience, cost/quality, and feature requests |

Read the bundled [platform guides](plugins/croche/skills/croche-platforms/SKILL.md),
[CLI reference](plugins/croche/skills/croche-cli/SKILL.md), or
[release notes](CHANGELOG.md). These docs ship with the plugin.

## Get help

[Open an issue](https://github.com/H1R-AI/croche/issues/new/choose) and choose the
matching [template](.github/ISSUE_TEMPLATE/). Include your SDK version, platform,
and reproduction steps; never post credentials or other users’ data.

Report security issues privately to [security@h1r.ai](mailto:security@h1r.ai),
or use GitHub’s private vulnerability reporting. See [SECURITY.md](SECURITY.md).
