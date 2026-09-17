require('../init');

const assert  = require('assert');
const express = require('express');
const { z }   = require('zod');

const validate = require('@igojs/server/src/api/validate');

const handler = (schemas = {}) => {
  const fn = (req, res) => res.end();
  Object.assign(fn, schemas);
  return fn;
};

describe('api/validate', function() {

  describe('schemasOf', function() {

    it('should find the schemas attached to a handler', () => {
      const schema  = z.object({ a: z.string() });
      const schemas = validate.schemasOf(handler({ body: schema, query: schema }));
      assert.deepStrictEqual(Object.keys(schemas).sort(), ['body', 'query']);
    });

    it('should ignore a handler without schemas', () => {
      assert.strictEqual(validate.schemasOf(handler()), null);
    });

    it('should ignore a property that is not a schema', () => {
      assert.strictEqual(validate.schemasOf(handler({ body: { a: 1 } })), null);
    });
  });

  describe('apply', function() {

    it('should report body routes without a schema', () => {
      const router = express.Router();
      router.post('/bulk', handler());
      assert.deepStrictEqual(validate.apply(router), ['POST /bulk']);
    });

    it('should not report a route that declares a schema', () => {
      const router = express.Router();
      router.post('/', handler({ body: z.object({ a: z.string() }) }));
      assert.deepStrictEqual(validate.apply(router), []);
    });

    it('should not report routes that carry no body', () => {
      const router = express.Router();
      router.get('/', handler());
      router.delete('/:id', handler());
      assert.deepStrictEqual(validate.apply(router), []);
    });

    it('should walk nested routers', () => {
      const nested = express.Router();
      nested.post('/deep', handler());
      const router = express.Router();
      router.use('/nested', nested);
      assert.deepStrictEqual(validate.apply(router), ['POST /deep']);
    });
  });
});
