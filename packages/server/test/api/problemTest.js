require('../init');

const assert  = require('assert');
const config  = require('@igojs/server').config;
const problem = require('@igojs/server/src/api/problem');

describe('api/problem', function() {

  describe('isApiRequest', function() {

    it('should recognize the api prefix', () => {
      assert(problem.isApiRequest({ path: '/api/books', headers: {} }));
      assert(problem.isApiRequest({ path: '/api', headers: {} }));
    });

    it('should not mistake a path that merely starts with the prefix', () => {
      assert(!problem.isApiRequest({ path: '/apidocs', headers: {} }));
    });

    it('should recognize a client asking for json', () => {
      assert(problem.isApiRequest({ path: '/books', headers: { accept: 'application/json' } }));
    });

    it('should leave a regular page request alone', () => {
      assert(!problem.isApiRequest({ path: '/books', headers: { accept: 'text/html' } }));
      assert(!problem.isApiRequest({ path: '/books', headers: {} }));
    });

    it('should follow a custom prefix', () => {
      const initial = config.api.prefix;
      config.api.prefix = '/v1';
      try {
        assert(problem.isApiRequest({ path: '/v1/books', headers: {} }));
        assert(!problem.isApiRequest({ path: '/api/books', headers: {} }));
      } finally {
        config.api.prefix = initial;
      }
    });
  });

  describe('problem', function() {

    it('should build an RFC 9457 document', () => {
      assert.deepStrictEqual(problem.problem(404), {
        type: 'about:blank', title: 'Not Found', status: 404
      });
    });

    it('should carry detail and errors when given', () => {
      const doc = problem.problem(400, { title: 'Validation failed', detail: 'nope', errors: [{ path: 'a' }] });
      assert.strictEqual(doc.detail, 'nope');
      assert.deepStrictEqual(doc.errors, [{ path: 'a' }]);
    });

    it('should fall back to a generic title', () => {
      assert.strictEqual(problem.problem(418).title, 'Error');
    });
  });
});
