const { Model } = require('@igojs/db');

const schema = {
  table: 'books',
  columns: ['id', 'title', 'author', 'pages', { name: 'published', type: 'boolean' }, 'created_at'],
};

export interface BookRow {
  id: number;
  title: string;
  author: string;
  pages: number;
  published: boolean;
  created_at: Date;
}

class Book extends Model(schema) {}

export default Book;
