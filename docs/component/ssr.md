
# Server-Side Rendering

Component pages are fully rendered on the server, then hydrated in the browser. The HTML is complete before any JavaScript runs.

## The `@component` helper

In a single-file component setup, you render a component with the `@component` Dust helper:

```dust
{! views/products/index.dust !}
<h1>Products</h1>
{@component name="components/ProductList" products=products title="On sale" /}
```

The helper:

1. Loads the SFC (`views/components/ProductList.dust`)
2. Merges caller params with `props` defaults from the definition
3. Computes all derived values (getters) with the merged props
4. Renders the Dust template with the full context
5. Serializes the merged props using [devalue](https://github.com/Rich-Harris/devalue) (XSS-safe)
6. Wraps the output in `<div data-component data-props>` for client hydration

The result the browser receives looks like:

```html
<div data-component="components/ProductList" data-props="…serialized…">
  <!-- full HTML, getters already evaluated -->
</div>
```

When `start()` mounts in the browser, it reads `data-props`, runs the definition's `init()`, and the component is interactive — no re-render needed for the initial paint.

### Stable keys for dynamic lists

In a loop, pass `key=` to give each instance a stable identity across re-renders:

```dust
{#products}
  {@component name="components/ProductCard" product=. key=.id /}
{/products}
```

`key=` is written as `data-component-key` and used by the runtime to match instances when the parent re-renders. Without it, the component name is used as the key — fine for single mounts, ambiguous for lists.

## Serialization

The serializer handles common types automatically:

| Type | Behavior |
|------|----------|
| Plain objects, arrays | Recursively serialized |
| Dates | Preserved as `Date` objects on the client |
| Model instances (with `.serialize()`) | `.serialize()` is called automatically |
| Form instances (with `.getValues()`) | `.getValues()` is called automatically |
| Circular references | Detected and skipped |

You pass raw Model instances in props; the serializer takes care of `.serialize()` and deduplicates repeated references (WeakMap-based).

### The `@serialize` helper

If you mount a component the manual way — by writing the wrapper `<div data-component>` in a template instead of using `{@component}` — use `@serialize` to embed local props on the wrapper:

```dust
<div data-component="products/Detail"
     data-props="{@serialize props="selectedProduct,form" /}">
  …
</div>
```

This serializes only the listed keys from template locals and emits an HTML-safe attribute. Most apps don't need this — the `{@component}` helper builds `data-props` for you.

## Endpoints

Two endpoints serve component assets to the browser. Register them in `app/routes.js`:

```js
app.get('/__component/templates', component.templates);
app.get('/__component/component', component.component);
```

### `GET /__component/templates?file=<name>`

Returns the compiled Dust template source as JSON. Used by class-based components that load their template lazily.

### `GET /__component/component?name=<name>`

Returns `{ scriptSrc, templateSource }` — the SFC `<script>` block and the compiled template source. The runtime evaluates the definition and builds an `IgoComponent` subclass on the fly. This is the path used by the SFC auto-loader.

Both endpoints validate the file/name with a strict regex (`/^[a-zA-Z0-9_/-]+$/`, no `..`) to prevent path traversal.
