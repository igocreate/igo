require('./init');

const assert = require('assert');

const middleware = require('../src/connect/requestlogger');

// Drives the middleware and returns what it settled on.
const run = (headers = {}) => {
  const sent = {};
  const req = { method: 'GET', originalUrl: '/', headers };
  const res = {
    statusCode: 200,
    setHeader: (name, value) => { sent[name] = value; },
    on: () => {},
  };
  middleware(req, res, () => {});
  return { traceId: req.traceId, sent };
};

const TRACE_ID = /^[0-9a-f]{32}$/;

describe('request identity', function() {

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

  // X-Request-Id is gone: one identity, under the name the spec gives it. And
  // traceresponse needs a server span, which only a registered SDK provides.
  it('should send no X-Request-Id', () => {
    assert.strictEqual(run().sent['X-Request-Id'], undefined);
  });

  it('should send no traceresponse without instrumentation', () => {
    assert.strictEqual(run().sent.traceresponse, undefined);
  });

});
