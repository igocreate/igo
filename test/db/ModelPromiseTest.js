

require('../../src/dev/test/init');

const assert    = require('assert');
const _         = require('lodash');
const async     = require('async');

const Model     = require('../../src/db/Model');

describe('db.Model', () => {

  var schema = {
    table:    'books',
    primary: ['id'],
    columns: [
      'id',
      'code',
      'title',
      {name: 'details_json', type: 'json', attr: 'details'},
      {name:'is_available', type: 'boolean'},
      'library_id',
      'created_at'
    ]
  };

  class Book extends Model(schema) {}

  describe('standard crud operations', () => {

    //
    describe('insert', () => {

      it('should insert a book', async () => {
        const book = await Book.create();
        assert(book && book.id);
      });

      it('should insert a book with values', async () => {
        const book = await Book.create({code: 123});
        assert(book && book.id);
        assert.strictEqual(book.code, '123');
      });

      it('should insert a book with values and go through beforeCreate', async () => {
        class BookWithTitle extends Model(schema) {
          beforeCreate(callback) {
            this.title = this.title || this.code;
            callback();
          }
        }

        const book = await BookWithTitle.create({code: 123});
        assert(book && book.id);
        assert.strictEqual(book.code, '123');
        assert.strictEqual(book.title, '123');
      });

    });

    //
    describe('find', () => {
      it('should find book by id', async () => {
        const first = await Book.create();
        const book  = await Book.find(first.id);
        assert.strictEqual(book.id, first.id);
      });

      it('should not find book if id is null', async () => {
        await Book.create();
        const book  = await Book.find(null);
        assert.strictEqual(book, null);
      });
    });

    //
    describe('list', () => {

      it('should handle empty arrays in where conditions', async () => {
        const books = await Book.where({id: []}).list();
        assert.strictEqual(0, books.length);
      });

      it('should handle 1k elements', async () => {
        const nb = 1000;
        const books = await async.timesSeries(nb, (n, next) => {
          Book.create(next);
        });
        assert.strictEqual(nb, books.length);
        const books2 = await Book.list();
        assert.strictEqual(nb, books2.length);
      });
    });

    //
    describe('first', () => {
      it('should select first book', async () => {
        const first   = await Book.create();
        const hibook  = await Book.create({title: 'hi'});
        await Book.create();
        const book = await Book.unscoped().first();
        assert.strictEqual(first.id, book.id);
        assert.strictEqual('hi', hibook.title);
      });
    });

    //
    describe('last', () => {
      it('should select last book', async () => {
        await Book.create();
        await Book.create();
        const last = await Book.create();
        const book = await Book.unscoped().last();
        assert.strictEqual(last.id, book.id);
      });
    });

    //
    describe('destroy', () => {
      it('should destroy a book', async () => {
        const first = await Book.create();
        await Book.create();
        await Book.create();
        await Book.destroy(first.id);
        const book = await Book.find(first.id);
        assert(!book);
      });

      it('should destroy selected books', async () => {
        await Book.create({ code: '123' });
        await Book.create({ code: '123' });
        await Book.create();
        await Book.where({ code: '123' }).destroy();
        const books = await Book.list();
        assert(books.length, 1);
      });
    });

    //
    describe('update', () => {
      it('should update books', async () => {
        await Book.create({ code: '123' });
        await Book.create({ code: '123' });
        await Book.create();
        await Book.where({ code: '123' }).update({ title: 'undeuxtrois'});
        const books = await Book.where({ title: 'undeuxtrois'}).list();
        assert.strictEqual(books.length, 2);
      });

      it('should update all books', async () => {
        await Book.create({ code: '123' });
        await Book.create({ code: '123' });
        await Book.create();
        await Book.update({ title: 'undeuxtrois'});
        const books = await Book.where({ title: 'undeuxtrois'}).list();
        assert.strictEqual(books.length, 3);
      });

      it('should load distinct codes', async () => {
        await Book.create({ code: '000' });
        await Book.create({ code: '111' });
        await Book.create({ code: '111' });
        const codes = await Book.distinct('code').list();
        assert.strictEqual(codes.length, 2);
      });

      it('should load distinct codes and titles', async () => {
        await Book.create({ code: '000' });
        await Book.create({ code: '111', title: '111' });
        await Book.create({ code: '111', title: '111' });
        await Book.create({ code: '222', title: '111' });
        const res = await Book.where({title: '111' }).distinct([ 'code', 'title' ]).list();
        assert.strictEqual(res.length, 2);
      });
    });

    //
    describe('select', () => {
      it('should use custom select', async () => {
        await Book.create({ code: '123', title: 'title' });
        const books = await Book.select('title').list();
        assert(books[0].title, 'title');
        assert(!books[0].code);
      });

      it('should use custom select', async () => {
        await Book.create({ code: '123', title: 'title' });
        const books = await Book.select('*, EXTRACT(YEAR FROM created_at) AS "year"').list();
        const currentYear = new Date().getFullYear();
        assert(books[0].title, 'title');
        assert(books[0].year, currentYear);
      });
    });

    //
    describe('count', () => {
      it('should count elements', async () => {
        const nb = 100;
        const books = await async.timesSeries(nb, (n, next) => {
          Book.create(next);
        });
        assert.strictEqual(nb, books.length);
        const count = await Book.count();
        assert.strictEqual(nb, count);
      });
    });
  });


  describe('instance operations', () => {

    describe('delete', () => {
      it('should delete a book', async () => {
        await Book.create();
        await Book.create();
        const last = await Book.create();
        await last.destroy();
        const book = await Book.find(last.id);
        assert(!book);
      });
    });

    describe('update', () => {
      it('should update a book', async () => {
        let book = await Book.create();
        book = await book.update({ code: 'hop', hello: 'world' });
        assert.strictEqual(book.code, 'hop');
        assert.notStrictEqual(book.hello, 'world');
        book = await book.reload();
        assert.strictEqual(book.code, 'hop');
      });
    });

  });

  describe('scopes', () => {

    var schema = {
      table:    'books',
      primary:  ['id'],
      columns: [
        'id',
        'code',
        'title',
        {name: 'details_json', type: 'json', attr: 'details'},
        {name:'is_available', type: 'boolean'},
        'library_id',
        'created_at'
      ],
      scopes: {
        default:  query => query.where({ code: 'abc' }),
        a:        query => query.where({ code: 'a' }),
      }
    };

    class BookWithScopes extends Model(schema) {}

    it('should use default scope', async () => {
      await BookWithScopes.create({code: 'a'});
      await BookWithScopes.create({code: 'abc'});
      const books = await BookWithScopes.list();
      assert.strictEqual(books.length, 1);
    });

    it('should use a scope', async () => {
      await BookWithScopes.create({code: 'a'});
      await BookWithScopes.create({code: 'abc'});
      const books = await BookWithScopes.unscoped().scope('a').list();
      assert.strictEqual(books.length, 1);
    });
  });

  describe('count', () => {
    it('should count rows', async () => {
      await async.timesSeries(10, function(n, next) {
        Book.create({ code: 'first' }, next);
      });
      await async.timesSeries(20, function(n, next) {
        Book.create({ code: 'second' }, next);
      });

      let count = await Book.where({code: 'first'}).count();
      assert.strictEqual(count, 10);

      count = await Book.count();
      assert.strictEqual(count, 30);
    });
  });


  describe('group', () => {
    it('should group by code', async () => {
      await async.timesSeries(10, function(n, next) {
        Book.create({ code: 'first' }, next);
      });
      await async.timesSeries(20, function(n, next) {
        Book.create({ code: 'second' }, next);
      });

      const groups = await Book.select('COUNT(*) AS "count", code').group('code').list();
      const firsts  = _.find(groups, {code: 'first'});
      const seconds = _.find(groups, {code: 'second'});
      assert.strictEqual(firsts.count, 10);
      assert.strictEqual(seconds.count, 20);
    });

    it('should group by year', async () => {
      await async.timesSeries(10, function(n, next) {
        Book.create({ code: 'first' }, next);
      });
      await async.timesSeries(20, function(n, next) {
        Book.create({ code: 'second' }, next);
      });

      const groups = await Book.select('COUNT(*) AS "count", EXTRACT(YEAR FROM created_at) AS "year"').group('year').list();
      const currentYear = new Date().getFullYear();
      assert.strictEqual(groups[0].count, 30);
      assert.strictEqual(groups[0].year, currentYear);
    });
  });


  describe('json columns', () => {

    const details = { a: 'hello', b: 'world', c: { d: '!' } };

    it('should stringify on insert', async () => {
      let book = await Book.create({ details });
      assert.strictEqual(book.details.a, 'hello');
      book = await Book.find(book.id);
      assert.strictEqual(book.details.a, 'hello');
    });

    it('should stringify on update', async () => {
      let book = await Book.create({ details });
      book = await book.update({ details: { a: 'world' }});
      assert.strictEqual(book.details.a, 'world');
      book = await Book.find(book.id);
      assert.strictEqual(book.details.a, 'world');
    });

    it('should stringify on global update', async () => {
      let book = await Book.create({ details });
      await Book.update({ details: { a: 'world' }});
      book = await Book.find(book.id);
      assert.strictEqual(book.details.a, 'world');
    });

    it('should parsejson on reload', async () => {
      let book = await Book.create({ details });
      book = await book.reload();
      assert.strictEqual(book.details.a, 'hello');
    });
  });

  describe('bool columns', () => {
    it('should handle true booleans', async () => {
      const book = await Book.create({ is_available: 'true' });
      assert.strictEqual(book.is_available, true);
    });
    it('should handle false booleans', async () => {
      const book = await Book.create({ is_available: '' });
      assert.strictEqual(book.is_available, false);
    });
    it.skip('should let boolean to null', async () => {
      const book = await Book.create({ is_available: null });
      assert.strictEqual(book.is_available, null);
    });
  });


  describe('array columns', () => {
    var schema = {
      table:    'books',
      primary: ['id'],
      columns: [
        'id',
        'code',
        'title',
        {name: 'details_json', type: 'array', attr: 'details'},
        {name:'is_available', type: 'boolean'},
        'library_id',
        'created_at'
      ]
    };
    class Book extends Model(schema) {}

    it('should handle array', async () => {
      const book = await Book.create({ details: [1, 2] });
      assert(Array.isArray(book.details));
      assert.strictEqual(book.details.length, 2);
    });

    it('should handle array', async () => {
      const book = await Book.create({ details: '' });
      assert(Array.isArray(book.details));
      assert.strictEqual(book.details.length, 0);
    });
  });

});
