require('./init');

const assert = require('assert');

const { config, logger } = require('@igojs/server');

const middleware = require('../src/connect/requestlogger');

// Drives the middleware with a fake response, and returns what got logged.
const run = (status, extra = {}) => {
  const lines = [];
  const log = logger.log;
  logger.log = (level, message, meta) => lines.push({ level, message, meta });

  let finish;
  const req = { method: 'GET', originalUrl: '/api/books', headers: {}, ...extra };
  const res = {
    statusCode: status,
    setHeader: () => {},
    on: (_e, cb) => { finish = cb; },
    json: (body) => { res.sent = body; return res; },
  };

  try {
    middleware(req, res, () => {});
    finish();
  } finally {
    logger.log = log;
  }
  return lines;
};

describe('request logger', function() {

  afterEach(function() {
    config.logrequests = config.env !== 'test';
  });

  it('should log every request when true', () => {
    config.logrequests = true;
    assert.strictEqual(run(200).length, 1);
    assert.strictEqual(run(500).length, 1);
  });

  it('should log nothing when false', () => {
    config.logrequests = false;
    assert.strictEqual(run(200).length, 0);
    assert.strictEqual(run(500).length, 0);
  });

  // The point of the floor: successes are the volume, errors are the signal.
  it('should keep only the errors above a status floor', () => {
    config.logrequests = 400;
    assert.strictEqual(run(200).length, 0);
    assert.strictEqual(run(304).length, 0);
    assert.strictEqual(run(400).length, 1);
    assert.strictEqual(run(500).length, 1);
  });

  it('should pick the level from the status', () => {
    config.logrequests = true;
    assert.strictEqual(run(200)[0].level, 'info');
    assert.strictEqual(run(404)[0].level, 'warn');
    assert.strictEqual(run(500)[0].level, 'error');
  });

  // A 400 without its body is diagnosed by guesswork, and a 500 rarely
  // reproduces on demand.
  it('should carry the request context when the response is an error', () => {
    config.logrequests = true;
    const { meta } = run(500, { body: { title: 'Dune' }, query: { page: '2' } })[0];
    assert.deepStrictEqual(meta.body, { title: 'Dune' });
    assert.deepStrictEqual(meta.query, { page: '2' });
  });

  it('should carry no context on a successful response', () => {
    config.logrequests = true;
    const { meta } = run(200, { body: { title: 'Dune' } })[0];
    assert.strictEqual(meta.body, undefined);
  });

  // The point of going through redact(): a failed sign-in must not drop a
  // password into the logs, where it would be kept and searchable.
  it('should redact sensitive fields of the body', () => {
    config.logrequests = true;
    const { meta } = run(401, {
      body: { email: 'a@b.c', motDePasse: 'sup3rS3cret', password: 'other' },
    })[0];
    assert.strictEqual(meta.body.motDePasse, '[redacted]');
    assert.strictEqual(meta.body.password, '[redacted]');
    assert.strictEqual(meta.body.email, 'a@b.c');
  });

  it('should truncate an oversized body', () => {
    config.logrequests = true;
    const { meta } = run(400, { body: { blob: 'x'.repeat(5000) } })[0];
    assert.strictEqual(typeof meta.body, 'string');
    assert.match(meta.body, /chars\)$/);
  });

  // The response is what the client was actually answered: without it, a
  // problem document has to be inferred from the status alone.
  it('should carry the response body of an error', () => {
    config.logrequests = true;
    const lines = [];
    const log = logger.log;
    logger.log = (level, message, meta) => lines.push({ level, message, meta });

    let finish;
    const req = { method: 'POST', originalUrl: '/api/books', headers: {} };
    const res = {
      statusCode: 200,
      setHeader: () => {},
      on: (_e, cb) => { finish = cb; },
      json: (body) => { res.sent = body; return res; },
    };

    try {
      middleware(req, res, () => {});
      res.statusCode = 422;
      res.json({ type: 'urn:igo:validation-failed', status: 422 });
      finish();
    } finally {
      logger.log = log;
    }

    assert.deepStrictEqual(lines[0].meta.response,
                           { type: 'urn:igo:validation-failed', status: 422 });
  });

  it('should carry no response body on success', () => {
    config.logrequests = true;
    const { meta } = run(200)[0];
    assert.strictEqual(meta.response, undefined);
  });

  it('should carry method, path, status and duration', () => {
    config.logrequests = true;
    const { meta } = run(200)[0];
    assert.strictEqual(meta.method, 'GET');
    assert.strictEqual(meta.path, '/api/books');
    assert.strictEqual(meta.status, 200);
    assert.strictEqual(typeof meta.duration_ms, 'number');
  });

});
