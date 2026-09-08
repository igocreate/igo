
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
  "type": "urn:igo:validation-failed",
  "title": "Validation failed",
  "status": 400,
  "errors": [
    { "path": "pages", "code": "invalid_type", "message": "Invalid input: expected number, received string" }
  ]
}
```

`type`, `title` and `status` are the RFC 9457 fields; `errors` carries the
per-field detail so a front end can display it without transformation.

### Identifying an error

Two levels, both meant to be branched on:

- **`type`** identifies the problem itself. It is a URI, and it does not have to
  resolve to anything. igo sets `urn:igo:validation-failed` when a schema
  rejects a request — the `urn:igo:` namespace marks the errors the framework
  itself produces. Otherwise it stays `about:blank`, which the RFC defines as
  "no specific type — the status says it all".
- **`errors[].code`** identifies what is wrong with one field: `invalid_type`,
  `too_small`, `invalid_format`, `invalid_value`… These come from the schema
  library and are stable across versions.

Branch on `type` and `code`, never on `title` or `message`: those are display
strings whose wording changes with the schema library's version and locale.

```js
if (problem.type === 'urn:igo:validation-failed') {
  for (const { path, code } of problem.errors) {
    setFieldError(path, translate(code));     // code, not message
  }
}
```

`path` is dotted, and includes array indices: `tags.0`, `author.email`.

### Typing your own errors

This is where the format earns its keep. A status code says a request failed; a
`type` says **why**, and lets a client react to a specific business situation:

```js
const { sendProblem } = require('@igojs/server');

exports.borrow = async (req, res) => {
  const book = await Book.find(req.params.id);
  if (!book) {
    return sendProblem(res, 404, { detail: 'Book not found' });
  }
  if (book.stock === 0) {
    return sendProblem(res, 409, {
      type:   '/problems/out-of-stock',
      title:  'Book is out of stock',
      detail: `"${book.title}" is not available right now`,
    });
  }
  ...
};
```

Without the `type`, a client receiving a 409 cannot tell "out of stock" from
"already borrowed" without parsing a human sentence.

Define a type whenever a client would plausibly react differently — not one per
status code. A 404 rarely needs one; a 409 or a 422 usually does.

`title` defaults to the standard HTTP wording for the status (`Conflict` for
409, `Too Many Requests` for 429), so pass it only when you have something more
precise to say.

**A convention, not a rule.** igo suggests `/problems/<slug>` — a relative URI,
so it resolves against your own origin and you can serve documentation there
later if you want to. URNs (`urn:myapp:out-of-stock`) and absolute URLs work
just as well. The RFC only asks for a URI that stays stable, since clients
branch on it. Pick one form and keep it across the project.

::: tip Why igo's own type is a URN
`/problems/<slug>` belongs to your application: it resolves against your domain,
and the slugs are yours to define. igo's own errors cannot live there — the same
framework error would get a different identifier on every project, and would
compete with your slugs. Hence `urn:igo:validation-failed`: one namespace for
the framework, identical everywhere, and `/problems/*` left entirely to you.
:::

Outside production a 500 includes the error message as `detail`; in production
it is omitted. Crash emails are unaffected — only the response format changes.

## DTOs

Returning a model straight from a controller sends every column it has:

```js
res.json(book);         // whatever `books` holds today, and tomorrow
```

Add `internal_cost` to the table six months later and it reaches the browser —
no controller changed, no test failed, nothing to notice in review.

A DTO is a plain function that picks what goes out. It is an allow-list: a new
column is invisible until someone names it here.

```js
exports.serialize = (book) => ({
  id:        book.id,
  title:     book.title,
  createdAt: book.created_at,       // snake_case in SQL, camelCase over the wire
});
```

```js
res.json(dto.serialize(book));
```

Nothing in igo looks for this function — the controller calls it, so the name is
a convention, not a hook. It also decouples the two shapes: renaming a column
changes `serialize()`, not the API contract. And one model can have several
serializers when two audiences see different fields.

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
igo create myapi --skel=api
```

TypeScript, with a working domain — model, DTO, controller, routes, migration
and integration tests.
