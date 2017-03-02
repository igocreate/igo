

require('../../src/dev/test/init');

var assert    = require('assert');
var _         = require('lodash');

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
