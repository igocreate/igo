# @igo/dust

JavaScript template engine inspired by [Dust.js](https://github.com/linkedin/dustjs).

## Installation

```sh
npm install @igo/dust
```

## Features

- **Dust-like syntax** - Familiar template syntax for Dust.js users
- **Async rendering** - Full async/await support
- **Streaming** - Stream output for large templates
- **Express integration** - Ready-to-use Express view engine
- **Helpers & Filters** - Extensible with custom helpers and filters
- **Browser bundle** - Vite-built browser version available

## Quick Start

```javascript
const dust = require('@igo/dust');

// Configure
dust.configure({
  views: './views',
  cache: true,
});

// Render a template
const html = await dust.renderFile('home.dust', { name: 'World' });
```

### Template Syntax

```dust
{! Comment !}

{! Variables !}
Hello {name}!

{! Conditionals !}
{?user}
  Welcome, {user.name}!
{:else}
  Please login.
{/user}

{! Loops !}
<ul>
{#items}
  <li>{.}</li>
{/items}
</ul>

{! Partials !}
{>header/}

{! Helpers !}
{@eq key=status value="active"}Active{/eq}
```

## API

### Configuration

```javascript
dust.configure({
  views: './views',      // Views directory
  cache: true,           // Enable template caching
});
```

### Rendering

```javascript
// Render file
const html = await dust.renderFile('template.dust', data);

// Render string
const html = await dust.render(templateSource, data);

// Get compiled template
const compiled = await dust.compileFile('template.dust');

// Stream output
const stream = createWriteStream('output.html');
await dust.renderFile('template.dust', data, stream);
```

### Express Engine

```javascript
const express = require('express');
const dust = require('@igo/dust');

const app = express();
app.engine('dust', dust.engine);
app.set('view engine', 'dust');

app.get('/', (req, res) => {
  res.render('home', { title: 'Hello' });
});
```

### Custom Helpers

```javascript
dust.helpers.uppercase = (params, locals) => {
  return params.value.toUpperCase();
};

// Usage: {@uppercase value=name /}
```

### Custom Filters

```javascript
dust.filters.money = (value) => {
  return '$' + value.toFixed(2);
};

// Usage: {price|money}
```

## Browser Usage

A minified browser bundle is available at `dist/igo-dust-6.0.0-min.js`.

```html
<script src="igo-dust-6.0.0-min.js"></script>
<script>
  const html = await igodust.render(template, data);
</script>
```

Build the bundle:
```sh
npm run build
```

## Documentation

See the [full documentation](https://igocreate.github.io/igo/#/dust/views).
