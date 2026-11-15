<!-- Generated Croche skill content. -->

# React Native

Requirements: React Native 0.76+ with New Architecture, iOS 15.1+ / Android API 26+.
Use the matching supplied 0.6 artifacts until published, preserving the app's package manager.
Resolve `MANIFEST.json.roles.runtime_tgz` and `roles.rn_tgz` relative to the bundle root
into `CROCHE_RUNTIME_TGZ` and `CROCHE_RN_TGZ`. A null role means not built; stop instead of substituting. With permission:

```sh
npm install "$CROCHE_RUNTIME_TGZ" "$CROCHE_RN_TGZ"
```

On the iOS build host, run `pod install` from the app's `ios` directory. No manual native SDK
build is required. Import `Croche` from the RN package. The SDK supplies storage: do not pass
Node `FileStorage`, `storage`, `secretStorage`, or a server key to the RN integration.

```ts
import { Croche } from '@h1r-ai/croche-react-native';

// developmentKey is provided by this app's debug-only build config, not automatic process.env.
if (__DEV__ && !developmentKey) throw new Error('Load the private debug-only app configuration.');
const croche = await Croche.open({
  projectKey: publicProjectKey,
  debugKey: __DEV__ ? developmentKey : undefined,
  user: appUserId,
  language: userLocale,
  bundledConfig: {
    schema: 7,
    project: {defaults: {model: 'openai/gpt-6-luna'}, languages: {default: 'en', supported: ['en']}},
    agents: {helper: {instructions: 'You are a helpful guide. Be concise.'}},
  },
});
const agent = await croche.agent('helper');
const result = await agent.request({ id: messageId, input: [{ type: 'text', text: 'Hello!' }] });
// Check result.status and final message.status before displaying success.
// At app-session teardown: await croche.close();
```

The variables above are app inputs, not new SDK helpers. You obtain the public project key
from project creation and the SDK debug key through the CLI file-writing workflow;
the user only runs the signup/developer-key/login step. Neither the CLI-created `.env` nor
`process.env.CROCHE_DEBUG_KEY` automatically populates a React Native app. Inspect the existing
build configuration and use the [dependency-free Debug key recipe](rn-debug-key.md):
a generated, ignored module plus a Babel Release swap, not a loader dependency.
The recipe includes the complete app script, Babel addition, npm hooks and artifact checks.

The guard above refuses a missing debug-build key without displaying it. Exclude the value **at build time**
from every Release artifact. The recipe's `--check` scans the built artifact, including Hermes bytecode;
`__DEV__` gating alone is not evidence that a bundled secret was removed. Its format guard expects
the CLI's `cdt_` plus 64 lowercase hex digits. Never commit a literal secret or embed the CLI
account credential. Release uses the normal production credential path (App Attest / Play Integrity,
or the unverified-install allowance when attestation is unavailable), not a missing-debug-key error.
Do not launch Release against Cloud to prove stripping; inspect the artifact instead.

Pass the app user's BCP-47 locale explicitly and verify locale behavior on the target RN runtime. Use the core skill's messages/tools references for the shared project/agent surface.
Test a simulator or emulator first; real-device release verification is a separate step.
