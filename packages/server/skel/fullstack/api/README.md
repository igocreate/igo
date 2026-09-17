# {project.name} — api

API JSON sur [igo](https://github.com/igocreate/igo). TypeScript, Node 24.

## Commandes

```bash
pnpm start        # tsx watch
pnpm migrate      # migrations SQL
pnpm seed         # données de dev
pnpm test         # mocha — vraie base, isolée par transaction
pnpm lint         # oxlint
pnpm format       # oxfmt
pnpm typecheck    # tsc --noEmit
pnpm build        # -> dist/
pnpm serve        # dist/, configuré par l'environnement : pas de .env dans dist
```

Depuis la racine : `pnpm --filter ./api test`. MySQL et Valkey doivent tourner
(`docker compose up -d`) ; la base de test est recréée et migrée à chaque
exécution.

## Structure

```
app/
  features/<domaine>/       un dossier par domaine, auto-contenu
    <domaine>.routes.ts     les endpoints
    <domaine>.controller.ts thin : service ou modèle -> DTO
    <domaine>.dto.ts        schémas entrants + serialize sortant
    <domaine>.service.ts    logique métier, dès qu'elle branche
    <Modèle>.ts             le modèle ORM du domaine
  shared/                   ce qui est transversal — authentication, models, services
  config.ts                 surcharge de la config igo — optionnel, absent au départ
  routes.ts                 montage
sql/                        migrations, une par fichier daté
seeds/                      données de dev, jouées à la demande
test/                       miroir de app/
```

Une feature possède son modèle. Un modèle importé par la majorité des features
migre dans `shared/models/` — c'est la seule règle, et elle demande du jugement.

Une feature peut importer chez une autre (`../dossiers/Dossier`) : l'organisation
porte la propriété, pas l'isolation.

## Configuration

igo lit `app/config.ts` s'il existe. Le seul réglage qu'un projet a
généralement à poser :

```ts
import type { Config } from '@igojs/server';

export const init = (config: Config) => {
  // Une ligne par requête est le premier poste d'un volume de logs, et les
  // succès n'apprennent rien que les métriques ne portent déjà.
  config.logrequests = 400;
};
```

À poser quand l'observabilité est branchée — pas avant, sinon on perd les seules
traces d'activité dont on dispose. Les secrets de session viennent du `.env`,
jamais de ce fichier.

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

**Une route protégée passe par `requireAuth`** (`shared/authentication.ts`),
qui répond 401 quand personne n'est en session. Ce que le projet fait de
`req.session.userId` — charger l'utilisateur, vérifier un rôle — lui appartient ;
le 403, connu mais sans droit sur la ressource, se répond dans le contrôleur par
`sendProblem(res, 403, { type })`. Une garde est générique sur les paramètres de
route (`<P>(req: Request<P>, …)`) : typée `RequestHandler`, elle imposerait ses
paramètres au handler qui la suit.

**Les logs portent des champs, pas des phrases** : `logger.info('book created',
{ book_id })` plutôt qu'une chaîne interpolée. L'identifiant de requête est
ajouté tout seul.

## Tests

Tout contrôleur API a un test d'intégration couvrant au minimum : le cas
nominal, la validation (400), l'entité absente (404), et l'accès refusé quand la
route est protégée.

Les tests passent par `dev.agent` contre la vraie base. Les mocks ne servent que
pour les dépendances externes — API tierces, SMTP.

## Dans un projet igo existant

Cette couche API se dépose telle quelle dans un projet igo en JavaScript, à
côté de ses pages dust. Six gestes, vérifiés :

1. `@igojs/server` et `@igojs/db` en dépendances directes, en plus de
   `@igojs/igo` — sans quoi ni `tsc` ni Node ne les résolvent depuis le projet.
2. `zod` et `tsx` en dépendances, `typescript` et les `@types/*` en dev ; un
   `tsconfig.json` avec `allowJs` et `noEmit` qui couvre `app/` et `test/`.
3. Copier `app/features/<domaine>/` — contrôleur, DTO, routes, test.
4. Le modèle reste en JavaScript. Le décrire pour TypeScript par un `.d.ts` à
   côté, sans le modifier :
   ```ts
   // app/models/Book.d.ts
   import type { ModelClass } from '@igojs/db';
   import type { BookRow } from '../features/books/books.dto';
   declare const Book: ModelClass<BookRow>;
   export = Book;
   ```
5. Monter depuis `app/routes.js` avec **`.default`** : un `require` d'un module
   TypeScript à `export default` rend `{ default }`, et igo refuse le handler.
   ```js
   app.api('/books', require('./features/books/books.routes').default);
   ```
6. Démarrer par `node --import tsx app.js` (`nodemon --import tsx` en
   développement), tester par `mocha --require tsx --extension ts,js`.

## Documentation

- [Routes et API JSON](https://igocreate.github.io/igo/server/api)
- [ORM](https://igocreate.github.io/igo/db/models)
- [Logs](https://igocreate.github.io/igo/server/logging)
