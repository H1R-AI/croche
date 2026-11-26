const fs = require('fs');
const path = require('path');

// Croche development key: in every non-development bundle (Metro --dev false: Xcode Release, Gradle
// release, `react-native bundle --dev false`), replace the generated module with `undefined`, and
// fail the bundle if any other file still holds a Croche development key.
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
        if (KEY.test(literal.node.value)) throw literal.buildCodeFrameError(`A Croche development key is in ${state.filename}; Release bundles must not carry one.`);
      },
      TemplateElement(element, state) {
        if (KEY.test(element.node.value.raw)) throw element.buildCodeFrameError(`A Croche development key is in ${state.filename}; Release bundles must not carry one.`);
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
