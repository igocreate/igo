import {
  createReactRouterV7DataOptions,
  getWebInstrumentations,
  initializeFaro,
  ReactIntegration,
  TransportItemType,
} from '@grafana/faro-react';
import type { TransportItem } from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import { matchRoutes } from 'react-router';

// Importé en premier dans main.tsx : Faro doit être en place avant React pour
// capter une erreur survenue au chargement.
//
// L'URL du collecteur part dans le navigateur — ce n'est pas un secret. Elle
// reste en variable d'environnement pour qu'un autre déploiement puisse viser
// ailleurs sans toucher au code.
//
// Son absence désactive Faro : c'est le défaut d'un poste de développement, qui
// ne doit ni consommer de quota ni mélanger ses erreurs à celles de la
// production. Pour l'activer le temps d'un build :
// VITE_FARO_URL=… pnpm build
const url = import.meta.env.VITE_FARO_URL;

// Part du trafic en succès conservée. Une session sur dix suffit à mesurer des
// tendances de performance, et un incident touche rarement une seule session.
// Les erreurs, elles, échappent à ce tirage.
const ROUTINE_SHARE = Number(import.meta.env.VITE_FARO_SAMPLE ?? 0.1);

// Tiré une fois par chargement : échantillonner événement par événement
// laisserait un parcours à moitié enregistré et rendrait les durées illisibles.
const inSample = Math.random() < ROUTINE_SHARE;

// Un appel a échoué s'il a rendu un statut d'erreur — ou s'il n'a rendu aucun
// statut du tout. Un fetch qui échoue en réseau (DNS, expiration, CORS) n'a pas
// de `http.response.status_code` : le tester seul laisserait échantillonner
// l'événement le plus intéressant.
const failed = (attributes: Record<string, unknown> | undefined) => {
  const status = Number(attributes?.['http.response.status_code'] ?? 0);
  if (status >= 400) {
    return true;
  }
  // Un appel abouti porte toujours un statut ; son absence sur un événement de
  // requête signale un échec avant la réponse.
  const estUneRequete =
    attributes?.['http.method'] !== undefined ||
    attributes?.['http.request.method'] !== undefined ||
    attributes?.['http.url'] !== undefined;
  return estUneRequete && status === 0;
};

// Le contexte navigateur pèse ~1,5 Ko par événement, répété à chaque appel.
// Tout garder sature le quota sans rien apprendre ; tout jeter perdrait la
// corrélation front/back. On garde donc l'anormal en entier, et un échantillon
// du reste.
const filter = (item: TransportItem): TransportItem | null => {
  switch (item.type) {
    // Jamais échantillonnés. Une erreur vue une seule fois est précisément
    // celle qu'on cherche, et les Web Vitals n'ont de sens qu'agrégés sur tout
    // le trafic.
    case TransportItemType.EXCEPTION:
    case TransportItemType.MEASUREMENT:
      return item;

    // Les spans du navigateur portent la racine de la trace. Les échantillonner
    // ici ne laisserait que la partie serveur, et la corrélation front/back
    // cesserait de fonctionner. La décision à l'échelle de la trace appartient
    // au bit `sampled` de l'en-tête traceparent que le SDK propage, pas à ce
    // filtre.
    case TransportItemType.TRACE:
      return item;

    // Un log volontaire — pushLog() — est intentionnel par nature : personne
    // n'en écrit un sans raison, et la console n'est pas capturée. Le jeter
    // même partiellement reviendrait à ignorer une demande explicite.
    case TransportItemType.LOG:
      return item;

    // Les événements — appels fetch, navigation, performance — font le volume :
    // 93 % des charges Faro mesurées, à ~1,5 Ko de contexte navigateur chacun.
    // C'est le seul signal à échantillonner, sauf quand l'appel a échoué.
    case TransportItemType.EVENT: {
      const payload = item.payload as { attributes?: Record<string, unknown> };
      return failed(payload.attributes) || inSample ? item : null;
    }

    // Un signal inconnu passe entier : on décide d'échantillonner, jamais
    // l'inverse — c'est ainsi que les spans du navigateur ont été perdus une fois.
    default:
      return item;
  }
};

if (url) {
  initializeFaro({
    url,
    app: {
      // Doit correspondre exactement à l'application déclarée dans Grafana
      // Frontend Observability, et à l'`appName` passé au téléversement des
      // source maps (vite.config.ts) : c'est cette clé qui rattache une pile
      // d'appels à ses source maps.
      name: import.meta.env.VITE_FARO_APP_NAME || 'audit',
      version: import.meta.env.VITE_APP_VERSION || '0.0.1',
      // Pas import.meta.env.MODE : il vaut 'production' dans tout build Vite, y
      // compris un `vite preview` sur un poste de développement. Les erreurs
      // locales se mélangeraient alors à celles de la production.
      environment: import.meta.env.VITE_ENVIRONMENT || 'dev',
    },
    // Pas d'identifiant de session écrit dans le navigateur : c'est un traceur
    // au sens du RGPD, et rien ici ne recueille de consentement. Erreurs, Web
    // Vitals et corrélation front/back s'en passent ; un projet qui veut les
    // parcours par session l'active après son bandeau.
    sessionTracking: { enabled: false },
    instrumentations: [
      ...getWebInstrumentations({
        // La console est ramassée indistinctement, bibliothèques tierces
        // comprises. Ce qui mérite d'être remonté passe par reportError().
        captureConsole: false,
      }),
      new TracingInstrumentation(),
      // Sans elle, une navigation est remontée sous son URL brute : /animaux/12
      // et /animaux/47 comptent alors comme deux pages distinctes, et
      // l'agrégation par page devient illisible dès que les identifiants se
      // multiplient. L'intégration résout le motif de la route, comme
      // http.route le fait côté serveur.
      //
      // La variante « data router » n'a besoin que de matchRoutes ; c'est
      // withFaroRouterInstrumentation, dans routes.tsx, qui l'abonne aux
      // navigations.
      new ReactIntegration({
        router: createReactRouterV7DataOptions({ matchRoutes }),
      }),
    ],

    beforeSend: filter,

    ignoreErrors: [
      // Bizarreries de mise en page, sans conséquence
      /^ResizeObserver loop limit exceeded$/,
      /^ResizeObserver loop completed with undelivered notifications$/,
      // Scripts d'une autre origine, sans pile exploitable
      /^Script error\.$/,
      // Interférences d'extensions de navigateur
      /chrome-extension:\/\//,
      /moz-extension:\/\//,
    ],
  });
}
