require('../init');

const assert  = require('assert');
const problem = require('@igojs/server/src/api/problem');

describe('api/problem', function() {

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

    it('should title any status from the HTTP registry', () => {
      assert.strictEqual(problem.problem(409).title, 'Conflict');
      assert.strictEqual(problem.problem(429).title, 'Too Many Requests');
    });

    it('should fall back to a generic title on an unknown status', () => {
      assert.strictEqual(problem.problem(799).title, 'Error');
    });

    it('should carry an application type when given', () => {
      assert.strictEqual(problem.problem(409, { type: '/problems/out-of-stock' }).type,
                         '/problems/out-of-stock');
    });
  });
});
