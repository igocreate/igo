

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
    
    const key = id => '{"sql":"SELECT `books`.* FROM `books` WHERE `id` = ? ORDER BY `id` ASC LIMIT ?, ?","params":[' + id + ',0,1]}';

    it('should put rows in cache', function(done) {
      Book.create((err, book1) => {
        Book.find(book1.id, (err, book) => {
          assert.strictEqual(book.id, book1.id);
          setTimeout(() => {
            cache.get('_cached.books', key(book1.id), (err, rows) => {
              assert.notStrictEqual(rows, undefined);
              assert.strictEqual(rows.length, 1);
              assert.strictEqual(rows[0].id, book.id);
              done();
            });
          }, 100);
        });
      });
    });

    it('should clear cache after update', function(done) {
      Book.create((err, book1) => {
        book1.update({ title: 'abc' }, () => {
          cache.get('_cached.books', key(book1.id), (err, rows) => {
            assert.strictEqual(rows, undefined);
            done();
          });
        });
      });
    });
  });
});
