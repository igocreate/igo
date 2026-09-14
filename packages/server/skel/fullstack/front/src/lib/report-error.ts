import { faro } from '@grafana/faro-react';

import { ApiError } from './api-client';

// Une exception n'est rattachée à aucune trace : elle survient hors d'un span,
// et celui du fetch est déjà clos quand le catch s'exécute.
//
// `ApiError` porte le trace-id que le serveur a renvoyé dans `traceresponse` :
// c'est celui de la requête qui a échoué, donc exactement celui qu'on veut
// suivre. Faro n'a pas de span-id à y associer, un identifiant nul convient —
// seul le trace-id relie les deux bouts.
const NO_SPAN = '0000000000000000';

const spanContext = (error: unknown) =>
  error instanceof ApiError && error.traceId
    ? { traceId: error.traceId, spanId: NO_SPAN }
    : undefined;

// Pour les erreurs que l'application rattrape et veut quand même voir remonter ;
// sans effet quand Faro n'est pas initialisé.
export const reportError = (error: unknown, context?: Record<string, string>) => {
  const asError = error instanceof Error ? error : new Error(String(error));
  faro.api?.pushError(asError, { context, spanContext: spanContext(error) });
};
