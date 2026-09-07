
# JSON APIs

Routes mounted with `app.api()` answer in JSON — always. Validation errors,
404s and 500s all come back as [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)
problem documents, never as a rendered page.

## Mounting routes

```js
// app/routes.js
module.exports.init = (app) => {
  app.api('/books', require('./api/books/books.routes'));   // -> /api/books
};
```

The prefix comes from `config.api.prefix` (`/api` by default), so it is never
repeated in the code. Override it in `app/config.js` if you need to:

```js
config.api.prefix = '/v1';
```

## Anatomy of a domain

```
app/api/books/
  books.routes.js       the endpoints
  books.controller.js   thin: model or service -> DTO
  books.dto.js          incoming schemas + outgoing serialization
```

```js
// books.routes.js
const { express } = require('@igojs/server');
const controller  = require('./books.controller');

const router = express.Router();

router.get('/',    controller.index);
router.post('/',   controller.create);
router.get('/:id', controller.show);

module.exports = router;
```

## Validation

Attach a schema to a handler and igo applies it before the handler runs. There
is nothing to add to the routes:

```js
// books.controller.js
exports.create = async (req, res) => {
  const book = await Book.create(req.body);      // already validated
  res.status(201).json(dto.serialize(book));
};
exports.create.body = dto.CreateBook;

exports.index = async (req, res) => {
  const { page, limit } = req.query;             // already numbers
  ...
};
exports.index.query = dto.ListBooks;
```

`body`, `query` and `params` are the three sources you can validate. The
validated value **replaces** the original, so coercions and defaults reach the
controller:

```js
// books.dto.js
exports.ListBooks = z.object({
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
```

`GET /api/books` gives `req.query.page === 1`, and `?page=3` gives the number
`3` — no `parseInt` in the controller.

::: warning Booleans in query strings
`z.coerce.boolean()` follows JavaScript: `Boolean('false')` is `true`, so every
present flag validates as true. For a URL flag, convert explicitly:

```js
published: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
```
:::

Any [Standard Schema](https://standardschema.dev) library works — zod, valibot
or arktype. The skeletons ship zod.

Routes that accept a body without declaring a schema are listed in a warning at
startup. It never blocks the server: a `GET` without parameters legitimately has
no schema.

## Error format

Every API error is a problem document, served as `application/problem+json`:

```json
{
  "type": "about:blank",
  "title": "Validation failed",
  "status": 400,
  "errors": [
    { "path": "pages", "message": "Invalid input: expected number, received string" }
  ]
}
```

`type`, `title` and `status` are the RFC 9457 fields; `errors` carries the
per-field detail so a front end can display it without transformation.

To answer with one yourself:

```js
const { sendProblem } = require('@igojs/server');

exports.show = async (req, res) => {
  const book = await Book.find(req.params.id);
  if (!book) {
    return sendProblem(res, 404, { detail: 'Book not found' });
  }
  res.json(dto.serialize(book));
};
```

Outside production a 500 includes the error message as `detail`; in production
it is omitted. Crash emails are unaffected — only the response format changes.

## DTOs

The DTO is the barrier between the ORM model and the API. Adding a column to a
model exposes nothing until it is named in `serialize()`:

```js
exports.serialize = (book) => ({
  id:        book.id,
  title:     book.title,
  createdAt: book.created_at,
});
```

## Testing

`dev.agent` exposes the parsed response body as `res.data`:

```js
it('should reject an invalid body', async () => {
  const res = await agent.post('/api/books', { body: { title: '' } });

  assert.strictEqual(res.statusCode, 400);
  assert.deepStrictEqual(res.data.errors.map(e => e.path), ['title']);
});
```

## TypeScript

The schemas are the source of the types — no shape is declared twice:

```ts
import type { ApiHandler } from '@igojs/server';

export const create: ApiHandler<{ body: typeof dto.CreateBook }> = async (req, res) => {
  req.body.pages;      // number
  req.body.isbn;       // compile error: not in the schema
};
create.body = dto.CreateBook;
```

igo itself stays JavaScript: the types ship as `.d.ts` files, which are never
loaded at runtime. A JavaScript project is unaffected.

## Starting a new API project

```bash
igo create myapi --skel=api        # JavaScript
igo create myapi --skel=api-ts     # TypeScript
```

Both come with a working domain — model, DTO, controller, routes, migration and
integration tests.
