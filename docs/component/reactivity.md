
# Reactivity

Components are reactive: mutating `state` or `props` triggers an automatic re-render. The system uses JavaScript Proxies — similar to Vue 3 — with deep tracking and getter memoization.

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
  {@component name="components/ProductList" products=products title="On sale" /}
  ```

- **Class-based mount** — the parent template embeds them on the wrapper `<div data-component>` via `{@serialize}`:

  ```dust
  <div data-component="products/List" data-props="{@serialize props="products" /}">
  ```

## Computed values (getters)

Define computed values as JavaScript getters in the definition object. Dependencies are tracked automatically and the result is memoized.

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

Getters can compose. Above, `hasResults` reads `filteredItems`, which itself depends on `state.filter` and `props.items`. The cache invalidation propagates the right way.

### Reserved names

These names are used internally and cannot be overridden as getters:

- `rawState`
- `events` (recognised on the class-based pattern)
- Any getter whose name starts with `_`

See [Internals](./internals) for how the dependency tracker and cache work.
