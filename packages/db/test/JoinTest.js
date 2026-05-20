require('./init');
const assert = require('assert');
const Model = require('@igojs/db').Model;

describe('includes', () => {

  class Country extends Model({
    table: 'countries',
    primary: ['id'],
    columns: [
      'id',
      'name',
    ],
    associations: () => ([
      ['has_many', 'cities', City, 'id', 'country_id'],
    ])
  }) {}

  class City extends Model({
    table: 'cities',
    primary: ['id'],
    columns: [
      'id',
      'name',
      'country_id',
    ],
    associations: () => ([
      ['has_many', 'libraries', Library, 'id', 'city_id'],
      ['belongs_to', 'country', Country, 'country_id', 'id'],
    ])
  }) {}

  class Library extends Model({
    table: 'libraries',
    primary: ['id'],
    columns: [
      'id',
      'title',
      'collection',
      'city_id',
      { name: 'details_json', type: 'json', attr: 'details' },
    ],
    associations: () => ([
      ['has_many', 'books', Book, 'id', 'library_id'],
      ['belongs_to', 'city', City, 'city_id', 'id'],
    ]),
    scopes: {
      default: query => query.includes('city')
    }
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
      'original_library_id',
      'created_at'
    ],
    associations: () => ([
      ['belongs_to', 'library', Library, 'library_id', 'id'],
      ['belongs_to', 'original_library', Library, 'original_library_id', 'id'],
    ])
  }) {}

  describe('join', () => {
    it('should load a book join with its library collection', async () => {
      const library   = await Library.create({ title: 'the big library', collection: 'A' });
      const book      = await Book.create({ library_id: library.id });

      const foundBook = await Book.join('library').find(book.id);
      assert.strictEqual(foundBook.id, book.id);
      assert.strictEqual(foundBook.library.collection, library.collection);
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

    it('should load a book join with specified columns, and a filter', async () => {
      const library = await Library.create({ title: 'A' });
      const book = await Book.create({ library_id: library.id });
      const foundBook = await Book.join('library', ['title'])
      .where({ 'library.title': library.title })
      .find(book.id);
      assert.strictEqual(foundBook.library.title, library.title);
    });

    // count with join
    it('should count books with join and where condition', async () => {
      const libraryA = await Library.create({ title: 'A' });
      const libraryB = await Library.create({ title: 'B' });
      await Book.create({ library_id: libraryA.id });
      await Book.create({ library_id: libraryA.id });
      await Book.create({ library_id: libraryB.id });

      const count = await Book.join('library').where('`library`.`title` = \'B\'').count();

      assert.strictEqual(count, 1);
    });

    // cascade joins
    it('should load books with libraries and cities', async () => {
      const city      = await City.create({ name: 'Paris' });
      const library   = await Library.create({ title: 'A', city_id: city.id });
      await Book.create({ library_id: library.id });
      await Book.create({ library_id: library.id });

      const books = await Book.join({library: 'city'}).list();

      assert.strictEqual(books.length, 2);
      assert.strictEqual(books[0].library.city.id, city.id);
    });

    it('should load a book even if no library', async () => {
      const book = await Book.create({});
      const foundBook = await Book.join('library').find(book.id);
      assert(foundBook);
      assert.strictEqual(foundBook.library, null);
    });    

    it('should load a book with a double join', async () => {
      const library         = await Library.create({ title: 'the big library' });
      const originalLibrary = await Library.create({ title: 'the original one' });
      const book            = await Book.create({ library_id: library.id, original_library_id: originalLibrary.id });

      const foundBook = await Book.join(['library', 'original_library']).find(book.id);
      assert.strictEqual(foundBook.id, book.id);
      assert.strictEqual(foundBook.library.title, library.title);
      assert.strictEqual(foundBook.original_library.title, originalLibrary.title);
    });

    it('should load a book with a three-level join', async () => {
      const country = await Country.create({ name: 'France' });
      const city    = await City.create({ name: 'Paris', country_id: country.id });
      const library = await Library.create({ title: 'the big library', city_id: city.id });
      const book    = await Book.create({ library_id: library.id });

      const foundBook = await Book.join({ library: { city: 'country' } }).find(book.id);
      assert.strictEqual(foundBook.id, book.id);
      assert.strictEqual(foundBook.library.city.country.name, country.name);
    });

    it('should load a book and its library with includes city', async () => {
      const city    = await City.create({ name: 'London' });
      const library = await Library.create({ title: 'London Library', city_id: city.id });
      const book    = await Book.create({ library_id: library.id });

      const foundBook = await Book.join('library').includes('library.city').find(book.id);
      assert.strictEqual(foundBook.id, book.id);
      assert.strictEqual(foundBook.library.city.name, city.name);
    });

    it('should load a book and its library with its books', async () => {
      const library = await Library.create({ title: 'London Library' });
      const book    = await Book.create({ library_id: library.id });
      const book2   = await Book.create({ library_id: library.id });

      const foundBook = await Book.join('library').includes('library.books').find(book.id);
      assert.strictEqual(foundBook.id, book.id);
      assert.strictEqual(foundBook.library.books.length, 2);
      assert.strictEqual(foundBook.library.books[0].id, book.id);
      assert.strictEqual(foundBook.library.books[1].id, book2.id);
    });

    it('should load a book and the city\'s libraries (nested includes)', async () => {
      const country = await Country.create({ name: 'France' });
      const city = await City.create({ name: 'Paris', country_id: country.id });
      const library1 = await Library.create({ title: 'Paris Library 1', city_id: city.id });
      const library2 = await Library.create({ title: 'Paris Library 2', city_id: city.id });
      await Library.create({ title: 'Other Library', city_id: null }); // Not associated with Paris
      const book = await Book.create({ library_id: library1.id });

      const foundBook = await Book.join({library: 'city'}).includes('library.city.libraries').find(book.id);

      assert.strictEqual(foundBook.id, book.id);
      assert.strictEqual(foundBook.library.id, library1.id);
      assert.strictEqual(foundBook.library.city.id, city.id);
      assert(Array.isArray(foundBook.library.city.libraries));
      assert.strictEqual(foundBook.library.city.libraries.length, 2);
      assert.strictEqual(foundBook.library.city.libraries[0].id, library1.id);
      assert.strictEqual(foundBook.library.city.libraries[1].id, library2.id);
    });

    it('should load a book join with its library and details', async () => {
      const library   = await Library.create({ title: 'the big library', collection: 'A', details: { description: 'A big library' } });
      const book      = await Book.create({ library_id: library.id });

      const foundBook = await Book.join('library').find(book.id);
      assert.strictEqual(foundBook.id, book.id);
      assert.strictEqual(foundBook.library.collection, library.collection);
      assert.strictEqual(foundBook.library.details.description, library.details.description);
    });

    it('should apply extraWhere conditions on join', async () => {
      class BookWithExtraWhere extends Model({
        table: 'books',
        primary: ['id'],
        columns: [
          'id',
          'code',
          'title',
          'library_id',
        ],
        associations: () => ([
          ['belongs_to', 'library', Library, 'library_id', 'id', { collection: 'A' }],
        ])
      }) {}

      const libraryA = await Library.create({ title: 'Library A', collection: 'A' });
      const libraryB = await Library.create({ title: 'Library B', collection: 'B' });
      const bookA    = await BookWithExtraWhere.create({ library_id: libraryA.id });
      const bookB    = await BookWithExtraWhere.create({ library_id: libraryB.id });

      // Book A should have its library joined (collection = 'A' matches extraWhere)
      const foundBookA = await BookWithExtraWhere.join('library').find(bookA.id);
      assert.strictEqual(foundBookA.id, bookA.id);
      assert.strictEqual(foundBookA.library.id, libraryA.id);

      // Book B should NOT have its library joined (collection = 'B' does not match extraWhere)
      const foundBookB = await BookWithExtraWhere.join('library').find(bookB.id);
      assert.strictEqual(foundBookB.id, bookB.id);
      assert.strictEqual(foundBookB.library, null);
    });

    it('should apply extraWhere with null value as IS NULL on join', async () => {
      class BookWithNullExtraWhere extends Model({
        table: 'books',
        primary: ['id'],
        columns: [
          'id',
          'code',
          'title',
          'library_id',
        ],
        associations: () => ([
          ['belongs_to', 'library', Library, 'library_id', 'id', { collection: null }],
        ])
      }) {}

      const libraryNull = await Library.create({ title: 'Library null', collection: null });
      const libraryA    = await Library.create({ title: 'Library A',    collection: 'A' });
      const bookNull    = await BookWithNullExtraWhere.create({ library_id: libraryNull.id });
      const bookA       = await BookWithNullExtraWhere.create({ library_id: libraryA.id });

      // Library with collection IS NULL should match extraWhere { collection: null }
      const foundBookNull = await BookWithNullExtraWhere.join('library').find(bookNull.id);
      assert.strictEqual(foundBookNull.id, bookNull.id);
      assert.strictEqual(foundBookNull.library?.id, libraryNull.id);

      // Library with collection = 'A' should NOT match extraWhere { collection: null }
      const foundBookA = await BookWithNullExtraWhere.join('library').find(bookA.id);
      assert.strictEqual(foundBookA.id, bookA.id);
      assert.strictEqual(foundBookA.library, null);
    });
  });

  describe('optimized join (page + join)', () => {
    it('should attach joined data in selectFull phase (cloneDeep regression)', async () => {
      const city    = await City.create({ name: 'Paris' });
      const library = await Library.create({ title: 'BNF', city_id: city.id });
      const book    = await Book.create({ library_id: library.id });

      const result = await Book
      .join('library')
      .page(1, 10)
      .list();

      const books = result.rows;
      assert.strictEqual(books.length, 1);
      assert.strictEqual(books[0].id, book.id);
      assert.strictEqual(books[0].library.id, library.id);
      assert.strictEqual(books[0].library.title, 'BNF');
    });

    it('should attach nested joined data in selectFull phase', async () => {
      const city    = await City.create({ name: 'Lyon' });
      const library = await Library.create({ title: 'Municipale', city_id: city.id });
      await Book.create({ library_id: library.id });

      const result = await Book
      .join({ library: 'city' })
      .page(1, 10)
      .list();
      const books = result.rows;

      assert.strictEqual(books.length, 1);
      assert.strictEqual(books[0].library.id, library.id);
      assert.strictEqual(books[0].library.city.id, city.id);
      assert.strictEqual(books[0].library.city.name, 'Lyon');
    });

  });

  describe('auto-activation of optimized mode (page + join)', () => {
    it('should return correct paginated results via optimized path', async () => {
      const library = await Library.create({ title: 'Central' });
      await Book.create({ library_id: library.id, title: 'Book A' });
      await Book.create({ library_id: library.id, title: 'Book B' });
      await Book.create({ title: 'Book C' }); // no library

      const result = await Book
      .where({ library_id: library.id })
      .join('library')
      .page(1, 10)
      .list();

      assert.ok(result.pagination, 'should return pagination object');
      assert.strictEqual(result.pagination.count, 2);
      assert.strictEqual(result.rows.length, 2);
      assert.strictEqual(result.rows[0].library.id, library.id);
      assert.strictEqual(result.rows[0].library.title, 'Central');
    });
  });

});
