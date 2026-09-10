import { useBooks } from '../api';
import { BooksList } from '../components/books-list';
import { AddBookSection } from '../sections/add-book-section';

// Une page assemble. Les états de chargement et d'erreur sont traités
// explicitement, plutôt que laissés à un indicateur qui tourne sans fin.
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
          <p className="mt-4 text-sm text-slate-500">{data.page.total} in total</p>
        </>
      )}
    </>
  );
}

export const Component = BooksPage;
