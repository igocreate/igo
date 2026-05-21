
# Translations

`@igojs/component` provides client-side i18n so translations work in both server-rendered templates and interactive components.

## Setup

Nothing to configure — `component.init(app)` (auto-called by `@igojs/server`) registers a `GET /__component/translations` endpoint that returns the current request's translations as JSON. When `start()` runs in the browser, it fetches that endpoint, initialises i18next, and only then mounts components.

On the server, the endpoint reads from i18next via `req.i18n.getResourceBundle(req.language, 'translation')` — so the visitor's language is detected per-request, no hardcoded `require('./locales/en/translation.json')` needed.

### Preload (optional)

To hide the fetch round-trip behind the JS bundle download, add a `<link rel="preload">` in the layout `<head>`. The browser fetches translations in parallel; when `start()` later calls `fetch('/__component/translations')`, the response is already in the HTTP cache.

```dust
<link rel="preload" href="/__component/translations" as="fetch">
```

### Register the `t` helper

To use `{@t}` in client-side component templates, register a `t` helper in your entry point:

```js
const { start } = require('@igojs/component/client');

start({
  helpers: {
    t: (params) => window.i18next.t(params.key, params),
  },
});
```

## Usage

### In Dust templates

The `{@t}` helper works both server-side and client-side:

```dust
<h1>{@t key="welcome" name=user.name /}</h1>
<p>{@t key="products.count" count=count /}</p>
```

### In components

Use `window.i18next.t()` in getters:

```js
get emptyMessage() {
  return window.i18next.t('products.empty');
}
```

## How it works

When `start()` runs in the browser:

1. Detects the language from the `<html lang="...">` attribute
2. Fetches `/__component/translations` — the server returns the right language's translations from i18next
3. Initializes i18next with that data and exposes it as `window.i18next`
4. Then mounts components — so `{@t}` and `window.i18next.t()` are ready for the first render

No additional i18n setup is needed on the client side.
