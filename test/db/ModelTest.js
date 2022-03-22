

require('../../src/dev/test/init');

const assert    = require('assert');
const _         = require('lodash');
const async     = require('async');

const Model     = require('../../src/db/Model');
const { call } = require('file-loader');

describe('db.Model', function() {

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

  describe('standard crud operations', function() {

    //
    describe('insert', function() {

      it('should insert a book', function(done) {
        Book.create(function(err, book) {
          assert(book && book.id);
          done();
        });
      });

      it('should insert a book with values', function(done) {
        Book.create({code: 123}, function(err, book) {
          assert(book && book.id);
          assert.strictEqual(book.code, '123');
          done();
        });
      });

      it('should insert a book with values and go through beforeCreate', function(done) {
        class BookWithTitle extends Model(schema) {
          beforeCreate(callback) {
            this.title = this.title || this.code;
            callback();
          }
        }

        BookWithTitle.create({code: 123}, function(err, book) {
          assert(book && book.id);
          assert.strictEqual(book.code, '123');
          assert.strictEqual(book.title, '123');
          done();
        });
      });

    });

    //
    describe('find', function() {
      it('should find book by id', function(done) {
        Book.create(function(err, first) {
          Book.find(first.id, function(err, book) {
            assert.strictEqual(book.id, first.id);
            done();
          });
        });
      });

      it('should not find book if id is null', function(done) {
        Book.create(function() {
          Book.find(null, function(err, book) {
            assert.strictEqual(book, null);
            done();
          });
        });
      });
    });

    //
    describe('list', function() {
      it('should handle empty arrays in where conditions', function(done) {
        Book.where({id: []}).list(function(err, books) {
          assert.strictEqual(0, books.length);
          done();
        });
      });

      it('should handle 1k elements', function(done) {
        const nb = 1000;
        async.timesSeries(nb, function(n, next) {
          Book.create(next);
        }, function(err, books) {
          assert.strictEqual(nb, books.length);
          Book.list(function(err, books) {
            assert.strictEqual(nb, books.length);
            done();
          });
        });
      });
    });

    //
    describe('first', function() {
      it('should select first book', function(done) {
        Book.create(function(err, first) {
          Book.create({title: 'hi'}, function(err, hibook) {
            Book.create(function() {
              Book.unscoped().first(function(err, book) {
                assert.strictEqual(first.id, book.id);
                assert.strictEqual('hi', hibook.title);
                done();
              });
            });
          });
        });
      });
    });

    //
    describe('last', function() {
      it('should select last book', function(done) {
        Book.create(function() {
          Book.create(function() {
            Book.create(function(err, last) {
              Book.unscoped().last(function(err, book) {
                assert.strictEqual(last.id, book.id);
                done();
              });
            });
          });
        });
      });
    });

    //
    describe('destroy', function() {
      it('should destroy a book', function(done) {
        Book.create(function(err, first) {
          Book.create(function() {
            Book.create(function() {
              Book.destroy(first.id, function() {
                Book.find(first.id, function(err, book) {
                  assert(!err);
                  assert(!book);
                  done();
                });
              });
            });
          });
        });
      });

      it('should destroy selected books', function(done) {
        Book.create({ code: '123' }, function() {
          Book.create({ code: '123' }, function() {
            Book.create(function() {
              Book.where({ code: '123' }).destroy(function() {
                Book.list(function(err, books) {
                  assert(books.length, 1);
                  done();
                });
              });
            });
          });
        });
      });
    });

    //
    describe('update', function() {
      it('should update books', function(done) {
        Book.create({ code: '123' }, function() {
          Book.create({ code: '123' }, function() {
            Book.create(function() {
              Book.where({ code: '123' }).update({ title: 'undeuxtrois'}, function(err) {
                assert(!err);
                Book.where({ title: 'undeuxtrois'}).list(function(err, books) {
                  assert.strictEqual(books.length, 2);
                  done();
                });
              });
            });
          });
        });
      });

      it('should update all books', function(done) {
        Book.create({ code: '123' }, function() {
          Book.create({ code: '123' }, function() {
            Book.create(function() {
              Book.update({ title: 'undeuxtrois'}, function(err) {
                assert(!err);
                Book.where({ title: 'undeuxtrois'}).list(function(err, books) {
                  assert.strictEqual(books.length, 3);
                  done();
                });
              });
            });
          });
        });
      });

      it('should load distinct codes', function(done) {
        Book.create({ code: '000' }, function() {
          Book.create({ code: '111' }, function() {
            Book.create({ code: '111' }, function() {
              Book.distinct('code').list(function(err, codes) {
                assert(!err);
                assert.strictEqual(codes.length, 2);
                done();
              });
            });
          });
        });
      });

      it('should load distinct codes and titles', function(done) {
        Book.create({ code: '000' }, function() {
          Book.create({ code: '111', title: '111' }, function() {
            Book.create({ code: '111', title: '111' }, function() {
              Book.create({ code: '222', title: '111' }, function() {
                Book.where({title: '111' }).distinct([ 'code', 'title' ]).list(function(err, res) {
                  assert(!err);
                  assert.strictEqual(res.length, 2);
                  done();
                });
              });
            });
          });
        });
      });
    });

    //
    describe('select', function() {
      it('should use custom select', function(done) {
        Book.create({ code: '123', title: 'title' }, function() {
          Book.select('title').list(function(err, books) {
            assert(!err);
            assert(books[0].title, 'title');
            assert(!books[0].code);
            done();
          });
        });
      });

      it('should use custom select', function(done) {
        Book.create({ code: '123', title: 'title' }, function() {
          Book.select('*, EXTRACT(YEAR FROM created_at) AS "year"').list(function(err, books) {
            const currentYear = new Date().getFullYear();
            assert(!err);
            assert(books[0].title, 'title');
            assert(books[0].year, currentYear);
            done();
          });
        });
      });
    });

    //
    describe('count', function() {
      it('should count elements', function(done) {
        const nb = 100;
        async.timesSeries(nb, function(n, next) {
          Book.create(next);
        }, function(err, books) {
          assert.strictEqual(nb, books.length);
          Book.count(function(err, count) {
            assert.strictEqual(nb, count);
            done();
          });
        });
      });
    });
  });


  describe('instance operations', function() {

    describe('destroy', function() {
      it('should destroy a book', function(done) {
        Book.create(function() {
          Book.create(function() {
            Book.create(function(err, last) {
              last.destroy(function() {
                Book.find(last.id, function(err, book) {
                  assert(!err);
                  assert(!book);
                  done();
                });
              });
            });
          });
        });
      });
    });

    describe('update', function() {
      it('should update a book', function(done) {
        Book.create(function(err, book) {
          book.update({ code: 'hop', hello: 'world' }, function(err, book) {
            book.reload(function(err, book) {
              assert.strictEqual(book.code, 'hop');
              done();
            });
          });
        });
      });
    });

  });

  describe('scopes', function() {

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

    describe('default scope', function() {
      it('should use default scope', function(done) {
        BookWithScopes.create({code: 'a'}, function() {
          BookWithScopes.create({code: 'abc'}, function() {
            BookWithScopes.list(function(err, books) {
              assert.strictEqual(books.length, 1);
              done();
            });
          });
        });
      });
    });

    describe('specified scope', function() {
      it('should use a scope', function(done) {
        BookWithScopes.create({code: 'a'}, function() {
          BookWithScopes.create({code: 'abc'}, function() {
            BookWithScopes.unscoped().scope('a').list(function(err, books) {
              assert.strictEqual(books.length, 1);
              done();
            });
          });
        });
      });
    });
  });

  describe('count', function() {
    it('should count rows', function(done) {
      async.timesSeries(10, function(n, next) {
        Book.create({ code: 'first' }, next);
      }, function() {
        async.timesSeries(20, function(n, next) {
          Book.create({ code: 'second' }, next);
        }, function() {

          Book.where({code: 'first'}).count(function(err, count) {
            assert.strictEqual(count, 10);

            Book.count(function(err, count) {
              assert.strictEqual(count, 30);

              done();
            });
          });
        });
      });
    });
  });


  describe('group', function() {
    it('should group by code', function(done) {
      async.timesSeries(10, function(n, next) {
        Book.create({ code: 'first' }, next);
      }, function() {
        async.timesSeries(20, function(n, next) {
          Book.create({ code: 'second' }, next);
        }, function() {

          Book.select('COUNT(*) AS "count", code').group('code').list(function(err, groups) {
            const firsts  = _.find(groups, {code: 'first'});
            const seconds = _.find(groups, {code: 'second'});
            assert.strictEqual(firsts.count, 10);
            assert.strictEqual(seconds.count, 20);
            // [{ count: 10, code: 'first' },
            //  { count: 20, code: 'second' }]
            done();
          });
        });
      });
    });

    it('should group by year', function(done) {
      async.timesSeries(10, function(n, next) {
        Book.create({ code: 'first' }, next);
      }, function() {
        async.timesSeries(20, function(n, next) {
          Book.create({ code: 'second' }, next);
        }, function() {

          Book.select('COUNT(*) AS "count", EXTRACT(YEAR FROM created_at) AS "year"').group('year').list(function(err, groups) {
            const currentYear = new Date().getFullYear();
            assert.strictEqual(groups[0].count, 30);
            assert.strictEqual(groups[0].year, currentYear);
            //[ { count: 30, year: 2018 } ]
            done();
          });
        });
      });
    });
  });


  describe('json columns', function() {

    const details = { a: 'hello', b: 'world', c: { d: '!' } };

    it('should stringify on insert', function(done) {
      Book.create({ details }, (err, book) => {
        assert.strictEqual(book.details.a, 'hello');
        Book.find(book.id, (err, book) => {
          assert.strictEqual(book.details.a, 'hello');
          done();
        });
      });
    });

    it('should stringify on update', function(done) {
      Book.create({ details }, (err, book) => {
        book.update({ details: { a: 'world' }}, (err, book) => {
          assert.strictEqual(book.details.a, 'world');
          Book.find(book.id, (err, book) => {
            assert.strictEqual(book.details.a, 'world');
            done();
          });
        });
      });
    });

    it('should stringify on global update', function(done) {
      Book.create({ details }, (err, book) => {
        Book.update({ details: { a: 'world' }}, () => {
          Book.find(book.id, (err, book) => {
            assert.strictEqual(book.details.a, 'world');
            done();
          });
        });
      });
    });

    it('should parsejson on reload', function(done) {
      Book.create({ details }, (err, book) => {
        book.reload((err, book) => {
          assert.strictEqual(book.details.a, 'hello');
          done();
        });
      });
    });
  });

  describe('bool columns', function() {
    it('should handle true booleans', function(done) {
      Book.create({ is_available: 'true' }, (err, book) => {
        assert.strictEqual(book.is_available, true);
        done();
      });
    });
    it('should handle false booleans', function(done) {
      Book.create({ is_available: '' }, (err, book) => {
        assert.strictEqual(book.is_available, false);
        done();
      });
    });
    it.skip('should let boolean to null', function(done) {
      Book.create({ is_available: null }, (err, book) => {
        assert.strictEqual(book.is_available, null);
        done();
      });
    });
  });

  describe('array columns', function() {

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

    it('should handle array', function(done) {
      Book.create({ details: [1, 2] }, (err, book) => {
        assert(Array.isArray(book.details));
        assert.strictEqual(book.details.length, 2);
        done();
      });
    });

    it('should handle array', function(done) {
      Book.create({ details: '' }, (err, book) => {
        assert(Array.isArray(book.details));
        assert.strictEqual(book.details.length, 0);
        done();
      });
    });
  });

  

});
