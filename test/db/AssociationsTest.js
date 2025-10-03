require('../../src/dev/test/init');
const assert = require('assert');
const Model = require('../../src/db/Model');

describe('includes', () => {

  class Library extends Model {
    static schema = {
      table: 'libraries',
      primary: ['id'],
      columns: [
        'id',
        'title'
      ],
      associations: () => ([
        ['has_many', 'books', 'Book', 'id', 'library_id'],
      ])
    };
  }

  class Book extends Model {
    static schema = {
      table: 'books',
      primary: ['id'],
      columns: [
        'id',
        'code',
        'title',
        { name: 'details_json', type: 'json', attr: 'details' },
        { name: 'is_available', type: 'boolean' },
        'library_id',
        'created_at'
      ],
      associations: () => ([
        ['belongs_to', 'library', 'Library', 'library_id', 'id'],
      ])
    };
  }

  describe('belongs_to', () => {

    it('should find a book with its library', async () => {
      const library = await Library.create();
      const book = await Book.create({ library_id: library.id });
      const foundBook = await Book.includes('library').find({id: book.id});
      assert(foundBook.library);
      assert.strictEqual(foundBook.library.id, library.id);
    });

    it('should set association to null if wrong id', async () => {
      await Library.create();
      const book = await Book.create({ library_id: 99999 });
      const foundBook = await Book.includes('library').find(book.id);
      assert.strictEqual(foundBook.library, null);
    });

    it('should list books with their libraries', async () => {
      const library = await Library.create();
      const library2 = await Library.create();
      await Book.create({ library_id: library.id });
      await Book.create({ library_id: library2.id });
      const books = await Book.includes('library').list();
      assert.strictEqual(books.length, 2);
      assert.strictEqual(books[0].library.id, library.id);
      assert.strictEqual(books[1].library.id, library2.id);
    });
  });

  describe('has_many', () => {

    class Library extends Model {
      static schema = {
        table: 'libraries',
        primary: ['id'],
        columns: ['id', 'title'],
        associations: () => [
          ['has_many', 'books', 'Book', 'id', 'library_id'],
        ]
      };
    }

    it('should find a library with its books', async () => {
      const library = await Library.create();
      await Book.create({ library_id: library.id });
      await Book.create({ library_id: library.id });
      const foundLibrary = await Library.includes('books').find(library.id);
      assert.strictEqual(foundLibrary.books.length, 2);
    });

    it('should return an empty array if ref null', async () => {
      const library = await Library.create();
      await Book.create({ library_id: null });
      const foundLibrary = await Library.includes('books').find(library.id);
      assert(Array.isArray(foundLibrary.books));
      assert.strictEqual(foundLibrary.books.length, 0);
    });

    it('should return an empty array if wrong id', async () => {
      const library = await Library.create();
      await Book.create({ library_id: 99999 });
      const foundLibrary = await Library.includes('books').find(library.id);
      assert(Array.isArray(foundLibrary.books));
      assert.strictEqual(foundLibrary.books.length, 0);
    });

    it('should list libraries with their books', async () => {
      const library = await Library.create();
      const library2 = await Library.create();
      await Book.create({ library_id: library.id });
      await Book.create({ library_id: library.id });
      await Book.create({ library_id: library2.id });
      const libraries = await Library.includes('books').list();
      assert.strictEqual(libraries[0].books.length, 2);
      assert.strictEqual(libraries[1].books.length, 1);
    });

    it('should handle default [] values correctly', async () => {
      await Library.create();
      await Library.create();
      const libraries = await Library.includes('books').list();
      libraries[0].books.push({ hello: 'world' });
      assert.strictEqual(libraries[0].books.length, 1);
      assert.strictEqual(libraries[1].books.length, 0);
    });

    class Library2 extends Model {
      static schema = {
        table: 'libraries',
        primary: ['id'],
        columns: ['id', 'title'],
        associations: () => [
          ['has_many', 'books', 'Book', 'id', 'library_id'],
        ],
        scopes: {
          default: q => q.includes('books')
        }
      };
    }

    // it.only('should ignore associations for inserts', async () => {
    //   const err = await Library2.create();
    //   assert(!err);
    // });

    it('should ignore associations for updates', async () => {
      const library = await Library2.create();
      assert(library);
    });
  });

  describe('has_many from array', () => {

    class Library extends Model {
      static schema = {
        table: 'libraries',
        primary: ['id'],
        columns: [
          'id',
          'title',
          { name: 'books_ids_json', type: 'json', attr: 'books_ids' },
        ],
        associations: () => [
          ['has_many', 'books', 'Book', 'books_ids', 'id'],
        ]
      };
    }

    it('should find a library with its books', async () => {
      const book1 = await Book.create();
      const book2 = await Book.create();
      const library = await Library.create({ books_ids: [book1.id, book2.id] });
      const foundLibrary = await Library.includes('books').find(library.id);
      assert.strictEqual(foundLibrary.books.length, 2);
      assert.strictEqual(foundLibrary.books[0].id, book1.id);
    });

    it('should return an empty array if ref null', async () => {
      const book1 = await Book.create();
      const book2 = await Book.create();
      const library = await Library.create({ books_ids: null });
      const foundLibrary = await Library.includes('books').find(library.id);
      assert(Array.isArray(foundLibrary.books));
      assert.strictEqual(foundLibrary.books.length, 0);
    });

    it('should return an empty array if wrong id', async () => {
      const book1 = await Book.create();
      const book2 = await Book.create();
      const library = await Library.create({ books_ids: [99999] });
      const foundLibrary = await Library.includes('books').find(library.id);
      assert(Array.isArray(foundLibrary.books));
      assert.strictEqual(foundLibrary.books.length, 0);
    });

    it('should list libraries with their books (2)', async () => {
      const book1 = await Book.create();
      const book2 = await Book.create();
      const book3 = await Book.create();
      await Library.create({ books_ids: [book1.id] });
      await Library.create({ books_ids: [book1.id, book2.id, book3.id] });
      const libraries = await Library.includes('books').list();
      assert.strictEqual(libraries[0].books.length, 1);
      assert.strictEqual(libraries[1].books.length, 3);
    });

    it('should include associations on reload', async () => {
      const library = await Library.create();
      const book = await Book.create({ library_id: library.id });
      const reloadedBook = await book.reload('library');
      assert.strictEqual(reloadedBook.library.id, library.id);
    });
  });

  describe('scopes', () => {

    it('should merge default scope with string include', async () => {
      class Library2 extends Model {
        static schema = {
          table: 'libraries',
          primary: ['id'],
          columns: [
            'id',
            'title'
          ],
          associations: () => ([
            ['has_many', 'books', 'Book', 'id', 'library_id'],
          ]),
          scopes: {
            default: q => q.includes('books')
          }
        };
      }

      const library = await Library2.create();
      await Book.create({ library_id: library.id });
      const libraries = await Library2.includes({ books: 'library' }).list();
      assert.strictEqual(libraries.length, 1);
      assert.strictEqual(libraries[0].books.length, 1);
      assert.strictEqual(libraries[0].books[0].library.id, library.id);
    });

    it('should merge default scope with object include', async () => {
      class Library2 extends Model {
        static schema = {
          table: 'libraries',
          primary: ['id'],
          columns: [
            'id',
            'title'
          ],
          associations: () => ([
            ['has_many', 'books', 'Book', 'id', 'library_id'],
          ]),
          scopes: {
            default: q => q.includes({ books: 'library' })
          }
        };
      }

      const library = await Library2.create();
      await Book.create({ library_id: library.id });
      const libraries = await Library2.includes('books').list();
      assert.strictEqual(libraries.length, 1);
      assert.strictEqual(libraries[0].books.length, 1);
      assert.strictEqual(libraries[0].books[0].library.id, library.id);
    });

    it('should override default scope with 2-levels object includes', async () => {
      class Library2 extends Model {
        static schema = {
          table: 'libraries',
          primary: ['id'],
          columns: [
            'id',
            'title'
          ],
          associations: () => ([
            ['has_many', 'books', 'Book', 'id', 'library_id'],
          ]),
          scopes: {
            default: q => q.includes({ books: 'library' })
          }
        };
      }

      const library = await Library2.create();
      await Book.create({ library_id: library.id });
      const libraries = await Library2.includes({ books: { library: 'books' } }).list();
      assert.strictEqual(libraries.length, 1);
      assert.strictEqual(libraries[0].books.length, 1);
      assert.strictEqual(libraries[0].books[0].library.id, library.id);
      assert.strictEqual(libraries[0].books[0].library.books.length, 1);
    });

    it('should override default scope with 4-levels object includes', async () => {
      class Library2 extends Model {
        static schema = {
          table: 'libraries',
          primary: ['id'],
          columns: [
            'id',
            'title'
          ],
          associations: () => ([
            ['has_many', 'books', 'Book', 'id', 'library_id'],
          ]),
          scopes: {
            default: q => q.includes({ books: { library: { books: 'library' } } })
          }
        };
      }

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
