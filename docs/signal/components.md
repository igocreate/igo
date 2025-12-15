# Signal Components

Signal is a reactive frontend framework for Igo.js with SSR support and automatic dependency tracking.

## Overview

Signal components provide:
- **Reactive state** with deep Proxy tracking
- **Computed values** with automatic dependency detection
- **SSR support** with client-side hydration
- **Efficient updates** via DiffDOM reconciliation

## Component Lifecycle

```
constructor()
    ↓
init()
    ↓
loadTemplate()
    ↓
render() ←──────────────┐
    ↓                   │
beforeRender()          │
    ↓                   │
_computeGettersAsDerived()
    ↓                   │
dust.render()           │
    ↓                   │
DiffDOM.apply()         │
    ↓                   │
_bindEvents()           │
    ↓                   │
afterRender()           │
    ↓                   │
[state mutation] ───────┘
```

## Creating a Component

### 1. Define the Component Class

```javascript
const { SignalComponent } = require('@igo/signal');

class ProductList extends SignalComponent {
  constructor(element) {
    // Template path (relative to views/)
    super(element, 'components/ProductList');
  }

  // Computed value - automatically re-computed when dependencies change
  get filteredProducts() {
    const search = this.state.form?.search?.toLowerCase() || '';
    return this.props.products.filter(p =>
      p.name.toLowerCase().includes(search)
    );
  }

  // Event bindings
  get events() {
    return [
      { selector: '.add-btn', eventType: 'click', handler: this.onAdd },
      { selector: '.delete-btn', eventType: 'click', handler: this.onDelete }
    ];
  }

  onAdd(e) {
    this.state.items.push({ id: Date.now(), name: 'New Item' });
  }

  onDelete(e) {
    const id = Number(e.target.dataset.id);
    const index = this.state.items.findIndex(i => i.id === id);
    this.state.items.splice(index, 1);
  }

  // Lifecycle hooks
  async beforeRender() {
    // Called before each render
  }

  async afterRender() {
    // Called after each render
  }
}

module.exports = ProductList;
```

### 2. Create the Template

```html
{! views/components/ProductList.dust !}
<div data-component="components/ProductList"
     data-props="{@serialize props="products,form" /}">

  <input type="text" name="search" value="{form.search}">

  <ul>
    {#filteredProducts}
      <li>
        {name}
        <button class="delete-btn" data-id="{id}">×</button>
      </li>
    {:else}
      <li>No products found</li>
    {/filteredProducts}
  </ul>

  <button class="add-btn">Add Product</button>
</div>
```

### 3. Register in Client Entry

```javascript
// assets/js/app.js
const signal = require('@igo/signal/src/front');

signal.start({
  components: require.context('./components', true, /\.js$/),
  helpers: require('./helpers')
});
```

## Reactivity

### State

State is deeply reactive via Proxy:

```javascript
// All of these trigger re-render
this.state.count = 5;
this.state.user = { name: 'John' };
this.state.user.name = 'Jane';
this.state.items.push({ id: 1 });
this.state.items[0].active = true;
```

### Props

Props come from the server and are immutable:

```javascript
// In controller
res.locals.signal_props = {
  products: await Product.list(),
  user: req.session.user
};
```

```javascript
// In component
this.props.products  // Array of products
this.props.user      // Current user
```

### Computed Values (Getters)

Getters are automatically tracked and cached:

```javascript
get totalPrice() {
  // Automatically re-computed when this.props.products or this.state.cart changes
  return this.state.cart.reduce((sum, item) => {
    const product = this.props.products.find(p => p.id === item.productId);
    return sum + (product?.price || 0) * item.quantity;
  }, 0);
}
```

## Forms

When `props.form` exists, forms are automatically bound:

```javascript
// Controller
res.locals.signal_props = {
  form: {
    search: req.query.search || '',
    category: req.query.category || 'all'
  }
};
```

```html
<input type="text" name="search" value="{form.search}">

<select name="category">
  <option value="all" {@selected key="all" value=form.category /}>All</option>
  <option value="electronics" {@selected key="electronics" value=form.category /}>Electronics</option>
</select>
```

```javascript
// In component - access form values
get filteredProducts() {
  const { search, category } = this.state.form;
  return this.props.products.filter(p => {
    if (category !== 'all' && p.category !== category) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
}
```

## SSR (Server-Side Rendering)

Signal components support SSR via the `ssr()` static method:

```javascript
// In controller
res.locals.signal_props = { products };
res.locals.signal_components = [ProductList];  // SSR these components
res.render('products/index');
```

The middleware will:
1. Serialize props with deduplication
2. Call `ProductList.ssr(props)` to compute derived values
3. Merge computed values into `res.locals`
4. Render the template with full data

## Child Components

Components can be nested:

```html
{! Parent component !}
<div data-component="ProductPage">
  {! Child component with its own props !}
  <div data-component="ProductList"
       data-props="{@serialize props="products" /}">
    ...
  </div>
</div>
```

Child components:
- Are preserved by DiffDOM
- Are mounted automatically after parent render
- Have their props synced when parent re-renders
