import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { TextField } from '@/components/form/text-field';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';
import { applyFieldErrors } from '@/lib/form';

import { useCreateBook } from '../api';
import { NewBook } from '../schemas';

type NewBookValues = z.input<typeof NewBook>;

const FIELDS = ['title', 'author', 'pages'] as const;

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
    // Trois types : ce que les champs portent (du texte), le contexte, et ce que
    // le schéma rend une fois converti — c'est ce dernier que reçoit
    // `handleSubmit`, donc ce qui part à l'API.
  } = useForm<NewBookValues, unknown, z.output<typeof NewBook>>({
    resolver: zodResolver(NewBook),
    // L'erreur apparaît quand on quitte le champ, et non à la première frappe
    // d'un champ qu'on est en train de remplir ; ensuite elle suit la saisie.
    mode: 'onTouched',
    defaultValues: { title: '', author: '', pages: '' },
  });

  // Ce que l'échec n'a pas pu placer sous un champ s'affiche ici. Sans cet
  // état, un refus qui nomme un champ absent du formulaire n'apparaîtrait
  // nulle part : ni sous un champ, ni en global.
  const [globalError, setGlobalError] = useState<Error | null>(null);

  // `mutateAsync` rejette sur erreur : on la rattrape pour placer ce qui vise
  // un champ. Sans ce `catch`, le rejet remonterait sans personne pour le
  // traiter.
  const submit = handleSubmit(async (values) => {
    setGlobalError(null);
    try {
      await createBook.mutateAsync(values);
      reset();
    } catch (error) {
      if (!applyFieldErrors(error, setError, FIELDS)) {
        setGlobalError(error as Error);
      }
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
        hint="En chiffres, par exemple 271"
        field={register('pages')}
        error={errors.pages}
        inputMode="numeric"
      />

      {globalError && (
        <p role="alert" className="text-sm text-destructive">
          L'ajout a échoué : {globalError.message}
          {globalError instanceof ApiError && globalError.traceId && (
            <span className="block text-muted-foreground">Référence : {globalError.traceId}</span>
          )}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Ajout…' : 'Ajouter'}
      </Button>
    </form>
  );
}
