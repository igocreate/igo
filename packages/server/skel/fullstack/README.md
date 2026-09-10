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
navigateur ne voit qu'une seule origine, donc **le cookie de session passe sans
CORS**.


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

## Structure

```
api/               API igo — voir api/CLAUDE.md
front/             SPA React — voir front/CLAUDE.md
e2e/               parcours Playwright — voir e2e/CLAUDE.md
```

Trois paquets pnpm dans un dépôt : **un commit porte un front et un back
cohérents**, et le déploiement livre un seul artefact.

`e2e` est un paquet comme les deux autres — il est linté et typechecké avec
eux, et porte sa propre configuration Playwright. Il n'est pas rattaché au
front : ses tests démarrent l'API *et* le front, et traversent les deux.

Une commande ciblée passe par un filtre : `pnpm --filter ./api test`.

## Les tests

| Niveau             | Où                        | Ce qu'il couvre                     |
| ------------------ | ------------------------- | ----------------------------------- |
| Intégration back   | `api/test/`               | route → contrôleur → DTO → base     |
| Composant, feature | `front/src/**/*.test.tsx` | rendu, API simulée par MSW          |
| E2E                | `e2e/`                    | le câblage complet, navigateur réel |

Les E2E tournent contre le **build** du front, pas le serveur de développement —
c'est ce qui est déployé. Ils restent peu nombreux : tout ce qui peut être
couvert plus bas doit l'être.

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

**Alloy n'est pas actif ici**, sa configuration dépendant de la plateforme :
`alloy/config.alloy.example` est un point de départ à copier en
`config.alloy` et à adapter. Son en-tête liste ce qui est à revoir et les
pièges de cardinalité déjà mesurés. Sans collecteur en écoute, l'API n'envoie
rien — c'est la première chose à vérifier quand aucune donnée n'arrive.

Le front est l'exception : il poste au collecteur Faro hébergé, un navigateur
n'atteignant pas un Alloy local.

## Conventions

[Conventional Commits](https://www.conventionalcommits.org), vérifiés par un
hook. Le pre-commit passe oxlint sur les fichiers indexés.

Le ticket, quand il y en a un, ouvre le sujet :
`feat(books): [PROJ-123] ajouter la pagination`.

Les conventions de code sont dans `api/CLAUDE.md`, `front/CLAUDE.md` et
`e2e/CLAUDE.md`.
