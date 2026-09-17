# {project.name}

API JSON [igo](https://github.com/igocreate/igo) et SPA React, dans un seul
dépôt. TypeScript, Node 24, pnpm.

## Démarrer

```bash
pnpm install
docker compose up -d   # MySQL + Valkey
pnpm migrate           # crée les tables
pnpm seed              # données de dev
pnpm dev               # api sur :3000, front sur :5173
```

Ouvrir http://localhost:5173. Le front proxifie `/api` vers le back : le
navigateur ne voit qu'une seule origine, donc le cookie de session passe sans
CORS.

## Commandes

```bash
pnpm dev           # api et front en parallèle
pnpm build         # api/dist et front/dist
pnpm lint          # oxlint sur les trois paquets
pnpm format        # oxfmt sur tout le dépôt
pnpm typecheck     # tsc sur les trois paquets
pnpm test          # api et front — rapide, pas les E2E
pnpm test:e2e      # Playwright contre le build
pnpm migrate       # migrations SQL
pnpm seed          # données de dev
```

Une commande ciblée passe par un filtre : `pnpm --filter ./api test`.

## Structure

```
api/               API igo — voir api/README.md
front/             SPA React — voir front/README.md
e2e/               parcours Playwright — voir e2e/README.md
```

Trois paquets pnpm dans un dépôt : un commit porte un front et un back
cohérents, et le déploiement livre un seul artefact. `e2e` est un paquet comme
les deux autres, linté et typechecké avec eux ; ses tests démarrent l'API et le
front, et traversent les deux.

## Le contrat front/back

Le back expose du JSON sous `/api`, le front le consomme par des **URL
relatives**. Jamais de base URL absolue : c'est ce qui permet au même build de
tourner sur tous les environnements. En développement, Vite proxifie `/api` vers
igo ; en production, c'est nginx.

**Les erreurs suivent RFC 9457.** Le back les émet avec `sendProblem`, le front
les lit avec `ApiError` : `fieldError(champ)` donne le message à afficher sous
un input. Le client teste `type` et `errors[].code`, jamais les libellés.

**Les types du front reflètent les DTO du back**, écrits à la main. S'ils
dérivent, ce sont les tests de feature qui le montrent.

## Ajouter un domaine

Les deux côtés se répondent, et le back sert d'abord :

```
api/app/features/<domaine>/     routes, controller, dto, modèle
front/src/features/<domaine>/   api.ts, types.ts, pages, sections, components
```

## Les tests

| Niveau             | Où                        | Ce qu'il couvre                     |
| ------------------ | ------------------------- | ----------------------------------- |
| Intégration back   | `api/test/`               | route → contrôleur → DTO → base     |
| Composant, feature | `front/src/**/*.test.tsx` | rendu, API simulée par MSW          |
| E2E                | `e2e/`                    | le câblage complet, navigateur réel |

Les E2E tournent contre le **build** du front, pas le serveur de développement :
c'est ce qui est déployé. Ils sont lents et restent peu nombreux ; tout ce qui
peut être couvert plus bas doit l'être plus bas. `pnpm test` ne les lance pas.
Ils portent aussi l'audit d'accessibilité : aucun écran ne doit présenter de
violation WCAG 2.1 AA.

## Dépendances

Dependabot ouvre une PR par mois : mineures et correctifs groupés, majeures
séparées puisqu'elles demandent un œil. Les quatre `package.json` du monorepo
sont surveillés — celui de la racine ne porte que l'outillage.

Les **mises à jour de sécurité** ne suivent pas ce rythme : elles arrivent dès
qu'un avis est publié. Mais rien dans `dependabot.yml` ne les déclenche, c'est un
réglage du dépôt — **Settings → Code security → Dependabot security updates** —
à activer une fois, à la création. Un projet qui l'oublie a le fichier sans les
alertes.

## Observabilité

**Rien n'est envoyé par défaut** : `OTEL_EXPORTER_OTLP_ENDPOINT` côté API et
`VITE_FARO_URL` côté front sont commentés, et leur absence suffit à tout
désactiver. Un poste de développement ne consomme donc aucun quota, et les
tests E2E n'envoient rien.

**L'application n'écrit jamais directement dans une plateforme.** Elle parle
OTLP à un collecteur local — [Grafana Alloy](https://grafana.com/docs/alloy/) —
qui relaie, filtre et dérive les métriques. C'est ce détour qui permet de
changer de destination sans toucher au code, et de collecter aussi les logs, la
base et le cache, qui ne parlent pas OTLP.

**Alloy n'est pas actif ici**, sa configuration dépendant de la plateforme.
`deploy/` en porte deux exemples, parce qu'un collecteur remplit deux rôles que
rien n'oblige à tenir au même endroit :

- `config.alloy.agent.example` — **un par machine**. Il lit ce qui n'existe que
  là : les fichiers de log, le `/proc` de l'hôte, et la télémétrie que l'API lui
  envoie en OTLP sur la boucle locale.
- `config.alloy.gateway.example` — **un pour toute l'infrastructure**. Il scrute
  ce qui s'interroge à distance : base managée, cache, API d'un hébergeur.

C'est la gateway qui absorbe la variabilité des plateformes. Le tableau de bord
interroge `mysql_*`, `redis_*` et `node_*` quel que soit l'hébergeur ; un projet
chez OVH ou Scaleway réécrit ce fichier, pas ses tableaux de bord.

L'en-tête de chacun liste ce qui est à revoir et les pièges de cardinalité déjà
mesurés. Sans collecteur en écoute, l'API n'envoie rien — c'est la première
chose à vérifier quand aucune donnée n'arrive.

Le front est l'exception : il poste au collecteur Faro hébergé, un navigateur
n'atteignant pas un Alloy local. Son URL vient de **Grafana Cloud → Frontend
Observability**, où l'application doit être déclarée au préalable — c'est là que
se lisent les erreurs JavaScript et les Web Vitals, et là que se règlent leurs
alertes, séparément des règles ci-dessous.

Les erreurs du navigateur arrivent aussi dans Loki, sous
`service_name="<app>"` et `kind="exception"` : c'est ce que lit le panneau
« Erreurs — navigateur » du tableau de bord.

### Les alertes

`deploy/grafana-alertes.example.json` porte quatorze règles à importer dans
Grafana. Ce qu'elles disent, et par où commencer quand l'une d'elles part :

| Alerte | Premier réflexe |
|---|---|
| `IgoServiceDown` | La sonde n'obtient plus de réponse valide. Regarder `/health/ready` : il nomme la dépendance qui manque. Sinon l'application est arrêtée, ou la route jusqu'à elle coupée. |
| `IgoHighErrorRate` | Plus de 5 % de 5xx. Le journal des erreurs porte la pile d'appels ; la courbe des codes dit depuis quand. |
| `IgoDatabasePoolSaturated` | Les connexions MySQL saturent. Souvent des connexions non rendues : chercher une requête longue ou une transaction restée ouverte. |
| `IgoFileDescriptorsExhausted` | Descripteurs presque épuisés — des sockets ou des fichiers qui fuient. À saturation, plus aucune connexion n'est acceptée. |
| `IgoClientErrorSpike` | La part de 4xx a triplé. Un contrat d'API changé, un client cassé, une ressource supprimée en masse. |
| `IgoLatencySpike` | Le p95 des réponses réussies a triplé. Comparer avec la médiane : les deux ensemble disent lenteur générale ou queue de distribution. |
| `IgoEventLoopSaturated` | Node ne suit plus. Chercher une opération synchrone bloquante ou un calcul à déplacer. |
| `IgoHostCpuSaturated`, `IgoHostMemorySaturated`, `IgoHostSystemSaturated` | La machine sature. L'étiquette `instance` dit laquelle, `role` ce qu'elle porte. |
| `IgoDiskIOSaturated` | Les entrées-sorties s'accumulent. Souvent la base, qui ralentit alors sans que le processeur ne bouge. |
| `IgoDiskFillingUp` | Le disque sature dans moins de quatre jours. Il reste le temps d'agir — logs, sauvegardes, fichiers temporaires. |

Deux règles sont livrées désactivées, faute de valoir pour tous les projets :

- `IgoLatencyDegraded` — le seuil d'une seconde ne veut rien dire tant qu'on
  n'a pas mesuré ce qui est normal ici. À régler après quelques semaines.
- `IgoTrafficCollapsed` — attrape la panne qu'aucune autre ne voit : le service
  répond, mais plus personne ne l'atteint. À activer sur un service dont le
  trafic ne retombe jamais, sous peine de sonner chaque nuit.

## Production

Le front est un dossier de fichiers statiques servi par nginx, l'API tourne
derrière lui sur la même origine. Le contrat, quelle que soit la conf :

- `index.html` n'est **jamais** mis en cache : il référence les assets du build
  courant. Les fichiers de `assets/`, hashés, se cachent sans limite ;
- tout chemin inconnu du front retombe sur `index.html` (`try_files`) ;
- `/api` est proxifié vers igo, avec `X-Forwarded-Proto` pour que HSTS soit posé ;
- `frame-ancestors` (ou `X-Frame-Options`) et HSTS sont posés par nginx : la
  politique de sécurité de contenu du front est dans son `index.html`, mais une
  `<meta>` ne peut pas porter ces deux-là ;
- l'API parle OTLP à un collecteur local (Alloy, port 4318), jamais à une
  plateforme directement.

`deploy/` porte un exemple de chaque : `nginx.conf.example`,
`config.alloy.agent.example` et `config.alloy.gateway.example`, plus le tableau
de bord et les règles d'alerte à importer dans Grafana. Ce sont des points de
départ, pas des fichiers actifs.

## Langue du code

**Le français porte le métier, l'anglais porte la technique.**

| En français | En anglais |
| --- | --- |
| Commentaires | Noms de variables, fonctions, classes |
| Messages de commit | Fichiers et dossiers techniques |
| Objets du domaine (`Demande`, `Animal`) | Bibliothèques, API, mots-clés |
| Découpage en features (`features/demandes/`) | Types et interfaces techniques |
| Documentation | Blocs `describe` techniques (`GET /api/books`) |
| Libellés de test (`it('liste les livres')`) | |
| Interface utilisateur | |

Le critère : **le nom désigne-t-il quelque chose dont le client parle ?** Si
oui, français. Sinon, anglais. Un modèle s'appelle `Demande` et vit dans
`features/demandes/` ; le middleware qui estampille une requête s'appelle
`tagRequest`, pas `marquerRequete`. Ça produit du franglais assumé
(`demande.partenaireId`) : traduire un domaine métier vers l'anglais ajoute une
charge mentale à chaque lecture et des contresens, pour un bénéfice nul quand
l'équipe et le client parlent français.

**Ce sont des préconisations.** Un client peut imposer autre chose — projet
repris, équipe internationale, contrainte contractuelle. La règle change alors,
mais reste uniforme sur le projet.

## Commits

[Conventional Commits](https://www.conventionalcommits.org), vérifiés par un
hook ; le pre-commit passe oxlint sur les fichiers indexés. Quand le travail est
rattaché à un ticket, son identifiant ouvre le sujet :
`feat(books): [PROJ-123] ajouter la pagination`. Un commit qui touche les deux
côtés est normal, c'est l'intérêt du dépôt unique.
