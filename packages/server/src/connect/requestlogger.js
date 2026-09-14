
const { AsyncLocalStorage } = require('async_hooks');
const { randomBytes }       = require('crypto');

const config = require('../config');
const logger = require('../logger');
const redact = require('../redact');

const storage = new AsyncLocalStorage();

// Optional: an application that does not instrument itself must still boot.
let otel = null;
try {
  otel = require('@opentelemetry/api');
} catch {
  // no instrumentation in this application
}

// The active span is the identity of the request when a SDK is registered:
// minting another id would leave two for the same request.
const activeSpanContext = () => {
  const context = otel?.trace.getSpan(otel.context.active())?.spanContext();
  // an all-zero id is what the API returns for an invalid context
  return context && !/^0+$/.test(context.traceId) ? context : null;
};

const activeTraceId = () => activeSpanContext()?.traceId ?? null;

// The way back, as W3C Trace Context Level 2 defines it: the trace id, the
// server span id a browser can attach its own span to, and whether the server
// recorded the trace. Without a SDK igo minted the trace id itself, so it mints
// the span id the same way and reports the trace as not recorded.
const traceresponse = (traceId) => {
  const span  = activeSpanContext();
  const id    = span?.spanId ?? randomBytes(8).toString('hex');
  const flags = (span?.traceFlags ?? 0).toString(16).padStart(2, '0');
  return `00-${traceId}-${id}-${flags}`;
};

// The version is not pinned to `00`: the spec asks to accept an unknown
// version whose remainder is well formed.
const TRACEPARENT = /^[0-9a-f]{2}-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/;

// An inbound traceparent no SDK will read — an instrumented caller, an igo
// service that is not. Validated: it comes from the client, and can be
// malformed, duplicated (an array, then) or an attempt at injecting into logs.
const traceIdFromHeader = (value) => {
  if (typeof value !== 'string') {
    return null;
  }
  const match = TRACEPARENT.exec(value);
  if (!match) {
    return null;
  }
  // all zeroes is what the spec calls an invalid id
  return /^0+$/.test(match[1]) ? null : match[1];
};

// An error line carries what the call failed with — body, query, params, and
// the response sent — redacted, and truncated: a diagnosis needs the shape of
// an import or an attachment, not its content. A successful line carries none
// of it, which would multiply the volume without teaching anything.
const MAX_LENGTH = 2000;

const truncate = (value) => {
  const text = JSON.stringify(value);
  if (!text || text.length <= MAX_LENGTH) {
    return value;
  }
  return `${text.slice(0, MAX_LENGTH)}… (${text.length} chars)`;
};

const isEmpty = (value) =>
  !value || (typeof value === 'object' && Object.keys(value).length === 0);

const failureContext = (req, res) => {
  const context = {};
  if (!isEmpty(req.body)) {
    context.body = truncate(redact(req.body));
  }
  if (!isEmpty(req.query)) {
    context.query = truncate(redact(req.query));
  }
  if (!isEmpty(req.params)) {
    context.params = redact(req.params);
  }
  if (res._loggedBody !== undefined) {
    context.response = truncate(redact(res._loggedBody));
  }
  return context;
};

// A response body cannot be read back off `res`: res.json, which every JSON
// answer goes through, keeps it for the error line.
const captureResponseBody = (res) => {
  if (typeof res.json !== 'function') {
    return;
  }
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400) {
      res._loggedBody = body;
    }
    return json(body);
  };
};

const levelFor = (status) => {
  if (status >= 500) {
    return 'error';
  }
  return status >= 400 ? 'warn' : 'info';
};

// config.logrequests: a boolean, or a status floor — 400 keeps the errors,
// which are worth every byte, and drops the successes metrics already cover.
const shouldLog = (status) => {
  const setting = config.logrequests;
  if (setting === false) {
    return false;
  }
  if (typeof setting === 'number') {
    return status >= setting;
  }
  return true;
};

logger.provideTraceId(() => storage.getStore()?.traceId);

// One line per request, carrying the id every log of that request is stamped
// with. Mounted by igo before the routes.
module.exports = (req, res, next) => {
  // The active span first: a SDK has already reconciled the inbound header, and
  // reversing the two could keep an id diverging from the trace recorded.
  const traceId = activeTraceId()
    || traceIdFromHeader(req.headers?.traceparent)
    || randomBytes(16).toString('hex');
  const start   = process.hrtime.bigint();

  req.traceId = traceId;

  res.setHeader('traceresponse', traceresponse(traceId));

  captureResponseBody(res);

  storage.run({ traceId }, () => {
    // mock responses in tests are plain objects, with no events to listen to
    if (typeof res.on === 'function') {
      res.on('finish', () => {
        if (!shouldLog(res.statusCode)) {
          return;
        }
        const duration = Number(process.hrtime.bigint() - start) / 1e6;
        logger.log(levelFor(res.statusCode), 'request', {
          method: req.method,
          // req.path is rewritten to the router-relative path once mounted
          path:   (req.originalUrl || req.url || '').split('?')[0],
          status: res.statusCode,
          duration_ms: Math.round(duration * 10) / 10,
          ...(res.statusCode >= 400 ? failureContext(req, res) : {}),
        });
      });
    }
    next();
  });
};

module.exports.traceId = () => storage.getStore()?.traceId;
