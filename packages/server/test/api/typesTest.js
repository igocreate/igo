const assert  = require('assert');
const path    = require('path');
const { execFileSync } = require('child_process');

const PROJECT = path.join(__dirname, '..', 'types', 'tsconfig.json');

// The .d.ts files are only exercised by a type checker: without this, a broken
// declaration would ship unnoticed. test/types/expect-errors.ts pins the
// errors that must fire — if inference degrades to `any`, tsc reports the
// @ts-expect-error directives as unused and this fails.
describe('api/types', function() {
  this.timeout(60000);

  // TypeScript 7 restricts its exports map, so its internal paths cannot be
  // resolved directly: locate the binary through the package manifest instead.
  const findTsc = () => {
    try {
      const pkg = require.resolve('typescript/package.json');
      return path.join(path.dirname(pkg), 'bin', 'tsc');
    } catch {
      return null;
    }
  };

  it('should typecheck the declarations against a TypeScript consumer', function() {
    const tsc = findTsc();
    if (!tsc) {
      return this.skip();
    }

    try {
      execFileSync(process.execPath, [tsc, '-p', PROJECT], { encoding: 'utf8', stdio: 'pipe' });
    } catch (err) {
      assert.fail(`tsc reported errors:\n${err.stdout || err.message}`);
    }
  });
});
