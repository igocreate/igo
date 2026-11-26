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
 * `fields` énumère les champs du formulaire. Une erreur qui en nomme un autre
 * — champ ajouté côté API, règle qui vise une entité liée — ne peut pas
 * s'afficher : `setError` sur un champ non enregistré est accepté sans rien
 * produire. La fonction renvoie alors `false`, et **l'appelant doit afficher
 * le message global**, sans quoi le refus n'apparaît nulle part.
 */
export const applyFieldErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean => {
  if (!(error instanceof ApiError) || !error.problem.errors?.length) {
    return false;
  }

  const placed = new Set<string>();

  error.problem.errors.forEach(({ path, message }) => {
    // Un champ ne porte qu'un message : on garde le premier, le plus proche de
    // ce que l'utilisateur vient de faire.
    if (!fields.includes(path as Path<T>) || placed.has(path)) {
      return;
    }
    setError(path as Path<T>, { message }, { shouldFocus: placed.size === 0 });
    placed.add(path);
  });

  return placed.size === error.problem.errors.length;
};

/**
 * Valeur d'`aria-describedby` : les identifiants des textes qui décrivent le
 * champ, dans l'ordre où un lecteur d'écran les annonce. `undefined` si aucun,
 * pour que l'attribut n'apparaisse pas du tout.
 */
export const describedBy = (...ids: (string | false | undefined)[]) =>
  ids.filter(Boolean).join(' ') || undefined;
