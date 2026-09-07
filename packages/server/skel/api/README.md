# {project.name}

API JSON TypeScript sur [igo](https://github.com/igocreate/igo).

## Démarrer

```bash
npm install
npm start          # tsx watch, rechargement à chaud
npm test           # mocha via tsx, base de test recréée à chaque run
npm run typecheck  # tsc --noEmit
npm run build      # compile vers dist/
npm run serve      # lance le build
```

## Structure

```
app/
  features/
    books/                    ← un dossier par domaine, auto-contenu
      books.routes.ts         ← les endpoints
      books.controller.ts     ← thin : service/modèle → DTO
      books.dto.ts            ← schémas entrants + sérialisation sortante
      Book.ts                 ← le modèle ORM du domaine
  shared/                     ← transversal : models, services, utils
  config.ts
  routes.ts                   ← montage des routes
sql/                          ← migrations
```

Une feature regroupe tout son domaine, modèle compris. Ce qui devient
transversal — un modèle importé par la majorité des features — migre dans
`shared/`.

## Conventions

**Les routes API se montent avec `app.api()`** — le préfixe (`/api`) vient de
`config.api.prefix`, jamais répété dans le code :

```ts
app.api('/books', books);   // -> /api/books
```

**La validation est automatique.** Le schéma s'attache au handler, igo
l'applique avant que le contrôleur ne tourne :

```ts
export const create: ApiHandler<{ body: typeof dto.CreateBook }> = async (req, res) => {
  req.body.pages;   // number — typé depuis le schéma
};
create.body = dto.CreateBook;
```

`req.body` et `req.query` contiennent la valeur validée — coercitions et
valeurs par défaut comprises. Plus de `parseInt(req.query.page)`.

**Les erreurs sont en JSON**, au format [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) :

```json
{
  "type": "urn:igo:validation-failed",
  "title": "Validation failed",
  "status": 400,
  "errors": [{ "path": "pages", "code": "invalid_type", "message": "..." }]
}
```

Tout ce qui vit sous `/api` répond en JSON — y compris les 404 et les 500.

Le client se branche sur `type` et `errors[].code`, jamais sur `title` ni
`message` — ce sont des libellés d'affichage. Pour une erreur métier, on pose
son propre type :

```js
sendProblem(res, 409, { type: '/problems/out-of-stock', title: 'Book is out of stock' });
```

**Le DTO est la barrière.** Le front ne voit jamais un modèle ORM brut :
ajouter une colonne au modèle n'expose rien tant qu'elle n'est pas nommée dans
`serialize()`.

## TypeScript

**Les schémas Zod sont la source des types.** `ApiHandler<{ body: typeof
CreateBook }>` donne à `req.body` la forme validée : aucune interface à
maintenir en double, et un champ absent du schéma est une erreur de
compilation.

igo reste du JavaScript — les types viennent de fichiers `.d.ts` livrés avec
le paquet. Rien n'est compilé côté framework.
