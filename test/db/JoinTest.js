
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
      'title',
      'collection'
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
  describe('join', () => {

    it('should load a book join with its library collection', (done) => {
      Library.create({ collection: 'A' }, (err, library) => {
        Book.create({ library_id: library.id }, (err, book) => {
          Book.join('library', 'collection').find(book.id, (err, book) => {
            assert.strictEqual(book.collection, library.collection);
            done();
          });
        });
      });
    });

    it.only('should load a book join with its library collection with custom select', (done) => {
      Library.create({ title: 'A' }, (err, library) => {
        Book.create({ library_id: library.id }, (err, book) => {
          Book.select('`books`.`id`, `libraries`.`title` AS library_title').join('library').find(book.id, (err, book) => {
            assert.strictEqual(book.library_title, library.title);
            done();
          });
        });
      });
    });

    it('should load a book even if no library', (done) => {
      Book.create({}, (err, book) => {
        Book.select('`books`.`id`, `libraries`.`collection`').join('library').find(book.id, (err, book) => {
          assert(book);
          done();
        });
      });
    });

    it('should join even with has_many', (done) => {
      Library.create({ collection: 'A' }, (err, library) => {
        Book.create({ library_id: library.id, title: 'title' }, (err, book) => {
          Library.join('books', 'title').find(library.id, (err, library) => {
            assert.strictEqual(library.title, book.title);
            done();
          });
        });
      });
    });
  });
});
