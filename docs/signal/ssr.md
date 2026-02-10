
# Server-Side Rendering

Signal supports SSR with automatic client-side hydration. Pages are fully rendered on the server, then made interactive in the browser.

## How SSR Works

```
Server                              Client
──────                              ──────
1. Controller sets signal_props     4. Parse __signal_props (devalue)
2. Middleware serializes props      5. Mount [data-component] elements
3. Component.ssr() computes         6. Create reactive Proxies
   derived values → template        7. Load template, render, bind events
```

## Server Setup

### Middleware

Add the Signal middleware to your Express app:

```js
const { signal } = require('@igojs/signal');

app.use(signal.middleware);
app.get('/__signal/templates', signal.templates);
```

The middleware:
1. Serializes `signal_props` using [devalue](https://github.com/Rich-Harris/devalue) (XSS-safe)
2. Injects the result as `window.__signal_props` in the page
3. Runs `Component.ssr()` for registered components
4. Merges derived values into `res.locals` for template access

### Controller

```js
app.get('/products', async (req, res) => {
  const products = await Product.list();

  res.locals.signal_props = { products };
  res.locals.signal_components = [ProductList]; // Optional: SSR getters
  res.render('products/index');
});
```

### SSR Derived Values

When you register components in `signal_components`, their getters are computed server-side and merged into the template locals:

```js
class ProductList extends SignalComponent {
  get totalPrice() {
    return this.props.products.reduce((sum, p) => sum + p.price, 0);
  }
}

// Controller
res.locals.signal_components = [ProductList];
// → res.locals.totalPrice is now available in the template
```

This means `{totalPrice}` works in the Dust template even before JavaScript loads.

## Serialization

### The `@serialize` Helper

Use `@serialize` in templates to embed props in `data-props` attributes:

```html
<div data-component="ProductList"
     data-props="{@serialize props="products,form" /}">
  ...
</div>
```

This serializes the specified locals using devalue and embeds them as a JavaScript expression.

### What Gets Serialized

The serializer handles:

| Type | Behavior |
|------|----------|
| Plain objects | Recursively serialized |
| Arrays | Recursively serialized |
| Dates | Preserved as Date objects |
| Models (with `.serialize()`) | `.serialize()` called |
| Forms (with `.getValues()`) | `.getValues()` called |
| Circular references | Detected and skipped |

### Global vs Local Props

```html
{! Global props — available to all components !}
<script>window.__signal_props = {__signal_props|s};</script>

{! Local props — specific to this component !}
<div data-component="Counter"
     data-props="{@serialize props="count" /}">
```

Local props override global props for the same key.

## Client Hydration

On the client, the component constructor:

1. Reads `window.__signal_props` (global props)
2. Parses `data-props` attribute (local props)
3. Merges them (`local` overrides `global`)
4. Creates reactive Proxies around the result
5. Loads the Dust template via `/__signal/templates`
6. Renders with DiffDOM

```js
// This happens automatically — you don't write this code
const globalProps = window.__signal_props || {};
const localProps  = parseDataProps(element.dataset.props);
const props = { ...globalProps, ...localProps };
```

## Template Endpoint

Signal fetches Dust templates on the client via:

```
GET /__signal/templates?file=products/List
```

This returns the compiled template source as JSON. Templates are cached in the browser after the first load.

## i18n Support

Signal injects translations for client-side i18next:

```js
// Server: configure translations
const signal = require('@igojs/signal');
signal.configure({
  translations: require('./locales/en.json'),
});
```

On the client, translations are available via `window.__signal_translations` and loaded into i18next automatically. The language is detected from the `<html lang>` attribute.
