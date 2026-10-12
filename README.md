# Croche

**AI features in your app, with no backend of your own.** Croche runs the agent loop on the
device (iOS, Android, React Native, and web backends), calls the model directly with a key issued
per install of your app (verified as a genuine install when you configure App Attest or Play
Integrity), streams replies, remembers across sessions, and keeps
per-user AI allowances that your app controls.

This repository is the **public home for developers building on Croche**: the coding-agent
plugin, examples, releases and issues. (During the closed beta it is private and invite-only; it
opens with the public beta.) It holds no SDK or Core source.

## Install in 3 steps

1. **Add the Croche plugin to your coding agent.**

   ```sh
   # Claude Code
   claude plugin marketplace add H1R-AI/croche
   claude plugin install croche@croche

   # Codex
   codex plugin marketplace add H1R-AI/croche
   codex plugin add croche@croche
   ```

2. **Install the SDK and the CLI from [Releases](https://github.com/H1R-AI/croche/releases).**
   Download the files for the version you use, then in your app:

   ```sh
   npm install ./h1r-ai-croche-0.4.0.tgz                 # web backends (Node)
   npm install ./h1r-ai-croche-react-native-0.4.0.tgz    # React Native (the native Core is inside)
   npm install --global ./h1r-ai-croche-cli-0.4.0.tgz    # the croche CLI
   ```

   On iOS, run `cd ios && pod install` after installing the React Native package.

3. **Ask your agent for the feature.** For example: *"Add a Croche agent to this app that can
   read and change the user's tasks."* The plugin's `croche` skill walks the agent through the
   project config, your app's commands, a development key and a first live check.

Your project key and development key come from Croche Studio or the `croche` CLI. Keep them in
your app's own configuration; never commit them.

## Examples

| Example | What it shows |
| --- | --- |
| [`examples/web-chat`](examples/web-chat) | A Node backend with one Croche agent and a browser chat page that streams replies |
| [`examples/react-native-chat`](examples/react-native-chat) | One React Native screen: open a project, send, and render streamed replies |

## Documentation

The plugin carries the documentation, and every release updates it with the SDK:

- [The skill](plugins/croche/skills/croche/SKILL.md): the recommended integration, step by step
- [SDK reference](plugins/croche/skills/croche/references/sdk.md): projects, agents, streaming,
  memory, React Native, web backends
- [CLI reference](plugins/croche/skills/croche/references/cli.md): keys, project config, usage
- [Coding-agent guidance](plugins/croche/skills/croche/references/coding-agent.md)
- [Release notes](CHANGELOG.md)

iOS (Swift) and Android (Kotlin) SDKs: coming with the public beta.

## Report a problem or ask for something

Open an issue and pick the template that fits:

| Template | Use it for |
| --- | --- |
| Bug | Something does not work as documented |
| Question | How do I…? Something the docs don't answer |
| Developer experience | It works, but the SDK or the docs made it hard |
| Cost or quality | A turn costs more, or answers worse, than you expected |
| Feature request | Something your app needs that Croche does not do |

Security issues: do **not** open an issue. See [SECURITY.md](SECURITY.md). How issues are
handled: [TRIAGE.md](TRIAGE.md).

Include the SDK version, the platform and, when you can, the runtime debug events
(visibility `runtime`, never `full`). **Never paste keys**: provider keys, server keys (`csk_`),
development keys (`cdt_`), or runtime tokens.
