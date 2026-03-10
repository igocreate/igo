# @igojs/dust

JavaScript template engine inspired by [Dust.js](https://github.com/linkedin/dustjs). Async rendering, Express integration, and browser bundle.

## Installation

```sh
npm install @igojs/dust
```

## Quick Start

```javascript
const dust = require('@igojs/dust');

dust.configure({
  views: './views',
  cache: true,
});

const html = await dust.renderFile('home.dust', { name: 'World' });
```

## Template Syntax

### Variables

```dust
Hello {name}!
{user.email}
{name|h}       {! HTML-encoded (default) !}
{code|s}       {! Raw / safe (no encoding) !}
{price|money}  {! Custom filter !}
```

### Conditionals

```dust
{?user}
  Welcome, {user.name}!
{:else}
  Please login.
{/user}

{^items}
  No items found.
{/items}
```

- `{?x}` — truthy check (non-null, non-empty array)
- `{^x}` — falsy check (null, undefined, empty array)

### Loops

```dust
<ul>
{#items}
  <li>{$idx}: {name}</li>
{/items}
</ul>
```

Loop context variables:
- `{$idx}` — zero-based index
- `{$len}` — array length
- `{.}` — current item (for primitive arrays)

### Partials

```dust
{>"header"/}
{>"layouts/main"/}
```

### Blocks (Template Inheritance)

```dust
{! layout.dust !}
<html>
  <body>{+content}Default content{/content}</body>
</html>

{! page.dust !}
{>"layout"/}
{<content}
  <h1>My Page</h1>
{/content}
```

### Comments

```dust
{! This is a comment, not rendered !}
```

## Helpers

### Built-in Helpers

```dust
{@eq key=status value="active"}Active{:else}Inactive{/eq}
{@ne key=count value=0}Has items{/ne}
{@gt key=price value=100}Expensive{/gt}
{@gte key=age value=18}Adult{/gte}
{@lt key=stock value=5}Low stock{/lt}
{@lte key=score value=50}Below average{/lte}

{! Loop helpers !}
{#items}
  {@first}First item!{/first}
  {@last}Last item!{/last}
  {@sep}, {/sep}
{/items}

{! Select helper !}
{@select key=status}
  {@eq value="active"}Active{/eq}
  {@eq value="pending"}Pending{/eq}
  {@none}Unknown{/none}
{/select}
```

### Custom Helpers

```javascript
dust.helpers.uppercase = (params, locals) => {
  return params.value.toUpperCase();
};
// Usage: {@uppercase value=name /}

dust.helpers.truncate = (params, locals) => {
  const s = String(params.value || '');
  const len = Number(params.len) || 100;
  return s.length > len ? s.slice(0, len) + '...' : s;
};
// Usage: {@truncate value=description len=50 /}
```

## Filters

### Built-in Filters

| Filter | Description |
|--------|-------------|
| `h` | HTML encode (default) |
| `s` | Safe / raw output (no encoding) |
| `j` | JavaScript string escape |
| `u` | `encodeURI` |
| `uc` | `encodeURIComponent` |
| `js` | `JSON.stringify` |
| `jp` | `JSON.parse` |

### Custom Filters

```javascript
dust.filters.money = (value) => {
  return '$' + Number(value).toFixed(2);
};
// Usage: {price|money}
```

## Express Engine

```javascript
const express = require('express');
const dust = require('@igojs/dust');

const app = express();
app.engine('dust', dust.engine);
app.set('view engine', 'dust');
app.set('views', './views');

app.get('/', (req, res) => {
  res.render('home', { title: 'Hello' });
});
```

## API

### Configuration

```javascript
dust.configure({
  views: './views',   // Views directory path
  cache: true,        // Cache compiled templates (recommended for production)
});
```

### Rendering

```javascript
// Render file
const html = await dust.renderFile('template.dust', data);

// Render string
const html = await dust.render(templateSource, data);

// Get compiled template function
const compiled = await dust.compileFile('template.dust');

// Get template source (compiled JS)
const source = await dust.getSource('template.dust');

// Stream output
const stream = createWriteStream('output.html');
await dust.renderFile('template.dust', data, stream);
```

### Component Support

Used by `@igojs/component` for single-file components:

```javascript
// Load component (script + compiled template)
const { scriptSrc, templateSource } = await dust.getComponent('components/List.dust');

// Load compiled component (script + template function)
const { scriptSrc, templateFn } = await dust.getCompiledComponent('components/List.dust');
```

## Browser Bundle

A minified browser bundle is available at `dist/igo-dust-6.0.0-min.js`.

```html
<script src="igo-dust-6.0.0-min.js"></script>
<script>
  const html = await igodust.render(template, data);
</script>
```

Build the bundle:
```sh
cd packages/dust && npm run build
```

## Exports

| Export | Description |
|--------|-------------|
| `configure(options)` | Configure views path and caching |
| `render(source, data, stream?)` | Render template string |
| `renderFile(path, data, stream?)` | Render template file |
| `compileFile(path)` | Get compiled template function |
| `getSource(path)` | Get compiled template source (JS string) |
| `getComponent(path)` | Load single-file component |
| `getCompiledComponent(path)` | Load compiled single-file component |
| `engine(path, data, cb)` | Express view engine adapter |
| `helpers` | Object to register custom helpers |
| `filters` | Object to register custom filters |
