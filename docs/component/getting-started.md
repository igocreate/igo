
# Igo Component

## Introduction

`@igojs/component` adds reactive components to your server-rendered Igo pages. A component lives in a single `.dust` file — definition + template — and runs both on the server (full SSR) and in the browser (hydration with auto-reactivity).

Server-rendered apps stay fast on first paint and play well with SEO, but interactive UI typically meant either a heavy SPA framework on top, or hand-rolled jQuery-style sprinkles. The component system is the in-between we wanted: real reactivity and clean composition, but the page still ships as HTML and the components hydrate in place.

### Key Features

* **Single-file `.dust` components** — `<script>` block + template, no manual registration
* **Deep reactivity via JavaScript Proxy** — Vue 3-like; mutating state at any depth triggers a re-render
* **Automatic dependency tracking for getters** — computed values are memoized and recompute only when inputs change
* **Server-side rendering with hydration** — the page is fully HTML before any JS runs
* **Auto-loading from the server** — `start()` with no arguments picks up `[data-component]` elements on demand
* **DiffDOM reconciliation** — minimal DOM updates, child components and form inputs preserved across re-renders
* **Inline event syntax** — `on:click="onIncrement"` in templates, no boilerplate handler registration
* **Two-way form binding** — `name="email"` inputs sync into `this.state.form` automatically
* **Render batching** — multiple state mutations in the same tick coalesce into one render

## Setup

### 1. Install

`@igojs/server` auto-wires the component middleware and endpoints when it detects `@igojs/component` is installed. Nothing to add to `app/routes.js` — your routes stay focused on your own app:

```js
// app/routes.js
const ProductsController = require('./controllers/ProductsController');

module.exports.init = (app) => {
  app.get('/products', ProductsController.index);
};
```

A regular controller — no component-specific API, just render the template with the data you want to expose:

```js
// app/controllers/ProductsController.js
module.exports.index = async (req, res) => {
  const products = await Product.where({ active: true }).list();
  res.render('products/index', { products });
};
```

Behind the scenes, the server registers `component.middleware` (which injects the current request's translations into `res.locals`), `GET /__component/templates`, and `GET /__component/component`. For advanced cases (custom paths, manual wiring without `@igojs/server`), the individual exports `component.middleware`, `component.templates`, `component.component` and `component.init(app)` remain available.

### 2. Layout

A standard Igo layout — nothing component-specific to add. The `lang` attribute lets the runtime detect the language; translations are loaded on the fly via the `/__component/translations` endpoint.

```dust
{! views/layouts/main.dust !}
<!DOCTYPE html>
<html lang="{lang}">
  <head>
    <link rel="stylesheet" href="{assets.main.css}" />
  </head>
  <body>
    {+body/}
    <script src="{assets.vendor.js}"></script>
    <script src="{assets.main.js}"></script>
  </body>
</html>
```

### 3. Client entry point

In your JavaScript bundle entry (`js/main.js`):

```js
const { start } = require('@igojs/component/client');

start();
```

That's it — no manual registration. Components are loaded on demand from the server.

## Your first component

A component is a single `.dust` file with a `<script>` block (definition) followed by the template:

```dust
{! views/components/Counter.dust !}
<script>
({
  props: {
    count: 0
  },

  onIncrement() {
    this.props.count++;
  }
})
</script>

<div>
  <p>Count: {count}</p>
  <button on:click="onIncrement">+1</button>
</div>
```

Props are reactive — mutating `this.props.count` directly triggers a re-render. For a counter this trivial, there's no need for a separate `state`: a single `props` object with a method is enough.

### Rendering from a page

Use the `{@component}` helper to render a component anywhere in a Dust template:

```dust
{! views/home.dust !}
<h1>Demo</h1>
{@component name="components/Counter" count=5 /}
```

The helper does, in one shot:

1. Loads the `.dust` file
2. Merges caller params with `props` defaults (`count=5` overrides the default `0`)
3. Computes derived values (getters, if any) for SSR
4. Renders the template server-side — the page is **fully rendered HTML**
5. Serializes props into `data-props` for client hydration

In the browser, `start()` finds the `[data-component]` element, fetches the definition from `/__component/component?name=components/Counter`, builds a class, hydrates it, and binds events. Clicking `+1` mutates `this.props.count`, which triggers an automatic re-render via DiffDOM.

## What's next

* **[Components](./components)** — Definition object, child components, lifecycle hooks
* **[Reactivity](./reactivity)** — How state, props, and computed values work
* **[Events & Forms](./events-forms)** — `on:` event syntax and two-way form binding
* **[SSR](./ssr)** — Server-side rendering details and `@serialize`
* **[Translations](./translations)** — Client-side i18n
* **[Internals](./internals)** — How the system works under the hood
