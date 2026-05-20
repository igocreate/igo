
# API

## configure(options)

Configures the Dust engine globally.

```js
const dust = require('@igojs/dust');

dust.configure({
  views:      './views',    // Template directory (default: './views')
  cache:      true,         // Enable template caching (default: false)
  htmlencode: true,         // Auto-escape HTML output (default: true)
  htmltrim:   true,         // Trim whitespace (default: true)
});
```

In production, enable `cache` to avoid re-reading and re-compiling templates on every render.

## render(src, data)

Renders a template string with data. Returns a `Promise<string>`.

```js
const dust = require('@igojs/dust');

const html = await dust.render('Hello, {name}!', { name: 'World' });
// => 'Hello, World!'
```

## renderFile(filePath, data)

Renders a template file with data. Returns a `Promise<string>`.

```js
const html = await dust.renderFile('views/home.dust', { title: 'Home' });
```

## compileFile(filePath)

Pre-compiles a template file to an executable function. Useful for caching in custom setups.

```js
const compiled = await dust.compileFile('views/home.dust');
const html = await compiled({ title: 'Home' });
```

## getSource(filePath)

Returns the compiled template as a JavaScript source string, without instantiating the function. Useful for shipping pre-compiled templates to the browser.

```js
const source = await dust.getSource('views/home.dust');
// => "var r='',l=l||{},c=c||{ctx:[]}; ..."
```

## engine(filePath, data, callback)

Express view engine integration. Register it with Express:

```js
const express = require('express');
const dust = require('@igojs/dust');

const app = express();

dust.configure({
  views: './views',
  cache: app.get('env') === 'production',
});

app.engine('dust', dust.engine);
app.set('view engine', 'dust');
app.set('views', './views');
```

Then use `res.render()` in your controllers:

```js
app.get('/', (req, res) => {
  res.render('home', { title: 'Hello' });
});
```

## Custom Helpers

Register helpers on the `dust.helpers` object:

```js
const dust = require('@igojs/dust');

dust.helpers.uppercase = (params) => {
  return params.value.toUpperCase();
};
```

```html
{@uppercase value=name /}
```

See [Helpers](./helpers.md) for built-in helpers (`@eq`, `@ne`, `@gt`, `@lt`, `@gte`, `@lte`).

## Custom Filters

Register filters on the `dust.filters` object:

```js
const dust = require('@igojs/dust');

dust.filters.money = (value) => {
  return '$' + Number(value).toFixed(2);
};
```

```html
{price|money}
```

See [Filters](./filters.md) for built-in filters (`h`, `s`, `j`, `u`, `uc`, `js`, `jp`, `uppercase`, `lowercase`).

## Single-file Components

Igo Dust supports single-file `.dust` components — a `<script>` block followed by a template — consumed by [`@igojs/component`](../component/components.md) for SSR. These low-level loaders are exposed for that integration; most users should use the `{@component}` helper rather than calling them directly.

### getComponent(filePath)

Loads a single-file component and returns its script and raw template source.

```js
const { scriptSrc, templateSource } = await dust.getComponent('components/UserCard.dust');
```

### getCompiledComponent(filePath)

Same as `getComponent`, but returns the template already compiled to an executable function.

```js
const { scriptSrc, templateFn } = await dust.getCompiledComponent('components/UserCard.dust');
const html = await templateFn({ name: 'Alice' });
```
