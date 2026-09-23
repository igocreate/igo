require('./init');

const assert = require('assert');
const path   = require('path');
const { execFileSync } = require('child_process');

// .cjs, outside the test glob: mocha would otherwise load it as a test
// file and the script would exit the runner itself.
const SCRIPT = path.join(__dirname, 'fixtures', 'uncaught.cjs');

// process.exit() cannot be observed from inside the test process: run each
// scenario in a child and read its exit code and what it printed.
const runChild = (mode) => {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, mode], { encoding: 'utf8', stdio: 'pipe' });
    return { status: 0, steps: stdout.trim().split('\n') };
  } catch (err) {
    return { status: err.status, steps: err.stdout.trim().split('\n') };
  }
};

const run = (mode) => runChild(mode).status;

describe('ErrorHandler uncaught exceptions', function() {
  this.timeout(20000);

  it('should exit even once the request is answered, so a process manager restarts a broken server', () => {
    assert.strictEqual(run('default'), 1);
  });

  it('should exit when the exception happened outside a request', () => {
    assert.strictEqual(run('no-context'), 1);
  });

  describe('config.onCrash', () => {

    it('should run once the failed response is flushed, before the process exits', () => {
      const { status, steps } = runChild('crash-hook');
      assert.strictEqual(status, 1);
      assert.deepStrictEqual(steps, ['response finished', 'flushed']);
    });

    it('should not hold the exit past its one second', () => {
      assert.strictEqual(run('crash-hook-hangs'), 1);
    });
  });
});
