// Driven by ShutdownTest: signals and exit codes cannot be observed from
// inside the test process, so each scenario runs here and prints what it did.
const mode = process.argv[2];

// 'test' would keep run() from installing the handlers, which is what most of
// these scenarios exercise.
process.env.NODE_ENV = mode === 'test-env' ? 'test' : 'dev';
process.env.HTTP_PORT = '0';

const config = require('../../src/config');
config.init();
// in 'delay', a ceiling counting the wait would expire before it ends
const timeouts = { hang: 300, delay: 250 };
config.shutdownTimeout = timeouts[mode] ?? 10000;
config.shutdownDelay   = mode === 'delay' ? 300 : 0;

const logger = require('../../src/logger');
logger.info = logger.warn = logger.error = () => {};

const say = (line) => process.stdout.write(`${line}\n`);

const exit = process.exit.bind(process);
process.exit = (code) => {
  say(`exit:${code}`);
  exit(code);
};

const app    = require('../../src/app');
const health = require('../../src/connect/health');

// the delay is the signal handler's, not shutdown()'s: trace when readiness
// turns 503, and a point in the middle of the wait
if (mode === 'delay') {
  const drain = health.drain;
  health.drain = (...args) => {
    say('drain');
    setTimeout(() => say('serving'), 150);
    return drain(...args);
  };
}

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
  // fits in shutdownTimeout once the delay is spent
  if (mode === 'delay') {
    await new Promise(resolve => setTimeout(resolve, 100));
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
