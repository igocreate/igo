# {project.name}

API JSON sur [igo](https://github.com/igocreate/igo). TypeScript, Node 24, pnpm.

## Commandes

```bash
pnpm start        # tsx watch
pnpm test         # mocha — vraie base, isolée par transaction
pnpm lint         # oxlint
pnpm typecheck    # tsc --noEmit
pnpm build        # -> dist/
```

Les tests ont besoin de MySQL et Redis en local. La base de test est recréée et
migrée à chaque exécution.

## Structure

```
app/
  features/<domaine>/       un dossier par domaine, auto-contenu
    <domaine>.routes.ts     les endpoints
    <domaine>.controller.ts thin : service ou modèle -> DTO
    <domaine>.dto.ts        schémas entrants + serialize sortant
    <domaine>.service.ts    logique métier, dès qu'elle branche
    <Modèle>.ts             le modèle ORM du domaine
  shared/                   ce qui est transversal — models, services, utils
  config.ts                 surcharge de la config igo
  routes.ts                 montage
sql/                        migrations, une par fichier daté
test/                       miroir de app/
```

Une feature possède son modèle. Un modèle importé par la majorité des features
migre dans `shared/models/` — c'est la seule règle, et elle demande du jugement.

Une feature peut importer chez une autre (`../dossiers/Dossier`) : l'organisation
porte la propriété, pas l'isolation.

## Conventions

**Les routes API se montent avec `app.api()`** — le préfixe `/api` vient de
`config.api.prefix`, jamais réécrit à la main.

**La validation est portée par le schéma attaché au handler**, jamais par un
appel dans le contrôleur :

```ts
export const create: ApiHandler<{ body: typeof dto.CreateBook }> = async (req, res) => { … };
create.body = dto.CreateBook;
```

`req.body` et `req.query` arrivent validés et coercés. Pas de `parseInt`, pas de
garde manuelle sur un champ requis.

**Le DTO est la barrière.** Un contrôleur ne renvoie jamais un modèle ORM :
`res.json(dto.serialize(book))`. Ajouter une colonne au modèle n'expose rien
tant qu'elle n'est pas nommée dans `serialize()`.

**Les erreurs sont des documents RFC 9457**, via `sendProblem(res, status, …)`.
Un cas métier mérite son propre `type` (`/problems/out-of-stock`) — c'est ce que
le client teste, jamais le libellé.

**La logique métier vit dans les services**, pas dans les contrôleurs, dès
qu'elle dépasse un appel au modèle.

**Les logs portent des champs, pas des phrases** : `logger.info('book created',
{ book_id })` plutôt qu'une chaîne interpolée. L'identifiant de requête est
ajouté tout seul.

## Tests

Tout contrôleur API a un test d'intégration couvrant au minimum : le cas
nominal, la validation (400), l'entité absente (404), et l'accès refusé quand la
route est protégée.

Les tests passent par `dev.agent` contre la vraie base. Les mocks ne servent que
pour les dépendances externes — API tierces, SMTP.

## Commits

[Conventional Commits](https://www.conventionalcommits.org), vérifié par un hook :
`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`, `ci:`. Le scope entre
parenthèses quand il aide — `fix(books): …`.

Le hook de pre-commit passe oxlint sur les fichiers indexés.

## Documentation

- [Routes et API JSON](https://igocreate.github.io/igo/server/api)
- [ORM](https://igocreate.github.io/igo/db/models)
- [Logs](https://igocreate.github.io/igo/server/logging)
