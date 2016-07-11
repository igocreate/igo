

require('../../src/dev/test/init');

var assert    = require('assert');
var _         = require('lodash');

var Model     = require('../../src/db/Model');

describe('db.Model', function() {

  var model = function() {
    this.init = function() {
      this._initialized = true;
    };
  };

  var schema = {
    table:    'books',
    columns: [
      'id',
      'code',
      'title'
    ]
  };

  var Book = new Model(model, schema);

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
        Book.create(function() {
          Book.create(function() {
            Book.first(function(err, book) {
              assert.equal(first.id, book.id);
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
            Book.last(function(err, book) {
              assert.equal(last.id, book.id);
              done();
            });
          });
        });
      });
    });
  });
});
