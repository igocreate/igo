require('./init');

const assert  = require('assert');
const otel    = require('@opentelemetry/api');
const winston = require('winston');
const { Writable } = require('stream');

const { config, logger } = require('@igojs/server');
const middleware = require('../src/connect/requestlogger');

// Drives the middleware and returns what it settled on.
const run = (headers = {}, next = () => {}) => {
  const sent = {};
  const req = { method: 'GET', originalUrl: '/', headers };
  const res = {
    statusCode: 200,
    setHeader: (name, value) => { sent[name] = value; },
    on: () => {},
  };
  middleware(req, res, next);
  return { traceId: req.traceId, sent };
};

// The OpenTelemetry API ships without a context manager: its `with()` runs the
// callback but `active()` keeps answering the root context. This one is just
// enough to make a span active for the duration of a callback.
class StackContextManager {
  constructor() { this.stack = [otel.ROOT_CONTEXT]; }
  active() { return this.stack[this.stack.length - 1]; }
  with(context, fn, thisArg, ...args) {
    this.stack.push(context);
    try {
      return fn.call(thisArg, ...args);
    } finally {
      this.stack.pop();
    }
  }
  bind(context, target) { return target; }
  enable() { return this; }
  disable() { return this; }
}

const SPAN = { traceId: '0af7651916cd43dd8448eb211c80319c', spanId: 'b7ad6b7169203331', traceFlags: 1 };

// Runs fn with a span carrying SPAN active, the way a registered SDK would.
const withActiveSpan = (fn) => {
  otel.context.setGlobalContextManager(new StackContextManager());
  try {
    const span = otel.trace.wrapSpanContext(SPAN);
    return otel.context.with(otel.trace.setSpan(otel.context.active(), span), fn);
  } finally {
    otel.context.disable();
  }
};

// Captures the JSON lines the logger writes while fn runs.
const captureLogs = (fn) => {
  const lines      = [];
  const transports = logger.transports.slice();
  const saved      = { format: logger.format, level: logger.level, logformat: config.logformat };

  logger.clear();
  logger.add(new winston.transports.Stream({
    stream: new Writable({
      write(chunk, encoding, callback) { lines.push(JSON.parse(chunk.toString())); callback(); },
    }),
  }));
  config.logformat = 'json';
  logger.init();
  lines.length = 0;
  logger.level = 'info';
  try {
    fn();
  } finally {
    logger.clear();
    transports.forEach(t => logger.add(t));
    config.logformat = saved.logformat;
    logger.format    = saved.format;
    logger.level     = saved.level;
  }
  return lines;
};

const TRACE_ID = /^[0-9a-f]{32}$/;

describe('trace context', function() {

  // Without a registered SDK there is no active span, so igo produces a value
  // of its own — with the shape of a trace id, so that the day instrumentation
  // arrives it is replaced by a real one with no code change.
  it('should generate a trace-id-shaped value when nothing provides one', () => {
    assert.match(run().traceId, TRACE_ID);
  });

  // The case that gets forgotten: an instrumented service calling an igo
  // service that is not. Its traceparent must not be discarded.
  it('should adopt the trace id of an inbound traceparent', () => {
    const { traceId } = run({
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    });
    assert.strictEqual(traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
  });

  it('should adopt it even when the caller did not sample', () => {
    const { traceId } = run({
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00',
    });
    assert.strictEqual(traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
  });

  // Trace Context Level 2 exists: refusing an unknown version would lose
  // correlation the day a caller moves up.
  it('should accept an unknown version whose remainder is well formed', () => {
    const { traceId } = run({
      traceparent: '01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    });
    assert.strictEqual(traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
  });

  // The header comes from the client, so it is validated: it can be malformed,
  // duplicated, or carry an attempt at injecting into the logs.
  it('should reject a malformed traceparent and fall back', () => {
    const refuses = [
      '00-00000000000000000000000000000000-00f067aa0ba902b7-01',  // all zeroes
      '00-4bf92f3577b34da6-00f067aa0ba902b7-01',                  // too short
      '00-4BF92F3577B34DA6A3CE929D0E0E4736-00f067aa0ba902b7-01',  // uppercase
      '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7',     // truncated
      'garbage',
      '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01\n{"level":"info"}',
    ];
    for (const traceparent of refuses) {
      const { traceId } = run({ traceparent });
      assert.match(traceId, TRACE_ID, `rejected: ${traceparent}`);
      assert.notStrictEqual(traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
    }
  });

  // A duplicated header reaches express as an array.
  it('should reject a duplicated header', () => {
    const { traceId } = run({
      traceparent: [
        '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        '00-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-00f067aa0ba902b7-01',
      ],
    });
    assert.match(traceId, TRACE_ID);
    assert.notStrictEqual(traceId, '4bf92f3577b34da6a3ce929d0e0e4736');
  });

  // A registered SDK has already reconciled the inbound header into the active
  // span: that span is the identity, even when the header says otherwise.
  it('should adopt the trace id of the active span over the inbound header', () => {
    const { traceId } = withActiveSpan(() => run({
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    }));
    assert.strictEqual(traceId, SPAN.traceId);
  });

  // traceresponse is the way back defined by Trace Context Level 2: it carries
  // the server span id, which is what lets a browser attach its span to it.
  it('should send traceresponse with the active span when instrumented', () => {
    const { sent } = withActiveSpan(() => run());
    assert.strictEqual(sent.traceresponse, `00-${SPAN.traceId}-${SPAN.spanId}-01`);
  });

  it('should stamp every log emitted during the request with its trace id', () => {
    let traceId;
    const lines = captureLogs(() => {
      ({ traceId } = run({}, () => logger.info('inside the request', { step: 1 })));
    });
    assert.strictEqual(lines.length, 1);
    assert.strictEqual(lines[0].message, 'inside the request');
    assert.strictEqual(lines[0].trace_id, traceId);
  });

  // X-Request-Id is gone: one identity, under the name the spec gives it.
  it('should expose no id outside of a request', () => {
    assert.strictEqual(middleware.traceId(), undefined);
  });

  it('should send no X-Request-Id', () => {
    assert.strictEqual(run().sent['X-Request-Id'], undefined);
  });

  // igo minted the trace id, so it mints the span id too, and says the trace
  // was not recorded: the client still gets the id support will look for.
  it('should send traceresponse with a generated span id when not instrumented', () => {
    const { traceId, sent } = run();
    assert.strictEqual(sent.traceresponse, `00-${traceId}-${sent.traceresponse.slice(36, 52)}-00`);
    assert.match(sent.traceresponse.slice(36, 52), /^[0-9a-f]{16}$/);
  });

});
