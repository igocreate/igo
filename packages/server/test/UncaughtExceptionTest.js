require('./init');

const assert = require('assert');
const path   = require('path');
const { execFileSync } = require('child_process');

// .cjs, outside the test glob: mocha would otherwise load it as a test
// file and the script would exit the runner itself.
const SCRIPT = path.join(__dirname, 'fixtures', 'uncaught.cjs');

// process.exit() cannot be observed from inside the test process: run each
// scenario in a child and read its exit code.
const run = (mode) => {
  try {
    execFileSync(process.execPath, [SCRIPT, mode], { encoding: 'utf8', stdio: 'pipe' });
    return 0;
  } catch (err) {
    return err.status;
  }
};

describe('ErrorHandler uncaught exceptions', function() {
  this.timeout(20000);

  it('should exit by default, so a process manager restarts a broken server', () => {
    assert.strictEqual(run('default'), 1);
  });

  it('should keep serving when the request was answered and exit is disabled', () => {
    assert.strictEqual(run('survive'), 0);
  });

  it('should exit even when disabled, if the exception happened outside a request', () => {
    assert.strictEqual(run('no-context'), 1);
  });
});
