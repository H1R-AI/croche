<!-- Generated Croche skill content. -->

# Android · Kotlin project API

Use this guide for a native Android app, not the single-agent API. It targets **0.5.4** and
`Croche.open` → `agent()` → `request()`.

> Version 0.5.4 is published on Maven. Verify Gradle integration, emulator first turn and
> release credential exclusion in the target app; package publication is not proof of those checks.
> If the package cannot be resolved within the declared range, report that blocker; do not downgrade the API.

## Install from Maven

Requires **minSdk 26+**. Add the repository to the existing `settings.gradle.kts` repositories:

```kotlin
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven("https://maven.croche.ai")
    }
}
```

Add the dependency range in `app/build.gradle.kts`:

```kotlin
dependencies {
    implementation("ai.croche:croche-android:0.5.+")
}
```

The distribution supplies the native binary and dependency metadata. No manual Rust/NDK build
or copied AAR is needed for this install path. Preserve the app's existing Android/Kotlin setup.
Minor releases in 0.x may break compatibility, so `0.5.+` stays within 0.5.x.
Windows verification is pending; these Gradle examples are not a Windows support claim.

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

## Keep the debug key in local.properties, Debug only

Android does not load the CLI's default `.env`. From the Android project root, verify that
`local.properties` is git-ignored and not tracked, then have the agent run:

```sh
croche debug-keys create --project PROJECT_ID --env-file local.properties --json
```

Use the project ID returned above. The CLI preserves existing entries such as `sdk.dir` and
writes `CROCHE_DEBUG_KEY` without printing its secret. It refuses an existing nonempty key
unless force is explicitly approved. Never use secret-print output or show the file. Existing
file permissions are preserved: restrict them to the user without displaying contents; Windows
file-protection verification is still pending. Git-ignore is not release protection.

In `app/build.gradle.kts`, load the private setting into the **Debug build type only** and use an
empty value for **Release**. Merge this with existing configuration rather than replacing it:

```kotlin
import java.util.Properties

val crocheLocal = Properties().apply {
    val localFile = rootProject.file("local.properties")
    if (localFile.isFile) localFile.inputStream().use { load(it) }
}

android {
    defaultConfig { minSdk = 26 }
    buildFeatures { buildConfig = true }
    buildTypes {
        getByName("debug") {
            val key = crocheLocal.getProperty("CROCHE_DEBUG_KEY", "")
            require(key.isEmpty() || Regex("cdt_[a-f0-9]{64}").matches(key)) {
                "Invalid Croche debug-key format."
            }
            buildConfigField("String", "CROCHE_DEBUG_KEY", "\"$key\"")
        }
        getByName("release") {
            buildConfigField("String", "CROCHE_DEBUG_KEY", "\"\"")
        }
    }
}
```

Do not put the key in `defaultConfig`, resources, the manifest, assets or a shared build field.
Apply the same exclusion to any custom distribution build types; never copy `local.properties`
or `.env` into the app. A runtime `BuildConfig.DEBUG` check alone cannot remove an embedded secret.
Keep verbose build output and build caches containing Debug artifacts private. See Android's
[build configuration guidance](https://developer.android.com/build/gradle-tips).

## First completed reply

Put this in your app module, importing the **app's own namespace** `BuildConfig` if the source
package differs. Replace `projectKey` with the public key obtained by the agent and `userID`
with the app's stable user ID. Call from the app's existing coroutine scope and render the result.
This one-shot check closes its project; a real app keeps one project open for the user session.

```kotlin
import com.google.gson.JsonParser
import dev.croche.Croche
import dev.croche.InputStatus
import dev.croche.MessageStatus
import dev.croche.OpenOptions
import dev.croche.SendInput
import java.util.UUID
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.withContext

suspend fun firstCrocheReply(projectKey: String, userID: String): String {
    val debugKey = if (BuildConfig.DEBUG) {
        BuildConfig.CROCHE_DEBUG_KEY.also {
            check(it.isNotBlank()) { "Debug key is not loaded." }
        }
    } else null
    val config = JsonParser.parseString(
        """{"model":"deepseek/deepseek-v4.1-flash","instructions":"Help the user with this app."}"""
    ).asJsonObject
    val croche = Croche.open(OpenOptions(
        projectKey = projectKey,
        config = config,
        user = userID,
        debugKey = debugKey,
    ))
    try {
        val agent = croche.agent()
        val result = agent.request(SendInput(id = UUID.randomUUID().toString(), text = "Hello!"))
        val text = result.messages.filter { it.status == MessageStatus.COMPLETED }
            .joinToString("\n") { it.text }
        check(result.status == InputStatus.ANSWERED && text.isNotEmpty()) {
            "No completed reply; inspect the result status."
        }
        return text
    } finally {
        withContext(NonCancellable) { croche.close() }
    }
}
```

The SDK supplies app-private storage on Android; do not pass a Node storage adapter or a JVM
project directory. A `send` receipt alone is not a completed reply. For new messages use new
IDs; preserve the ID and payload when retrying the same input. Respect the app's usage
authorization before a paid turn.

## Options and configuration

| Option | App-visible meaning |
| --- | --- |
| `projectKey` | Public project key returned by CLI project creation |
| `config` | Complete app code config; set `model` explicitly when you want a particular model |
| `user` | Stable app user ID; do not mix different users in one open project |
| `debugKey` | SDK debug credential loaded only for Debug; `null` in Release |
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

- Resolve the latest available 0.5.x patch, record the resolved version, build Debug and run on the
  selected emulator. Confirm a nonempty,
  completed reply; report the real error if it fails. In Studio, inspect **Monitoring → Logs**
  with the development filter. Never paste credentials or private app data into the report.
- Inspect a clean Release APK/AAB without printing secrets: no debug key in classes/resources,
  no `local.properties`/`.env` bundled, no CLI credential. Git-ignore alone is not enough.
- Production uses the app's verification setup under **Settings → App verification**, not a
  shipped debug key. An emulator run does not prove real-device production verification.
