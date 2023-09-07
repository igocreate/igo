
require('../../src/dev/test/init');
const assert    = require('assert');
const Model     = require('../../src/db/Model');

//
describe('includes', () => {

  class Library extends Model({
    table: 'libraries',
    primary: ['id'],
    columns: [
      'id',
      'title'
    ],
    associations: () => ([
      ['has_many', 'books', Book, 'id', 'library_id'],
    ])
  }) {}

  class Book extends Model({
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
    ],
    associations: () => ([
      ['belongs_to', 'library', Library, 'library_id', 'id'],
    ])
  }) {}


  //
  describe('belongs_to', () => {

    it('should find a book with its library', (done) => {
      Library.create((err, library) => {
        Book.create({ library_id: library.id }, (err, book) => {
          Book.includes('library').find(book.id, (err, book) => {
            assert(book.library);
            assert.strictEqual(book.library.id, library.id);
            done();
          });
        });
      });
    });

    it('should set association to null if wrong id', (done) => {
      Library.create(() => {
        Book.create({ library_id: 99999 }, (err, book) => {
          Book.includes('library').find(book.id, (err, book) => {
            assert.strictEqual(book.library, null);
            done();
          });
        });
      });
    });

    it('should list books with their libraries', (done) => {
      Library.create((err, library) => {
        Library.create((err, library2) => {
          Book.create({ library_id: library.id }, () => {
            Book.create({ library_id: library2.id }, () => {
              Book.includes('library').list((err, books) => {
                assert.strictEqual(books.length, 2);
                assert.strictEqual(books[0].library.id, library.id);
                assert.strictEqual(books[1].library.id, library2.id);
                done();
              });
            });
          });
        });
      });
    });
  });

  //
  describe('has_many', () => {

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

    it('should find a library with its books', (done) => {
      Library.create((err, library) => {
        Book.create({ library_id: library.id }, () => {
          Book.create({ library_id: library.id }, () => {
            Library.includes('books').find(library.id, (err, library) => {
              assert.strictEqual(library.books.length, 2);
              done();
            });
          });
        });
      });
    });

    it('should return an empty array if ref null', (done) => {
      Library.create((err, library) => {
        Book.create({library_id: null}, () => {
          Library.includes('books').find(library.id, (err, library) => {
            assert(Array.isArray(library.books));
            assert.strictEqual(library.books.length, 0);
            done();
          });
        });
      });
    });

    it('should return an empty array if wrong id', (done) => {
      Library.create((err, library) => {
        Book.create({library_id: 99999}, () => {
          Library.includes('books').find(library.id, (err, library) => {
            assert(Array.isArray(library.books));
            assert.strictEqual(library.books.length, 0);
            done();
          });
        });
      });
    });

    it('should list libraries with their books', (done) => {
      Library.create((err, library) => {
        Library.create((err, library2) => {
          Book.create({library_id: library.id}, () => {
            Book.create({library_id: library.id}, () => {
              Book.create({library_id: library2.id}, () => {
                Library.includes('books').list((err, libraries) => {
                  assert.strictEqual(libraries[0].books.length, 2);
                  assert.strictEqual(libraries[1].books.length, 1);
                  done();
                });
              });
            });
          });
        });
      });
    });

    it('should handle default [] values correctly', (done) => {
      Library.create(() => {
        Library.create(() => {
          Library.includes('books').list((err, libraries) => {
            libraries[0].books.push({hello: 'world'});
            assert.strictEqual(libraries[0].books.length, 1);
            assert.strictEqual(libraries[1].books.length, 0);
            done();
          });
        });
      });
    });

    schema.scopes = {
      default: q => q.includes('books')
    };
    class Library2 extends Model(schema) {}

    it('should ignore associations for inserts', (done) => {
      Library2.create((err) => {
        assert(!err);
        done();
      });
    });

    it('should ignore associations for updates', (done) => {
      Library2.create((err, library) => {
        assert(!err);
        assert(library);
        done();
      });
    });
  });

  //
  describe('has_many from array', () => {

    var schema = {
      table:    'libraries',
      primary: ['id'],
      columns: [
        'id',
        'title',
        {name: 'books_ids_json', type: 'json', attr: 'books_ids'},
      ],
      associations: () => {
        return [
          ['has_many', 'books',  Book, 'books_ids',  'id'],
        ];
      }
    };
    class Library extends Model(schema) {}

    it('should find a library with its books', (done) => {
      Book.create((err, book1) => {
        Book.create((err, book2) => {
          Library.create({books_ids:[book1.id, book2.id]},(err, library) => {
            Library.includes('books').find(library.id, (err, library) => {
              assert.strictEqual(library.books.length, 2);
              assert.strictEqual(library.books[0].id, book1.id);
              done();
            });
          });
        });
      });
    });

    it('should return an empty array if ref null', (done) => {
      Book.create(() => {
        Book.create(() => {
          Library.create({books_ids: null},(err, library) => {
            Library.includes('books').find(library.id, (err, library) => {
              assert(Array.isArray(library.books));
              assert.strictEqual(library.books.length, 0);
              done();
            });
          });
        });
      });
    });

    it('should return an empty array if wrong id', (done) => {
      Book.create(() => {
        Book.create(() => {
          Library.create({books_ids: [99999]},(err, library) => {
            Library.includes('books').find(library.id, (err, library) => {
              assert(Array.isArray(library.books));
              assert.strictEqual(library.books.length, 0);
              done();
            });
          });
        });
      });
    });


    it('should list libraries with their books (2)', (done) => {
      Book.create((err, book1) => {
        Book.create((err, book2) => {
          Book.create((err, book3) => {
            Library.create({books_ids:[book1.id]},() => {
              Library.create({books_ids:[book1.id, book2.id, book3.id]},() => {
                Library.includes('books').list((err, libraries) => {
                  assert.strictEqual(libraries[0].books.length, 1);
                  assert.strictEqual(libraries[1].books.length, 3);
                  done();
                });
              });
            });
          });
        });
      });
    });


    it('should include associations on reload', (done) => {
      Library.create((err, library) => {
        Book.create({ library_id: library.id }, (err, book) => {
          book.reload('library', (err, book) => {
            assert.strictEqual(book.library.id, library.id);
            done();
          });
        });
      });
    });
  });


  describe('scopes', () => {

    it('should merge default scope with string include', async () => {

      class Library2 extends Model({
        table: 'libraries',
        primary: ['id'],
        columns: [
          'id',
          'title'
        ],
        associations: () => ([
          ['has_many', 'books', Book, 'id', 'library_id'],
        ]),
        scopes: {
          default: q => q.includes('books')
        }
      }) {}
      
      const library = await Library2.create();
      await Book.create({ library_id: library.id });
      const libraries = await Library2.includes({ books: 'library' }).list();
      assert.strictEqual(libraries.length, 1);
      assert.strictEqual(libraries[0].books.length, 1);
      assert.strictEqual(libraries[0].books[0].library.id, library.id);
    });

    //
    it('should merge default scope with object include', async () => {

      class Library2 extends Model({
        table: 'libraries',
        primary: ['id'],
        columns: [
          'id',
          'title'
        ],
        associations: () => ([
          ['has_many', 'books', Book, 'id', 'library_id'],
        ]),
        scopes: {
          default: q => q.includes({ books: 'library' })
        }
      }) {}
      
      const library = await Library2.create();
      await Book.create({ library_id: library.id });
      const libraries = await Library2.includes('books').list();
      assert.strictEqual(libraries.length, 1);
      assert.strictEqual(libraries[0].books.length, 1);
      assert.strictEqual(libraries[0].books[0].library.id, library.id);
    });


    //
    it('should override default scope with 2-levels object includes', async () => {

      class Library2 extends Model({
        table: 'libraries',
        primary: ['id'],
        columns: [
          'id',
          'title'
        ],
        associations: () => ([
          ['has_many', 'books', Book, 'id', 'library_id'],
        ]),
        scopes: {
          default: q => q.includes({ books: 'library' })
        }
      }) {}
      
      const library = await Library2.create();
      await Book.create({ library_id: library.id });
      const libraries = await Library2.includes({ books: {library: 'books'} }).list();
      assert.strictEqual(libraries.length, 1);
      assert.strictEqual(libraries[0].books.length, 1);
      assert.strictEqual(libraries[0].books[0].library.id, library.id);
      assert.strictEqual(libraries[0].books[0].library.books.length, 1);
    });

    //
    it('should override default scope with 4-levels object includes', async () => {

      class Library2 extends Model({
        table: 'libraries',
        primary: ['id'],
        columns: [
          'id',
          'title'
        ],
        associations: () => ([
          ['has_many', 'books', Book, 'id', 'library_id'],
        ]),
        scopes: {
          default: q => q.includes({ books: {library: {books: 'library'}}})
        }
      }) {}
      
      const library = await Library2.create();
      await Book.create({ library_id: library.id });
      const libraries = await Library2.includes({ books: 'library' }).list();
      assert.strictEqual(libraries.length, 1);
      assert.strictEqual(libraries[0].books.length, 1);
      assert.strictEqual(libraries[0].books[0].library.id, library.id);
      assert.strictEqual(libraries[0].books[0].library.books.length, 1);
      assert.strictEqual(libraries[0].books[0].library.books[0].library.id, library.id);
    });

  });

});
