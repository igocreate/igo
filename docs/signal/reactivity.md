
# Reactivity

Signal uses JavaScript Proxies to provide deep, automatic reactivity — similar to Vue 3's reactivity system.

## State

State is deeply reactive. Any mutation at any depth triggers a re-render:

```js
// All of these trigger re-render
this.state.count = 5;
this.state.user = { name: 'John' };
this.state.user.name = 'Jane';
this.state.items.push({ id: 1 });
this.state.items[0].active = true;
this.state.items.splice(0, 1);
```

### Supported Array Methods

Array mutations are intercepted automatically:

| Method | Effect |
|--------|--------|
| `push()` | Add items to end |
| `pop()` | Remove last item |
| `shift()` | Remove first item |
| `unshift()` | Add items to start |
| `splice()` | Add/remove items at index |
| `sort()` | Sort in place |
| `reverse()` | Reverse in place |

### Raw State

Use `rawState` to access state without triggering renders. Useful for internal bookkeeping:

```js
this.rawState.lastFetchTime = Date.now(); // No re-render
```

### Render Batching

Multiple state mutations in the same synchronous block are batched into a single render via `requestAnimationFrame`:

```js
onSubmit() {
  this.state.loading = true;
  this.state.error = null;
  this.state.items = [];
  // → Only ONE render happens (next animation frame)
}
```

## Props

Props come from the server and are **read-only**. They're set in the controller:

```js
// Controller
res.locals.signal_props = {
  products: await Product.list(),
  user: req.session.user,
};
```

In the component:

```js
this.props.products  // Array of products
this.props.user      // Current user
```

### Global vs Local Props

- **Global props** (`window.__signal_props`): shared by all components on the page, set via `res.locals.signal_props`
- **Local props** (`data-props` attribute): specific to a component instance

```html
<div data-component="ProductList"
     data-props="{@serialize props="products" /}">
```

Local props override global props when both define the same key.

## Computed Values (Getters)

Define computed values as JavaScript getters. Dependencies are tracked automatically:

```js
class ProductList extends SignalComponent {
  get totalPrice() {
    return this.props.products.reduce((sum, p) => sum + p.price, 0);
  }

  get filteredProducts() {
    const search = this.state.form?.search?.toLowerCase() || '';
    return this.props.products.filter(p =>
      p.name.toLowerCase().includes(search)
    );
  }

  get hasResults() {
    return this.filteredProducts.length > 0;
  }
}
```

### How It Works

1. Before computing a getter, Signal enables dependency tracking
2. As the getter executes, every access to `this.props.*`, `this.state.*`, or other getters is recorded
3. The result is cached with its dependencies
4. On the next render, Signal checks if dependencies changed (shallow `Object.is` comparison)
5. If unchanged, the cached value is reused — otherwise, the getter recomputes

### Getters Can Depend on Other Getters

```js
get selectedId() {
  return Number(this.state.form?.product_id);
}

get selectedProduct() {
  return this.props.products.find(p => p.id === this.selectedId);
}
```

### Reserved Getter Names

These names are used internally and cannot be overridden:

- `rawState` — access internal state
- `events` — event bindings
- Any getter starting with `_` (private)
