

require('../../src/dev/test/init');

const assert    = require('assert');

const Model       = require('../../src/db/Model');
const CacheStats  = require('../../src/db/CacheStats');

//
describe('db.CacheStats', function() {

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
  describe('getStats', function() {
  
    it('should save stats in cache', function(done) {
      Book.create((err, book1) => {
        Book.find(book1.id, () => {
          setTimeout(() => {
            CacheStats.getStats((err, stats) => {
              assert.strictEqual(stats.length, 1);
              assert.strictEqual(stats[0].hits, 1);
              assert.strictEqual(stats[0].total, 2);
              assert.strictEqual(stats[0].table, 'books');
              done();
            });  
          }, 100);
        });
      });
    });
  });
});
