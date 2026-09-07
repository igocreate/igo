# {project.name}

API JSON sur [igo](https://github.com/igocreate/igo).

## Démarrer

```bash
npm install
npm start          # nodemon sur app.js
npm test           # mocha, base de test recréée à chaque run
```

## Structure

```
app/
  api/
    books/                    ← un dossier par domaine
      books.routes.js         ← les endpoints
      books.controller.js     ← thin : service/modèle → DTO
      books.dto.js            ← schémas entrants + sérialisation sortante
  models/                     ← modèles ORM
  config.js
  routes.js                   ← montage des routes
sql/                          ← migrations
```

## Conventions

**Les routes API se montent avec `app.api()`** — le préfixe (`/api`) vient de
`config.api.prefix`, jamais répété dans le code :

```js
app.api('/books', require('./api/books/books.routes'));   // -> /api/books
```

**La validation est automatique.** Le schéma s'attache au handler, igo
l'applique avant que le contrôleur ne tourne :

```js
exports.create.body  = dto.CreateBook;
exports.index.query  = dto.ListBooks;
```

`req.body` et `req.query` contiennent la valeur validée — coercitions et
valeurs par défaut comprises. Plus de `parseInt(req.query.page)`.

**Les erreurs sont en JSON**, au format [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) :

```json
{
  "type": "about:blank",
  "title": "Validation failed",
  "status": 400,
  "errors": [{ "path": "pages", "message": "expected number, received string" }]
}
```

Tout ce qui vit sous `/api` répond en JSON — y compris les 404 et les 500.

**Le DTO est la barrière.** Le front ne voit jamais un modèle ORM brut :
ajouter une colonne au modèle n'expose rien tant qu'elle n'est pas nommée dans
`serialize()`.
