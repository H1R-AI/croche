<!-- Generated Croche skill content. -->

# Android · Kotlin project API

Use this guide for the native **0.7** App API: `Croche.open` → `agent()` → `request()`.
Verify Gradle integration,
emulator first turn and release credential exclusion; package publication is not proof of those checks.

## Install from the Croche Maven repository

Requires **minSdk 26+**. Add the Croche Maven repository to the existing
`settings.gradle.kts` repositories. Preserve the app's current repositories and plugins:

```kotlin
dependencyResolutionManagement {
    repositories {
        maven { url = uri("https://maven.croche.ai") }
        google()
        mavenCentral()
    }
}
```

Pin an exact published 0.7 release for `crocheVersion` in the app's Gradle properties. Use a
version listed in https://maven.croche.ai/ai/croche/croche-android/maven-metadata.xml.
If no 0.7 release is available or it does not resolve, report that blocker instead of installing an older release.
In `app/build.gradle.kts`:

```kotlin
val crocheVersion = providers.gradleProperty("crocheVersion").get()
dependencies {
    implementation("ai.croche:croche-android:$crocheVersion")
}
```

The repository serves the AAR, native libraries and dependency metadata together; do not copy a
bare AAR without its dependencies. No app-side Rust/NDK build is required. Windows verification is pending.

## One human step; the agent sets up the project

The coding agent installs the CLI with permission. The human signs up at
the Studio that `croche auth whoami --json` names (`studio_url`, or `error.details.studio_url` before login), creates one account key under **Account → Account keys**, and
runs **`croche login`** privately. Never ask for a key in chat or run login for them. Reuse a
confirmed login. After the human says done, re-check authentication and the private key file,
then continue setup and the first authorized live turn in the same turn. Capture CLI JSON
privately; emit only success/IDs/file paths, never raw output, prefixes or any part of a key.
For key checks, presence/length only. The agent creates/reuses the project and obtains its **public** project key:

```sh
croche auth whoami --json
croche projects create --name "My app" --json
```

Do not request a public project key or SDK development key from the user. The account key
is only for CLI authentication; it never goes in the app.

## Keep the development key in local.properties, Debug only

Android does not load the CLI's default `.env`. From the Android project root, verify that
`local.properties` is git-ignored and not tracked, then have the agent run:

```sh
croche development-keys create --project PROJECT_ID --dotenv-file local.properties --json
```

Use the project ID returned above. The CLI preserves existing entries such as `sdk.dir` and
writes `CROCHE_DEVELOPMENT_KEY` without printing its secret. It refuses an existing nonempty key
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
            val key = crocheLocal.getProperty("CROCHE_DEVELOPMENT_KEY", "")
            require(key.isEmpty() || Regex("cdt_[a-f0-9]{64}").matches(key)) {
                "Invalid Croche development-key format."
            }
            buildConfigField("String", "CROCHE_DEVELOPMENT_KEY", "\"$key\"")
        }
        getByName("release") {
            buildConfigField("String", "CROCHE_DEVELOPMENT_KEY", "\"\"")
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
with the app's stable user ID. Supply the schema-7 `bundledConfig`, its declared `agentID`,
and the Android `Context`. Call from the app's existing coroutine scope and render the result.
This one-shot check closes its project; a real app keeps one project open for the user session.

```kotlin
import android.content.Context
import com.google.gson.JsonObject
import dev.croche.AppStreamContract
import dev.croche.Croche
import dev.croche.OpenOptions
import dev.croche.SendInput
import dev.croche.TextInput
import java.util.UUID
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.withContext

suspend fun firstCrocheReply(context: Context, projectKey: String, userID: String, bundledConfig: JsonObject, agentID: String): String {
    val developmentKey = if (BuildConfig.DEBUG) {
        BuildConfig.CROCHE_DEVELOPMENT_KEY.also {
            check(it.isNotBlank()) { "Development key is not loaded." }
        }
    } else null
    val croche = Croche.open(OpenOptions(
        projectKey = projectKey,
        bundledConfig = bundledConfig,
        platform = context.applicationContext,
        user = userID,
        developmentKey = developmentKey,
    ))
    try {
        val agent = croche.agent(agentID)
        val result = agent.request(SendInput(id = UUID.randomUUID().toString(), input = listOf(TextInput("Hello!"))))
        val text = result.messages.filter { it.status == AppStreamContract.MessageStatus.COMPLETED }
            .joinToString("\n") { it.text }
        check(result.status == AppStreamContract.InputDisposition.ANSWERED && text.isNotEmpty()) {
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
| `bundledConfig` | Schema-7 bundle declaring agent IDs; choose `project.defaults.model` explicitly |
| `platform` | Android application Context |
| `user` | Stable app user ID; do not mix different users in one open project |
| `developmentKey` | The development key, loaded only in Debug; `null` in Release |
| `language` | User's BCP-47 language; defaults to the device locale when omitted |

`language` selects the supported wording in `bundledConfig.project.languages` and
`agents.<id>.languages`; the authored default must be in the supported set. It does not force
the model's reply language. See [config and language](https://docs.croche.ai/concepts/config.md).

The Cloud supplies a patch over the schema-7 bundle; it does not replace the app's entire
bundle. Development-key installs follow development drafts. Reopen the agent after synchronization
and verify the applied config. Register tools in app code, not config.
Choose a model using [Models](https://docs.croche.ai/models.md).

## Verify before shipping

- Verify the resolved `ai.croche:croche-android` version, build Debug and run on the
  selected emulator. Confirm a nonempty,
  completed reply; report the real error if it fails. In Studio, inspect **Monitoring → Logs**
  with the development filter. Never paste credentials or private app data into the report.
- Inspect a clean Release APK/AAB without printing secrets: no development key in classes/resources,
  no `local.properties`/`.env` bundled, no CLI credential. Git-ignore alone is not enough.
- Production uses the app's verification setup under **Settings → App verification**, not a
  shipped development key. An emulator run does not prove real-device production verification.
