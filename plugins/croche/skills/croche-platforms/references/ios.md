<!-- Generated Croche skill content. -->

# iOS · Swift project API

Use this guide for a native iOS app, not the single-agent API. It targets **0.5.2** and
`Croche.open` → `agent()` → `request()`.

> Version 0.5.2 is published through SPM. Verify Xcode integration, simulator first turn and
> release credential exclusion in the target app; package publication is not proof of those checks.
> If the exact package cannot be resolved, report that blocker; do not downgrade the API.

## Install with Swift Package Manager

Requires iOS 15+ and a Swift 6-capable Xcode. In Xcode, **File → Add Package Dependencies…**:

- URL: `https://github.com/H1R-AI/croche-swift`
- Dependency rule: **Exact Version**, **0.5.2**
- Add the **CrocheRuntime** product to your app target; import `CrocheRuntime`.

For a Swift package target, add the dependency and product to its existing manifest:

```swift
.package(url: "https://github.com/H1R-AI/croche-swift", exact: "0.5.2")
// In the app target's dependencies:
.product(name: "CrocheRuntime", package: "croche-swift")
```

The distribution supplies the native binary; an app developer does not need a Rust toolchain.
Do not replace the app's existing package dependencies.

## One human step; the agent sets up the project

The coding agent installs the CLI with permission. The human signs up at
[Studio](https://studio.croche.ai), creates one account key under **Account → Account keys**, and
runs **`croche login`** privately. Never ask for a key in chat or run login for them. Reuse a
confirmed login. After the human says done, re-check authentication and the private key file,
then continue setup and the first authorized live turn in the same turn. Capture CLI JSON
privately; emit only success/IDs/file paths, never raw output, prefixes or any part of a key.
For key checks, presence/length only. The agent creates/reuses the project and obtains its **public** project key:

```sh
croche auth whoami --json
croche projects create --name "My app" --json
```

Do not request a public project key or SDK debug key from the user. The account key
is only for CLI authentication; it never goes in the app.

## Keep the debug key in a private, Debug-only configuration

The CLI can write its `CROCHE_DEBUG_KEY` assignment directly to an `.xcconfig` file; Xcode does
not load the CLI's default `.env`. The agent creates the `Config` directory first, verifies the
file is not tracked by Git, and runs:

```sh
croche debug-keys create --project PROJECT_ID --env-file Config/Croche.Debug.xcconfig --json
```

Use the project ID returned above. The CLI prints metadata only and adds the destination to
`.gitignore`; verify the ignore rule and owner-only file permissions without reading or printing
the key. Never use secret-print output or force-overwrite an existing key without consent.

Wire this up in the app's existing Xcode project:

1. Use `Config/Croche.Debug.xcconfig` only as the **Debug** base configuration, or include it
   from the existing Debug-only `.xcconfig`. Preserve existing settings. Do not include it in
   Release or any distribution configuration.
2. Set Debug's **Info.plist File** (`INFOPLIST_FILE`) to a Debug-specific plist preserving the
   app's required entries. Add the following entry inside its `<dict>`. Keep build-setting
   expansion enabled. Release keeps a separate plist **without this entry**.

   ```xml
   <key>CROCHE_DEBUG_KEY</key>
   <string>$(CROCHE_DEBUG_KEY)</string>
   ```

3. Keep the private `.xcconfig` outside target resource membership / Copy Bundle Resources.
   Do not copy that file, `.env`, or the CLI credential file into any app bundle. The expanded
   key is permitted only in a local Debug app, never in a Release app/archive.
4. Ensure `DEBUG` is defined only for Debug. Read the plist value only inside `#if DEBUG`.
   Do not rely on a runtime flag to remove a secret already included in a release artifact.

See Apple's [build configuration files](https://developer.apple.com/documentation/xcode/adding-a-build-configuration-file-to-your-project)
and [build settings](https://developer.apple.com/documentation/xcode/build-settings-reference).
Do not log expanded build settings or a Debug plist: those can expose the key.

## First completed reply

Replace `projectKey` with the public key obtained by the agent and `userID` with the app's
stable user ID. Call this async function from your app; display its returned reply in the UI.
This one-shot check closes its project; a real app keeps one project open for the user session.

```swift
import Foundation
import CrocheRuntime

func firstCrocheReply(projectKey: String, userID: String) async throws -> String {
    let debugKey: String?
    #if DEBUG
    guard let value = Bundle.main.object(forInfoDictionaryKey: "CROCHE_DEBUG_KEY") as? String,
          !value.isEmpty, !value.contains("$(") else {
        throw NSError(domain: "CrocheSetup", code: 1,
                      userInfo: [NSLocalizedDescriptionKey: "Debug key is not loaded."])
    }
    debugKey = value
    #else
    debugKey = nil
    #endif

    let config = try JSON(#"{"model":"deepseek/deepseek-v4.1-flash","instructions":"Help the user with this app."}"#)
    let croche = try await Croche.open(OpenOptions(
        projectKey: projectKey,
        config: config,
        user: userID,
        debugKey: debugKey
    ))
    do {
        let agent = try await croche.agent()
        let result = try await agent.request(SendInput(id: UUID().uuidString, text: "Hello!"))
        let text = result.messages.filter { $0.status == .completed }
            .map(\.text).joined(separator: "\n")
        guard result.status == .answered, !text.isEmpty else {
            throw NSError(domain: "CrocheFirstTurn", code: 2,
                          userInfo: [NSLocalizedDescriptionKey: "No completed reply; inspect the result status."])
        }
        try await croche.close()
        return text
    } catch {
        try? await croche.close()
        throw error
    }
}
```

The SDK supplies app-private storage on iOS; do not pass a Node storage adapter. A `send`
receipt alone is not a completed reply. For new messages use new IDs; preserve the ID and
payload when retrying the same input. Respect the app's usage authorization before a paid turn.

## Options and configuration

| Option | App-visible meaning |
| --- | --- |
| `projectKey` | Public project key returned by CLI project creation |
| `config` | Complete app code config; set `model` explicitly when you want a particular model |
| `user` | Stable app user ID; do not mix different users in one open project |
| `debugKey` | SDK debug credential loaded only for Debug; `nil` in Release |
| `language` | User's BCP-47 language; defaults to the device locale when omitted in 0.5.1 |

`language` selects `config.languages.<tag>` by exact tag, then primary subtag. If none matches,
the base config is used as is, written in `config.defaultLanguage` (default `en`): that is the
config's authored language, **not** the user's. An English-only config can serve a Korean user.
The model is not told `language`; it replies in the language the user writes unless instructions
say otherwise. See [config and language](https://docs.croche.ai/concepts/config.md).

A Studio config replaces the whole code config at the **next open after sync**, never mid-session.
Debug-key installs follow drafts. Include **every tool** the app uses and register its handlers.
Choose a model using [Models](https://docs.croche.ai/models.md).

## Verify before shipping

- Resolve exactly 0.5.2, build Debug and run on the selected simulator. Confirm a nonempty,
  completed reply; report the real error if it fails. In Studio, inspect **Monitoring → Logs**
  with the development filter. Never paste credentials or private app data into the report.
- Inspect a clean Release archive without printing secrets: no debug key in the binary/plist,
  no private `.xcconfig`/`.env` bundled, no CLI credential. Git-ignore alone is not enough.
- Production uses the app's verification setup under **Settings → App verification**, not a
  shipped debug key. A simulator run does not prove real-device production verification.
