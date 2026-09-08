import { useState } from 'react';

import { ApiError } from '@/lib/api-client';

import { useCreateBook } from '../api';

const EMPTY = { title: '', author: '', pages: '' };

// A section owns its mutation. The server is the authority on validity: its
// per-field errors are displayed as they come, without being re-derived here.
export function AddBookSection() {
  const [form, setForm] = useState(EMPTY);
  const createBook = useCreateBook();

  const error = createBook.error instanceof ApiError ? createBook.error : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    createBook.mutate(
      { title: form.title, author: form.author, pages: Number(form.pages) },
      { onSuccess: () => setForm(EMPTY) },
    );
  };

  return (
    <form onSubmit={submit} className="mb-8 space-y-3">
      {(['title', 'author', 'pages'] as const).map((field) => (
        <div key={field}>
          <label className="block text-sm font-medium capitalize" htmlFor={field}>
            {field}
          </label>
          <input
            id={field}
            value={form[field]}
            onChange={(e) => setForm({ ...form, [field]: e.target.value })}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
          {error?.fieldError(field) && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {error.fieldError(field)}
            </p>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={createBook.isPending}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {createBook.isPending ? 'Adding…' : 'Add book'}
      </button>
    </form>
  );
}
