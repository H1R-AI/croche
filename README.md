# Croche

**AI features in your app, with no backend of your own.** Croche runs the agent loop on the
device (iOS, Android, React Native, and web backends), calls the model directly with a key only
a genuine install of your app receives, streams replies, remembers across sessions, and keeps
per-user AI allowances that your app controls.

This repository is the **public home for developers building on Croche**: issues, discussions,
guides, examples and releases. (During the closed beta it is private and invite-only; it opens
with the public beta.)

## Report a problem or ask for something

Open an issue and pick the template that fits:

| Template | Use it for |
| --- | --- |
| Bug | Something does not work as documented |
| Developer experience | It works, but the SDK or the docs made it hard |
| Cost or quality | A turn costs more, or answers worse, than you expected |
| Feature request | Something your app needs that Croche does not do |

Security issues: do **not** open an issue. See [SECURITY.md](SECURITY.md).

Include the SDK version, the platform and, when you can, the runtime debug events
(visibility `runtime`, never `full`). **Never paste keys**: provider keys, server keys (`csk_`),
development keys (`cdt_`), or runtime tokens.

## Guides

- React Native: `docs/react-native.md`
- Web (on your own backend): `docs/web.md`
- iOS (Swift) and Android (Kotlin): coming with the public beta

These guides are published copies of the SDK guides maintained with the code.
