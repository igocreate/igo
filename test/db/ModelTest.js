

require('../../src/dev/test/init');

const assert    = require('assert');
const _         = require('lodash');
const async     = require('async');

var Model     = require('../../src/db/Model');

describe('db.Model', function() {
  
  var schema = {
    table:    'books',
    primary: ['id'],
    columns: [
      'id',
      'code',
      'title',
      'library_id'
    ]
  };

  class Book extends Model(schema) {}

  describe('standard operations', function() {

    //
    describe('insert', function() {

      it('should insert a book', function(done) {
        Book.create(function(err, book) {
          assert(book && book.id);
          done();
        });
      });
    });

    //
    describe('find', function() {
      it('should find book by id', function(done) {
        Book.create(function(err, first) {
          Book.find(first.id, function(err, book) {
            assert.equal(book.id, first.id);
            done();
          });
        });
      });

      it('should not find book if id is null', function(done) {
        Book.create(function(err, first) {
          Book.find(null, function(err, book) {
            assert.equal(book, null);
            done();
          });
        });
      });
    });

    //
    describe('list', function() {
      it('should handle empty arrays in where conditions', function(done) {
        Book.where({id: []}).list(function(err, books) {
          assert.equal(0, books.length);
          done();
        });
      });

      it('should handle 1k elements', function(done) {
        const nb = 1000;
        async.timesSeries(nb, function(n, next) {
          Book.create(next);
        }, function(err, books) {
          assert.equal(nb, books.length);
          Book.list(function(err, books) {
            assert.equal(nb, books.length);
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
                assert.equal(first.id, book.id);
                assert.equal('hi', hibook.title);
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
        Book.create(function(err, first) {
          Book.create(function() {
            Book.create(function(err, last) {
              Book.unscoped().last(function(err, book) {
                assert.equal(last.id, book.id);
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
            Book.create(function(err, last) {
              Book.destroy(first.id, function(err) {
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
        Book.create({ code: '123' }, function(err, first) {
          Book.create({ code: '123' }, function() {
            Book.create(function(err, last) {
              Book.where({ code: '123' }).destroy(function(err) {
                Book.all(function(err, books) {
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
        Book.create({ code: '123' }, function(err, first) {
          Book.create({ code: '123' }, function(err, second) {
            Book.create(function(err, last) {
              Book.where({ code: '123' }).update({ title: 'undeuxtrois'}, function(err) {
                assert(!err);
                Book.where({ title: 'undeuxtrois'}).list(function(err, books) {
                  assert.equal(books.length, 2);
                  done();
                });
              });
            });
          });
        });
      });

      it('should update all books', function(done) {
        Book.create({ code: '123' }, function(err, first) {
          Book.create({ code: '123' }, function(err, second) {
            Book.create(function(err, last) {
              Book.update({ title: 'undeuxtrois'}, function(err) {
                assert(!err);
                Book.where({ title: 'undeuxtrois'}).list(function(err, books) {
                  assert.equal(books.length, 3);
                  done();
                });
              });
            });
          });
        });
      });

      it('should load distinct codes', function(done) {
        Book.create({ code: '000' }, function(err, first) {
          Book.create({ code: '111' }, function(err, second) {
            Book.create({ code: '111' }, function(err, third) {
              Book.distinct('code').list(function(err, codes) {
                assert(!err);
                assert.equal(codes.length, 2);
                done();
              });
            });
          });
        });
      });

      it('should load distinct codes and titles', function(done) {
        Book.create({ code: '000' }, function(err, first) {
          Book.create({ code: '111', title: '111' }, function(err, second) {
            Book.create({ code: '111', title: '111' }, function(err, third) {
              Book.create({ code: '222', title: '111' }, function(err, last) {
                Book.where({title: '111' }).distinct([ 'code', 'title' ]).list(function(err, res) {
                  assert(!err);
                  assert.equal(res.length, 2);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  describe('instance operations', function() {

    describe('destroy', function() {
      it('should destroy a book', function(done) {
        Book.create(function(err, first) {
          Book.create(function() {
            Book.create(function(err, last) {
              last.destroy(function(err) {
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
          book.update({ code: 'hop' }, function(err, book) {
            book.reload(function(err, book) {
              assert.equal(book.code, 'hop');
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
        'title'
      ],
      scopes: {
        default:  query => query.where({ code: 'abc' }),
        a:        query => query.where({ code: 'a' }),
      }
    };

    class BookWithScopes extends Model(schema) {}

    describe('default scope', function() {
      it('should use default scope', function(done) {
        BookWithScopes.create({code: 'a'}, function(err, first) {
          BookWithScopes.create({code: 'abc'}, function(err, second) {
            BookWithScopes.all(function(err, books) {
              assert.equal(books.length, 1);
              done();
            });
          });
        });
      });
    });

    describe('specified scope', function() {
      it('should use a scope', function(done) {
        BookWithScopes.create({code: 'a'}, function(err, first) {
          BookWithScopes.create({code: 'abc'}, function(err, second) {
            BookWithScopes.unscoped().scope('a').list(function(err, books) {
              assert.equal(books.length, 1);
              done();
            });
          });
        });
      });
    });
  });


  describe('includes', function() {

    var schema = {
      table:    'libraries',
      primary: ['id'],
      columns: [
        'id',
        'title'
      ],
      associations: [
        ['has_many', 'books', Book, 'id', 'library_id'],
      ]
    };
  
    class Library extends Model(schema) {}


    it('should find a library with its books', function(done) {
      Library.create(function(err, library) {
        Book.create({ library_id: library.id }, function(err, book) {
          Book.create({ library_id: library.id }, function(err, book) {
            Library.includes('books').find(library.id, function(err, library) {
              assert.equal(library.books.length, 2);
              done();
            });
          });
        });
      });
    });
    
  });
});
