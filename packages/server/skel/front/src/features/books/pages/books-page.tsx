import { useBooks } from '../api';
import { BooksList } from '../components/books-list';
import { AddBookSection } from '../sections/add-book-section';

// A page assembles. Loading and error states are handled explicitly rather
// than left to a spinner that never resolves.
export function BooksPage() {
  const { data, isPending, isError, error } = useBooks();

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Books</h1>

      <AddBookSection />

      {isPending && <p className="text-slate-500">Loading…</p>}
      {isError && (
        <p role="alert" className="text-red-600">
          {error.message}
        </p>
      )}
      {data && (
        <>
          <BooksList books={data.books} />
          <p className="mt-4 text-sm text-slate-400">{data.page.total} in total</p>
        </>
      )}
    </>
  );
}

export const Component = BooksPage;
