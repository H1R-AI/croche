---
name: croche-platforms
description: Set up Croche for React Native, a web backend, customer-hosted serverless, or native Swift/Kotlin. Use for platform imports, storage, development versus server credentials, mobile locale, and native release readiness. Not for ordinary Node first-turn setup or generic platform development without Croche.
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
| Serverless · Workers + Durable Objects | Customer-deployed Worker, explicit durable StoragePal | [serverless.md](references/serverless.md) |
| iOS · Swift | Supplied 0.6 SPM distribution, `Croche.open` | [ios.md](references/ios.md) |
| Android · Kotlin | Supplied 0.6 local Maven repository, `Croche.open` | [android.md](references/android.md) |

Until the matching 0.6 release is published, install only the supplied artifacts from the bundle
manifest, preserving the app's package manager and lockfile. Do not resolve an older registry
package or mix SDK, CLI and native versions. Both plugin formats follow the SDK version. `MANIFEST.json.roles` names `runtime_tgz`,
`rn_tgz`, `swift_package`, `android_maven`, `docs` and `plugin`; resolve each path relative
to the bundle root. A null role means not built, never permission to guess or downgrade.

Node.js 22+ on macOS/Linux; Windows verification pending. PowerShell syntax does not establish
Windows support. Verify the installed version and platform behavior.
Node and RN do not automatically load the CLI-created `.env`: Node needs `--env-file` or an
existing dotenv loader, web secrets stay server-side only, and RN needs debug-only build config
with no secret in release artifacts. Read the matching reference above before the first turn.
For account CLI login and shell syntax, use `croche-cli` if installed; a `dk_` key is
never an app credential.

## Language option on every platform

`language` is the **user's BCP-47 language**. Supported languages and the authored default
live at `bundledConfig.project.languages`; translated wording lives at
`agents.<id>.languages`. The default must be in the supported set. Selecting wording does not
translate app data or force a reply language. Omitted language uses the device locale where
available; on servers the bundle's authored default applies. Pass the app user's known locale
explicitly on a backend, and verify locale behavior on the actual mobile runtime.
Use `croche-config` for the complete selection rules.

## Native gate

Use the matching native **0.6** artifacts, not an older published SDK. Installation and
`Croche.open` first-turn examples are in [ios.md](references/ios.md) and
[android.md](references/android.md). Publication is not proof of platform behavior.
Verify a simulator/emulator first turn and release credential exclusion in the target app.
Never claim an example was run without running it. Use git-ignored `.xcconfig` (iOS) or
`local.properties` (Android), wired only into Debug and excluded from Release at build time.
If the supplied native artifact is missing, report that blocker; do not downgrade the API or
rewrite an existing native app into a different stack unasked.

## Verify the actual target

Build and run on the selected simulator/emulator/backend; note its SDK version and OS.
Check one completed reply and persistence, and inspect a release bundle/config to ensure it
does not contain development or CLI credentials. Production app verification is configured
by the user at **Settings → App verification**; a simulator check does not verify a device release.
