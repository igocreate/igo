
# Views

Igo.js renders HTML through [@igojs/dust](../dust/getting-started) — full template syntax is documented there. This page focuses on how views integrate with the server: the view engine, view helpers, and the built-in `@dateformat` helper.

## Layout

Templates live in `/views`:

```
views/
├── layouts/
│   └── default.dust
├── users/
│   ├── index.dust
│   └── show.dust
└── emails/
    └── welcome.mjml
```

Render from a controller:

```js
module.exports.show = async (req, res) => {
  res.render('users/show', { user });   // → /views/users/show.dust
};
```

The view engine is wired up automatically by `@igojs/server` (Dust as the engine, `/views` as the directory, view cache enabled in production).

## Built-in helpers

In addition to the helpers shipped with [@igojs/dust](../dust/helpers), Igo.js registers two helpers in the server layer.

### `@t` — translations

Available in every template through `res.locals.t` (set by the i18n middleware):

```dust
<h1>{@t key="welcome.title" /}</h1>
<p>{@t key="welcome.hello" name=user.name /}</p>
```

Backed by [i18next](https://www.i18next.com/). Translation files live in `/locales/<lang>/translation.json` — see [i18n](./i18n).

### `@dateformat` — date formatting

Formats `Date` values via [moment.js](https://momentjs.com/). Strings are passed through unchanged.

```dust
{@dateformat date=user.created_at /}
{@dateformat date=user.created_at format="DD/MM/YYYY" /}
{@dateformat date=user.created_at format="calendar" /}
{@dateformat date=user.created_at format="LLLL" lang="fr" /}
```

- `format` defaults to `'YYYY-MM-DD HH:mm:ss'`. `'calendar'` uses moment's relative `.calendar()` output.
- `lang` defaults to the current request language (`res.locals.lang`). Pass `lang=` to override per-call.

## Custom view helpers

Register additional Dust helpers and filters in `/app/helpers.js`:

```js
// app/helpers.js

module.exports.init = (dust) => {
  // @nl2br helper — convert newlines to <br/>
  dust.helpers.nl2br = (params) => {
    if (!params.value) return '';
    return params.value.replace(/\r?\n/g, '<br/>');
  };

  // money filter — format numbers as currency
  dust.filters.money = (value) => '$' + Number(value).toFixed(2);
};
```

```dust
{@nl2br value=description /}
{price|money}
```

The file is loaded automatically at startup if it exists. The `dust` argument is the `@igojs/dust` module — see [Custom Helpers](../dust/helpers#custom-helpers) and [Custom Filters](../dust/filters#custom-filters) for the API.
