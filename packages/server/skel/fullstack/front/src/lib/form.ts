import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiError } from './api-client';

/**
 * Pose les erreurs de champ renvoyées par l'API sous les champs qu'elles
 * nomment, et met le focus sur le premier.
 *
 * Le serveur revalide tout : il refuse des saisies que le schéma du formulaire
 * ne peut pas juger — une référence déjà prise, un montant hors barème. Ses
 * erreurs s'affichent donc au même endroit que celles du schéma, sans quoi
 * l'utilisateur lit un message global sans savoir quel champ reprendre.
 *
 * Renvoie `false` si l'erreur ne nomme aucun champ : à l'appelant de
 * l'afficher comme une erreur globale.
 */
export const applyFieldErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
): boolean => {
  if (!(error instanceof ApiError) || !error.problem.errors?.length) {
    return false;
  }

  error.problem.errors.forEach(({ path, message }, index) => {
    setError(path as Path<T>, { message }, { shouldFocus: index === 0 });
  });

  return true;
};

/**
 * Valeur d'`aria-describedby` : les identifiants des textes qui décrivent le
 * champ, dans l'ordre où un lecteur d'écran les annonce. `undefined` si aucun,
 * pour que l'attribut n'apparaisse pas du tout.
 */
export const describedBy = (...ids: (string | false | undefined)[]) =>
  ids.filter(Boolean).join(' ') || undefined;
