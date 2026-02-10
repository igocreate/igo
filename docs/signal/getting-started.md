
# Getting Started

## Introduction

@igojs/signal is a reactive frontend framework for Igo.js. It brings deep reactivity to server-rendered pages — without a virtual DOM, without a build-time compiler, and without a heavy runtime.

The idea was simple: we wanted interactive components on our server-rendered Dust templates, with the DX of modern frameworks but without the complexity. Signal uses JavaScript Proxies for automatic dependency tracking, DiffDOM for efficient patching, and Dust templates for rendering — all in a few kilobytes.

### Key Features

* **Deep Reactivity**: State changes at any depth trigger re-renders automatically
* **Computed Values**: Getters with automatic dependency tracking and memoization
* **SSR Support**: Server-side rendering with seamless client hydration
* **Two-way Form Binding**: Automatic input synchronization
* **Efficient DOM Updates**: DiffDOM-based reconciliation (no full re-render)
* **Zero Boilerplate**: No decorators, no annotations, no compile step

## Quick Start

### 1. Routes (`app/routes.js`)

Register the Signal middleware and template endpoint in your routes file:

```js
const signal = require('@igojs/signal');

module.exports.init = (app) => {
  // Signal middleware (serializes props, handles SSR)
  app.use(signal.middleware);

  // Template endpoint (serves Dust templates to the browser)
  app.get('/__signal/templates', signal.templates);

  // Your routes
  app.get('/products', ProductsController.index);
};
```

### 2. Controller (`app/controllers/ProductsController.js`)

```js
const ProductList = require('../components/products/List');

module.exports.index = async (req, res) => {
  const products = await Product.list();

  res.locals.signal_props = { products };
  res.locals.signal_components = [ProductList]; // SSR: compute getters server-side
  res.render('products/index');
};
```

### 3. Layout (`views/layout.dust`)

The layout must inject the serialized props for client hydration:

```html
<!DOCTYPE html>
<html lang="{lang}">
<head>
  <link rel="stylesheet" href="{assets.main.css}" />
</head>
<body>
  {+body/}
  <script>window.__signal_props = {__signal_props|s};</script>
  <script src="{assets.vendor.js}"></script>
  <script src="{assets.main.js}"></script>
</body>
</html>
```

### 4. Template (`views/products/index.dust`)

```html
{>layout/}
{<body}
<div data-component="products/List">
  <p>{count} product{@gt key=count value=1}s{/gt}</p>
  <ul>
    {#products}
      <li>{.name} — ${.price}</li>
    {/products}
  </ul>
  <button class="add-btn">Add product</button>
</div>
{/body}
```

Props set in `signal_props` are available to all components via `window.__signal_props`. Use `data-props` only to pass specific props to a child component (see [Components](./components)).

### 5. Component (`assets/js/components/products/List.js`)

```js
const { SignalComponent } = require('@igojs/signal/src/client');

class ProductList extends SignalComponent {
  constructor(element) {
    super(element, 'products/List');
  }

  get events() {
    return [
      { selector: '.add-btn', eventType: 'click', handler: this.onAdd },
    ];
  }

  get count() {
    return this.props.products.length;
  }

  onAdd() {
    this.props.products.push({ name: 'New product', price: 0 });
  }
}

module.exports = ProductList;
```

### 6. Client Entry (`public/main.js`)

```js
const { start } = require('@igojs/signal/src/client');

start({
  components: require.context('./components', true, /\.js$/),
  helpers: require('./helpers'),
});
```

## How It Works

```
Server                          Browser
──────                          ───────
Controller sets                 1. Hydrate props from
  res.locals.signal_props         window.__signal_props

Middleware serializes            2. Mount [data-component]
  props with devalue               elements

Dust renders HTML with           3. Load Dust template
  data-component attributes         via /__signal/templates

HTML sent to client →            4. State mutation triggers
                                    re-render via DiffDOM
```

## Next Steps

* **[Components](./components)** — Creating and structuring components
* **[Reactivity](./reactivity)** — State, props, and computed values
* **[Events & Forms](./events-forms)** — Event handling and form binding
* **[SSR](./ssr)** — Server-side rendering and hydration
