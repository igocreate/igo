
# Getting Started

@igojs/component adds reactive components to your server-rendered Igo pages. You write Dust templates that render on the server, then the component system makes them interactive in the browser — with automatic reactivity, form binding, and efficient DOM updates.

## Setup

### 1. Routes

Register the component middleware and template endpoint in `app/routes.js`:

```js
const component = require('@igojs/component');

// Optional: configure translations for client-side i18n
component.configure({
  translations: require('../locales/en/translation.json'),
});

module.exports.init = (app) => {
  app.use(component.middleware);
  app.get('/__component/templates', component.templates);

  // Your routes
  app.get('/products', ProductsController.index);
};
```

### 2. Layout

Add the component scripts in your layout (`views/layouts/main.dust`):

```html
<!DOCTYPE html>
<html lang="{lang}">
<head>
  <link rel="stylesheet" href="{assets.main.css}" />
</head>
<body>
  {+body/}
  <script>window.__igo_translations = {__igo_translations|s};</script>
  <script>window.__igo_props = {__igo_props|s};</script>
  <script src="{assets.vendor.js}"></script>
  <script src="{assets.main.js}"></script>
</body>
</html>
```

### 3. Client entry point

Initialize the component system in your JavaScript entry point (`js/main.js`):

```js
const component = require('@igojs/component/src/client');

component.start({
  components: require.context('./components', true, /\.js$/),
  helpers: require('./helpers'),
});
```

With `require.context`, component names are derived from file paths: `./products/List.js` becomes `products/List`.

You can also register components manually:

```js
component.start({
  components: {
    'products/List': require('./components/products/List'),
    'Counter': require('./components/Counter'),
  },
});
```

## Your first component

### Controller

```js
// app/controllers/ProductsController.js
module.exports.index = async (req, res) => {
  const products = await Product.list();

  res.locals.component_props = { products };
  res.locals.component_components = [ProductList];
  res.render('products/index');
};
```

- `component_props` — data sent to the browser for client-side reactivity
- `component_components` — components whose getters are computed server-side (for SSR)

### Template

```html
{! views/products/index.dust !}
{>layout/}
{<body}
<div data-component="products/List">
  <p>{count} product{@gt key=count value=1}s{/gt}</p>
  <ul>
    {#products}
      <li>{.name} - ${.price}</li>
    {/products}
  </ul>
  <button class="add-btn">Add product</button>
</div>
{/body}
```

The `data-component` attribute links the DOM element to the `products/List` component class.

### Component

```js
// js/components/products/List.js
const { IgoComponent } = require('@igojs/component/src/client');

class ProductList extends IgoComponent {
  constructor(element, props) {
    super(element, 'products/List', props);
  }

  get events() {
    return [
      { selector: '.add-btn', eventType: 'click', handler: this.onAdd },
    ];
  }

  // Computed value — available in the template as {count}
  get count() {
    return this.props.products.length;
  }

  onAdd() {
    this.props.products.push({ name: 'New product', price: 0 });
  }
}

module.exports = ProductList;
```

That's it. The page renders server-side with the full HTML, then Igo hydrates the component in the browser. Clicking "Add product" pushes to the reactive array, which triggers a re-render automatically.

## Next steps

* **[Components](./components)** — Lifecycle, child components, API reference
* **[Reactivity](./reactivity)** — State, props, and computed values
* **[Events & Forms](./events-forms)** — Event handling and two-way form binding
* **[SSR](./ssr)** — Server-side rendering details
* **[Translations](./translations)** — Client-side i18n
* **[Internals](./internals)** — How the component system works under the hood
