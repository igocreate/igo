import { faro } from '@grafana/faro-react';

// Le point d'entrée unique pour signaler une erreur que le code a rattrapée.
// Faro capte déjà les exceptions non rattrapées et les rejets de promesse ;
// cette fonction sert aux cas que l'application gère elle-même et veut quand
// même voir remonter.
//
// L'appel est sans effet quand Faro n'est pas initialisé (pas de collecteur
// configuré) : l'application n'a pas à savoir si l'observabilité est branchée.
export const reportError = (error: unknown, context?: Record<string, string>) => {
  const asError = error instanceof Error ? error : new Error(String(error));
  faro.api?.pushError(asError, { context });
};
