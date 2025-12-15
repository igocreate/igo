

require('./init');

const assert    = require('assert');

const Query     = require('@igojs/db').Query;
const Model     = require('@igojs/db').Model;

//
describe('db.Query', function() {

  class Book extends Model({
    table:    'books',
    primary:  ['id']
  }) {}

  //
  describe('first', function() {
    it('should return correct SQL', async () => {
      const query = new Query(Book)
      await query.first();
      const sql = 'SELECT `books`.* FROM `books` ORDER BY `books`.`id` ASC LIMIT ?, ?';
      assert.strictEqual(sql, query.query.generated.sql);
    });
  });
});
