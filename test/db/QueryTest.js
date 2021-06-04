

require('../../src/dev/test/init');

const assert    = require('assert');
const _         = require('lodash');

const Query     = require('../../src/db/Query');

//
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
      const first = new Query(Book).first();
      const sql = 'SELECT `books`.* FROM `books` ORDER BY `id` ASC LIMIT ?, ?';
      assert.equal(sql, first.query.generated.sql);
    });
  });
});
