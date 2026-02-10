
# Events & Forms

## Event Handling

Define events by implementing the `events` getter. Each entry maps a CSS selector to an event handler.

> **Note:** The event declaration API (`get events()`) is a work in progress and will be simplified in a future release.

```js
class ProductList extends SignalComponent {
  get events() {
    return [
      { selector: '.add-btn',    eventType: 'click', handler: this.onAdd },
      { selector: '.delete-btn', eventType: 'click', handler: this.onDelete },
      { selector: '.search',     eventType: 'input', handler: this.onSearch },
    ];
  }

  onAdd(e) {
    this.state.items.push({ id: Date.now(), name: 'New' });
  }

  onDelete(e) {
    const id = Number(e.target.dataset.id);
    const index = this.state.items.findIndex(i => i.id === id);
    this.state.items.splice(index, 1);
  }

  onSearch(e) {
    this.state.search = e.target.value;
  }
}
```

### Global Events

Use `'document'` or `'window'` as selector for global events:

```js
get events() {
  return [
    { selector: 'document', eventType: 'keydown',  handler: this.onKeydown },
    { selector: 'window',   eventType: 'scroll',   handler: this.onScroll },
    { selector: 'window',   eventType: 'resize',   handler: this.onResize },
  ];
}
```

### Performance

EventBinder uses a WeakMap to cache listeners per element:

- If DiffDOM preserves an element, its listener is **reused** (no rebind)
- If an element is removed, the WeakMap allows garbage collection
- Multiple state mutations batch into a single event rebind cycle

### Child Component Boundaries

Events don't cross component boundaries. If a selector matches an element inside a child `data-component`, a warning is logged. Bind events to child elements from within the child component instead.

## Two-Way Form Binding

When `props.form` exists, Signal automatically binds all form inputs to `this.state.form`:

### Setup

```js
// Controller
res.locals.signal_props = {
  products: await Product.list(),
  form: {
    search: req.query.search || '',
    category: req.query.category || 'all',
  },
};
```

```html
<input type="text" name="search" value="{form.search}">

<select name="category">
  <option value="all" {@selected key="all" value=form.category /}>All</option>
  <option value="electronics" {@selected key="electronics" value=form.category /}>Electronics</option>
</select>
```

Typing in the input automatically updates `this.state.form.search`, which triggers a re-render if a getter depends on it.

### Supported Input Types

| Input | State value |
|-------|-------------|
| `text`, `email`, `password`, `number` | String |
| `textarea` | String |
| `checkbox` (single) | Boolean |
| `checkbox` (multiple, `name="x[]"`) | Array of strings |
| `radio` | String |
| `select` | String |
| `select[multiple]` | Array of strings |
| `name="x[0][]"` (nested array) | Array of arrays |

### Type Conversion

Form values are always stored as **strings** (matching HTML form behavior), except checkboxes which store booleans. Convert explicitly in getters:

```js
get selectedProduct() {
  const productId = Number(this.state.form?.product_id);
  return this.props.products.find(p => p.id === productId);
}
```

### Shared Form State

Form state is shared across all components on a page via `window.__signal_form`. This means two components can read and write the same form fields.

### Child Component Inputs

FormHandler skips inputs inside child `data-component` elements. Each component manages its own form inputs.

## Using Both Together

A typical component with events and form binding:

```js
class SearchPage extends SignalComponent {
  constructor(element) {
    super(element, 'search/Page');
  }

  get events() {
    return [
      { selector: '.reset-btn', eventType: 'click', handler: this.onReset },
    ];
  }

  get filtered() {
    const { search, category } = this.state.form || {};
    return this.props.items.filter(item => {
      if (category && category !== 'all' && item.category !== category) return false;
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }

  onReset() {
    this.state.form.search = '';
    this.state.form.category = 'all';
  }
}
```
