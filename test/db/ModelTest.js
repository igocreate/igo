

require('../../src/dev/test/init');

const assert    = require('assert');
const _         = require('lodash');
const async     = require('async');

var Model     = require('../../src/db/Model');

describe('db.Model', function() {

  describe('standard operations', function() {

    var schema = {
      table:    'books',
      primary: ['id'],
      columns: [
        'id',
        'code',
        'title'
      ]
    };

    class Book extends Model(schema) {}

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
        default:  query => query.where({code: 'abc'}),
        a:        query => query.where({code: 'a'}),
      }
    };

    class Book extends Model(schema) {}

    describe('default scope', function() {
      it('should use default scope', function(done) {
        Book.create({code: 'a'}, function(err, first) {
          Book.create({code: 'abc'}, function(err, second) {
            Book.all(function(err, books) {
              assert.equal(books.length, 1);
              done();
            });
          });
        });
      });
    });

    describe('specified scope', function() {
      it('should use a scope', function(done) {
        Book.create({code: 'a'}, function(err, first) {
          Book.create({code: 'abc'}, function(err, second) {
            Book.unscoped().scope('a').list(function(err, books) {
              assert.equal(books.length, 1);
              done();
            });
          });
        });
      });
    });
  });
});
