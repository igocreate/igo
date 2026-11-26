import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { TextField } from '@/components/form/text-field';
import { ApiError } from '@/lib/api-client';
import { applyFieldErrors } from '@/lib/form';

import { useCreateBook } from '../api';
import { NewBook } from '../schemas';

type NewBookValues = z.input<typeof NewBook>;

// Une section possède sa mutation. Le schéma écarte une saisie mal formée avant
// l'envoi ; ce que seul le serveur peut refuser s'affiche sous le champ qu'il nomme.
export function AddBookSection() {
  const createBook = useCreateBook();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<NewBookValues>({
    resolver: zodResolver(NewBook),
    // L'erreur apparaît quand on quitte le champ, et non à la première frappe
    // d'un champ qu'on est en train de remplir ; ensuite elle suit la saisie.
    mode: 'onTouched',
    defaultValues: { title: '', author: '', pages: '' },
  });

  // Une erreur qui ne nomme aucun champ n'a pas d'endroit où s'afficher : elle
  // revient ici.
  const globalError = createBook.error instanceof ApiError ? createBook.error : null;

  // `mutateAsync` rejette sur erreur, mais la mutation la garde dans son état :
  // on la rattrape ici pour placer ce qui vise un champ, et le reste s'affiche
  // depuis `createBook.error`. Sans ce `catch`, le rejet remonterait sans
  // personne pour le traiter.
  const submit = handleSubmit(async (values) => {
    try {
      await createBook.mutateAsync(NewBook.parse(values));
      reset();
    } catch (error) {
      applyFieldErrors(error, setError);
    }
  });

  return (
    <form onSubmit={submit} noValidate className="mb-8 space-y-3">
      <TextField
        id="title"
        label="Titre"
        field={register('title')}
        error={errors.title}
        autoComplete="off"
      />
      <TextField id="author" label="Auteur" field={register('author')} error={errors.author} />
      <TextField
        id="pages"
        label="Pages"
        field={register('pages')}
        error={errors.pages}
        inputMode="numeric"
      />

      {globalError && !globalError.problem.errors?.length && (
        <p role="alert" className="text-sm text-red-600">
          L'ajout a échoué : {globalError.message}
          {globalError.traceId && (
            <span className="block text-slate-500">Référence : {globalError.traceId}</span>
          )}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {isSubmitting ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  );
}
