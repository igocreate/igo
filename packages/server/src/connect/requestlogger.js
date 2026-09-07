
const { AsyncLocalStorage } = require('async_hooks');
const { randomUUID }        = require('crypto');

const config = require('../config');
const logger = require('../logger');

const storage = new AsyncLocalStorage();

// A reverse proxy or an upstream service may already have issued one: reusing
// it is what lets a single request be followed across services.
const INBOUND_HEADERS = ['x-request-id', 'x-correlation-id'];

const incomingId = (req) => {
  for (const header of INBOUND_HEADERS) {
    const value = req.headers?.[header];
    if (typeof value === 'string' && value.length && value.length <= 200) {
      return value;
    }
  }
  return null;
};

const levelFor = (status) => {
  if (status >= 500) {
    return 'error';
  }
  return status >= 400 ? 'warn' : 'info';
};

logger.provideRequestId(() => storage.getStore()?.requestId);

// One line per request, carrying the id every log of that request is stamped
// with. Mounted by igo before the routes.
module.exports = (req, res, next) => {
  const requestId = incomingId(req) || randomUUID();
  const start     = process.hrtime.bigint();

  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  storage.run({ requestId }, () => {
    // mock responses in tests are plain objects, with no events to listen to
    if (config.logrequests !== false && typeof res.on === 'function') {
      res.on('finish', () => {
        const duration = Number(process.hrtime.bigint() - start) / 1e6;
        logger.log(levelFor(res.statusCode), 'request', {
          method: req.method,
          // req.path is rewritten to the router-relative path once mounted
          path:   (req.originalUrl || req.url || '').split('?')[0],
          status: res.statusCode,
          duration_ms: Math.round(duration * 10) / 10,
        });
      });
    }
    next();
  });
};

module.exports.requestId = () => storage.getStore()?.requestId;
