
# Server-Side Rendering

Component pages are fully rendered on the server, then hydrated in the browser. The HTML is complete before any JavaScript runs.

## The `@component` helper

In a single-file component setup, you render a component with the `@component` Dust helper:

```dust
{! views/products/index.dust !}
<h1>Products</h1>
{@component "components/ProductList" products title="On sale" /}
```

The helper:

1. Loads the SFC (`views/components/ProductList.dust`)
2. Merges caller params with `props` defaults from the definition
3. Computes all derived values (getters) with the merged props
4. Renders the Dust template with the full context
5. Serializes the merged props using [devalue](https://github.com/Rich-Harris/devalue) (XSS-safe)
6. Wraps the output in `<div data-component>`, with the props in an inert `<script type="application/json">` island for client hydration

The result the browser receives looks like:

```html
<div data-component="components/ProductList">
  <script type="application/json" data-igo-props>…serialized props…</script>
  <!-- full HTML, getters already evaluated -->
</div>
```

The island is a non-executable `<script>` — it never runs, so no `script-src 'unsafe-inline'` is needed. When `start()` mounts in the browser, it reads the island with `devalue.parse` (no eval), removes it, runs the definition's `init()`, and the component is interactive — no re-render needed for the initial paint.

### What runs server-side

Only `props`, `state`, getters, and methods exist during SSR — enough to evaluate getters into the initial HTML:

```js
({
  state: { open: 'home' },
  isOpen(id) { return this.state.open === id; },
  get activeClass() { return this.isOpen('home') ? 'active' : ''; }  // works in SSR
})
```

Getters may call methods (as shown). Two things differ from the client and must be accounted for, or the first paint will not match what the client renders:

- **`init()` does not run server-side** — it runs once in the browser, before the first client render. State it sets is absent from the SSR HTML. Put values needed for the initial paint in `state` defaults or `props`, not `init()`.
- **`this.store` is empty server-side** — the page store is a client construct. Read it defensively in getters: `this.store.user?.name`.

A getter that throws server-side (e.g. it touches the DOM) is caught and logged, and its value is left out of the HTML — a silent first-paint mismatch until hydration. Keep getters DOM-free.

### Stable keys for dynamic lists

In a loop, pass `key=` to give each instance a stable identity across re-renders:

```dust
{#products}
  {@component "components/ProductCard" product=. key=.id /}
{/products}
```

`key=` is written as `data-component-key` and used by the runtime to match instances when the parent re-renders. Without it, the component name is used as the key — fine for single mounts, ambiguous for lists.

#### Keying plain elements with `data-key`

The same matching applies to ordinary elements during re-render. Reconciliation (morphdom) pairs siblings by position by default, so a node whose sibling order varies — e.g. an element rendered next to a conditional `{?…}` block — can be paired with the wrong node and silently recreated, losing its DOM state. Add `data-key` to pin its identity:

```dust
{?open}<div class="backdrop"></div>{/open}
<aside data-key="sidebar" class="drawer">…</aside>
```

With `data-key`, the `<aside>` keeps the same DOM node whether or not the backdrop is present. Note this preserves identity and state — it does not by itself animate the element appearing or disappearing; for that, see [Transitions](./transitions).

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

This serializes only the listed keys from template locals (with `devalue.stringify`) and emits an HTML-safe `data-props` attribute, read back with `devalue.parse` at mount. Most apps don't need this — the `{@component}` helper builds the props island for you.

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
