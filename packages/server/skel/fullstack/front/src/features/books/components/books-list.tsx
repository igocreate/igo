import type { Book } from '../types';

export function BooksList({ books }: { books: Book[] }) {
  if (books.length === 0) {
    return <p className="text-muted-foreground">Aucun livre pour l'instant.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {books.map((book) => (
        <li key={book.id} className="flex items-baseline justify-between py-3">
          <div>
            <span className="font-medium">{book.title}</span>
            <span className="ml-2 text-muted-foreground">{book.author}</span>
          </div>
          <span className="text-sm text-muted-foreground">{book.pages} pages</span>
        </li>
      ))}
    </ul>
  );
}
