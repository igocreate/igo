
const { Model } = require('@igojs/db');

const schema = {
  table:   'books',
  columns: [
    'id',
    'title',
    'author',
    'pages',
    { name: 'published', type: 'boolean' },
    'created_at',
  ],
};

class Book extends Model(schema) {
}

module.exports = Book;
