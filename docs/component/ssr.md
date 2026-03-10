
# Server-Side Rendering

Component pages are fully rendered on the server, then hydrated in the browser. This means the page is visible and complete before JavaScript loads.

## component_props

Set `res.locals.component_props` in your controller to pass data to Igo components:

```js
module.exports.index = async (req, res) => {
  const products = await Product.list();

  res.locals.component_props = {
    products,
    user: req.session.user,
  };
  res.render('products/index');
};
```

The middleware:
1. Serializes the props using [devalue](https://github.com/Rich-Harris/devalue) (XSS-safe)
2. Stores the result in `res.locals.__igo_props` for the layout script tag
3. Merges the raw props into `res.locals` so they're available in the Dust template

This means `{products}` works directly in your template, and the same data is available to components in the browser via `this.props.products`.

## component_components

Register components in `res.locals.component_components` to compute their getters server-side:

```js
res.locals.component_components = [ProductList];
```

The middleware calls each component's `ssr()` method, which evaluates all getters and merges the results into `res.locals`. For example:

```js
class ProductList extends IgoComponent {
  get totalPrice() {
    return this.props.products.reduce((sum, p) => sum + p.price, 0);
  }
}
```

With `component_components = [ProductList]`, the template can use `{totalPrice}` directly — even before JavaScript loads.

## Serialization

### Automatic handling

The serializer handles these types:

| Type | Behavior |
|------|----------|
| Plain objects, arrays | Recursively serialized |
| Dates | Preserved as Date objects |
| Models (with `.serialize()`) | `.serialize()` is called |
| Forms (with `.getValues()`) | `.getValues()` is called |
| Circular references | Detected and skipped |

Pass your raw Model instances in `component_props` — don't call `.serialize()` yourself. The serializer handles it and deduplicates repeated references.

### The @serialize helper

Use `@serialize` to pass local props to a specific component instance via `data-props`:

```html
<div data-component="products/List"
     data-props="{@serialize props="products,form" /}">
  ...
</div>
```

This serializes only the listed keys from template locals and embeds them as an HTML-safe attribute.

## Global vs local props

| Source | Scope | Set by |
|--------|-------|--------|
| `component_props` | All components on the page | Controller via `res.locals.component_props` |
| `data-props` | Single component instance | Template via `{@serialize}` |

Local props override global props for the same key.

**When to use `data-props`:** when a child component needs specific data that differs from the global props, or when you have multiple instances of the same component with different data.

```html
{! Global props available to all components !}
<script>window.__igo_props = {__igo_props|s};</script>

{! Local props for this specific component instance !}
<div data-component="products/Detail"
     data-props="{@serialize props="selectedProduct" /}">
  ...
</div>
```

## Template endpoint

Igo components load their Dust template source in the browser via:

```
GET /__component/templates?file=products/List
```

This endpoint is registered in your routes (`component.templates`). Templates are cached in the browser after the first load.
