
const assert = require('assert');
const { compileCondition, compileNotCondition } = require('../../src/db/OperatorCompiler');

const mysqlDialect = require('../../src/db/drivers/mysql').dialect;
const pgDialect    = require('../../src/db/drivers/postgresql').dialect;

describe('OperatorCompiler', function() {

  describe('compileCondition (MySQL)', function() {
    const col = '`books`.`status`';
    const d = mysqlDialect;

    it('should compile null to IS NULL', function() {
      const r = compileCondition(col, null, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` IS NULL');
      assert.deepStrictEqual(r.params, []);
    });

    it('should compile empty array to FALSE', function() {
      const r = compileCondition(col, [], d, 1);
      assert.strictEqual(r.sql, 'FALSE');
      assert.deepStrictEqual(r.params, []);
    });

    it('should compile array to IN', function() {
      const r = compileCondition(col, ['a', 'b'], d, 1);
      assert.strictEqual(r.sql, '`books`.`status` IN (?)');
      assert.deepStrictEqual(r.params, [['a', 'b']]);
      assert.strictEqual(r.i, 2);
    });

    it('should compile $like', function() {
      const r = compileCondition(col, { $like: 'Dup%' }, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` LIKE ?');
      assert.deepStrictEqual(r.params, ['Dup%']);
    });

    it('should compile $between', function() {
      const r = compileCondition(col, { $between: ['2024-01-01', '2024-12-31'] }, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` BETWEEN ? AND ?');
      assert.deepStrictEqual(r.params, ['2024-01-01', '2024-12-31']);
      assert.strictEqual(r.i, 3);
    });

    it('should compile $gte', function() {
      const r = compileCondition(col, { $gte: 10 }, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` >= ?');
      assert.deepStrictEqual(r.params, [10]);
    });

    it('should compile $lte', function() {
      const r = compileCondition(col, { $lte: 100 }, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` <= ?');
      assert.deepStrictEqual(r.params, [100]);
    });

    it('should compile $gt', function() {
      const r = compileCondition(col, { $gt: 5 }, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` > ?');
      assert.deepStrictEqual(r.params, [5]);
    });

    it('should compile $lt', function() {
      const r = compileCondition(col, { $lt: 50 }, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` < ?');
      assert.deepStrictEqual(r.params, [50]);
    });

    it('should compile string with % to implicit LIKE', function() {
      const r = compileCondition(col, 'Dup%', d, 1);
      assert.strictEqual(r.sql, '`books`.`status` LIKE ?');
      assert.deepStrictEqual(r.params, ['Dup%']);
    });

    it('should compile scalar to equality', function() {
      const r = compileCondition(col, 'active', d, 1);
      assert.strictEqual(r.sql, '`books`.`status` = ?');
      assert.deepStrictEqual(r.params, ['active']);
    });

    it('should compile integer to equality', function() {
      const r = compileCondition(col, 42, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` = ?');
      assert.deepStrictEqual(r.params, [42]);
    });

    it('should compile Date to equality (not as operator object)', function() {
      const date = new Date('2024-06-15');
      const r = compileCondition(col, date, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` = ?');
      assert.deepStrictEqual(r.params, [date]);
    });
  });

  describe('compileCondition (PostgreSQL)', function() {
    const col = '"books"."status"';
    const d = pgDialect;

    it('should use numbered params for equality', function() {
      const r = compileCondition(col, 'active', d, 3);
      assert.strictEqual(r.sql, '"books"."status" = $3');
      assert.strictEqual(r.i, 4);
    });

    it('should use = ANY for IN', function() {
      const r = compileCondition(col, [1, 2], d, 1);
      assert.strictEqual(r.sql, '"books"."status" = ANY ($1)');
    });

    it('should use numbered params for $between', function() {
      const r = compileCondition(col, { $between: ['a', 'z'] }, d, 5);
      assert.strictEqual(r.sql, '"books"."status" BETWEEN $5 AND $6');
      assert.strictEqual(r.i, 7);
    });

    it('should use numbered params for $gte', function() {
      const r = compileCondition(col, { $gte: 10 }, d, 2);
      assert.strictEqual(r.sql, '"books"."status" >= $2');
    });
  });

  describe('compileNotCondition', function() {
    const col = '`books`.`status`';
    const d = mysqlDialect;

    it('should compile null to IS NOT NULL', function() {
      const r = compileNotCondition(col, null, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` IS NOT NULL');
    });

    it('should compile empty array to TRUE', function() {
      const r = compileNotCondition(col, [], d, 1);
      assert.strictEqual(r.sql, 'TRUE');
    });

    it('should compile array to NOT IN', function() {
      const r = compileNotCondition(col, [1, 2], d, 1);
      assert.strictEqual(r.sql, '`books`.`status` NOT IN (?)');
      assert.deepStrictEqual(r.params, [[1, 2]]);
    });

    it('should compile scalar to !=', function() {
      const r = compileNotCondition(col, 'deleted', d, 1);
      assert.strictEqual(r.sql, '`books`.`status` != ?');
      assert.deepStrictEqual(r.params, ['deleted']);
    });

    it('should compile $like to NOT LIKE', function() {
      const r = compileNotCondition(col, { $like: 'Dup%' }, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` NOT LIKE ?');
      assert.deepStrictEqual(r.params, ['Dup%']);
    });

    it('should compile $between to NOT BETWEEN', function() {
      const r = compileNotCondition(col, { $between: [1, 10] }, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` NOT BETWEEN ? AND ?');
      assert.deepStrictEqual(r.params, [1, 10]);
    });

    it('should compile $gte to < (inverted)', function() {
      const r = compileNotCondition(col, { $gte: 10 }, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` < ?');
      assert.deepStrictEqual(r.params, [10]);
    });

    it('should compile $lte to > (inverted)', function() {
      const r = compileNotCondition(col, { $lte: 100 }, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` > ?');
      assert.deepStrictEqual(r.params, [100]);
    });

    it('should compile $gt to <= (inverted)', function() {
      const r = compileNotCondition(col, { $gt: 5 }, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` <= ?');
      assert.deepStrictEqual(r.params, [5]);
    });

    it('should compile $lt to >= (inverted)', function() {
      const r = compileNotCondition(col, { $lt: 50 }, d, 1);
      assert.strictEqual(r.sql, '`books`.`status` >= ?');
      assert.deepStrictEqual(r.params, [50]);
    });

    it('should compile string with % to NOT LIKE', function() {
      const r = compileNotCondition(col, 'Dup%', d, 1);
      assert.strictEqual(r.sql, '`books`.`status` NOT LIKE ?');
      assert.deepStrictEqual(r.params, ['Dup%']);
    });
  });
});
