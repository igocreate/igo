
# Reactivity

Components are reactive: mutating `state` or `props` triggers an automatic re-render. The system uses JavaScript Proxies — similar to Vue 3 — with deep tracking.

## State

State is deeply reactive. Any mutation at any depth re-renders:

```js
this.state.count = 5;                    // primitive write
this.state.user = { name: 'John' };      // replace object
this.state.user.name = 'Jane';           // nested write
this.state.items.push({ id: 1 });        // array mutation
this.state.items[0].active = true;       // nested array write
this.state.items.splice(0, 1);           // structural change
```

### Supported array methods

```
push, pop, shift, unshift, splice, sort, reverse
```

These are intercepted by the StateProxy — mutations through them trigger a render.

### Raw state

For internal bookkeeping you don't want to trigger renders, use `rawState`:

```js
this.rawState.lastFetchTime = Date.now();  // no re-render
```

### Render batching

Multiple state mutations in the same synchronous block are coalesced into a single render via `requestAnimationFrame`:

```js
onSubmit() {
  this.state.loading = true;
  this.state.error = null;
  this.state.items = [];
  // → exactly one render (on the next animation frame)
}
```

## Props

Props are passed from the parent — either through the `{@component}` helper params, or via `data-props` for class-based mounts. They're **read** through a tracking Proxy: every access to `this.props.<x>` is recorded as a dependency.

```js
get total() {
  return this.props.items.reduce((sum, i) => sum + i.price, 0);
}
```

You can also mutate props from within a component — mutations behave like state writes and trigger a re-render:

```js
async onDelete(id) {
  await fetch(`/api/items/${id}`, { method: 'DELETE' });
  this.props.items = this.props.items.filter(i => i.id !== id);
}
```

That said, treating props as one-way data (parent → child) and keeping mutations in `state` is the cleaner convention.

### Where props come from

Props are always scoped to the component instance, set by the parent that renders it:

- **SFC mount** — caller params on the `{@component}` helper become props on the child instance:

  ```dust
  {@component "components/ProductList" products title="On sale" /}
  ```

- **Class-based mount** — the parent template embeds them on the wrapper `<div data-component>` via `{@serialize}`:

  ```dust
  <div data-component="products/List" data-props="{@serialize props="products" /}">
  ```

## Computed values (getters)

Define computed values as JavaScript getters in the definition object. They are evaluated on each render.

```js
({
  state: { filter: '' },

  get filteredItems() {
    const q = this.state.filter.toLowerCase();
    return this.props.items.filter(i => i.name.toLowerCase().includes(q));
  },

  get hasResults() {
    return this.filteredItems.length > 0;
  }
})
```

Getters can compose. Above, `hasResults` reads `filteredItems`, which itself depends on `state.filter` and `props.items`. Within a single render each getter is computed at most once, even when read by several others.

### Reserved names

These names are used internally and cannot be overridden as getters:

- `rawState`
- `events` (recognised on the class-based pattern)
- Any getter whose name starts with `_`

## Watchers

To run a side effect when a specific value changes, declare a `watch` map. Each handler receives `(newValue, oldValue)` and runs with `this` bound to the component:

```js
({
  state: { query: '' },

  watch: {
    // a local state path
    'state.query'(value, previous) {
      this.search(value);
    },
    // a prop the parent may change
    'props.client'(client) {
      this.state.query = '';
    },
    // a shared store key (see Shared state)
    'store.modal'(name) {
      this.state.open = name === 'settings';
    },
  },
})
```

Keys are namespaced by prefix — `state.`, `props.`, or `store.` — and match an **exact dotted path** (`state.form.email` fires only for that field, not its siblings). A **bare key** with no prefix defaults to `store.`, since cross-component state is the common case for watchers:

```js
watch: {
  client(c) { /* same as 'store.client' */ },
}
```

Watchers fire on writes through the reactive proxy, including array mutators (`push`, `splice`, …). They run **in addition** to the automatic re-render, not instead of it — use them for side effects (fetching, resetting a dependent field), not to derive values you render (use a getter for that).

## Shared state across components

For data shared between components on the same page — parent ↔ siblings, siblings ↔ siblings, or anything outside the immediate parent chain — use `this.store`. See [Shared state](./shared-state).

See [Internals](./internals) for how rendering and reconciliation work.
