
# Events & Forms

## Inline event syntax

In single-file components, declare events directly in the template with `on:<event>="methodName"`:

```dust
<button on:click="onIncrement">+1</button>
<input on:input="onFilter">
<select on:change="onSort">
<form on:submit="onSubmit">
```

Methods are looked up on the definition object:

```js
({
  state: { count: 0 },

  onIncrement(e) {
    this.state.count++;
  },

  onFilter(e) {
    this.state.filter = e.target.value;
  }
})
```

The `on:` attributes are rewritten to `data-on-<event>` at parse time, so the original markup is preserved through DiffDOM and event listeners are reused across renders (WeakMap-cached per element).

### Bubbling boundaries

Events don't cross component boundaries. If you `on:click` an element that lives inside a nested `[data-component]`, a warning is logged — bind events from the child component instead. Each component manages its own surface.

## Two-way form binding

When a component receives a `form` prop, all named inputs in its template are automatically synced to `this.state.form`.

### Setup

Pass the form via the `@component` helper:

```dust
{@component name="components/Search" form=form /}
```

`form` is typically built in the controller — for example from the query string on a search page:

```js
module.exports.index = async (req, res) => {
  const form = {
    search:   req.query.search || '',
    category: req.query.category || 'all',
  };
  res.render('products/index', { form, products: await Product.list() });
};
```

### Template

Just name your inputs — no `on:` handler needed for binding:

```dust
<input type="text" name="search" value="{form.search}">

<select name="category">
  <option value="all">All</option>
  <option value="electronics">Electronics</option>
</select>
```

Typing in the input updates `this.state.form.search`. Any getter that reads it recomputes; the DOM updates via DiffDOM.

### Supported input types

| Input | State value |
|-------|-------------|
| `text`, `email`, `password`, `number` | String |
| `textarea` | String |
| `checkbox` (single) | Boolean |
| `checkbox` (multiple, `name="tags[]"`) | Array of strings |
| `radio` | String |
| `select` | String |
| `select[multiple]` | Array of strings |
| `name="x[0][]"` (nested arrays) | Array of arrays |

### Type coercion

Form values are always stored as **strings** (matching HTML form behavior), except checkboxes which store booleans. Convert in getters:

```js
get selectedProduct() {
  const id = Number(this.state.form?.product_id);
  return this.props.products.find(p => p.id === id);
}
```

### Shared form state

Form state is shared across all components on a page via `window.__igo_form`. Two components rendering inputs of the same form read and write the same state — useful for splitting a long form across multiple components.

The flow on mount:

1. Constructor copies `props.form` into `_state.form`
2. `init()` lets `FormHandler` replace it with the page-wide singleton (`window.__igo_form`)
3. All components with `props.form` end up pointing at the same form object

If you need independent forms in two components on the same page, keep the data in `state` directly rather than going through `props.form`.

### Inputs inside child components

`FormHandler` only binds inputs that belong to the component instance — inputs inside a nested `[data-component]` are left to that child. Each component owns its own form surface.

## Class-based events (legacy)

In the class-based pattern, events are declared via the `events` getter rather than inline `on:`:

```js
class ProductList extends IgoComponent {
  get events() {
    return [
      { selector: '.add-btn',    eventType: 'click', handler: this.onAdd },
      { selector: '.delete-btn', eventType: 'click', handler: this.onDelete }
    ];
  }
}
```

Selectors can be plain CSS selectors or the special `'document'` / `'window'` strings for global events:

```js
get events() {
  return [
    { selector: 'document', eventType: 'keydown', handler: this.onKeydown },
    { selector: 'window',   eventType: 'scroll',  handler: this.onScroll }
  ];
}
```

In SFC components, use lifecycle hooks (`afterRender`) plus `document.addEventListener` for global events.
