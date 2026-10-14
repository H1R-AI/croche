---
name: croche-platforms
description: Set up Croche for React Native, a web backend, or native Swift/Kotlin. Use for platform imports, storage, development versus server credentials, mobile locale, and native release readiness. Not for ordinary Node first-turn setup or generic platform development without Croche.
---

<!-- Generated Croche skill content. -->

# Choose the correct platform integration

Preserve the user's target platform. Explain what is ready and what needs verification rather
than silently converting their app to another platform. Croche runs the model for the app;
use the usage and limits shown in Studio, not a separate model-service setup.

| Target | Path | Read when needed |
| --- | --- | --- |
| Local Node check | `@h1r-ai/croche`, durable `FileStorage`, SDK debug key | Core `croche` skill |
| React Native | `Croche` from `@h1r-ai/croche-react-native`, SDK-managed storage | [react-native.md](references/react-native.md) |
| Web (local and production) | `Croche` on the app's Node backend, server key stays there | [web-backend.md](references/web-backend.md) |
| iOS · Swift | SPM, **Up to Next Minor Version** from **0.5.2**, `Croche.open` | [ios.md](references/ios.md) |
| Android · Kotlin | Maven, **0.5.+**, `Croche.open` | [android.md](references/android.md) |

Install npm packages without a version suffix; the project lockfile records resolved versions.
Minor releases in 0.x may break compatibility, so the native ranges above stay within 0.5.x.

Node.js 22+ on macOS/Linux; Windows verification pending. PowerShell syntax does not establish
Windows support. SDK 0.5.2 is published on npm; verify the installed version and platform behavior.
Node and RN do not automatically load the CLI-created `.env`: Node needs `--env-file` or an
existing dotenv loader, web secrets stay server-side only, and RN needs debug-only build config
with no secret in release artifacts. Read the matching reference above before the first turn.
For account CLI login and shell syntax, use `croche-cli` if installed; a `dk_` key is
never an app credential.

## Language option on every platform

`language` is the **user's BCP-47 language**, selecting a translated `config.languages` branch.
No match uses the base as written in `config.defaultLanguage`; it does not force a reply
language. Omitted language uses browser `navigator.language`; RN/Swift/Kotlin automatic device
locale is targeted for 0.5.1 (TODO verify). Pass the known user locale explicitly on earlier RN
or a Node backend. The model replies to the user's language unless instructions say otherwise.
Use `croche-config` for the complete selection and next-open rules.

## Native gate

**Native Swift and Kotlin SDKs are published as 0.5.2**, including the shared
**project/agent `Croche.open` API**. Do not describe published SDKs as nonexistent.
Installation and `Croche.open` first-turn examples are in [ios.md](references/ios.md)
and [android.md](references/android.md). For a native request, read the matching reference,
prepare the integration using the declared 0.5.x range and record its resolved version.
Verify simulator/emulator first turn
and release credential exclusion in the target app. Do not substitute the native
0.5.0 single-agent API or claim an example was run without running it. Use git-ignored `.xcconfig` (iOS) or
`local.properties` (Android), wired only into Debug and excluded from Release at build time.
If a native release is unavailable, report that blocker; offer TypeScript/React Native for a
new hackathon app, but never rewrite an existing native app into a different stack unasked.

## Verify the actual target

Build and run on the selected simulator/emulator/backend; note its SDK version and OS.
Check one completed reply and persistence, and inspect a release bundle/config to ensure it
does not contain development or CLI credentials. Production app verification is configured
by the user at **Settings → App verification**; a simulator check does not verify a device release.
