
# Components

## Creating a Component

An Igo component is a class that extends `IgoComponent`:

```js
const { IgoComponent } = require('@igojs/component/src/client');

class Counter extends IgoComponent {
  constructor(element, props) {
    super(element, 'Counter', props); // template path (relative to views/)
  }

  get events() {
    return [
      { selector: '.increment', eventType: 'click', handler: this.increment },
    ];
  }

  get count() {
    return this.state.count || 0;
  }

  increment() {
    this.state.count = (this.state.count || 0) + 1;
  }
}

module.exports = Counter;
```

## Template

Each component has a Dust template. The root element **must** have `data-component`:

```html
{! views/Counter.dust !}
<div data-component="Counter">
  <p>Count: {count}</p>
  <button class="increment">+1</button>
</div>
```

The template context is a flat merge of `props`, `state`, and computed values (getters).

## Registering Components

Register components in your client entry point:

```js
// public/main.js
const { start } = require('@igojs/component/src/client');

start({
  components: {
    'Counter': require('./components/Counter'),
    'products/List': require('./components/products/List'),
  },
  helpers: require('./helpers'),
});
```

Or with Webpack `require.context` for automatic discovery:

```js
start({
  components: require.context('./components', true, /\.js$/),
});
```

With `require.context`, component names are derived from file paths: `./products/List.js` becomes `products/List`.

## Lifecycle

```
constructor(element, props)
    ↓
init()                    ← Load template, init form handler
    ↓
render()  ←────────────┐
    ↓                   │
beforeRender()          │
    ↓                   │
compute getters         │
    ↓                   │
dust.render()           │
    ↓                   │
DiffDOM.apply()         │
    ↓                   │
bind events             │
    ↓                   │
mount child components  │
    ↓                   │
afterRender()           │
    ↓                   │
[state mutation] ───────┘
```

### Lifecycle Hooks

Override these methods for custom logic:

```js
class MyComponent extends IgoComponent {
  async init() {
    // Called once after constructor
    // Template is loaded here — call super.init() or handle manually
    await super.init();
  }

  async beforeRender() {
    // Called before each render
  }

  async afterRender() {
    // Called after each render — DOM is updated
    // Good for: focus management, scroll position, third-party libs
  }

  async onError(error) {
    // Called if render throws
  }

  async destroy() {
    // Cleanup: cancel pending renders, unbind events, clear cache
    await super.destroy();
  }
}
```

## Child Components

Components can be nested. Parent and child components are independent:

```html
{! Parent template !}
<div data-component="products/Page">
  <input type="text" name="search" value="{form.search}">

  {! Child component !}
  <div data-component="products/List"
       data-props="{@serialize props="filtered" /}">
    <ul>
      {#filtered}
        <li>{.name}</li>
      {/filtered}
    </ul>
  </div>
</div>
```

### How children work

- **Preserved**: when the parent re-renders, child component DOM nodes are preserved (not re-created)
- **Props synced**: after parent render, `data-props` are re-evaluated and children re-render if props changed
- **Auto-mounted**: new child components added during parent render are automatically mounted
- **Independent state**: each child has its own state, getters, and event bindings

### Parent → child communication

Via props (the `data-props` attribute):

```html
<div data-component="ProductDetail"
     data-props="{@serialize props="selectedProduct" /}">
```

When the parent recomputes `selectedProduct`, the child receives the new value and re-renders.

## API Reference

### Static Methods

| Method | Description |
|--------|-------------|
| `ssr(props)` | Compute derived values for server-side rendering |

### Instance Properties

| Property | Description |
|----------|-------------|
| `element` | The DOM element this component is mounted on |
| `template` | Template file path |
| `props` | Read-only props (tracking Proxy) |
| `state` | Reactive state (deep Proxy) |
| `rawState` | Internal state (no auto-render on access) |

### Lifecycle Methods

| Method | Description |
|--------|-------------|
| `init()` | Called once after constructor |
| `render()` | Render the component (called automatically) |
| `beforeRender()` | Hook before each render |
| `afterRender()` | Hook after each render |
| `onError(error)` | Hook on render error |
| `destroy()` | Cleanup and unbind everything |
