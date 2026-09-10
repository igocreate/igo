
const { AsyncLocalStorage } = require('async_hooks');
const { randomBytes }       = require('crypto');

const config = require('../config');
const logger = require('../logger');
const redact = require('../redact');

const storage = new AsyncLocalStorage();

// OpenTelemetry is not a dependency: an application that does not instrument
// itself must still boot. Loaded optionally, so the trace id is read when a
// SDK is registered and ignored otherwise.
let otel = null;
try {
  otel = require('@opentelemetry/api');
} catch {
  // no instrumentation in this application
}

// The trace id of the active span, when one exists.
//
// OpenTelemetry defines no generic request id — for it, trace_id *is* the
// identity of a request, and it already reaches the logs and the traces. So it
// is read rather than a second one being minted, which would leave two
// independent ids for the same request: the one the client is shown, and the
// one the trace carries.
//
// The test is the presence of a span, never the presence of a traceparent
// header: a request from an uninstrumented client carries no header, yet OTel
// has already created a trace for it.
const activeSpanContext = () => {
  const context = otel?.trace.getSpan(otel.context.active())?.spanContext();
  // an all-zero id is what the API returns for an invalid context
  return context && !/^0+$/.test(context.traceId) ? context : null;
};

const activeTraceId = () => activeSpanContext()?.traceId ?? null;

// Only known when a SDK is registered: without a span there is no server side
// for a client to attach to, so no traceresponse is sent.
const activeSpanId = () => activeSpanContext()?.spanId ?? null;

// The version is deliberately not pinned to `00`: Trace Context Level 2 exists,
// and the spec asks implementations to stay lenient about an unknown version
// whose remainder is well formed. Rejecting `01-…` would lose correlation the
// day a caller moves up.
const TRACEPARENT = /^[0-9a-f]{2}-([0-9a-f]{32})-[0-9a-f]{16}-[0-9a-f]{2}$/;

// The trace id carried by an inbound traceparent, for the case nothing else
// covers: an instrumented service calling an igo service that is not, whose
// header no SDK will read. Without this, igo would mint a fresh id and break a
// chain of correlation already established.
//
// The value comes from the client, so it is validated: it can be malformed,
// duplicated (an array, then), or carry an attempt at injecting into the logs.
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

// What a request line does not say: what the call failed with. A 400 without
// its body or its parameters is diagnosed by guesswork, and a 500 rarely
// reproduces on demand — so the body, the query and the path parameters ride
// along, but only when the response is an error. On a successful request they
// would multiply the volume without teaching anything.
//
// Values go through redact(): its default pattern covers `motDePasse` as well
// as `password`, and a project whose domain has its own sensitive fields
// extends config.sensitiveKeys.
const MAX_LENGTH = 2000;

// A body can be large — an import, an attachment in base64. Truncated: a
// diagnosis needs the shape, not the whole content.
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
  // What the client was actually answered — a problem document, or whatever a
  // controller chose to send. Captured below, since a response body cannot be
  // read back off `res`.
  if (res._loggedBody !== undefined) {
    context.response = truncate(redact(res._loggedBody));
  }
  return context;
};

// res.json is the one place every JSON answer goes through, problem documents
// included: wrapping it is what lets an error line carry the response the
// client received. Only the body is kept, and only while the request is in
// flight.
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

// config.logrequests takes a boolean, or a status floor: 400 keeps the errors
// and drops the successes.
//
// The floor exists because one line per request is the largest single item in a
// log bill, while the successful ones teach little that metrics do not already
// carry — latency per route and error rate are derived from spans. The errors,
// on the other hand, are worth every byte.
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

logger.provideRequestId(() => storage.getStore()?.traceId);

// One line per request, carrying the id every log of that request is stamped
// with. Mounted by igo before the routes.
module.exports = (req, res, next) => {
  // The order matters. The OpenTelemetry context comes first: when a SDK is
  // loaded it has already reconciled an inbound header if there was one, and
  // reversing the two could retain an id diverging from the trace actually
  // recorded. The generated value has the shape of a trace id, so the day
  // instrumentation arrives it is replaced by a real one with no code change.
  const traceId = activeTraceId()
    || traceIdFromHeader(req.headers?.traceparent)
    || randomBytes(16).toString('hex');
  const start   = process.hrtime.bigint();

  req.traceId = traceId;

  // traceresponse is what W3C Trace Context Level 2 defines for the way back,
  // and it carries the server span id as well — which is what lets a browser
  // attach its span to the server's. No X-Request-Id: one identity, under the
  // name the specification gives it.
  const spanId = activeSpanId();
  if (spanId) {
    res.setHeader('traceresponse', `00-${traceId}-${spanId}-01`);
  }

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
