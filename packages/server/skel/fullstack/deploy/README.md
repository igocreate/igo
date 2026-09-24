# deploy

Des points de départ, pas des fichiers actifs : chacun se copie et s'adapte, et
son en-tête dit ce qui est à revoir.

| Fichier | Rôle |
|---|---|
| `nginx.conf.example` | le front statique et `/api` sur la même origine |
| `config.alloy.agent.example` | collecteur Alloy, **un par machine** : logs, `/proc` de l'hôte, OTLP de l'API |
| `config.alloy.gateway.example` | collecteur Alloy, **un pour l'infrastructure** : base, cache, sonde de disponibilité |
| `grafana-dashboard.example.json` | le tableau de bord |
| `grafana-alertes.example.json` | les règles d'alerte |

La gateway absorbe les différences d'hébergeur : le tableau de bord lit
`mysql_*`, `redis_*` et `node_*` partout, et un projet chez OVH ou Scaleway
réécrit ce fichier, pas ses tableaux de bord.

## Mettre en place sur Grafana Cloud

Une fois par stack, puis par projet. URL et identifiants numériques se
versionnent ; les jetons vont dans le gestionnaire de secrets du projet.

1. **Destinations**, sur grafana.com, bouton *Details* de chaque service :

   | Variable Alloy | Où |
   |---|---|
   | `GRAFANA_METRICS_URL` / `_ID` | Prometheus : *Remote Write Endpoint*, *Username / Instance ID* |
   | `GRAFANA_LOGS_URL` / `_ID` | Loki : URL suivie de `/loki/api/v1/push`, *User* |
   | `GRAFANA_TRACES_URL` / `_ID` | Tempo : **l'hôte seul suivi de `:443`**, *User* — l'URL en `/tempo` de la console est celle de la lecture |

2. **Jeton d'envoi, pour Alloy** : *Cloud access policies*, une policy avec les
   seuls scopes `metrics:write`, `logs:write`, `traces:write`, puis un jeton
   (`GRAFANA_TOKEN`). Pas un service account, qui donne accès à l'API de
   Grafana et pas à l'envoi. Un seul jeton pour tous les environnements.

3. **Jeton d'API, pour importer** tableau de bord et alertes : *Service
   accounts*, rôle Editor, expiration courte.

4. **Source de données Prometheus** : déclarer son *Scrape interval* à `60s`,
   comme les collecteurs. Laissé vide, il vaut 15 s, et `$__rate_interval`
   calcule des fenêtres d'un seul point : les courbes courtes sont vides.

5. **Tableau de bord** : un dossier par projet, puis *Dashboards → Import*, ou
   par l'API :

   ```bash
   jq '{dashboard: ., folderUid: "<projet>", overwrite: true}' grafana-dashboard.json \
     | curl -s -H "Authorization: Bearer $(cat ~/.grafana_<projet>)" -H 'Content-Type: application/json' \
            -X POST https://<stack>.grafana.net/api/dashboards/db -d @-
   ```

   Le JSON du projet fait référence : une retouche faite dans l'interface
   s'exporte et se commite, sinon le prochain import l'écrase.

6. **Faro** : *Frontend Observability → New application*, nommée comme le
   `service_name` du front (`<projet>-front`). Y déclarer les origines de chaque
   environnement (`https://qualif-*.exemple.fr` est accepté), sans quoi le
   navigateur est bloqué par CORS. La clé de téléversement des source maps est
   un secret de build, pas du processus.

7. **Disponibilité** : un check Synthetic Monitoring sur `/health/ready` d'une
   adresse **publique**, nommé `<projet>-<env>-ready`. Ses sondes viennent
   d'Internet : un vhost filtré par IP leur répond 403.

8. **Vérifier dans Grafana qu'une série arrive**, avec ses étiquettes : un envoi
   refusé ne rend pas le composant Alloy malade.

**Le gestionnaire de processus doit attendre l'arrêt ordonné** d'igo, qui peut
durer `shutdownDelay` + `shutdownTimeout` (10 s par défaut), sans quoi la
télémétrie en tampon est perdue à chaque déploiement. pm2 n'attend que 1,6 s :
`--kill-timeout 15000`.

**Le quota compte un point par minute et par série**, au-delà facturé comme une
série de plus : scruter et exporter toutes les 60 s, pas plus souvent.

## Les alertes

Les règles, comme le tableau de bord, filtrent sur
`service_namespace="{project.name}"` : à reprendre si le projet surcharge son
namespace.

Une sonde Synthetic Monitoring ne pose pas `service_namespace` : pour
`IgoServiceDown`, filtrer sur le nom du check (`job=~"<projet>-.*"`). Une base
managée OVH n'expose pas `max_connections` : sans traduction dans la gateway,
`IgoDatabasePoolSaturated` ne se déclenche jamais, sans erreur. Aucun canal de
notification n'est défini.

| Alerte | Premier réflexe |
|---|---|
| `IgoServiceDown` | Regarder `/health/ready` : il nomme la dépendance qui manque. Sinon l'application est arrêtée, ou la route jusqu'à elle coupée. |
| `IgoHighErrorRate` | Plus de 5 % de 5xx. Le journal des erreurs porte la pile ; la courbe des codes dit depuis quand. |
| `IgoDatabasePoolSaturated` | Souvent des connexions non rendues : une requête longue ou une transaction restée ouverte. |
| `IgoFileDescriptorsExhausted` | Des sockets ou des fichiers qui fuient. À saturation, plus aucune connexion n'est acceptée. |
| `IgoClientErrorSpike` | La part de 4xx a triplé : un contrat d'API changé, un client cassé. |
| `IgoLatencySpike` | Le p95 a triplé. Avec la médiane : lenteur générale ou queue de distribution. |
| `IgoEventLoopSaturated` | Une opération synchrone bloquante, ou un calcul à déplacer. |
| `IgoHostCpuSaturated`, `IgoHostMemorySaturated`, `IgoHostSystemSaturated` | `instance` dit quelle machine, `role` ce qu'elle porte. |
| `IgoDiskIOSaturated` | Souvent la base, qui ralentit sans que le processeur ne bouge. |
| `IgoDiskFillingUp` | Plein dans moins de quatre jours : logs, sauvegardes, fichiers temporaires. |

Deux règles sont livrées désactivées :

- `IgoLatencyDegraded` — son seuil d'une seconde ne vaut qu'une fois la latence
  normale mesurée.
- `IgoTrafficCollapsed` — le service répond mais plus personne ne l'atteint. À
  activer sur un trafic qui ne retombe jamais, sinon elle sonne chaque nuit.
