

require('../../src/dev/test/init');

const assert    = require('assert');

const Query     = require('../../src/db/Query');
const Model     = require('../../src/db/Model');

//
describe('db.Query', function() {

  class Book extends Model {
    static schema = {
      table:    'books',
      primary:  ['id']
    };
  }

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
