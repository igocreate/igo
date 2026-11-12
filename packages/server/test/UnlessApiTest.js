require('./init');

const assert = require('assert');
const { unlessApi } = require('@igojs/server/src/api');

// The middlewares that only serve rendered pages must not run on an API
// request: the flash scope alone writes to the session on every GET, which
// made every JSON response set a session cookie nothing reads.
describe('unlessApi', function() {
  const calls = [];
  const wrapped = unlessApi((req, res, next) => { calls.push(req.path); next(); });

  beforeEach(() => { calls.length = 0; });

  it('should skip a view middleware on an API request', () => {
    let reached = false;
    wrapped({ path: '/api/books', headers: {} }, {}, () => { reached = true; });
    assert(reached);
    assert.deepStrictEqual(calls, []);
  });

  it('should run it on a page request', () => {
    wrapped({ path: '/books', headers: {} }, {}, () => {});
    assert.deepStrictEqual(calls, ['/books']);
  });

  // a client must not strip a page of the middlewares its controller needs:
  // a crawler citing application/json;q=0.7 crashed a page on res.locals.flash
  it('should run it on a page request whatever the Accept header', () => {
    wrapped({ path: '/signup', headers: { accept: 'application/json' } }, {}, () => {});
    wrapped({ path: '/signup', headers: { accept: 'text/html,application/json;q=0.7,*/*;q=0.5' } }, {}, () => {});
    assert.deepStrictEqual(calls, ['/signup', '/signup']);
  });
});
