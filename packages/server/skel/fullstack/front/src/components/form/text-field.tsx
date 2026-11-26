import type { ComponentPropsWithoutRef } from 'react';
import type { FieldError, FieldErrorsImpl, Merge, UseFormRegisterReturn } from 'react-hook-form';

import {
  Field,
  FieldDescription,
  FieldError as FieldErrorMessage,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { describedBy } from '@/lib/form';

// Ce que `errors.<champ>` porte : une erreur simple, ou la forme élargie que
// react-hook-form donne aux champs imbriqués et aux tableaux.
type FieldErrorLike = FieldError | Merge<FieldError, FieldErrorsImpl>;

// `className` est exclu : l'habillage vient de `components/ui/`. Le refuser au
// type plutôt que l'ignorer en silence évite de chercher pourquoi une classe
// passée ici ne produit rien.
interface TextFieldProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'id' | 'name' | 'className'
> {
  /** Sert d'`id` au champ, et de racine aux identifiants de l'aide et de l'erreur. */
  id: string;
  label: string;
  /** Le retour de `register('champ')` : il porte `name`, `ref` et les gestionnaires. */
  field: UseFormRegisterReturn;
  hint?: string;
  error?: FieldErrorLike;
}

/**
 * Un champ de saisie, son libellé, son aide et son erreur.
 *
 * `Field` et consorts donnent la mise en page et les styles ; ils ne relient
 * pas le champ à ce qui le décrit. C'est ce que fait ce composant —
 * `aria-describedby`, `aria-invalid` — et c'est ce qui justifie de ne pas
 * utiliser `Field` directement dans chaque formulaire : refait à la main, ce
 * câblage finit par être oublié quelque part.
 */
export function TextField({ id, label, field, hint, error, ...props }: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  // Sur un champ imbriqué, `message` peut être absent : il n'y a alors rien à
  // afficher, et le champ ne doit pas porter un `aria-describedby` dans le vide.
  const message = typeof error?.message === 'string' ? error.message : undefined;

  return (
    <Field data-invalid={message ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>

      {hint && <FieldDescription id={hintId}>{hint}</FieldDescription>}

      <Input
        {...field}
        {...props}
        id={id}
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy(hint && hintId, message && errorId)}
      />

      {/*
        Le message est déjà annoncé à la prise de focus par `aria-describedby`.
        Le `role="alert"` que porte ce composant le fait annoncer aussi quand
        il apparaît sans que le champ ait le focus — à la soumission, ou quand
        le serveur répond.
      */}
      <FieldErrorMessage id={errorId} errors={[{ message }]} />
    </Field>
  );
}
