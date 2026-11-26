import type { ComponentPropsWithoutRef } from 'react';
import type { FieldError, FieldErrorsImpl, Merge, UseFormRegisterReturn } from 'react-hook-form';

import { describedBy } from '@/lib/form';

// Ce que `errors.<champ>` porte : une erreur simple, ou la forme élargie que
// react-hook-form donne aux champs imbriqués et aux tableaux.
type FieldErrorLike = FieldError | Merge<FieldError, FieldErrorsImpl>;

interface TextFieldProps extends Omit<ComponentPropsWithoutRef<'input'>, 'id' | 'name'> {
  /** Sert d'`id` au champ, et de racine aux identifiants de l'aide et de l'erreur. */
  id: string;
  label: string;
  /** Le retour de `register('champ')` : il porte `name`, `ref` et les gestionnaires. */
  field: UseFormRegisterReturn;
  hint?: string;
  error?: FieldErrorLike;
}

/**
 * Un champ de saisie, son libellé, son aide et son erreur, reliés pour les
 * lecteurs d'écran. C'est ce câblage — `htmlFor`, `aria-describedby`,
 * `aria-invalid`, `role="alert"` — qui justifie un composant partagé : refait
 * à la main sur chaque formulaire, il finit par être oublié quelque part.
 */
export function TextField({ id, label, field, hint, error, ...props }: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  // Sur un champ imbriqué, `message` peut être absent : il n'y a alors rien à
  // afficher, et le champ ne doit pas porter un `aria-describedby` dans le vide.
  const message = typeof error?.message === 'string' ? error.message : undefined;

  return (
    <div>
      <label className="block text-sm font-medium" htmlFor={id}>
        {label}
      </label>

      {hint && (
        <p id={hintId} className="text-sm text-slate-500">
          {hint}
        </p>
      )}

      <input
        {...field}
        {...props}
        id={id}
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy(hint && hintId, message && errorId)}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 aria-invalid:border-red-600"
      />

      {message && (
        <p id={errorId} role="alert" className="mt-1 text-sm text-red-600">
          {message}
        </p>
      )}
    </div>
  );
}
