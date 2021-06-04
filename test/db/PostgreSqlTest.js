

var assert    = require('assert');
var _         = require('lodash');

var Sql           = require('../../src/db/Sql');

const { dialect } = require('../../src/db/drivers/postgresql');


describe('db.PostgreSql', function() {

  var query = {
    table: 'books',
    where: []
  };

  //
  describe('selectSQL', function() {

    it('should return correct SQL', function() {
      var selectSQL = new Sql(query, dialect).selectSQL();
      assert.equal('SELECT "books".* FROM "books"', selectSQL.sql);
      assert.equal(0, selectSQL.params.length);
    });

    it('should allow order by', function() {
      query.order = [ '"title"' ];
      var selectSQL = new Sql(query, dialect).selectSQL();
      assert.equal('SELECT "books".* FROM "books" ORDER BY "title"', selectSQL.sql);
      assert.equal(0, selectSQL.params.length);
      delete query.order;
    });

    it('should allow limit', function() {
      query.limit = 3;
      var selectSQL = new Sql(query, dialect).selectSQL();
      assert.equal('SELECT "books".* FROM "books" LIMIT $2 OFFSET $1', selectSQL.sql);
      assert.equal(2, selectSQL.params.length);
      assert.equal(0, selectSQL.params[0]);
      assert.equal(3, selectSQL.params[1]);
    });

    it('should allow distinct', function() {
      query.distinct  = [ 'type' ];
      query.limit     = null;
      var selectSQL   = new Sql(query, dialect).selectSQL();
      assert.equal('SELECT DISTINCT "type" FROM "books"', selectSQL.sql);
      assert.equal(0, selectSQL.params.length);
    })
  });

  //
  describe('countSQL', function() {
    it('should return correct SQL', function() {
      var selectSQL = new Sql(query, dialect).countSQL();
      assert.equal('SELECT COUNT(0) as "count" FROM "books"', selectSQL.sql);
    });
  });

  //
  describe('whereSQL', function() {

    it('should allow string as query param', function() {
      var params  = [];
      query.where = [[ 'field like ?', '%soon%' ]];
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.equal('WHERE field like ? ', sql);
      assert.equal('%soon%', params[0]);
    });

    it('should allow integer as query param', function() {
      var params  = [];
      query.where = [[ 'id=?', 12 ]];
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.equal('WHERE id=? ', sql);
      assert.equal(12, params[0]);
    });

    it('should allow array as query param', function() {
      var params  = [];
      query.where = [[ 'field like ?', ['%soon%'] ]];
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.equal('WHERE field like ? ', sql);
      assert.equal('%soon%', params[0]);
    });

    it('should allow object as criterion', function() {
      var params  = [];
      query.where = [{ id: 123 }];
      var sql     = new Sql(query, dialect).whereSQL(params);
      assert.equal('WHERE "id" = $1 ', sql);
      assert.equal(123, params[0]);
    });
  });
});
