

var assert    = require('assert');

var Sql           = require('../../src/db/Sql');

const { dialect } = require('../../src/db/drivers/postgresql');


describe('db.PostgreSql', function() {

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
      assert.strictEqual('SELECT "books".* FROM "books"', selectSQL.sql);
      assert.strictEqual(0, selectSQL.params.length);
    });

    it('should allow order by', function() {
      var selectSQL = new Sql(freshQuery({ order: ['"title"'] }), dialect).selectSQL();
      assert.strictEqual('SELECT "books".* FROM "books" ORDER BY "title"', selectSQL.sql);
      assert.strictEqual(0, selectSQL.params.length);
    });

    it('should allow limit', function() {
      var selectSQL = new Sql(freshQuery({ limit: 3 }), dialect).selectSQL();
      assert.strictEqual('SELECT "books".* FROM "books" LIMIT $2 OFFSET $1', selectSQL.sql);
      assert.strictEqual(2, selectSQL.params.length);
      assert.strictEqual(0, selectSQL.params[0]);
      assert.strictEqual(3, selectSQL.params[1]);
    });

    it('should allow distinct', function() {
      var selectSQL = new Sql(freshQuery({ distinct: ['type'] }), dialect).selectSQL();
      assert.strictEqual('SELECT DISTINCT "type" FROM "books"', selectSQL.sql);
      assert.strictEqual(0, selectSQL.params.length);
    });
  });

  //
  describe('countSQL', function() {
    it('should return correct SQL', function() {
      var selectSQL = new Sql(freshQuery(), dialect).countSQL();
      assert.strictEqual('SELECT COUNT(0) as "count" FROM "books"', selectSQL.sql);
    });
  });

  //
  describe('whereSQL', function() {

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

    it('should allow array as query param', function() {
      var params  = [];
      var query   = freshQuery({ where: [[ 'field like ?', ['%soon%'] ]] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE field like ? ', sql);
      assert.strictEqual('%soon%', params[0]);
    });

    it('should allow object as criterion', function() {
      var params  = [];
      var query   = freshQuery({ where: [{ id: 123 }] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE "books"."id" = $1 ', sql);
      assert.strictEqual(123, params[0]);
    });

    // $? placeholder substitution with PostgreSQL numbered params
    it('should substitute $? placeholders with numbered params', function() {
      var params  = [];
      var query   = freshQuery({ where: [[ '"books"."id" = $? AND "books"."status" = $?', [42, 'active'] ]] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE "books"."id" = $1 AND "books"."status" = $2 ', sql);
      assert.strictEqual(42, params[0]);
      assert.strictEqual('active', params[1]);
    });

    // IS NULL
    it('should generate IS NULL for null value', function() {
      var params  = [];
      var query   = freshQuery({ where: [{ deleted_at: null }] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE "books"."deleted_at" IS NULL ', sql);
      assert.strictEqual(0, params.length);
    });

    // Empty array → FALSE
    it('should generate FALSE for empty array value', function() {
      var params  = [];
      var query   = freshQuery({ where: [{ id: [] }] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE FALSE ', sql);
    });

    // Non-empty array → = ANY (PostgreSQL)
    it('should generate = ANY for array value', function() {
      var params  = [];
      var query   = freshQuery({ where: [{ id: [1, 2, 3] }] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE "books"."id" = ANY ($1) ', sql);
      assert.deepStrictEqual([1, 2, 3], params[0]);
    });

    // Dot-qualified key
    it('should handle dot-qualified column names', function() {
      var params  = [];
      var query   = freshQuery({ where: [{ 'library.title': 'foo' }] });
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.strictEqual('WHERE "library"."title" = $1 ', sql);
      assert.strictEqual('foo', params[0]);
    });
  });

  //
  describe('whereNotSQL', function() {

    it('should generate IS NOT NULL for null value', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ deleted_at: null }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE "books"."deleted_at" IS NOT NULL ', sql);
    });

    it('should generate != for scalar value', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ status: 'deleted' }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE "books"."status" != $1 ', sql);
      assert.strictEqual('deleted', params[0]);
    });

    it('should generate != ALL for array value', function() {
      var params  = [];
      var query   = freshQuery({ where: [], whereNot: [{ id: [1, 2, 3] }] });
      var sql     = new Sql(query, dialect).whereNotSQL(params);
      assert.strictEqual('WHERE "books"."id" != ALL ($1) ', sql);
      assert.deepStrictEqual([1, 2, 3], params[0]);
    });
  });

  //
  describe('updateSQL', function() {

    it('should generate UPDATE with WHERE using numbered params', function() {
      var query = freshQuery({
        verb: 'update',
        values: { title: 'New Title' },
        where: [{ id: 42 }],
      });
      var result = new Sql(query, dialect).updateSQL();
      assert.strictEqual('UPDATE "books" SET "title" = $1 WHERE "books"."id" = $2 ', result.sql);
      assert.deepStrictEqual(['New Title', 42], result.params);
    });
  });

  //
  describe('deleteSQL', function() {

    it('should generate DELETE with WHERE using numbered params', function() {
      var query = freshQuery({
        verb: 'delete',
        where: [{ id: 42 }],
      });
      var result = new Sql(query, dialect).deleteSQL();
      assert.strictEqual('DELETE FROM "books" WHERE "books"."id" = $1 ', result.sql);
      assert.deepStrictEqual([42], result.params);
    });
  });
});
