<!-- Generated Croche skill content. -->

# React Native: the Croche debug key in Debug builds, never in Release

This recipe adds no dependency. It is two app-owned files, `scripts/croche-dev-key.mjs` and an
addition to `babel.config.js`, plus a few lines elsewhere.

- **Debug:** the script copies `CROCHE_DEBUG_KEY` from the CLI-written, git-ignored `.env` into a
  git-ignored module. Metro serves that module to the Debug app.
- **Release:** every non-development Metro bundle (Xcode Release, Gradle release,
  `react-native bundle --dev false`) replaces the module with `undefined`, whatever the file
  holds. The bundle fails if any other source still holds a `cdt_` key.
- **Check:** `--check` mechanically proves the built artifact holds no key.

Install the matching project-local CLI using the croche-cli companion skill before the workflow.
Merge the npm hooks and Babel plugins with the app's existing hooks and plugins; do not overwrite them.
Keep `.env` and the generated module untracked. Create `src/` if the app does not have it.

## 1. Files

`scripts/croche-dev-key.mjs`: copy the complete script below into your app. It writes
`src/croche-dev-key.generated.ts` with mode 0600, and `--check` scans artifacts. It never prints
a key.

`babel.config.js`: use the complete Babel addition below, including `crocheReleaseKeyStrip` and the `api.env('development')` switch. Keep
any plugins the app already has in both branches. For example, 0.6.0-dev.3 needs
`@babel/plugin-transform-class-static-block` until P12 ships.

```js
module.exports = api => {
  const development = api.env('development');
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: development ? [] : [crocheReleaseKeyStrip],
  };
};
```

`.gitignore`:

```
.env
src/croche-dev-key.generated.ts
```

`package.json` scripts. The module must exist before any bundle, so `postinstall` creates it
too; without a `.env` it writes `undefined`:

```json
"postinstall": "node scripts/croche-dev-key.mjs",
"prestart": "node scripts/croche-dev-key.mjs",
"preios": "node scripts/croche-dev-key.mjs",
"preandroid": "node scripts/croche-dev-key.mjs"
```

## 2. App code

```ts
import { Croche } from '@h1r-ai/croche-react-native';
import { developmentKey } from './croche-dev-key.generated';

// Debug: no key means `croche debug-keys create` has not run, or Metro started before it did.
if (__DEV__ && !developmentKey) {
  throw new Error('No Croche debug key: run `croche debug-keys create`, then restart Metro.');
}
const croche = await Croche.open({
  projectKey: publicProjectKey,
  debugKey: __DEV__ ? developmentKey : undefined,
  // user, language, bundledConfig, tools as usual
});
```

## 3. Agent workflow

1. `croche debug-keys create --project PROJECT_ID --json`, run from the app root. It writes
   `./.env` with mode 0600 and git-ignores it; use the default output path.
2. `node scripts/croche-dev-key.mjs`. It prints `debug key written`, never the key.
3. Start Metro, build and launch Debug on the simulator, then verify a real first turn.
4. Release proof. Do not ship a build unless this passes:
   - iOS: `xcodebuild -workspace ios/App.xcworkspace -scheme App -configuration Release -sdk iphonesimulator -derivedDataPath build/rel build`,
     then `node scripts/croche-dev-key.mjs --check build/rel/Build/Products/Release-iphonesimulator/App.app`.
     That scans `main.jsbundle` and the binary.
   - Android: `(cd android && ./gradlew assembleRelease)`, then
     `node scripts/croche-dev-key.mjs --check android/app/build/outputs/apk/release`.
   - Quick check without a native build:
     `npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output /tmp/rel.js`,
     then `node scripts/croche-dev-key.mjs --check /tmp/rel.js`.
   - `--check` looks for any string matching `cdt_[a-f0-9]{64}` (the CLI's debug-key format:
     `cdt_` plus 64 lowercase hex digits), and for this `.env`'s own key byte for byte. The
     Babel guard and the script use the same lowercase-hex pattern. `.env` values outside that
     format are not loaded: the script writes `undefined`, and a Debug build then stops at the
     missing-key guard.

## What Release does

A Release build never holds a debug key. It opens Croche through the normal production
credential path: App Attest or Play Integrity, or the unverified-install allowance when the
platform cannot attest. It does not raise a missing-debug-key error. Do not launch a Release build
against Cloud to "prove" the strip; the proof is `--check` on the built artifact.

## Why each piece

- **A generated module, not `process.env`:** React Native bundles have no `process.env`. A
  module is what Metro can serve.
- **Babel, not the script, guards Release:** the script runs by hand and from npm hooks. Xcode
  and Gradle Release builds call Metro directly, with `--dev false`. Babel's env is
  `development` only for dev bundles, so any other env strips the key (fail closed).
- **`__DEV__ ? developmentKey : undefined` alone is not enough:** a string imported from another
  module stays in the bundle unless that module is replaced.
- **Import elision is not the guard:** with the standard app code, the RN TypeScript preset
  already drops the import in Release, because `__DEV__` folds to false and the binding goes
  unused. That holds only while every use sits behind `__DEV__`. One use outside it, or a `.js`
  app without the TS elision, would pull the key in. The Babel swap holds either way: bundling the
  key module itself as the entry with `--dev false` gives no key with the swap, and the key
  without it (P14 proof).
- **Real paths:** the swap compares real paths, so a symlinked project dir (macOS `/var` →
  `/private/var`) still matches.
- **The `StringLiteral` guard:** it catches a key pasted anywhere else in app source.
- **`--check` matches the app's own key byte for byte:** it does not rely only on the format.

## App file: scripts/croche-dev-key.mjs

```js
#!/usr/bin/env node
// Croche debug key for a React Native app. Node built-ins only; never prints a key.
//
//   node scripts/croche-dev-key.mjs             Writes src/croche-dev-key.generated.ts from the
//                                               CROCHE_DEBUG_KEY line of the CLI-written ./.env.
//                                               With no .env or no key, it writes `undefined`.
//   node scripts/croche-dev-key.mjs --check P…  Exits 1 if any file under the paths P (a release
//                                               bundle, .app, .ipa, .apk or .aab) holds a Croche
//                                               debug key. Archives are read with `unzip -p`.
//
// The generated module and .env are git-ignored. babel.config.js replaces the module with
// `undefined` in every non-development Metro bundle, so a Release build never carries the key,
// whatever the file holds.
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src', 'croche-dev-key.generated.ts');
const KEY = /cdt_[a-f0-9]{64}/;

function envKey() {
  const file = join(root, '.env');
  if (!existsSync(file)) return undefined;
  const line = readFileSync(file, 'latin1').match(/^(?:export[ \t]+)?CROCHE_DEBUG_KEY[ \t]*=([^\r\n]*)/m);
  const value = line?.[1].trim().replace(/^(['"])(.*)\1$/, '$2');
  return value && KEY.test(value) ? value : undefined;
}

function write() {
  const key = envKey();
  const body = '// Generated by scripts/croche-dev-key.mjs from .env. Git-ignored; never commit.\n'
    + '// babel.config.js replaces this module with `undefined` in Release bundles.\n'
    + `export const developmentKey: string | undefined = ${key ? JSON.stringify(key) : 'undefined'};\n`;
  writeFileSync(out, body, { mode: 0o600 });
  chmodSync(out, 0o600);
  console.log(`croche-dev-key: ${key ? 'debug key written' : 'no CROCHE_DEBUG_KEY in .env; wrote undefined'} (${out})`);
}

function* files(path) {
  const st = statSync(path);
  if (!st.isDirectory()) { yield path; return; }
  for (const name of readdirSync(path)) yield* files(join(path, name));
}

function contents(file) {
  if (/\.(ipa|apk|aab|zip)$/i.test(file)) {
    return execFileSync('unzip', ['-p', file], { maxBuffer: 1 << 30 }).toString('latin1');
  }
  return readFileSync(file).toString('latin1');
}

function check(paths) {
  if (!paths.length) throw new Error('--check needs at least one path');
  const own = envKey();
  let scanned = 0;
  const hits = [];
  for (const path of paths) {
    for (const file of files(path)) {
      const text = contents(file);
      scanned += 1;
      if (KEY.test(text) || (own && text.includes(own))) hits.push(file);
    }
  }
  if (!scanned) throw new Error('--check found no files to scan');
  if (hits.length) {
    console.error(`FAIL croche-dev-key: a Croche debug key is in ${hits.length} file(s):`);
    for (const file of hits) console.error(`  ${file}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS croche-dev-key: no Croche debug key in ${scanned} file(s)`);
  }
}

try {
  const at = process.argv.indexOf('--check');
  if (at >= 0) check(process.argv.slice(at + 1)); else write();
} catch (error) {
  console.error(`FAIL croche-dev-key: ${error.message}`);
  process.exitCode = 2;
}
```

## App file: babel.config.js

```js
const fs = require('fs');
const path = require('path');

// Croche debug key: in every non-development bundle (Metro --dev false: Xcode Release, Gradle
// release, `react-native bundle --dev false`), replace the generated module with `undefined`, and
// fail the bundle if any other file still holds a Croche debug key.
const DEV_KEY_MODULE = path.join(__dirname, 'src', 'croche-dev-key.generated.ts');
// Compare real paths: a symlinked project dir (macOS /var -> /private/var) must still match.
const real = file => { try { return fs.realpathSync(file); } catch { return path.resolve(file); } };
const KEY = /cdt_[a-f0-9]{64}/;
function crocheReleaseKeyStrip({ types: t }) {
  return {
    visitor: {
      Program(program, state) {
        if (!state.filename || real(path.resolve(state.cwd ?? __dirname, state.filename)) !== real(DEV_KEY_MODULE)) return;
        program.node.body = [t.exportNamedDeclaration(t.variableDeclaration('const', [
          t.variableDeclarator(t.identifier('developmentKey'), t.identifier('undefined'))]), [])];
      },
      StringLiteral(literal, state) {
        if (KEY.test(literal.node.value)) throw literal.buildCodeFrameError(`A Croche debug key is in ${state.filename}; Release bundles must not carry one.`);
      },
      TemplateElement(element, state) {
        if (KEY.test(element.node.value.raw)) throw element.buildCodeFrameError(`A Croche debug key is in ${state.filename}; Release bundles must not carry one.`);
      },
    },
  };
}

module.exports = api => {
  const development = api.env('development');
  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: development ? [] : [crocheReleaseKeyStrip],
  };
};
```

## Verification provenance

Rook verified RN 0.88.1 / New Architecture / Xcode 27: a Debug first turn,
an iOS Release simulator `.app` (Hermes bundle and binary), Android non-development
Metro bundle, generated-module and Hermes-bytecode positive controls, and a Babel
swap A/B. The Android bundle check is not an Android native Release build proof.
A Release app was deliberately not launched against Cloud. Repeat the artifact checks
on your own app and target; do not substitute `__DEV__` folding for the Babel swap.
