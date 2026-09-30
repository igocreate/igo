require('./init');

const assert = require('assert');
const http   = require('http');
const os     = require('os');
const zlib   = require('zlib');
const axios  = require('axios');

const { config, logger, logHttpCalls } = require('@igojs/server');
const httpCalls     = require('../src/httpcalls');
const requestLogger = require('../src/connect/requestlogger');

const partner = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    const json = (status, payload) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(payload));
    };
    const path = req.url.split('?')[0];
    if (path === '/ok') {
      return json(200, { id: 1, token: 'issued' });
    }
    if (path === '/refused') {
      return json(422, { errors: [{ code: 'SIRET', detail: 'invalide' }], received: body });
    }
    if (path === '/gzip') {
      res.writeHead(422, { 'content-type': 'application/json', 'content-encoding': 'gzip' });
      return res.end(zlib.gzipSync(JSON.stringify({ detail: 'compressé' })));
    }
    if (path === '/down') {
      res.writeHead(502, { 'content-type': 'text/html' });
      return res.end('<h1>Bad Gateway</h1>');
    }
    if (path === '/slow') {
      return setTimeout(() => json(200, {}), 200);
    }
    json(404, {});
  });
});

let base;
let lines;
let originalLog;

// A port nobody listens on: bound, then released.
const closedPort = () => new Promise((resolve) => {
  const server = http.createServer().listen(0, () => {
    const { port } = server.address();
    server.close(() => resolve(port));
  });
});

// The fetch adapter logs a failure once it has read the body off a copy.
const settled = () => new Promise((resolve) => setTimeout(resolve, 20));

const only = () => {
  assert.strictEqual(lines.length, 1, JSON.stringify(lines));
  return lines[0];
};

describe('http calls', function() {

  before(function(done) {
    httpCalls.init();
    partner.listen(0, '127.0.0.1', () => {
      base = `http://127.0.0.1:${partner.address().port}`;
      done();
    });
  });

  after(function(done) {
    partner.close(done);
  });

  beforeEach(function() {
    lines = [];
    originalLog = logger.log;
    logger.log = (level, message, meta) => lines.push({ level, message, meta });
    config.loghttpcalls = true;
    config.loghttpcallsByHost = {};
  });

  afterEach(function() {
    logger.log = originalLog;
    config.loghttpcalls = false;
    config.loghttpcallsByHost = {};
  });

  describe('through axios', function() {

    it('should log a call with what it addressed and how long it took', async () => {
      await axios.get(`${base}/ok`, { params: { siret: '123', token: 'secret' } });
      const { level, message, meta } = only();
      assert.strictEqual(level, 'info');
      assert.strictEqual(message, 'http call');
      assert.strictEqual(meta.method, 'GET');
      assert.strictEqual(meta.host, new URL(base).host);
      assert.strictEqual(meta.path, '/ok');
      assert.strictEqual(meta.status, 200);
      assert.ok(meta.duration_ms >= 0);
      assert.deepStrictEqual(JSON.parse(meta.query), { siret: '123', token: '[redacted]' });
    });

    it('should not carry the payloads of a successful call', async () => {
      await axios.post(`${base}/ok`, { siret: '123' });
      const { meta } = only();
      assert.strictEqual(meta.body, undefined);
      assert.strictEqual(meta.response, undefined);
    });

    it('should carry what was sent and what came back when the partner refuses', async () => {
      await assert.rejects(axios.post(`${base}/refused`, { siret: '123', password: 'p' }));
      const { level, message, meta } = only();
      assert.strictEqual(level, 'warn');
      assert.strictEqual(message, 'http call');
      assert.strictEqual(meta.status, 422);
      assert.deepStrictEqual(JSON.parse(meta.body), { siret: '123', password: '[redacted]' });
      assert.strictEqual(JSON.parse(meta.response).errors[0].code, 'SIRET');
    });

    it('should redact a form, where a token request carries its secret', async () => {
      const form = new URLSearchParams({ grant_type: 'client_credentials', client_secret: 's3cr3t' });
      await assert.rejects(axios.post(`${base}/refused`, form));
      assert.deepStrictEqual(JSON.parse(only().meta.body), {
        grant_type:    'client_credentials',
        client_secret: '[redacted]',
      });
    });

    it('should read a compressed answer', async () => {
      await assert.rejects(axios.get(`${base}/gzip`));
      assert.deepStrictEqual(JSON.parse(only().meta.response), { detail: 'compressé' });
    });

    it('should keep an answer that is not JSON as text', async () => {
      await assert.rejects(axios.get(`${base}/down`));
      const { level, meta } = only();
      assert.strictEqual(level, 'error');
      assert.strictEqual(meta.response, '<h1>Bad Gateway</h1>');
    });

    it('should log a call that got no answer, with its cause', async () => {
      const port = await closedPort();
      await assert.rejects(axios.get(`http://127.0.0.1:${port}/`));
      const { level, message, meta } = only();
      assert.strictEqual(level, 'error');
      assert.match(message, /ECONNREFUSED/);
      assert.strictEqual(meta.code, 'ECONNREFUSED');
      assert.strictEqual(meta.status, undefined);
    });

    it('should log a timeout', async () => {
      await assert.rejects(axios.get(`${base}/slow`, { timeout: 50 }));
      assert.strictEqual(only().meta.code, 'ECONNABORTED');
    });

    it('should not log a call the caller cancelled', async () => {
      const controller = new AbortController();
      const call = axios.get(`${base}/slow`, { signal: controller.signal });
      controller.abort();
      await assert.rejects(call);
      assert.strictEqual(lines.length, 0);
    });

    it('should hand the caller the answer and the error untouched', async () => {
      const { data } = await axios.get(`${base}/ok`);
      assert.deepStrictEqual(data, { id: 1, token: 'issued' });
      const err = await axios.get(`${base}/refused`).catch(e => e);
      assert.strictEqual(err.response.status, 422);
      assert.strictEqual(err.response.data.errors[0].detail, 'invalide');
    });

    it('should log the calls of an instance the project creates', async () => {
      const client = axios.create({ baseURL: base });
      await client.get('/ok', { params: { page: 2 } });
      const { meta } = only();
      assert.strictEqual(meta.path, '/ok');
      assert.deepStrictEqual(JSON.parse(meta.query), { page: '2' });
    });

    it('should log a call once, however often the instance is handed over', async () => {
      logHttpCalls(axios);
      httpCalls.init();
      await axios.get(`${base}/ok`);
      only();
    });

    it('should ignore an error raised before any call was made', async () => {
      const client = axios.create();
      client.interceptors.request.use(() => {
        throw new Error('network blocked in tests');
      });
      await assert.rejects(client.get(`${base}/ok`), /network blocked/);
      assert.strictEqual(lines.length, 0);
    });

    it('should carry the trace id of the request that made the call', async () => {
      const traced = [];
      logger.log = () => traced.push(logger.currentTraceId());
      const req = { method: 'GET', originalUrl: '/', headers: {} };
      const res = { statusCode: 200, setHeader: () => {} };
      let call;
      requestLogger(req, res, () => {
        call = axios.get(`${base}/ok`);
      });
      await call;
      assert.deepStrictEqual(traced, [req.traceId]);
    });
  });

  describe('through fetch', function() {

    it('should log a call with what it addressed', async () => {
      await fetch(`${base}/ok?page=2`);
      const { level, message, meta } = only();
      assert.strictEqual(level, 'info');
      assert.strictEqual(message, 'http call');
      assert.strictEqual(meta.method, 'GET');
      assert.strictEqual(meta.path, '/ok');
      assert.strictEqual(meta.status, 200);
      assert.deepStrictEqual(JSON.parse(meta.query), { page: '2' });
    });

    it('should carry both payloads when the partner refuses, and leave the body to the caller', async () => {
      const response = await fetch(`${base}/refused`, {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ siret: '123', token: 't' }),
      });
      assert.strictEqual((await response.json()).errors[0].code, 'SIRET');
      await settled();
      const { level, meta } = only();
      assert.strictEqual(level, 'warn');
      assert.strictEqual(meta.method, 'POST');
      assert.strictEqual(meta.status, 422);
      assert.deepStrictEqual(JSON.parse(meta.body), { siret: '123', token: '[redacted]' });
      assert.strictEqual(JSON.parse(meta.response).errors[0].detail, 'invalide');
    });

    it('should redact a form', async () => {
      await fetch(`${base}/refused`, {
        method: 'POST',
        body:   new URLSearchParams({ client_secret: 's3cr3t' }),
      });
      await settled();
      assert.deepStrictEqual(JSON.parse(only().meta.body), { client_secret: '[redacted]' });
    });

    it('should log a call that got no answer with its cause, not "fetch failed"', async () => {
      const port = await closedPort();
      await assert.rejects(fetch(`http://127.0.0.1:${port}/`));
      const { level, message, meta } = only();
      assert.strictEqual(level, 'error');
      assert.match(message, /ECONNREFUSED/);
      assert.strictEqual(meta.code, 'ECONNREFUSED');
    });

    it('should accept the options fetch accepts', async () => {
      await fetch(`${base}/ok`, null);
      assert.strictEqual(only().meta.status, 200);
    });

    it('should log a timeout', async () => {
      await assert.rejects(fetch(`${base}/slow`, { signal: AbortSignal.timeout(50) }));
      assert.match(only().message, /timeout/);
    });

    it('should not log a call the caller aborted, whatever the reason given', async () => {
      for (const reason of [undefined, new Error('user left the page')]) {
        const controller = new AbortController();
        const call = fetch(`${base}/slow`, { signal: controller.signal });
        controller.abort(reason);
        await assert.rejects(call);
      }
      assert.strictEqual(lines.length, 0);
    });
  });

  describe('config.loghttpcalls', function() {

    it('should drop the successes under a status floor, and keep the refusals', async () => {
      config.loghttpcalls = 400;
      await axios.get(`${base}/ok`);
      assert.strictEqual(lines.length, 0);
      await assert.rejects(axios.get(`${base}/refused`));
      assert.strictEqual(only().meta.status, 422);
    });

    it('should log nothing when off, but a call that got no answer', async () => {
      config.loghttpcalls = false;
      await assert.rejects(axios.get(`${base}/refused`));
      assert.strictEqual(lines.length, 0);
      const port = await closedPort();
      await assert.rejects(axios.get(`http://127.0.0.1:${port}/`));
      assert.strictEqual(only().meta.code, 'ECONNREFUSED');
    });

    it('should follow the setting of the partner over the default', async () => {
      config.loghttpcalls = false;
      config.loghttpcallsByHost = { [new URL(base).host]: 500 };
      await assert.rejects(axios.get(`${base}/refused`));
      assert.strictEqual(lines.length, 0);
      await assert.rejects(axios.get(`${base}/down`));
      assert.strictEqual(only().meta.status, 502);
    });
  });

  it('should boot a project without axios', function() {
    const projectRoot = config.projectRoot;
    config.projectRoot = os.tmpdir();
    try {
      httpCalls.init();
    } finally {
      config.projectRoot = projectRoot;
    }
  });
});
