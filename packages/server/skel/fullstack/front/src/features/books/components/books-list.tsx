import type { Book } from '../types';

// Pur : tout arrive par les props. Pas de useQuery ici — voir la règle
// d'injection des données dans les conventions du front.
export function BooksList({ books }: { books: Book[] }) {
  if (books.length === 0) {
    return <p className="text-slate-500">No book yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-200">
      {books.map((book) => (
        <li key={book.id} className="flex items-baseline justify-between py-3">
          <div>
            <span className="font-medium">{book.title}</span>
            <span className="ml-2 text-slate-500">{book.author}</span>
          </div>
          <span className="text-sm text-slate-400">{book.pages} pages</span>
        </li>
      ))}
    </ul>
  );
}
