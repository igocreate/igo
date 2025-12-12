# @igo/signal

Reactive frontend/SSR framework for Igo.js with automatic dependency tracking.

## Installation

```sh
npm install @igo/signal
```

## Features

- **Reactive State** - Deep reactivity via Proxy (like Vue 3)
- **Auto-tracking** - Automatic dependency detection for computed values
- **SSR Support** - Server-side rendering with hydration
- **DiffDOM** - Efficient DOM reconciliation
- **Form Handling** - Two-way binding for forms
- **Dust Templates** - Integration with @igo/dust

## Architecture

```
Props (immutable) → State (reactive) → Derived (computed) → Template → DOM
                          ↓                                           ↓
                    Proxy tracking                         DiffDOM reconciliation
```

## Quick Start

### Server Setup

```javascript
const express = require('express');
const signal = require('@igo/signal');

const app = express();

// Configure translations (optional)
signal.configure({
  translations: require('./locales/fr/translation.json')
});

// Add signal middleware
app.use(signal.middleware);

// Template endpoint for client-side loading
app.get('/__signal/templates', signal.templates);

// Controller
app.get('/products', (req, res) => {
  res.locals.signal_props = {
    products: await Product.list(),
    form: { search: req.query.search || '' }
  };
  res.render('products/index');
});
```

### Component Definition

```javascript
// components/ProductList.js
const { SignalComponent } = require('@igo/signal');

class ProductList extends SignalComponent {
  constructor(element) {
    super(element, 'components/ProductList');
  }

  // Computed value with auto-tracking
  get filteredProducts() {
    const search = this.state.form?.search?.toLowerCase() || '';
    return this.props.products.filter(p =>
      p.name.toLowerCase().includes(search)
    );
  }

  // Event handlers
  get events() {
    return [
      { selector: '.delete-btn', eventType: 'click', handler: this.onDelete }
    ];
  }

  async onDelete(e) {
    const id = e.target.dataset.id;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    this.props.products = this.props.products.filter(p => p.id !== id);
  }
}

module.exports = ProductList;
```

### Template (Dust)

```dust
{! views/components/ProductList.dust !}
<div data-component="components/ProductList" data-props="{@serialize props="products,form" /}">
  <input type="text" name="search" value="{form.search}" placeholder="Search...">

  <ul>
    {#filteredProducts}
      <li>
        {name} - ${price}
        <button class="delete-btn" data-id="{id}">Delete</button>
      </li>
    {/filteredProducts}
  </ul>
</div>
```

### Client Entry Point

```javascript
// assets/js/app.js
const signal = require('@igo/signal/src/client');

signal.start({
  components: require.context('./components', true, /\.js$/),
  helpers: require('./helpers')
});
```

## API

### Server

| Export | Description |
|--------|-------------|
| `middleware` | Express middleware for SSR |
| `templates` | Endpoint for client template loading |
| `configure({ translations })` | Configure i18n translations |
| `serialize(data)` | Serialize data for hydration |
| `SignalComponent` | Base component class |

### SignalComponent

| Property/Method | Description |
|-----------------|-------------|
| `this.props` | Immutable props from server |
| `this.state` | Reactive state (triggers re-render on change) |
| `this.rawState` | Direct state access (no reactivity) |
| `get xyz()` | Computed values with auto-tracking |
| `get events()` | Event bindings `[{selector, eventType, handler}]` |
| `beforeRender()` | Lifecycle hook before render |
| `afterRender()` | Lifecycle hook after render |
| `destroy()` | Cleanup component |

### Reactivity

```javascript
// Deep reactivity
this.state.user = { name: 'John' };
this.state.user.name = 'Jane';           // Triggers render
this.state.items.push({ id: 1 });        // Triggers render
this.state.items[0].active = true;       // Triggers render
```

### Form Handling

Forms are automatically bound when `props.form` exists:

```javascript
// In your component
get selectedProduct() {
  const id = Number(this.state.form?.product_id);
  return this.props.products.find(p => p.id === id);
}
```

```dust
<select name="product_id">
  {#products}
    <option value="{id}" {@selected key=id value=form.product_id /}>{name}</option>
  {/products}
</select>
```

## Module Structure

```
src/
├── client/                   # Browser code
│   ├── index.js              # Entry point, start()
│   ├── SignalComponent.js    # Base component class
│   ├── StateProxy.js         # Deep reactivity
│   ├── DerivedCache.js       # Computed value memoization
│   ├── EventBinder.js        # Event listener management
│   ├── FormHandler.js        # Two-way form binding
│   └── dust/
│       ├── Templates.js      # Template loading
│       ├── Utils.js          # Dust helpers/filters
│       └── i18n.js           # i18next setup
└── server/                   # Node.js code
    ├── index.js              # Server exports
    ├── SignalController.js   # SSR middleware
    └── SerializeUtils.js     # Data serialization
```

## Documentation

See the [full documentation](https://igocreate.github.io/igo/#/signal/components).
