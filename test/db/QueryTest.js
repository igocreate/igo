

require('../../src/dev/test/init');

var assert    = require('assert');
var _         = require('lodash');

var Query     = require('../../src/db/Query');

describe('db.Query', function() {

  class Book {

  };
  Book.schema = {
    table:    'books',
    primary:  ['id']
  };

  //
  describe('first', function() {
    it('should return correct SQL', function() {
      var first = new Query(Book).first();
      var sql = 'SELECT * FROM `books` ORDER BY `id` ASC LIMIT ?, ?';
      assert.equal(sql, first.query.generated.sql);
    });
  });
});
