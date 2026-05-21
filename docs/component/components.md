
# Components

## Single-file component (SFC)

A component is a `.dust` file that contains a `<script>` block followed by the template. The script returns a bare object — no class, no `import`, no manual registration.

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
    const q = this.state.filter.toLowerCase();
    return this.props.products.filter(p => p.name.toLowerCase().includes(q));
  },

  onFilter(e) {
    this.state.filter = e.target.value;
  },

  async onDelete(e) {
    const id = Number(e.target.dataset.id);
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    this.props.products = this.props.products.filter(p => p.id !== id);
  }
})
</script>

<div>
  <h2>{title}</h2>
  <input type="text" on:input="onFilter" value="{filter}" placeholder="Filter…">

  <ul>
    {#filteredProducts}
      <li>
        {.name} — ${.price}
        <button on:click="onDelete" data-id="{.id}">Delete</button>
      </li>
    {/filteredProducts}
  </ul>
</div>
```

### Definition object

The `<script>` block returns a single object literal. Its keys are picked up as follows:

| Key | Type | Purpose |
|-----|------|---------|
| `props` | Object | Default values for props. Overridden by caller-passed values from `{@component}` or `data-props`. |
| `state` | Object | Initial reactive state. Cloned per instance. |
| `get xyz()` | Getter | Computed value with auto-tracked dependencies, available as `{xyz}` in the template. |
| `methodName()` | Function | Event handler (called by `on:click="methodName"`) or any custom method. |

Inside getters and methods, `this.props`, `this.state`, and `this.<getter>` are all available. Mutating `state` or `props` triggers a re-render — see [Reactivity](./reactivity).

### Template context

The template receives a flat merge of `{ ...props, ...state, ...derivedGetters }`. So in the example above, `{title}` resolves to `props.title`, `{filter}` to `state.filter`, and `{filteredProducts}` to the getter result.

## Rendering a component

Use the `{@component}` Dust helper:

```dust
{@component name="components/ProductList" products=products title="Soldes" /}
```

This renders the component server-side and emits a hydration-ready wrapper:

```html
<div data-component="components/ProductList" data-props="…serialized…">
  <!-- fully rendered HTML -->
</div>
```

Caller params (`products=…`, `title=…`) override the corresponding `props` defaults from the definition.

## Lifecycle

```
constructor(element)
    ↓
init()                          ← load template, set up form binding
    ↓
render() ←──────────────────┐
    ↓                        │
beforeRender()                │
    ↓                        │
compute getters (memoized)    │
    ↓                        │
dust.render(template, ctx)    │
    ↓                        │
DiffDOM.apply()               │
    ↓                        │
sync child props              │
    ↓                        │
bind events (WeakMap-cached)  │
    ↓                        │
mount child components        │
    ↓                        │
afterRender()                 │
    ↓                        │
[state mutation] ─────────────┘
```

### Hooks

Add any of these as methods in the definition object:

```js
({
  async beforeRender() { /* before each render */ },
  async afterRender()  { /* after each render — DOM is updated */ },
  async onError(err)   { /* if render throws */ }
})
```

`afterRender` is the right place for focus management, scroll restoration, or initialising third-party libs that need a stable DOM.

## Child components

Components can be nested. Each `[data-component]` element becomes its own component instance with isolated state.

Inline:

```dust
{! Parent template !}
<div>
  <h1>Dashboard</h1>
  {@component name="components/ProductList" products=products /}
  {@component name="components/CartSummary" cart=cart /}
</div>
```

Each child component manages its own state, getters and events. When the parent re-renders, child DOM nodes are **preserved** (not recreated). Their `data-props` are re-evaluated and the child re-renders if its props changed.

### Stable identity in dynamic lists

When you render a list of components, give each one a `key=` param. The helper writes it as `data-component-key`; the runtime uses that to match instances across re-renders.

```dust
{#products}
  {@component name="components/ProductCard" product=. key=.id /}
{/products}
```

Without an explicit `key=`, the component name is used — fine for one-off mounts but ambiguous for repeated children.

## Class-based components (advanced)

For cases where you need lifecycle methods that don't fit the definition object — heavy custom logic, dynamic component classes, etc. — you can also extend `IgoComponent` directly:

```js
const { IgoComponent } = require('@igojs/component/client');

class Counter extends IgoComponent {
  constructor(element) {
    super(element, 'components/Counter');
  }

  get events() {
    return [
      { selector: '.increment', eventType: 'click', handler: this.onIncrement }
    ];
  }

  onIncrement() {
    this.state.count = (this.state.count || 0) + 1;
  }
}

// Register at startup
start({ components: { 'components/Counter': Counter } });
```

This pre-`6.0` pattern is still supported. Most apps should reach for SFC first — the `on:` event syntax replaces the `events` getter, and the definition object handles the boilerplate.

## API reference

### Instance properties

| Property | Description |
|----------|-------------|
| `element` | The DOM element this component is mounted on |
| `props` | Reactive Proxy over the props (read + mutate, triggers render) |
| `state` | Deep reactive Proxy over state |
| `rawState` | Plain state object — access without triggering renders |

### Lifecycle methods

| Method | Description |
|--------|-------------|
| `init()` | Called once after the constructor — template load + form handler setup |
| `render()` | Render the component (called automatically on state mutation) |
| `beforeRender()` / `afterRender()` | Render hooks |
| `onError(error)` | Hook for render errors |
| `destroy()` | Cleanup: cancel pending renders, unbind events, clear caches |
