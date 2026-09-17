import { FaroErrorBoundary } from '@grafana/faro-react';
import type { ReactNode } from 'react';

import { ErrorPage } from './error-page';

// La frontière d'erreur racine : un composant qui lève affiche une page
// générique au lieu d'un écran blanc, et l'incident est signalé.
//
// Le fournisseur d'observabilité est enfermé ici, comme il l'est dans
// reportError() : le point d'entrée de l'application n'a pas à le nommer, et le
// remplacer ne touche que ce fichier.
export function ErrorBoundary({ children }: { children: ReactNode }) {
  return <FaroErrorBoundary fallback={<ErrorPage />}>{children}</FaroErrorBoundary>;
}
