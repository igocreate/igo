require('../init');

const assert  = require('assert');
const http    = require('http');
const Keygrip = require('keygrip');

const session = require('../../src/connect/session');


const KEYS = [ 'key-one', 'key-two' ];

//
const run = function(middleware, cookieHeader) {
  const req = { headers: cookieHeader ? { cookie: cookieHeader } : {}, socket: {} };
  const res = new http.ServerResponse(req);
  let done   = null;
  middleware(req, res, () => { done = true; });
  assert.strictEqual(done, true);
  return { req, res };
};

//
const setCookies = function(res) {
  res.writeHead(200);
  const header = res.getHeader('Set-Cookie') || [];
  return (Array.isArray(header) ? header : [ header ]);
};

//
const cookieValue = function(cookies, name) {
  const cookie = cookies.find(c => c.startsWith(name + '='));
  return cookie ? cookie.slice(name.length + 1).split(';')[0] : null;
};

//
const legacyCookie = function(name, obj, keys) {
  const value = Buffer.from(JSON.stringify(obj)).toString('base64');
  const sig   = new Keygrip(keys).sign(name + '=' + value);
  return `${name}=${value}; ${name}.sig=${sig}`;
};


describe('Session middleware', () => {

  const middleware = session({ name: 'app', keys: KEYS, maxAge: 60000 });

  it('should require keys', () => {
    assert.throws(() => session({ name: 'app' }), /keys required/);
  });

  it('should start with an empty session', () => {
    const { req, res } = run(middleware);
    assert.deepStrictEqual(req.session, {});
    assert.deepStrictEqual(setCookies(res), []);
  });

  it('should encrypt the session in the cookie', () => {
    const { req, res } = run(middleware);
    req.session.user_id = 42;
    req.session.role    = 'admin';

    const value = cookieValue(setCookies(res), 'app');
    assert(value.startsWith('1.'));
    assert(!value.includes('admin'));
    assert(!Buffer.from(value.slice(2), 'base64url').toString('utf8').includes('admin'));
  });

  it('should read back its own cookie', () => {
    const first = run(middleware);
    first.req.session.user_id = 42;
    const cookies = setCookies(first.res);

    const { req } = run(middleware, cookies.join('; '));
    assert.deepStrictEqual(req.session, { user_id: 42 });
  });

  it('should not rewrite an unchanged session', () => {
    const first = run(middleware);
    first.req.session.user_id = 42;
    const cookies = setCookies(first.res);

    const second = run(middleware, cookies.join('; '));
    assert.strictEqual(second.req.session.user_id, 42);
    assert.deepStrictEqual(setCookies(second.res), []);
  });

  it('should not sign the cookie', () => {
    const { req, res } = run(middleware);
    req.session.user_id = 42;
    assert.strictEqual(cookieValue(setCookies(res), 'app.sig'), null);
  });

  it('should ignore a tampered cookie', () => {
    const first = run(middleware);
    first.req.session.user_id = 42;
    const value   = cookieValue(setCookies(first.res), 'app');
    const tampered = value.slice(0, -4) + 'AAAA';

    const { req } = run(middleware, 'app=' + tampered);
    assert.deepStrictEqual(req.session, {});
  });

  it('should ignore a cookie encrypted with another key', () => {
    const other = session({ name: 'app', keys: [ 'another-key' ] });
    const first = run(other);
    first.req.session.user_id = 42;

    const { req } = run(middleware, setCookies(first.res).join('; '));
    assert.deepStrictEqual(req.session, {});
  });

  it('should support key rotation', () => {
    const previous = session({ name: 'app', keys: [ KEYS[1] ] });
    const first    = run(previous);
    first.req.session.user_id = 42;

    const { req } = run(middleware, setCookies(first.res).join('; '));
    assert.deepStrictEqual(req.session, { user_id: 42 });
  });

  it('should destroy the session when set to null', () => {
    const first = run(middleware);
    first.req.session.user_id = 42;
    const cookies = setCookies(first.res);

    const second = run(middleware, cookies.join('; '));
    second.req.session = null;
    assert.strictEqual(second.req.session, null);

    const cookie = setCookies(second.res).find(c => c.startsWith('app='));
    assert(cookie.includes('expires=Thu, 01 Jan 1970'));
  });

  it('should replace the session when set to an object', () => {
    const first = run(middleware);
    first.req.session.user_id = 42;
    const cookies = setCookies(first.res);

    const second = run(middleware, cookies.join('; '));
    second.req.session = { user_id: 43 };

    const { req } = run(middleware, setCookies(second.res).join('; '));
    assert.deepStrictEqual(req.session, { user_id: 43 });
  });

  it('should reject an expired session', () => {
    const expired = session({ name: 'app', keys: KEYS, maxAge: -1000 });
    const first   = run(expired);
    first.req.session.user_id = 42;

    const { req } = run(expired, setCookies(first.res).join('; '));
    assert.deepStrictEqual(req.session, {});
  });

  it('should not embed an expiry without maxAge', () => {
    const forever = session({ name: 'app', keys: KEYS });
    const first   = run(forever);
    first.req.session.user_id = 42;

    const { req } = run(forever, setCookies(first.res).join('; '));
    assert.deepStrictEqual(req.session, { user_id: 42 });
  });

  // sessions written by cookie-session (igo < 6.2) are not readable anymore, even signed
  it('should ignore an unencrypted cookie-session cookie', () => {
    const { req } = run(middleware, legacyCookie('app', { user_id: 42 }, KEYS));
    assert.deepStrictEqual(req.session, {});
  });

  it('should find the encrypted cookie when a legacy cookie with the same name comes first', () => {
    const first = run(middleware);
    first.req.session.user_id = 42;
    const encrypted = cookieValue(setCookies(first.res), 'app');

    const header = `app=legacybase64garbage; app=${encrypted}`;
    const { req } = run(middleware, header);
    assert.deepStrictEqual(req.session, { user_id: 42 });
  });

});
