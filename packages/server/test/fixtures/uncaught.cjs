// Driven by UncaughtExceptionTest: raises an uncaught exception in a child
// process so its exit code can be observed.
process.env.NODE_ENV = 'test';

const mode = process.argv[2];

const config = require('../../src/config');
config.init();

// what the parent reads back, in order, from stdout
const trace = (step) => process.stdout.write(`${step}\n`);

if (mode === 'crash-hook') {
  config.onCrash = async () => trace('flushed');
}
if (mode === 'crash-hook-hangs') {
  config.onCrash = () => new Promise(() => {});
}

const errorhandler = require('../../src/connect/errorhandler');
const logger       = require('../../src/logger');

logger.error = () => {};

const fakeReq = () => ({
  method: 'GET', originalUrl: '/x', url: '/x', path: '/x', protocol: 'http',
  headers: { host: 'localhost' }, get: () => '', body: {}, session: {},
});

const { EventEmitter } = require('events');

// writableFinished stays false until 'finish', like a response still flushing
const fakeRes = () => {
  const res = Object.assign(new EventEmitter(), { headersSent: false, statusCode: 200, setHeader: () => {} });
  res.status = (code) => { res.statusCode = code; return res; };
  res.render = () => res;
  res.send   = () => res;
  res.json   = () => res;
  return res;
};

const raise = () => process.emit('uncaughtException', new Error('boom'));

if (mode === 'no-context') {
  raise();
} else {
  const res = fakeRes();
  errorhandler.initContext({})(fakeReq(), res, raise);
  setTimeout(() => {
    trace('response finished');
    res.emit('finish');
  }, 100);
}

// only reached if the handler failed to exit
setTimeout(() => process.exit(0), 1500);
