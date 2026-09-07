// Driven by UncaughtExceptionTest: raises an uncaught exception in a child
// process so its exit code can be observed.
process.env.NODE_ENV = 'test';

const mode = process.argv[2];

const config = require('../../src/config');
config.init();
config.exitOnUncaughtException = mode === 'default';

const errorhandler = require('../../src/connect/errorhandler');
const logger       = require('../../src/logger');

logger.error = () => {};

const fakeReq = () => ({
  method: 'GET', originalUrl: '/x', url: '/x', path: '/x', protocol: 'http',
  headers: { host: 'localhost' }, get: () => '', body: {}, session: {},
});

const fakeRes = () => {
  const res = { headersSent: false, statusCode: 200, setHeader: () => {} };
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
  errorhandler.initContext({})(fakeReq(), fakeRes(), raise);
}

// only reached when the handler chose not to exit
setTimeout(() => process.exit(0), 1500);
