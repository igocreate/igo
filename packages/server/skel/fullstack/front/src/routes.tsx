import { withFaroRouterInstrumentation } from '@grafana/faro-react';
import { createBrowserRouter } from 'react-router';

import { AppLayout } from '@/components/layout/app-layout';
import { RouteError } from '@/components/layout/route-error';

const arbre = createBrowserRouter([
  {
    element: <AppLayout />,
    // Couvre tout l'arbre : react-router remonte l'erreur jusqu'au premier
    // errorElement rencontré.
    errorElement: <RouteError />,
    children: [
      // lazy par feature : une route n'est téléchargée qu'à la visite
      { index: true, lazy: () => import('@/features/books/pages/books-page') },
    ],
  },
]);

// Abonne Faro aux navigations : l'intégration déclarée dans observability.ts en
// dépend pour résoudre le motif de chaque route. Sans collecteur configuré,
// l'appel est sans effet.
export const router = withFaroRouterInstrumentation(arbre);
