import type { ComponentPropsWithoutRef } from 'react';
import type { FieldError, FieldErrorsImpl, Merge, UseFormRegisterReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
 * Un champ de saisie, son libellé, son aide et son erreur, reliés pour les
 * lecteurs d'écran. C'est ce câblage — `htmlFor`, `aria-describedby`,
 * `aria-invalid` — qui justifie un composant partagé : refait à la main sur
 * chaque formulaire, il finit par être oublié quelque part.
 *
 * L'habillage vient de `components/ui/`, qui porte les jetons du projet : ce
 * composant ne décide d'aucune couleur ni d'aucun espacement.
 */
export function TextField({ id, label, field, hint, error, ...props }: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  // Sur un champ imbriqué, `message` peut être absent : il n'y a alors rien à
  // afficher, et le champ ne doit pas porter un `aria-describedby` dans le vide.
  const message = typeof error?.message === 'string' ? error.message : undefined;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>

      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}

      <Input
        {...field}
        {...props}
        id={id}
        aria-invalid={message ? true : undefined}
        aria-describedby={describedBy(hint && hintId, message && errorId)}
      />

      {/*
        Le message est déjà annoncé à la prise de focus par `aria-describedby`.
        `role="alert"` s'ajoute pour qu'il le soit aussi quand il apparaît sans
        que le champ ait le focus — à la soumission, ou quand le serveur
        répond.
      */}
      {message && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
