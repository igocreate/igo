
# Translations

Igo component provides client-side i18n so that translations work in both server-rendered templates and interactive components.

## Setup

### 1. Configure translations

In your routes file, pass your translation data to the component system:

```js
const component = require('@igojs/component');

component.configure({
  translations: require('../locales/en/translation.json'),
});
```

The middleware serializes translations into `res.locals.__igo_translations`.

### 2. Layout script tag

Add the translations script tag in your layout, **before** the props and application scripts:

```html
<script>window.__igo_translations = {__igo_translations|s};</script>
<script>window.__igo_props = {__igo_props|s};</script>
<script src="{assets.vendor.js}"></script>
<script src="{assets.main.js}"></script>
```

### 3. Register the `t` helper

To use `{@t}` in client-side component templates, register a `t` helper in your entry point:

```js
const component = require('@igojs/component/src/client');

component.start({
  components: require.context('./components', true, /\.js$/),
  helpers: {
    t: (params) => window.i18next.t(params.key, params),
  },
});
```

## Usage

### In Dust templates

The `{@t}` helper works both server-side and client-side:

```html
<h1>{@t key="welcome" name=user.name /}</h1>
<p>{@t key="products.count" count=count /}</p>
```

### In components

Use `window.i18next.t()` in your getters:

```js
class ProductList extends IgoComponent {
  get emptyMessage() {
    return window.i18next.t('products.empty');
  }
}
```

## How it works

When `component.start()` is called in the browser:

1. Detects the language from the `<html lang="...">` attribute
2. Loads translations from `window.__igo_translations`
3. Initializes i18next and exposes it as `window.i18next`

No additional i18n setup is needed on the client side.
