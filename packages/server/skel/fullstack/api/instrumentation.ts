import '@igojs/server/env';

import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// Chargé par --import, AVANT igo : OpenTelemetry instrumente en remplaçant les
// modules au moment du require, donc ce fichier doit passer en premier. Importé
// depuis app.ts, il n'instrumenterait ni express ni mysql2.
//
// Conséquence : le .env n'est pas encore lu, puisque c'est la configuration
// d'igo qui appelle dotenv. Sans le premier import ci-dessus, toute variable
// OTEL_* lue plus bas vaudrait undefined et le SDK ne démarrerait pas —
// silencieusement, sans erreur ni donnée. Ce point d'entrée charge le .env sans
// rien initialiser, là où importer @igojs/server tirerait express et winston,
// soit précisément ce que ce fichier devait précéder.

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
    'deployment.environment.name': process.env.NODE_ENV || 'dev',
  }),
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 15_000,
  }),
  // Pas d'exporteur de logs : igo écrit déjà du JSON structuré sur la sortie
  // standard, que le collecteur lit. Les pousser aussi en OTLP les dupliquerait.
  // L'instrumentation winston ci-dessous sert uniquement à estampiller ces
  // lignes avec le trace_id.
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
      // igo écrit déjà ses logs en JSON avec service/version/environment : on
      // veut l'estampille trace_id, pas une seconde copie des logs.
      '@opentelemetry/instrumentation-winston': {
        enabled: true,
        disableLogSending: true,
      },
    }),
  ],
});

// Pas de destination, rien à envoyer : l'absence d'OTEL_EXPORTER_OTLP_ENDPOINT
// suffit à désactiver l'observabilité. C'est le défaut d'un poste de
// développement — ni quota consommé, ni erreurs locales mélangées à celles de la
// production — et la même règle que côté front, où l'absence de VITE_FARO_URL
// désactive Faro.
//
// L'adresse doit viser un collecteur local (Grafana Alloy), pas directement une
// plateforme : c'est ce qui permet de filtrer, de dériver des métriques et de
// changer de destination sans toucher à ce fichier.
const active = Boolean(process.env.OTEL_EXPORTER_OTLP_ENDPOINT);

if (active) {
  sdk.start();
}

const stop = async () => {
  if (active) {
    await sdk.shutdown();
  }
};

process.once('SIGTERM', stop);
process.once('SIGINT', stop);
