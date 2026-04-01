# @igojs/component

Reactive components with SSR for Igo.js. Single-file `.dust` components with deep reactivity, auto-tracking, and server-side rendering.

## Installation

```sh
npm install @igojs/component
```

## Overview

```
Single-file .dust component
        ↓
   <script> block    →  Component definition (props, state, getters, methods)
   Template block    →  Dust template
        ↓
   Server (SSR)      →  {@component name="..." /} renders HTML + serialized props
   Client (Hydration) →  Auto-loads definition, binds reactivity, events, forms
```

## Single-File Component

A `.dust` file with a `<script>` block containing a bare JS object:

```dust
{! views/components/ProductList.dust !}
<script>
({
  props: {
    products: [],
    title: 'Products'
  },

  state: {
    filter: ''
  },

  get filteredProducts() {
    return this.props.products.filter(p =>
      p.name.toLowerCase().includes(this.state.filter.toLowerCase())
    );
  },

  onFilter(e) {
    this.state.filter = e.target.value;
  },

  async onDelete(e) {
    const id = e.target.dataset.id;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    this.props.products = this.props.products.filter(p => p.id !== id);
  }
})
</script>

<div class="product-list">
  <h2>{title}</h2>
  <input type="text" on:input="onFilter" placeholder="Filter..." value="{filter}">

  <ul>
    {#filteredProducts}
      <li>
        {.name} - ${.price}
        <button on:click="onDelete" data-id="{.id}">Delete</button>
      </li>
    {/filteredProducts}
  </ul>
</div>
```

### Definition Object

| Key | Type | Description |
|-----|------|-------------|
| `props` | Object | Default prop values. Merged with caller props. |
| `state` | Object | Initial reactive state. Cloned per instance. |
| `get xyz()` | Getter | Computed value with auto-dependency tracking. |
| `method()` | Function | Event handler or custom method. |

## Server-Side Usage

### Routes Setup

```javascript
// app/routes.js
const component = require('@igojs/component');

module.exports.init = (app) => {
  app.use(component.middleware);
  app.get('/__component/templates', component.templates);
  app.get('/__component/component', component.component);

  app.get('/products', ProductController.index);
};
```

### Controller

No special API needed. Just pass data to `res.render`:

```javascript
// app/controllers/ProductController.js
module.exports.index = async (req, res) => {
  const products = await Product.where({ active: true }).list();
  res.render('products/index', { products });
};
```

### Template with `{@component}`

Use the `{@component}` helper to render a component server-side:

```dust
{! views/products/index.dust !}
{@component name="components/ProductList" products=products title="On sale" /}
```

This outputs:
```html
<div data-component="components/ProductList" data-props="...serialized...">
  <!-- Server-rendered HTML -->
</div>
```

The helper:
1. Loads the `.dust` file and extracts `<script>` + template
2. Merges caller props with definition defaults
3. Computes derived values (getters) for SSR
4. Renders the template server-side
5. Serializes props into `data-props` for client hydration

### i18n Configuration (optional)

```javascript
component.configure({
  translations: require('./locales/fr/translation.json')
});
```

## Client-Side Usage

### Entry Point

```javascript
// assets/js/app.js
const { start } = require('@igojs/component/client');

start();
```

That's it. Components are auto-loaded from the server on demand.

### How It Works

1. `start()` finds all `[data-component]` elements in the DOM
2. For each, fetches the component definition from `/__component/component`
3. Builds a class with the definition's methods and getters
4. Hydrates props from `data-props`, initializes state, binds events
5. On state change, re-renders with DiffDOM reconciliation

### Custom Dust Helpers

```javascript
start({
  helpers: {
    formatPrice: (params) => '$' + Number(params.value).toFixed(2)
  }
});
```

## Inline Events

Use `on:<event>="methodName"` in templates:

```dust
<button on:click="onDelete">Delete</button>
<input on:input="onFilter">
<select on:change="onSort">
```

These are rewritten to `data-on-click`, `data-on-input`, etc. before Dust parsing, then auto-bound on the client.

## Reactivity

### State

Deep reactivity via Proxy. Any mutation triggers a re-render:

```javascript
this.state.count = 5;                    // Triggers render
this.state.user.name = 'Jane';           // Nested - triggers render
this.state.items.push({ id: 1 });        // Array method - triggers render
this.state.items[0].active = true;       // Nested array - triggers render
```

### Computed Values (Getters)

Getters auto-track their dependencies and are memoized:

```javascript
get filteredProducts() {
  // Tracks: this.props.products, this.state.filter
  return this.props.products.filter(p =>
    p.name.includes(this.state.filter)
  );
}
```

Recalculates only when `this.props.products` or `this.state.filter` changes.

### Props

Props come from the server via `data-props`. They are **reactive** — mutations trigger a re-render, just like state:

```javascript
this.props.count++;                              // Triggers render
this.props.products = this.props.products.filter(p => p.id !== id);  // Triggers render
```

## Form Handling

Automatic two-way binding when `props.form` is provided:

```javascript
// Controller
res.render('products/index', {
  form: { search: req.query.search || '', category: 'all' }
});
```

```dust
{@component name="components/Search" form=form /}
```

```dust
<script>
({
  props: {
    form: { search: '', category: 'all' }
  },

  get hasFilter() {
    return this.state.form.search.length > 0;
  }
})
</script>

<input type="text" name="search" value="{form.search}">
<select name="category">
  <option value="all">All</option>
  <option value="electronics">Electronics</option>
</select>
```

All form inputs with a `name` attribute are automatically synced to `this.state.form`. Supported input types:

| Input | Stored value |
|-------|-------------|
| `type="text"`, `textarea` | String |
| `type="checkbox"` | Boolean (single) or Array of strings (`name="x[]"`) |
| `type="radio"` | String |
| `select` | String |
| `select[multiple]` | Array of strings |

## Lifecycle

```
constructor → init → render ←─────────┐
                       ↓               │
                 beforeRender()        │
                       ↓               │
              compute getters          │
                       ↓               │
                dust.render()          │
                       ↓               │
                DiffDOM.apply()        │
                       ↓               │
              sync child props         │
                       ↓               │
                bind events            │
                       ↓               │
             mount child components    │
                       ↓               │
                afterRender()          │
                       ↓               │
               [state mutation] ───────┘
```

### Hooks

Override in your definition:

```javascript
({
  async beforeRender() { /* before each render */ },
  async afterRender()  { /* after each render */ },
  async onError(err)   { /* if render throws */ }
})
```

## Class-Based Components (Advanced)

For complex cases, extend `IgoComponent` directly:

```javascript
const { IgoComponent } = require('@igojs/component/client');

class Counter extends IgoComponent {
  constructor(element) {
    super(element, 'components/Counter');
    this.state.count = this.props.count || 0;
    this.events = [
      { selector: '.increment-btn', eventType: 'click', handler: this.onIncrement }
    ];
  }

  onIncrement() {
    this.state.count++;
  }
}
```

Register class-based components manually:

```javascript
start({
  components: { 'components/Counter': Counter }
});
```

## Server API

| Export | Description |
|--------|-------------|
| `middleware` | Express middleware (injects translations) |
| `templates` | `GET /__component/templates` - serves compiled Dust templates |
| `component` | `GET /__component/component` - serves component definition + template |
| `configure({ translations })` | Set i18n translations for client |
| `serialize(data)` | Serialize models/data for hydration |

## Module Structure

```
src/
├── client/
│   ├── index.js              # Entry point, start()
│   ├── IgoComponent.js       # IgoComponent base class
│   ├── ComponentLoader.js    # Auto-loading from server
│   ├── StateProxy.js         # Deep reactivity via Proxy
│   ├── DerivedCache.js       # Getter memoization
│   ├── EventBinder.js        # Event listener management
│   ├── FormHandler.js        # Two-way form binding
│   └── dust/
│       ├── Templates.js      # Template loading
│       ├── Utils.js          # Dust helpers/filters
│       └── i18n.js           # i18next setup
├── server/
│   ├── index.js              # Server exports
│   ├── ComponentController.js # Middleware and endpoints
│   ├── ComponentHelper.js    # {@component} Dust helper
│   └── SerializeUtils.js     # Data serialization
└── shared/
    └── serialize.js          # Shared serialization helpers
```
