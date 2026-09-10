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
