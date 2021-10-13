

require('../../src/dev/test/init');

const assert    = require('assert');
const async     = require('async');

const Model     = require('../../src/db/Model');

const NB        = 10000;

describe('PerfTest', function() {

  const schema = {
    table:    'books',
    primary:  ['id'],
    columns: [
      'id',
      'code',
      'title',
      {name: 'details_json', type: 'json', attr: 'details'},
      {name: 'tags_array', type: 'array', attr: 'tags'},
      {name:'is_available', type: 'boolean'},
      'library_id',
      'created_at'
    ],
  };
  class Book extends Model(schema) {}

  const createBook = (n, next) => {
    Book.create({
      code: 'AZER',
      title: 'AZER AZERA AZER',
      details: { qsdf: 1234, sdfq: 'azer', qzer: 'AZER YY' },
      tags: [ 'hello', 'world', 'john' ],
      is_available: true
    }, next);
  };


  describe('Write', function() {
    it.skip('should create many objects', function(done) {
      const t0 = Date.now();
      async.times(NB, createBook, () => {
        console.log(`t: ${Date.now() - t0}ms`);
        done();
      });
    });
  });


  describe('Read', function() {
    it.skip('should read many objects', function(done) {
      async.times(NB, createBook, () => {
        const t0 = Date.now();
        Book.list((err, books) => {
          console.log(`t: ${Date.now() - t0}ms`);
          assert.strictEqual(books.length, NB);
          done();
        });
      });
    });
    
  });

  
});
