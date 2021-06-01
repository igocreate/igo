

require('../../src/dev/test/init');

const assert    = require('assert');
const _         = require('lodash');

const db        = require('../../src/db/db');
const Query     = require('../../src/db/Query');

const mysql       = require('../../src/db/databases/mysql');
const postgresql  = require('../../src/db/databases/postgresql');

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
      var first = new Query(Book).first();
      var sql = 'SELECT `books`.* FROM `books` ORDER BY `id` ASC LIMIT ?, ?';
      assert.equal(sql, first.query.generated.sql);
    });
  });
});
