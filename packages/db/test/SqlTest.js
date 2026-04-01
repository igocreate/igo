

const assert    = require('assert');

const Sql           = require('@igojs/db').Sql;

const { dialect } = require('@igojs/db/src/drivers/mysql');


describe('db.Sql', () => {

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
  describe('selectSQL', () => {

    it('should return correct SQL', () => {
      const selectSQL = new Sql(freshQuery(), dialect).selectSQL();
      assert.strictEqual('SELECT `books`.* FROM `books`', selectSQL.sql);
      assert.strictEqual(0, selectSQL.params.length);
    });

    it('should allow order by', () => {
      const selectSQL = new Sql(freshQuery({ order: ['`title`'] }), dialect).selectSQL();
      assert.strictEqual('SELECT `books`.* FROM `books` ORDER BY `title`', selectSQL.sql);
      assert.strictEqual(0, selectSQL.params.length);
    });

    it('should allow limit', () => {
      const selectSQL = new Sql(freshQuery({ limit: 3 }), dialect).selectSQL();
      assert.strictEqual('SELECT `books`.* FROM `books` LIMIT ?, ?', selectSQL.sql);
      assert.strictEqual(2, selectSQL.params.length);
      assert.strictEqual(0, selectSQL.params[0]);
      assert.strictEqual(3, selectSQL.params[1]);
    });

    it('should allow distinct', () => {
      const selectSQL = new Sql(freshQuery({ distinct: ['type'] }), dialect).selectSQL();
      assert.strictEqual('SELECT DISTINCT `type` FROM `books`', selectSQL.sql);
      assert.strictEqual(0, selectSQL.params.length);
    });
  });

  //
  describe('countSQL', () => {
    it('should return correct SQL', () => {
      const selectSQL = new Sql(freshQuery(), dialect).countSQL();
      assert.strictEqual('SELECT COUNT(0) as `count` FROM `books`', selectSQL.sql);
    });

    it('should return correct SQL with where', () => {
      const query = freshQuery({ where: [{ status: 'active' }] });
      const countSQL = new Sql(query, dialect).countSQL();
      assert.strictEqual('SELECT COUNT(0) as `count` FROM `books` WHERE `books`.`status` = ?', countSQL.sql);
      assert.deepStrictEqual(['active'], countSQL.params);
    });
  });

  //
  describe('whereSQL', () => {

    // Array branch: [sql, scalarParam]
    it('should allow string as query param', () => {
      const params  = [];
      const query   = freshQuery({ where: [[ 'field like ?', '%soon%' ]] });
      const sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE field like ? ', sql);
      assert.strictEqual('%soon%', params[0]);
    });

    it('should allow integer as query param', () => {
      const params  = [];
      const query   = freshQuery({ where: [[ 'id=?', 12 ]] });
      const sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE id=? ', sql);
      assert.strictEqual(12, params[0]);
    });

    // Array branch: [sql, arrayParam]
    it('should allow array as query param', () => {
      const params  = [];
      const query   = freshQuery({ where: [[ 'field like ?', ['%soon%'] ]] });
      const sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE field like ? ', sql);
      assert.strictEqual('%soon%', params[0]);
    });

    // Array branch: $? placeholder substitution
    it('should substitute $? placeholders with dialect params', () => {
      const params  = [];
      const query   = freshQuery({ where: [[ '`books`.`id` = $? AND `books`.`status` = $?', [42, 'active'] ]] });
      const sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`id` = ? AND `books`.`status` = ? ', sql);
      assert.strictEqual(42, params[0]);
      assert.strictEqual('active', params[1]);
    });

    // String branch
    it('should allow raw string as where clause', () => {
      const params  = [];
      const query   = freshQuery({ where: ['`books`.`id` > 10'] });
      const sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`id` > 10 ', sql);
      assert.strictEqual(0, params.length);
    });

    // Object branch: scalar equality
    it('should allow object as criterion', () => {
      const params  = [];
      const query   = freshQuery({ where: [{ id: 123 }] });
      const sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`id` = ? ', sql);
      assert.strictEqual(123, params[0]);
    });

    // Object branch: null → IS NULL
    it('should generate IS NULL for null value', () => {
      const params  = [];
      const query   = freshQuery({ where: [{ deleted_at: null }] });
      const sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`deleted_at` IS NULL ', sql);
      assert.strictEqual(0, params.length);
    });

    // Object branch: undefined → IS NULL
    it('should generate IS NULL for undefined value', () => {
      const params  = [];
      const query   = freshQuery({ where: [{ deleted_at: undefined }] });
      const sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`deleted_at` IS NULL ', sql);
      assert.strictEqual(0, params.length);
    });

    // Object branch: empty array → FALSE
    it('should generate FALSE for empty array value', () => {
      const params  = [];
      const query   = freshQuery({ where: [{ id: [] }] });
      const sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE FALSE ', sql);
      assert.strictEqual(0, params.length);
    });

    // Object branch: non-empty array → IN
    it('should generate IN for array value', () => {
      const params  = [];
      const query   = freshQuery({ where: [{ id: [1, 2, 3] }] });
      const sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`id` IN (?) ', sql);
      assert.deepStrictEqual([1, 2, 3], params[0]);
    });

    // Object branch: dot-qualified key
    it('should handle dot-qualified column names', () => {
      const params  = [];
      const query   = freshQuery({ where: [{ 'library.title': 'foo' }] });
      const sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `library`.`title` = ? ', sql);
      assert.strictEqual('foo', params[0]);
    });

    // Multiple conditions (implicit AND)
    it('should join multiple conditions with AND', () => {
      const params  = [];
      const query   = freshQuery({ where: [{ status: 'active' }, { type: 'novel' }] });
      const sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`status` = ? AND `books`.`type` = ? ', sql);
      assert.strictEqual('active', params[0]);
      assert.strictEqual('novel', params[1]);
    });

    // Multiple keys in same object (implicit AND)
    it('should AND multiple keys in same object', () => {
      const params  = [];
      const query   = freshQuery({ where: [{ status: 'active', type: 'novel' }] });
      const sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`status` = ? AND `books`.`type` = ? ', sql);
      assert.strictEqual('active', params[0]);
      assert.strictEqual('novel', params[1]);
    });

    // Empty where → empty string
    it('should return empty string for empty where', () => {
      const params  = [];
      const query   = freshQuery();
      const sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('', sql);
      assert.strictEqual(0, params.length);
    });
  });

  //
  describe('whereNotSQL', () => {

    // IS NOT NULL
    it('should generate IS NOT NULL for null value', () => {
      const params  = [];
      const query   = freshQuery({ where: [], whereNot: [{ deleted_at: null }] });
      const sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`deleted_at` IS NOT NULL ', sql);
      assert.strictEqual(0, params.length);
    });

    // != for scalar
    it('should generate != for scalar value', () => {
      const params  = [];
      const query   = freshQuery({ where: [], whereNot: [{ status: 'deleted' }] });
      const sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`status` != ? ', sql);
      assert.strictEqual('deleted', params[0]);
    });

    // NOT IN for array
    it('should generate NOT IN for array value', () => {
      const params  = [];
      const query   = freshQuery({ where: [], whereNot: [{ id: [1, 2, 3] }] });
      const sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`id` NOT IN (?) ', sql);
      assert.deepStrictEqual([1, 2, 3], params[0]);
    });

    // TRUE for empty array
    it('should generate TRUE for empty array value', () => {
      const params  = [];
      const query   = freshQuery({ where: [], whereNot: [{ id: [] }] });
      const sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE TRUE ', sql);
      assert.strictEqual(0, params.length);
    });

    // AND prefix when where is already populated
    it('should use AND prefix when where clauses exist', () => {
      const params  = [];
      const query   = freshQuery({ where: [{ status: 'active' }], whereNot: [{ type: 'draft' }] });
      // First generate the where SQL
      const _whereSql = new Sql(query, dialect).whereSQL(params);
      // Then generate whereNot - needs a fresh Sql instance
      const params2 = [];
      const whereNotSql = new Sql(query, dialect).whereNotSQL(params2);
      assert.strictEqual('AND `books`.`type` != ? ', whereNotSql);
      assert.strictEqual('draft', params2[0]);
    });

    // WHERE prefix when no where clauses
    it('should use WHERE prefix when no where clauses exist', () => {
      const params  = [];
      const query   = freshQuery({ where: [], whereNot: [{ type: 'draft' }] });
      const sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`type` != ? ', sql);
    });

    // Operators in whereNot
    it('should invert $gte to < in whereNot', () => {
      const params  = [];
      const query   = freshQuery({ where: [], whereNot: [{ price: { $gte: 100 } }] });
      const sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`price` < ? ', sql);
      assert.deepStrictEqual([100], params);
    });

    it('should use NOT LIKE in whereNot for $like', () => {
      const params  = [];
      const query   = freshQuery({ where: [], whereNot: [{ title: { $like: 'Draft%' } }] });
      const sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`title` NOT LIKE ? ', sql);
      assert.deepStrictEqual(['Draft%'], params);
    });

    it('should invert $lte to > in whereNot', () => {
      const params  = [];
      const query   = freshQuery({ where: [], whereNot: [{ price: { $lte: 100 } }] });
      const sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`price` > ? ', sql);
      assert.deepStrictEqual([100], params);
    });

    it('should invert $gt to <= in whereNot', () => {
      const params  = [];
      const query   = freshQuery({ where: [], whereNot: [{ price: { $gt: 5 } }] });
      const sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`price` <= ? ', sql);
      assert.deepStrictEqual([5], params);
    });

    it('should invert $lt to >= in whereNot', () => {
      const params  = [];
      const query   = freshQuery({ where: [], whereNot: [{ price: { $lt: 50 } }] });
      const sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`price` >= ? ', sql);
      assert.deepStrictEqual([50], params);
    });

    it('should use NOT BETWEEN in whereNot for $between', () => {
      const params  = [];
      const query   = freshQuery({ where: [], whereNot: [{ price: { $between: [10, 50] } }] });
      const sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE `books`.`price` NOT BETWEEN ? AND ? ', sql);
      assert.deepStrictEqual([10, 50], params);
    });
  });

  //
  describe('updateSQL', () => {

    it('should generate UPDATE with WHERE', () => {
      const query = freshQuery({
        table: 'books',
        verb: 'update',
        values: { title: 'New Title', status: 'published' },
        where: [{ id: 42 }],
      });
      const result = new Sql(query, dialect).updateSQL();
      assert.strictEqual('UPDATE `books` SET `title` = ?, `status` = ? WHERE `books`.`id` = ? ', result.sql);
      assert.deepStrictEqual(['New Title', 'published', 42], result.params);
    });

    it('should generate UPDATE without WHERE', () => {
      const query = freshQuery({
        table: 'books',
        verb: 'update',
        values: { status: 'archived' },
      });
      const result = new Sql(query, dialect).updateSQL();
      assert.strictEqual('UPDATE `books` SET `status` = ?', result.sql.trim());
      assert.deepStrictEqual(['archived'], result.params);
    });
  });

  //
  describe('deleteSQL', () => {

    it('should generate DELETE with WHERE', () => {
      const query = freshQuery({
        table: 'books',
        verb: 'delete',
        where: [{ id: 42 }],
      });
      const result = new Sql(query, dialect).deleteSQL();
      assert.strictEqual('DELETE FROM `books` WHERE `books`.`id` = ? ', result.sql);
      assert.deepStrictEqual([42], result.params);
    });

    it('should generate DELETE without WHERE', () => {
      const query = freshQuery({
        table: 'books',
        verb: 'delete',
      });
      const result = new Sql(query, dialect).deleteSQL();
      assert.strictEqual('DELETE FROM `books`', result.sql.trim());
      assert.deepStrictEqual([], result.params);
    });
  });

  //
  describe('insertSQL', () => {

    it('should generate INSERT', () => {
      const query = freshQuery({
        table: 'books',
        verb: 'insert',
        values: { title: 'My Book', status: 'draft' },
      });
      const result = new Sql(query, dialect).insertSQL();
      assert.strictEqual('INSERT INTO `books`(`title`,`status`) VALUES(?,?) ', result.sql);
      assert.deepStrictEqual(['My Book', 'draft'], result.params);
    });
  });

  //
  describe('whereSQL operators', () => {

    it('should support $like operator', () => {
      const params = [];
      const query  = freshQuery({ where: [{ title: { $like: 'Node%' } }] });
      const sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`title` LIKE ? ', sql);
      assert.deepStrictEqual(['Node%'], params);
    });

    it('should support $gte operator', () => {
      const params = [];
      const query  = freshQuery({ where: [{ price: { $gte: 10 } }] });
      const sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`price` >= ? ', sql);
      assert.deepStrictEqual([10], params);
    });

    it('should support $lte operator', () => {
      const params = [];
      const query  = freshQuery({ where: [{ price: { $lte: 100 } }] });
      const sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`price` <= ? ', sql);
      assert.deepStrictEqual([100], params);
    });

    it('should support $gt operator', () => {
      const params = [];
      const query  = freshQuery({ where: [{ price: { $gt: 5 } }] });
      const sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`price` > ? ', sql);
      assert.deepStrictEqual([5], params);
    });

    it('should support $lt operator', () => {
      const params = [];
      const query  = freshQuery({ where: [{ price: { $lt: 50 } }] });
      const sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`price` < ? ', sql);
      assert.deepStrictEqual([50], params);
    });

    it('should support multiple operators on same column', () => {
      const params = [];
      const query  = freshQuery({ where: [{ price: { $gte: 100, $lte: 500 } }] });
      const sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE (`books`.`price` >= ? AND `books`.`price` <= ?) ', sql);
      assert.deepStrictEqual([100, 500], params);
    });

    it('should support $between operator', () => {
      const params = [];
      const query  = freshQuery({ where: [{ created_at: { $between: ['2024-01-01', '2024-12-31'] } }] });
      const sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`created_at` BETWEEN ? AND ? ', sql);
      assert.deepStrictEqual(['2024-01-01', '2024-12-31'], params);
    });

    it('should support $or operator', () => {
      const params = [];
      const query  = freshQuery({ where: [{ $or: [{ status: 'active' }, { status: 'pending' }] }] });
      const sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE (`books`.`status` = ? OR `books`.`status` = ?) ', sql);
      assert.deepStrictEqual(['active', 'pending'], params);
    });

    it('should support $and operator', () => {
      const params = [];
      const query  = freshQuery({ where: [{ $and: [{ status: 'active' }, { price: { $gte: 10 } }] }] });
      const sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE (`books`.`status` = ? AND `books`.`price` >= ?) ', sql);
      assert.deepStrictEqual(['active', 10], params);
    });

    it('should support $or with different columns', () => {
      const params = [];
      const query  = freshQuery({ where: [{ $or: [{ title: { $like: 'Node%' } }, { status: 'featured' }] }] });
      const sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE (`books`.`title` LIKE ? OR `books`.`status` = ?) ', sql);
      assert.deepStrictEqual(['Node%', 'featured'], params);
    });

    it('should support mixed operators and plain values', () => {
      const params = [];
      const query  = freshQuery({ where: [{ status: 'active', price: { $gte: 10 }, title: { $like: '%JS%' } }] });
      const sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE `books`.`status` = ? AND `books`.`price` >= ? AND `books`.`title` LIKE ? ', sql);
      assert.deepStrictEqual(['active', 10, '%JS%'], params);
    });

    it('should support $and with siblings', () => {
      const params = [];
      const query  = freshQuery({ where: [{ $and: [{ price: { $gte: 10 } }], status: 'active' }] });
      const sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE (`books`.`price` >= ? AND `books`.`status` = ?) ', sql);
      assert.deepStrictEqual([10, 'active'], params);
    });

    it('should support $or combined with other conditions', () => {
      const params = [];
      const query  = freshQuery({ where: [{ $or: [{ status: 'active' }, { status: 'pending' }], type: 'novel' }] });
      const sql    = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE (`books`.`status` = ? OR `books`.`status` = ?) AND `books`.`type` = ? ', sql);
      assert.deepStrictEqual(['active', 'pending', 'novel'], params);
    });

    it('should support operators in UPDATE WHERE clause', () => {
      const query = freshQuery({
        verb: 'update',
        values: { status: 'archived' },
        where: [{ created_at: { $lt: '2023-01-01' } }],
      });
      const result = new Sql(query, dialect).updateSQL();
      assert.strictEqual('UPDATE `books` SET `status` = ? WHERE `books`.`created_at` < ? ', result.sql);
      assert.deepStrictEqual(['archived', '2023-01-01'], result.params);
    });

    it('should support operators in DELETE WHERE clause', () => {
      const query = freshQuery({
        verb: 'delete',
        where: [{ price: { $lt: 5 }, status: 'draft' }],
      });
      const result = new Sql(query, dialect).deleteSQL();
      assert.strictEqual('DELETE FROM `books` WHERE `books`.`price` < ? AND `books`.`status` = ? ', result.sql);
      assert.deepStrictEqual([5, 'draft'], result.params);
    });

    it('should support operators in COUNT WHERE clause', () => {
      const query = freshQuery({
        where: [{ price: { $between: [10, 50] } }],
      });
      const result = new Sql(query, dialect).countSQL();
      assert.strictEqual('SELECT COUNT(0) as `count` FROM `books` WHERE `books`.`price` BETWEEN ? AND ?', result.sql);
      assert.deepStrictEqual([10, 50], result.params);
    });

    it('should throw on unknown operator (object injection)', () => {
      const params = [];
      const query  = freshQuery({ where: [{ login: { $ne: 'invalid' } }] });
      assert.throws(
        () => new Sql(query, dialect).whereSQL(params),
        { message: /Unknown operator.*\$ne/ }
      );
    });

    it('should throw on unknown operator in whereNot', () => {
      const params = [];
      const query  = freshQuery({ where: [], whereNot: [{ login: { $ne: 'invalid' } }] });
      assert.throws(
        () => new Sql(query, dialect).whereNotSQL(params),
        { message: /Unknown operator.*\$ne/ }
      );
    });

    it('should throw on arbitrary object value', () => {
      const params = [];
      const query  = freshQuery({ where: [{ login: { foo: 'bar', baz: 42 } }] });
      assert.throws(
        () => new Sql(query, dialect).whereSQL(params),
        { message: /Unknown operator.*foo, baz/ }
      );
    });
  });
});
