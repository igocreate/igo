
require('../../src/dev/test/init');
const assert    = require('assert');
const Model     = require('../../src/db/Model');

//
describe('includes', function() {

  class Library extends Model({table: 'libraries', primary: ['id'], columns: ['id','title']}) {}

  const schema = {
    table:    'books',
    primary: ['id'],
    columns: [
      'id',
      'code',
      'title',
      'details_json',
      'is_available',
      'library_id',
      'created_at'
    ],
    associations: () => ([
       ['belongs_to', 'library', Library, 'library_id', 'id'],
    ])
  };
  class Book extends Model(schema) {};


  //
  describe('belongs_to', function() {

    it('should find a book with its library', function(done) {
      Library.create(function(err, library) {
        Book.create({ library_id: library.id }, function(err, book) {
          Book.includes('library').find(book.id, function(err, book) {
            assert(book.library);
            assert.equal(book.library.id, library.id);
            done();
          });
        });
      });
    });

    it('should set association to null if wrong id', function(done) {
      Library.create(function(err, library) {
        Book.create({ library_id: 99999 }, function(err, book) {
          Book.includes('library').find(book.id, function(err, book) {
            assert.equal(book.library, null);
            done();
          });
        });
      });
    });

    it('should list books with their libraries', function(done) {
      Library.create(function(err, library) {
        Library.create(function(err, library2) {
          Book.create({ library_id: library.id }, function(err, book) {
            Book.create({ library_id: library2.id }, function(err, book) {
              Book.includes('library').list(function(err, books) {
                assert.equal(books.length, 2);
                assert.equal(books[0].library.id, library.id);
                assert.equal(books[1].library.id, library2.id);
                done();
              });
            });
          });
        });
      });
    });
  });

  //
  describe('has_many', function() {

    var schema = {
      table:    'libraries',
      primary: ['id'],
      columns: ['id','title'],
      associations: () => {
        return [
          ['has_many', 'books', Book, 'id', 'library_id'],
        ];
      }
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

    it('should return an empty array if ref null', function(done) {
      Library.create(function(err, library) {
        Book.create({library_id: null}, function(err, book1) {
          Library.includes('books').find(library.id, function(err, library) {
            assert(Array.isArray(library.books));
            assert.equal(library.books.length, 0);
            done();
          });
        });
      });
    });

    it('should return an empty array if wrong id', function(done) {
      Library.create(function(err, library) {
        Book.create({library_id: 99999}, function(err, book1) {
          Library.includes('books').find(library.id, function(err, library) {
            assert(Array.isArray(library.books));
            assert.equal(library.books.length, 0);
            done();
          });
        });
      });
    });

    it('should list libraries with their books', function(done) {
      Library.create(function(err, library) {
        Library.create(function(err, library2) {
          Book.create({library_id: library.id}, function(err, book1) {
            Book.create({library_id: library.id}, function(err, book2) {
              Book.create({library_id: library2.id}, function(err, book3) {
                Library.includes('books').list(function(err, libraries) {
                  assert.equal(libraries[0].books.length, 2);
                  assert.equal(libraries[1].books.length, 1);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

  //
  describe('has_many from array', function() {

    var schema = {
      table:    'libraries',
      primary: ['id'],
      columns: [
        'id',
        'title',
        'books_ids_json',
        // { name: 'books', type: 'json' }
      ],
      associations: () => {
        return [
          ['has_many', 'books',  Book, 'books_ids',  'id'],
        ];
      }
    };
    class Library extends Model(schema) {}

    it('should find a library with its books', function(done) {
      Book.create(function(err, book1) {
        Book.create(function(err, book2) {
          Library.create({books_ids:[book1.id, book2.id]},function(err, library) {
            Library.includes('books').find(library.id, function(err, library) {
              assert.equal(library.books.length, 2);
              assert.equal(library.books[0].id, book1.id);
              done();
            });
          });
        });
      });
    });

    it('should return an empty array if ref null', function(done) {
      Book.create(function(err, book1) {
        Book.create(function(err, book2) {
          Library.create({books_ids: null},function(err, library) {
            Library.includes('books').find(library.id, function(err, library) {
              assert(Array.isArray(library.books));
              assert.equal(library.books.length, 0);
              done();
            });
          });
        });
      });
    });

    it('should return an empty array if wrong id', function(done) {
      Book.create(function(err, book1) {
        Book.create(function(err, book2) {
          Library.create({books_ids: [99999]},function(err, library) {
            Library.includes('books').find(library.id, function(err, library) {
              assert(Array.isArray(library.books));
              assert.equal(library.books.length, 0);
              done();
            });
          });
        });
      });
    });


    it('should list libraries with their books', function(done) {
      Book.create(function(err, book1) {
        Book.create(function(err, book2) {
          Book.create(function(err, book3) {
            Library.create({books_ids:[book1.id]},function(err, library) {
              Library.create({books_ids:[book1.id, book2.id, book3.id]},function(err, library) {
                Library.includes('books').list(function(err, libraries) {
                  assert.equal(libraries[0].books.length, 1);
                  assert.equal(libraries[1].books.length, 3);
                  done();
                });
              });
            });
          });
        });
      });
    });
  });

});
