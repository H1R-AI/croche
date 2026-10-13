<!-- Generated Croche skill content. -->

# React Native

Requirements: React Native 0.76+ with New Architecture, iOS 15.1+ / Android API 26+.
TODO verify matching public packages before installing; use the app's existing package manager.
With permission:

```sh
npm install @h1r-ai/croche @h1r-ai/croche-react-native
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
  config: { model: 'deepseek/deepseek-v4.1-flash', instructions: 'You are a helpful guide. Be concise.' },
});
const agent = await croche.agent();
const result = await agent.request({ id: messageId, text: 'Hello!' });
// Check result.status and final message.status before displaying success.
// At app-session teardown: await croche.close();
```

The variables above are app inputs, not new SDK helpers. You obtain the public project key
from project creation and the SDK debug key through the CLI file-writing workflow;
the user only runs the signup/developer-key/login step. Neither the CLI-created `.env` nor
`process.env.CROCHE_DEBUG_KEY` automatically populates a React Native app. Inspect the existing
build configuration and map `CROCHE_DEBUG_KEY` from the ignored file into its **debug-only**
`developmentKey` input before opening Croche. Do not invent a package import or add a loader
dependency without permission. If no loader exists, report that specific build-wiring blocker;
do not ask for the secret or pretend Node's env-file flag injects a mobile bundle.

The guard above refuses a missing debug-build key without displaying it. Rebuild the debug app
after changing its build configuration and verify a real turn. Exclude the value **at build time**
from every release artifact and inspect the release configuration/bundle for accidental inclusion.
`__DEV__` gating alone is not evidence that a bundled secret was removed. Never commit a literal
secret or embed the CLI `dk_` credential. CLI file behavior remains pending verification.

Pass the app user's BCP-47 locale explicitly until RN automatic device locale is verified in
0.5.1. Use the core skill's messages/tools references for the shared project/agent surface.
Test a simulator or emulator first; real-device release verification is a separate step.
