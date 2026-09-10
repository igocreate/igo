import { faro } from '@grafana/faro-react';

// Pour les erreurs que l'application rattrape et veut quand même voir remonter ;
// sans effet quand Faro n'est pas initialisé.
export const reportError = (error: unknown, context?: Record<string, string>) => {
  const asError = error instanceof Error ? error : new Error(String(error));
  faro.api?.pushError(asError, { context });
};
