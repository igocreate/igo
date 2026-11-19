import { useState } from 'react';
import { z } from 'zod';

import { ApiError } from '@/lib/api-client';

import { useCreateBook } from '../api';
import { NewBook } from '../types';

const EMPTY = { title: '', author: '', pages: '' };
const LABELS = { title: 'Titre', author: 'Auteur', pages: 'Pages' };

type FormErrors = Partial<Record<keyof typeof EMPTY, string[]>>;

// Une section possède sa mutation. Le schéma écarte une saisie mal formée avant
// l'envoi ; ce que seul le serveur peut refuser s'affiche sous le champ qu'il nomme.
export function AddBookSection() {
  const [form, setForm] = useState(EMPTY);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const createBook = useCreateBook();

  const error = createBook.error instanceof ApiError ? createBook.error : null;
  const fieldErrors = error?.problem.errors?.length ? error : null;
  const globalError = createBook.isError && !fieldErrors ? createBook.error : null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = NewBook.safeParse(form);
    if (!parsed.success) {
      createBook.reset();
      setFormErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    setFormErrors({});
    createBook.mutate(parsed.data, { onSuccess: () => setForm(EMPTY) });
  };

  return (
    <form onSubmit={submit} className="mb-8 space-y-3">
      {(['title', 'author', 'pages'] as const).map((field) => {
        const message = formErrors[field]?.[0] ?? fieldErrors?.fieldError(field);
        return (
          <div key={field}>
            <label className="block text-sm font-medium" htmlFor={field}>
              {LABELS[field]}
            </label>
            <input
              id={field}
              value={form[field]}
              inputMode={field === 'pages' ? 'numeric' : undefined}
              aria-invalid={message ? true : undefined}
              aria-describedby={message ? `${field}-error` : undefined}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            />
            {message && (
              <p id={`${field}-error`} role="alert" className="mt-1 text-sm text-red-600">
                {message}
              </p>
            )}
          </div>
        );
      })}

      {globalError && (
        <p role="alert" className="text-sm text-red-600">
          L'ajout a échoué : {globalError.message}
          {error?.traceId && (
            <span className="block text-slate-500">Référence : {error.traceId}</span>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={createBook.isPending}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {createBook.isPending ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  );
}
