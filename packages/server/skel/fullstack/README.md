# {project.name}

API JSON [igo](https://github.com/igocreate/igo) et SPA React, dans un seul
dépôt. TypeScript, Node 24, pnpm.

## Démarrer

```bash
pnpm install
pnpm migrate       # crée les tables
pnpm dev           # api sur :3000, front sur :5173
```

Ouvrir http://localhost:5173. Le front proxifie `/api` vers le back : le
navigateur ne voit qu'une seule origine, donc **le cookie de session passe sans
CORS**.

MySQL et Redis doivent tourner en local.

## Commandes

```bash
pnpm dev           # les deux en parallèle
pnpm build         # api/dist et front/dist
pnpm lint          # oxlint sur les deux
pnpm typecheck     # tsc sur les deux
pnpm test          # tests back et front
pnpm test:e2e      # Playwright contre le build
pnpm migrate       # migrations SQL
```

## Structure

```
api/               API igo — voir api/CLAUDE.md
front/             SPA React — voir front/CLAUDE.md
e2e/               parcours Playwright
```

Deux paquets pnpm dans un dépôt : **un commit porte un front et un back
cohérents**, et le déploiement livre un seul artefact.

## Les tests

| Niveau             | Où                        | Ce qu'il couvre                     |
| ------------------ | ------------------------- | ----------------------------------- |
| Intégration back   | `api/test/`              | route → contrôleur → DTO → base     |
| Composant, feature | `front/src/**/*.test.tsx` | rendu, API simulée par MSW          |
| E2E                | `e2e/`                    | le câblage complet, navigateur réel |

Les E2E tournent contre le **build** du front, pas le serveur de développement —
c'est ce qui est déployé. Ils restent peu nombreux : tout ce qui peut être
couvert plus bas doit l'être.

## Déploiement

Un seul artefact. Le build produit `api/dist` et `front/dist`.

**nginx sert les statiques**, pas igo — `front/dist` va dans le répertoire servi
par nginx, et `/api` est passé au process Node. Deux réglages à ne pas
découvrir en production :

- une `location = /index.html` **sans `expires max`** : sinon l'utilisateur
  garde un fichier qui référence des assets disparus ;
- un `try_files` qui retombe sur `index.html`, sans quoi le routage client
  renvoie des 404 sur rechargement.

Voir `deploy/nginx.conf.example`.

## Conventions

[Conventional Commits](https://www.conventionalcommits.org), vérifiés par un
hook. Le pre-commit passe oxlint sur les fichiers indexés.

Les conventions de code sont dans `api/CLAUDE.md` et `front/CLAUDE.md`.
