

require('../../src/dev/test/init');

const assert    = require('assert');

const Model     = require('../../src/db/Model');
const cache     = require('../../src/cache');

//
describe('db.CachedQuery', function() {

  class Book extends Model({
    table:    'books',
    primary:  ['id'],
    columns: [
      'id',
      'code',
      'title',
      'created_at'
    ],
    cache: {
      ttl: 100
    }
  }) {}

  //
  describe('find', function() {
    
    const key = id => '{"sql":"SELECT `books`.* FROM `books` WHERE `books`.`id` = ? ORDER BY `id` ASC LIMIT ?, ?","params":[' + id + ',0,1]}';

    it('should put rows in cache', async () => {
      const book1 = await Book.create();
      const book  = await Book.find(book1.id);
      assert.strictEqual(book.id, book1.id);
      const rows = await cache.get('_cached.books', key(book1.id));
      assert.notStrictEqual(rows, undefined);
      assert.strictEqual(rows.length, 1);
      assert.strictEqual(rows[0].id, book.id);
    });

    it('should clear cache after update', async () => {
      const book1 = await Book.create();
      await book1.update({ title: 'abc' });
      const rows = await cache.get('_cached.books', key(book1.id));
      assert.strictEqual(rows, null);
    });

  });
});
