import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';

import { reportError } from '@/lib/report-error';

import { ErrorPage } from './error-page';

// react-router intercepte lui-même ce qui échoue dans une route — chargement
// d'un module lazy, loader, action — et n'atteint donc jamais la frontière
// d'erreur racine. Sans errorElement, il affiche sa page de secours, et
// l'incident ne remonte nulle part.
//
// Un 404 n'est pas un incident : c'est un lien mort ou une URL saisie à la
// main, que le taux d'erreur des métriques porte déjà. On ne remonte que le
// reste.
export function RouteError() {
  const error = useRouteError();
  const attendu = isRouteErrorResponse(error) && error.status === 404;

  useEffect(() => {
    if (!attendu) {
      reportError(error, { origine: 'route' });
    }
  }, [error, attendu]);

  return <ErrorPage />;
}
