

var assert    = require('assert');

var Sql           = require('../../src/db/Sql');

const { dialect } = require('../../src/db/drivers/mysql');


describe('db.Sql', function() {

  // Fresh query for each test to avoid state leakage
  const freshQuery = (overrides = {}) => ({
    table: 'books',
    where: [],
    whereNot: [],
    joins: [],
    order: [],
    ...overrides
  });

  //
  describe('selectSQL', function() {

    it('should return correct SQL', function() {
      var selectSQL = new Sql(freshQuery(), dialect).selectSQL();
      assert.strictEqual('SELECT `books`.* FROM `books`', selectSQL.sql);
      assert.strictEqual(0, selectSQL.params.length);
    });

    it('should allow order by', function() {
      var selectSQL = new Sql(freshQuery({ order: ['`title`'] }), dialect).selectSQL();
      assert.strictEqual('SELECT `books`.* FROM `books` ORDER BY `title`', selectSQL.sql);
      assert.strictEqual(0, selectSQL.params.length);
    });

    it('should allow limit', function() {
      var selectSQL = new Sql(freshQuery({ limit: 3 }), dialect).selectSQL();
      assert.strictEqual('SELECT `books`.* FROM `books` LIMIT ?, ?', selectSQL.sql);
      assert.strictEqual(2, selectSQL.params.length);
      assert.strictEqual(0, selectSQL.params[0]);
      assert.strictEqual(3, selectSQL.params[1]);
    });

    it('should allow distinct', function() {
      var selectSQL = new Sql(freshQuery({ distinct: ['type'] }), dialect).selectSQL();
      assert.strictEqual('SELECT DISTINCT `type` FROM `books`', selectSQL.sql);
      assert.strictEqual(0, selectSQL.params.length);
    });
  });

  //
  describe('countSQL', function() {
    it('should return correct SQL', function() {
      var selectSQL = new Sql(freshQuery(), dialect).countSQL();
      assert.strictEqual('SELECT COUNT(0) as `count` FROM `books`', selectSQL.sql);
    });

    it('should return correct SQL with where', function() {
      var query = freshQuery({ where: [{ status: 'active' }] });
      var countSQL = new Sql(query, dialect).countSQL();
      assert.strictEqual('SELECT COUNT(0) as `count` FROM `books` WHERE `books`.`status` = ?', countSQL.sql);
      assert.deepStrictEqual(['active'], countSQL.params);
    });
  });

  //
  describe('whereSQL', function() {

    // Array branch: [sql, scalarParam]
    it('should allow string as query param', function() {
      var params  = [];
      var query   = freshQuery({ where: [[ 'field like ?', '%soon%' ]] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE field like ? ', sql);
      assert.strictEqual('%soon%', params[0]);
    });

    it('should allow integer as query param', function() {
      var params  = [];
      var query   = freshQuery({ where: [[ 'id=?', 12 ]] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE id=? ', sql);
      assert.strictEqual(12, params[0]);
    });

    // Array branch: [sql, arrayParam]
    it('should allow array as query param', function() {
      var params  = [];
      var query   = freshQuery({ where: [[ 'field like ?', ['%soon%'] ]] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE field like ? ', sql);
      assert.strictEqual('%soon%', params[0]);
    });

    // Array branch: $? placeholder substitution
    it('should substitute $? placeholders with dialect params', function() {
      var params  = [];
      var query   = freshQuery({ where: [[ '`books`.`id` = $? AND `books`.`status` = $?', [42, 'active'] ]] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`id` = ? AND `books`.`status` = ? ', sql);
      assert.strictEqual(42, params[0]);
      assert.strictEqual('active', params[1]);
    });

    // String branch
    it('should allow raw string as where clause', function() {
      var params  = [];
      var query   = freshQuery({ where: ['`books`.`id` > 10'] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`id` > 10 ', sql);
      assert.strictEqual(0, params.length);
    });

    // Object branch: scalar equality
    it('should allow object as criterion', function() {
      var params  = [];
      var query   = freshQuery({ where: [{ id: 123 }] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`id` = ? ', sql);
      assert.strictEqual(123, params[0]);
    });

    // Object branch: null → IS NULL
    it('should generate IS NULL for null value', function() {
      var params  = [];
      var query   = freshQuery({ where: [{ deleted_at: null }] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`deleted_at` IS NULL ', sql);
      assert.strictEqual(0, params.length);
    });

    // Object branch: undefined → IS NULL
    it('should generate IS NULL for undefined value', function() {
      var params  = [];
      var query   = freshQuery({ where: [{ deleted_at: undefined }] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`deleted_at` IS NULL ', sql);
      assert.strictEqual(0, params.length);
    });

    // Object branch: empty array → FALSE
    it('should generate FALSE for empty array value', function() {
      var params  = [];
      var query   = freshQuery({ where: [{ id: [] }] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE FALSE ', sql);
      assert.strictEqual(0, params.length);
    });

    // Object branch: non-empty array → IN
    it('should generate IN for array value', function() {
      var params  = [];
      var query   = freshQuery({ where: [{ id: [1, 2, 3] }] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`id` IN (?) ', sql);
      assert.deepStrictEqual([1, 2, 3], params[0]);
    });

    // Object branch: dot-qualified key
    it('should handle dot-qualified column names', function() {
      var params  = [];
      var query   = freshQuery({ where: [{ 'library.title': 'foo' }] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `library`.`title` = ? ', sql);
      assert.strictEqual('foo', params[0]);
    });

    // Multiple conditions (implicit AND)
    it('should join multiple conditions with AND', function() {
      var params  = [];
      var query   = freshQuery({ where: [{ status: 'active' }, { type: 'novel' }] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`status` = ? AND `books`.`type` = ? ', sql);
      assert.strictEqual('active', params[0]);
      assert.strictEqual('novel', params[1]);
    });

    // Multiple keys in same object (implicit AND)
    it('should AND multiple keys in same object', function() {
      var params  = [];
      var query   = freshQuery({ where: [{ status: 'active', type: 'novel' }] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`status` = ? AND `books`.`type` = ? ', sql);
      assert.strictEqual('active', params[0]);
      assert.strictEqual('novel', params[1]);
    });

    // Empty where → empty string
    it('should return empty string for empty where', function() {
      var params  = [];
      var query   = freshQuery();
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('', sql);
      assert.strictEqual(0, params.length);
    });
  });

  //
  describe('whereNotSQL', function() {

    // IS NOT NULL
    it('should generate IS NOT NULL for null value', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ deleted_at: null }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`deleted_at` IS NOT NULL ', sql);
      assert.strictEqual(0, params.length);
    });

    // != for scalar
    it('should generate != for scalar value', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ status: 'deleted' }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`status` != ? ', sql);
      assert.strictEqual('deleted', params[0]);
    });

    // NOT IN for array
    it('should generate NOT IN for array value', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ id: [1, 2, 3] }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`id` NOT IN (?) ', sql);
      assert.deepStrictEqual([1, 2, 3], params[0]);
    });

    // TRUE for empty array
    it('should generate TRUE for empty array value', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ id: [] }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE TRUE ', sql);
      assert.strictEqual(0, params.length);
    });

    // AND prefix when where is already populated
    it('should use AND prefix when where clauses exist', function() {
      var params  = [];
      var query   = freshQuery({ where: [{ status: 'active' }], whereNot: [{ type: 'draft' }] });
      // First generate the where SQL
      var whereSql = new Sql(query, dialect).whereSQL(params);
      // Then generate whereNot - needs a fresh Sql instance
      var params2 = [];
      var whereNotSql = new Sql(query, dialect).whereNotSQL(params2);
      assert.strictEqual('AND `books`.`type` != ? ', whereNotSql);
      assert.strictEqual('draft', params2[0]);
    });

    // WHERE prefix when no where clauses
    it('should use WHERE prefix when no where clauses exist', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ type: 'draft' }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`type` != ? ', sql);
    });

    // Operators in whereNot
    it('should invert $gte to < in whereNot', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ price: { $gte: 100 } }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`price` < ? ', sql);
      assert.deepStrictEqual([100], params);
    });

    it('should use NOT LIKE in whereNot for $like', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ title: { $like: 'Draft%' } }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`title` NOT LIKE ? ', sql);
      assert.deepStrictEqual(['Draft%'], params);
    });

    it('should invert $lte to > in whereNot', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ price: { $lte: 100 } }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`price` > ? ', sql);
      assert.deepStrictEqual([100], params);
    });

    it('should invert $gt to <= in whereNot', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ price: { $gt: 5 } }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`price` <= ? ', sql);
      assert.deepStrictEqual([5], params);
    });

    it('should invert $lt to >= in whereNot', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ price: { $lt: 50 } }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`price` >= ? ', sql);
      assert.deepStrictEqual([50], params);
    });

    it('should use NOT BETWEEN in whereNot for $between', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ price: { $between: [10, 50] } }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`price` NOT BETWEEN ? AND ? ', sql);
      assert.deepStrictEqual([10, 50], params);
    });

    it('should use NOT LIKE in whereNot for implicit %', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ title: 'Draft%' }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`title` NOT LIKE ? ', sql);
      assert.deepStrictEqual(['Draft%'], params);
    });
  });

  //
  describe('updateSQL', function() {

    it('should generate UPDATE with WHERE', function() {
      var query = freshQuery({
        table: 'books',
        verb: 'update',
        values: { title: 'New Title', status: 'published' },
        where: [{ id: 42 }],
      });
      var result = new Sql(query, dialect).updateSQL();
      assert.strictEqual('UPDATE `books` SET `title` = ?, `status` = ? WHERE `books`.`id` = ? ', result.sql);
      assert.deepStrictEqual(['New Title', 'published', 42], result.params);
    });

    it('should generate UPDATE without WHERE', function() {
      var query = freshQuery({
        table: 'books',
        verb: 'update',
        values: { status: 'archived' },
      });
      var result = new Sql(query, dialect).updateSQL();
      assert.strictEqual('UPDATE `books` SET `status` = ?', result.sql.trim());
      assert.deepStrictEqual(['archived'], result.params);
    });
  });

  //
  describe('deleteSQL', function() {

    it('should generate DELETE with WHERE', function() {
      var query = freshQuery({
        table: 'books',
        verb: 'delete',
        where: [{ id: 42 }],
      });
      var result = new Sql(query, dialect).deleteSQL();
      assert.strictEqual('DELETE FROM `books` WHERE `books`.`id` = ? ', result.sql);
      assert.deepStrictEqual([42], result.params);
    });

    it('should generate DELETE without WHERE', function() {
      var query = freshQuery({
        table: 'books',
        verb: 'delete',
      });
      var result = new Sql(query, dialect).deleteSQL();
      assert.strictEqual('DELETE FROM `books`', result.sql.trim());
      assert.deepStrictEqual([], result.params);
    });
  });

  //
  describe('insertSQL', function() {

    it('should generate INSERT', function() {
      var query = freshQuery({
        table: 'books',
        verb: 'insert',
        values: { title: 'My Book', status: 'draft' },
      });
      var result = new Sql(query, dialect).insertSQL();
      assert.strictEqual('INSERT INTO `books`(`title`,`status`) VALUES(?,?) ', result.sql);
      assert.deepStrictEqual(['My Book', 'draft'], result.params);
    });
  });

  //
  describe('whereSQL operators', function() {

    it('should support $like operator', function() {
      var params = [];
      var query  = freshQuery({ where: [{ title: { $like: 'Node%' } }] });
      var sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`title` LIKE ? ', sql);
      assert.deepStrictEqual(['Node%'], params);
    });

    it('should support implicit LIKE with %', function() {
      var params = [];
      var query  = freshQuery({ where: [{ title: 'Node%' }] });
      var sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`title` LIKE ? ', sql);
      assert.deepStrictEqual(['Node%'], params);
    });

    it('should support $gte operator', function() {
      var params = [];
      var query  = freshQuery({ where: [{ price: { $gte: 10 } }] });
      var sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`price` >= ? ', sql);
      assert.deepStrictEqual([10], params);
    });

    it('should support $lte operator', function() {
      var params = [];
      var query  = freshQuery({ where: [{ price: { $lte: 100 } }] });
      var sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`price` <= ? ', sql);
      assert.deepStrictEqual([100], params);
    });

    it('should support $gt operator', function() {
      var params = [];
      var query  = freshQuery({ where: [{ price: { $gt: 5 } }] });
      var sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`price` > ? ', sql);
      assert.deepStrictEqual([5], params);
    });

    it('should support $lt operator', function() {
      var params = [];
      var query  = freshQuery({ where: [{ price: { $lt: 50 } }] });
      var sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`price` < ? ', sql);
      assert.deepStrictEqual([50], params);
    });

    it('should support multiple operators on same column', function() {
      var params = [];
      var query  = freshQuery({ where: [{ price: { $gte: 100, $lte: 500 } }] });
      var sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE (`books`.`price` >= ? AND `books`.`price` <= ?) ', sql);
      assert.deepStrictEqual([100, 500], params);
    });

    it('should support $between operator', function() {
      var params = [];
      var query  = freshQuery({ where: [{ created_at: { $between: ['2024-01-01', '2024-12-31'] } }] });
      var sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`created_at` BETWEEN ? AND ? ', sql);
      assert.deepStrictEqual(['2024-01-01', '2024-12-31'], params);
    });

    it('should support $or operator', function() {
      var params = [];
      var query  = freshQuery({ where: [{ $or: [{ status: 'active' }, { status: 'pending' }] }] });
      var sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE (`books`.`status` = ? OR `books`.`status` = ?) ', sql);
      assert.deepStrictEqual(['active', 'pending'], params);
    });

    it('should support $and operator', function() {
      var params = [];
      var query  = freshQuery({ where: [{ $and: [{ status: 'active' }, { price: { $gte: 10 } }] }] });
      var sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE (`books`.`status` = ? AND `books`.`price` >= ?) ', sql);
      assert.deepStrictEqual(['active', 10], params);
    });

    it('should support $or with different columns', function() {
      var params = [];
      var query  = freshQuery({ where: [{ $or: [{ title: { $like: 'Node%' } }, { status: 'featured' }] }] });
      var sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE (`books`.`title` LIKE ? OR `books`.`status` = ?) ', sql);
      assert.deepStrictEqual(['Node%', 'featured'], params);
    });

    it('should support mixed operators and plain values', function() {
      var params = [];
      var query  = freshQuery({ where: [{ status: 'active', price: { $gte: 10 }, title: { $like: '%JS%' } }] });
      var sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`status` = ? AND `books`.`price` >= ? AND `books`.`title` LIKE ? ', sql);
      assert.deepStrictEqual(['active', 10, '%JS%'], params);
    });

    it('should support $and with siblings', function() {
      var params = [];
      var query  = freshQuery({ where: [{ $and: [{ price: { $gte: 10 } }], status: 'active' }] });
      var sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE (`books`.`price` >= ? AND `books`.`status` = ?) ', sql);
      assert.deepStrictEqual([10, 'active'], params);
    });

    it('should support $or combined with other conditions', function() {
      var params = [];
      var query  = freshQuery({ where: [{ $or: [{ status: 'active' }, { status: 'pending' }], type: 'novel' }] });
      var sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE (`books`.`status` = ? OR `books`.`status` = ?) AND `books`.`type` = ? ', sql);
      assert.deepStrictEqual(['active', 'pending', 'novel'], params);
    });

    it('should support operators in UPDATE WHERE clause', function() {
      var query = freshQuery({
        verb: 'update',
        values: { status: 'archived' },
        where: [{ created_at: { $lt: '2023-01-01' } }],
      });
      var result = new Sql(query, dialect).updateSQL();
      assert.strictEqual('UPDATE `books` SET `status` = ? WHERE `books`.`created_at` < ? ', result.sql);
      assert.deepStrictEqual(['archived', '2023-01-01'], result.params);
    });

    it('should support operators in DELETE WHERE clause', function() {
      var query = freshQuery({
        verb: 'delete',
        where: [{ price: { $lt: 5 }, status: 'draft' }],
      });
      var result = new Sql(query, dialect).deleteSQL();
      assert.strictEqual('DELETE FROM `books` WHERE `books`.`price` < ? AND `books`.`status` = ? ', result.sql);
      assert.deepStrictEqual([5, 'draft'], result.params);
    });

    it('should support operators in COUNT WHERE clause', function() {
      var query = freshQuery({
        where: [{ price: { $between: [10, 50] } }],
      });
      var result = new Sql(query, dialect).countSQL();
      assert.strictEqual('SELECT COUNT(0) as `count` FROM `books` WHERE `books`.`price` BETWEEN ? AND ?', result.sql);
      assert.deepStrictEqual([10, 50], result.params);
    });
  });
});
