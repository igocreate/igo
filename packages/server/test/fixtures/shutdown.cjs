// Driven by ShutdownTest: signals and exit codes cannot be observed from
// inside the test process, so each scenario runs here and prints what it did.
const mode = process.argv[2];

// 'test' would keep run() from installing the handlers, which is what most of
// these scenarios exercise.
process.env.NODE_ENV = mode === 'test-env' ? 'test' : 'dev';
process.env.HTTP_PORT = '0';

const config = require('../../src/config');
config.init();
config.shutdownTimeout = mode === 'hang' ? 300 : 10000;

const logger = require('../../src/logger');
logger.info = logger.warn = logger.error = () => {};

const say = (line) => process.stdout.write(`${line}\n`);

const exit = process.exit.bind(process);
process.exit = (code) => {
  say(`exit:${code}`);
  exit(code);
};

const app = require('../../src/app');

// configure() would need a database and a redis: this fixture is about the
// signal wiring, so the steps it orchestrates are stubbed out.
app.configure = async () => {};
app.shutdown  = async () => {
  say('shutdown');
  // closes the last handle before hanging, as the real shutdown does
  if (mode === 'hang') {
    await new Promise(resolve => app.server.close(resolve));
    await new Promise(() => {});
  }
  // long enough that the second signal of the 'twice' scenario lands while
  // this one is still running
  if (mode === 'twice') {
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
};

const send = (signal) => process.kill(process.pid, signal);

app.run(null, () => {
  if (mode === 'test-env') {
    say(`handlers:${process.listenerCount('SIGTERM')}`);
    return exit(0);
  }

  if (mode === 'sigint') {
    return send('SIGINT');
  }

  send('SIGTERM');

  // the second one has to land while the first shutdown is still running
  if (mode === 'twice') {
    setTimeout(() => send('SIGTERM'), 50);
  }
});
