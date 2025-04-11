require('../../src/dev/test/init');

const assert = require('assert');
const Model = require('../../src/db/Model');

const NB = 10000;

describe('PerfTest', function () {
  const schema = {
    table: 'books',
    primary: ['id'],
    columns: [
      'id',
      'code',
      'title',
      { name: 'details_json', type: 'json', attr: 'details' },
      { name: 'tags_array', type: 'array', attr: 'tags' },
      { name: 'is_available', type: 'boolean' },
      'library_id',
      'created_at'
    ]
  };

  class Book extends Model(schema) {}

  const createBook = async () => {
    await Book.create({
      code: 'AZER',
      title: 'AZER AZERA AZER',
      details: { qsdf: 1234, sdfq: 'azer', qzer: 'AZER YY' },
      tags: ['hello', 'world', 'john'],
      is_available: true
    });
  };

  describe('Write', function () {
    it.skip('should create many objects', async function () {
      const t0 = Date.now();
      for (let i = 0; i < NB; i++) {
        await createBook();
      }
      console.log(`t: ${Date.now() - t0}ms`);
    });
  });

  describe('Read', function () {
    it.skip('should read many objects', async function () {
      for (let i = 0; i < NB; i++) {
        await createBook();
      }

      const t0 = Date.now();
      const books = await Book.list();
      console.log(`t: ${Date.now() - t0}ms`);
      assert.strictEqual(books.length, NB);
    });
  });
});
