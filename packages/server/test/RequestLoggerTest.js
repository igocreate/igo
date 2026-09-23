require('./init');

const assert = require('assert');

const { config, logger } = require('@igojs/server');

const middleware = require('../src/connect/requestlogger');

// Drives the middleware with a fake response, and returns what got logged.
// `sent` is the body the route answers with, `err` an error the handler
// attaches, and `render: true` a page route, which never calls res.json.
const run = (status, { sent, err, render, ...extra } = {}) => {
  const lines = [];
  const log = logger.log;
  logger.log = (level, message, meta) => lines.push({ level, message, meta });

  let finish;
  const req = { method: 'GET', originalUrl: '/api/books', headers: {}, ...extra };
  const res = {
    // the status is set once the route answered, as express does
    statusCode: 200,
    setHeader: () => {},
    on: (_e, cb) => { finish = cb; },
    ...(render
      ? { render: () => res }
      : { json: (body) => { res.sent = body; return res; } }),
  };

  try {
    middleware(req, res, () => {});
    res.statusCode = status;
    if (err) {
      middleware.logError(res, err);
    }
    if (sent) {
      res.json(sent);
    }
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

  describe('what a line carries', function() {

    beforeEach(function() {
      config.logrequests = true;
    });

    // query and params are on a successful line too: what was asked is part of
    // reading it, and neither weighs on the volume the way a body does.
    it('should carry the request, what it asked and how long it took', () => {
      const { message, meta } = run(200, {
        query:  { page: '2' },
        params: { id: '42' },
      })[0];
      assert.strictEqual(message, 'request');
      assert.strictEqual(meta.method, 'GET');
      assert.strictEqual(meta.path, '/api/books');
      assert.strictEqual(meta.status, 200);
      assert.strictEqual(typeof meta.duration_ms, 'number');
      assert.strictEqual(meta.query, '{"page":"2"}');
      assert.strictEqual(meta.params, '{"id":"42"}');
    });

    it('should pick the level from the status', () => {
      assert.strictEqual(run(200)[0].level, 'info');
      assert.strictEqual(run(404)[0].level, 'warn');
      assert.strictEqual(run(500)[0].level, 'error');
    });

    it('should carry no query or params when they are empty', () => {
      const { meta } = run(200)[0];
      assert.strictEqual(meta.query, undefined);
      assert.strictEqual(meta.params, undefined);
    });

    // The body and the response are the volume: a served request has nothing
    // to explain, so it carries neither.
    it('should carry no body, response or stack on success', () => {
      const { meta } = run(200, { body: { title: 'Dune' }, sent: { id: 1 } })[0];
      assert.strictEqual(meta.body, undefined);
      assert.strictEqual(meta.response, undefined);
      assert.strictEqual(meta.stack, undefined);
    });

    // A 400 without its body is diagnosed by guesswork, and a 500 rarely
    // reproduces on demand.
    it('should carry the body and the response of an error', () => {
      const { meta } = run(422, {
        body: { title: 'Dune' },
        sent: { type: 'urn:igo:validation-failed', status: 422 },
      })[0];
      assert.strictEqual(meta.body, '{"title":"Dune"}');
      assert.strictEqual(meta.response,
                         '{"type":"urn:igo:validation-failed","status":422}');
    });
  });

  describe('config.logrequests', function() {

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

    // The setting turns off the access log, not the reporting of a crash:
    // since the error rides on this line, dropping it would lose the only
    // trace of what failed.
    it('should log a caught error whatever the setting says', () => {
      config.logrequests = false;
      const lines = run(500, { err: new Error('boom') });
      assert.strictEqual(lines.length, 1);
      assert.strictEqual(lines[0].message, 'Error: boom');

      config.logrequests = 599;
      assert.strictEqual(run(500, { err: new Error('boom') }).length, 1);
    });
  });

  describe('a failed request is one line', function() {

    beforeEach(function() {
      config.logrequests = true;
    });

    it('should make the error the message, and carry its stack', () => {
      const { message, meta } = run(500, {
        err:  new Error('connection refused to 10.0.0.5:3306'),
        sent: { type: 'about:blank', title: 'Internal Server Error', status: 500 },
      })[0];
      assert.strictEqual(message, 'Error: connection refused to 10.0.0.5:3306');
      assert.match(meta.stack, /^Error: connection refused/);
    });

    // A 500 answers with an empty problem body in production, on purpose: the
    // reason it failed would be nowhere if the log followed suit.
    it('should name the error a censored response does not', () => {
      const { message, meta } = run(500, {
        err:  new Error('connection refused to 10.0.0.5:3306'),
        sent: { type: 'about:blank', title: 'Internal Server Error', status: 500 },
      })[0];
      assert.match(message, /connection refused/);
      // what the client got stays what the client got
      assert.strictEqual(JSON.parse(meta.response).detail, undefined);
    });

    // logError is called before the handler branches on the request being an
    // API one: a server-rendered route reports the same way, minus the JSON
    // response it never sent.
    it('should report a page route the same way', () => {
      const { message, meta } = run(500, {
        originalUrl: '/dossiers/42/valider',
        err: new Error('ECONNREFUSED mysql'),
        render: true,
      })[0];
      assert.strictEqual(message, 'Error: ECONNREFUSED mysql');
      assert.match(meta.stack, /^Error: ECONNREFUSED mysql/);
      assert.strictEqual(meta.response, undefined);
    });
  });

  describe('what never reaches the logs', function() {

    beforeEach(function() {
      config.logrequests = true;
    });

    // The point of going through redact(): a failed sign-in must not drop a
    // password into the logs, where it would be kept and searchable.
    it('should redact sensitive fields of the body', () => {
      const { meta } = run(401, {
        body: { email: 'a@b.c', motDePasse: 'sup3rS3cret', password: 'other' },
      })[0];
      const body = JSON.parse(meta.body);
      assert.strictEqual(body.motDePasse, '[redacted]');
      assert.strictEqual(body.password, '[redacted]');
      assert.strictEqual(body.email, 'a@b.c');
    });

    it('should truncate an oversized body', () => {
      const { meta } = run(400, { body: { blob: 'x'.repeat(5000) } })[0];
      assert.strictEqual(typeof meta.body, 'string');
      assert.match(meta.body, /chars\)$/);
    });
  });

});
