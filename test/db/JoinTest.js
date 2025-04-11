require('../../src/dev/test/init');
const assert = require('assert');
const Model = require('../../src/db/Model');

describe('includes', () => {

  class Library extends Model({
    table: 'libraries',
    primary: ['id'],
    columns: [
      'id',
      'title',
      'collection'
    ],
    associations: () => ([
      ['has_many', 'books', Book, 'id', 'library_id'],
    ])
  }) {}

  class Book extends Model({
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
      ['belongs_to', 'library', Library, 'library_id', 'id'],
    ])
  }) {}

  describe('join', () => {

    it('should load a book join with its library collection', async () => {
      const library = await Library.create({ collection: 'A' });
      const book = await Book.create({ library_id: library.id });
      const foundBook = await Book.join('library', 'collection').find(book.id);
      assert.strictEqual(foundBook.collection, library.collection);
    });

    it('should load a book join with its library collection with custom select', async () => {
      const library = await Library.create({ title: 'A' });
      const book = await Book.create({ library_id: library.id });
      const foundBook = await Book
        .select('`books`.`id`, `libraries`.`title` AS library_title')
        .join('library')
        .find(book.id);
      assert.strictEqual(foundBook.library_title, library.title);
    });

    it('should load a book even if no library', async () => {
      const book = await Book.create({});
      const foundBook = await Book
        .select('`books`.`id`, `libraries`.`collection`')
        .join('library')
        .find(book.id);
      assert(foundBook);
    });

    it('should join even with has_many', async () => {
      const library = await Library.create({ collection: 'A' });
      const book = await Book.create({ library_id: library.id, title: 'title' });
      const foundLibrary = await Library
        .join('books', 'title')
        .find(library.id);
      assert.strictEqual(foundLibrary.title, book.title);
    });

  });

});
