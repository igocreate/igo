import '@igojs/server/env';

import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// Importé en première ligne de app.ts : OpenTelemetry pose ses crochets sur
// `require`, donc ce fichier doit précéder @igojs/server, qui charge express et
// mysql2. Rien de l'application ne doit être importé ici. Le premier import
// charge le .env sans rien d'autre : la configuration d'igo n'a pas encore
// tourné, et sans lui toute variable OTEL_* vaudrait undefined — le SDK ne
// démarrerait pas, sans erreur ni donnée.

// Les détecteurs par défaut ajoutent treize attributs de ressource — dont
// process.pid, process.command_args, process.executable.path, host.id — et un
// collecteur les convertit en étiquettes.
//
// Le coût n'est pas le nombre d'étiquettes mais la cardinalité : process.pid
// change à chaque redémarrage, donc chaque relance crée un jeu de séries neuf,
// facturé comme tel. Et un chemin d'exécutable dans une étiquette n'apprend
// rien qu'on veuille interroger.
//
// `env` seul est conservé : il lit OTEL_RESOURCE_ATTRIBUTES, ce qui laisse un
// déploiement ajouter ce qu'il juge utile. Le reste est déclaré ci-dessous, à
// la main.
process.env.OTEL_NODE_RESOURCE_DETECTORS ??= 'env';

const sdk = new NodeSDK({
  // OTel 2.x n'expose plus de classe Resource : les attributs passent par
  // resourceFromAttributes.
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || '{project.name}-api',
    [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || '0.0.1',
    // NODE_ENV vaut production sur une qualif aussi. igo lit ENVIRONMENT pour
    // ses logs : trace et log désignent le même déploiement.
    'deployment.environment.name': process.env.ENVIRONMENT || process.env.NODE_ENV || 'dev',
  }),
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 15_000,
  }),
  // Pas d'exporteur de logs : igo écrit déjà du JSON structuré sur la sortie
  // standard, que le collecteur lit. Les pousser aussi en OTLP les dupliquerait.
  instrumentations: [
    getNodeAutoInstrumentations({
      // Le système de fichiers produit un span par lecture : illisible, et le
      // volume à lui seul épuise un quota.
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // Express reste instrumenté : c'est elle qui pose `http.route` — le motif
      // de la route, pas l'URL brute — sur le span *et* sur la métrique du
      // serveur. Sans elle, la latence par route n'est pas calculable.
      //
      // Elle coûte environ 56 spans de plomberie par requête sur 66. Ce volume
      // appartient au collecteur, qui peut dériver les métriques des spans avant
      // de les jeter. La désactiver ici obligerait à choisir entre volume et
      // finesse ; traiter le problème là-bas ne coûte rien.
      '@opentelemetry/instrumentation-express': { enabled: true },
      // Le routage interne d'Express n'apprend rien : 21 spans `router - …`.
      '@opentelemetry/instrumentation-router': { enabled: false },
      '@opentelemetry/instrumentation-mysql2': { enabled: true },
      // igo pose déjà le trace_id sur chaque ligne, dans une requête comme
      // dans un cron, avec ou sans SDK.
      '@opentelemetry/instrumentation-winston': { enabled: false },
    }),
  ],
});

// Sans destination, rien n'est envoyé : c'est le défaut d'un poste de
// développement, et la même règle que VITE_FARO_URL côté front.
const active = Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

if (active) {
  sdk.start();
}

// Vide les tampons avant la sortie : les spans partent par lots, toutes les
// cinq secondes, et ceux d'une requête en erreur sont ceux qu'on veut garder.
// Appelé par igo (app.ts), pas sur un signal : un second gestionnaire de
// SIGTERM n'attendrait pas la fin des requêtes en cours.
export const stopTelemetry = async () => {
  if (active) {
    await sdk.shutdown();
  }
};
