

# Igo Dust

## Introduction

Dust.js was a great templating engine, maintained and then abandoned by LinkedIn. After looking for an equivalent that was lightweight and performant, we ended up rewriting it from scratch — with zero dependencies and modern async/await patterns.

### Key Features

* **Fully Async**: Built with async/await, all rendering returns Promises
* **High Performance**: Optimized compilation and rendering engine
* **HTML-safe by default**: All output is HTML-encoded unless you opt out
* **Zero Dependencies**: Lightweight and fast
* **Express Integration**: Works as an Express view engine

> The VSCode extension for Igo Dust is available [here](https://marketplace.visualstudio.com/items?itemName=IGOCREATE.igo-dust-language-support).

### Differences from Dust.js

Igo Dust is **not a drop-in replacement** for Dust.js. It shares a similar syntax but has important differences:

**1. Dot notation required in loops and sections**

Inside a loop or section, you must use `.` to access properties of the current item:

```js
// Template
{#users}{.name}{/users}
```

Without the dot, `{name}` looks up the root context, not the current item. This is the biggest difference from Dust.js.

You can also rename the iterator with `it=`:

```js
{#users it="user"}{user.name}{/users}
```

**2. HTML encoding by default**

All output is HTML-encoded by default (prevents XSS). Use the `|s` filter to output raw HTML:

```js
{content|s}
```

In Dust.js, output is not encoded by default.

**3. No hierarchical scope chain**

Dust.js searches up a scope chain to resolve variables. Igo Dust uses a flat context with explicit save/restore. Inside a section, only `.property` accesses the current context — there is no automatic fallback to parent contexts.

**4. Empty arrays are falsy**

In Igo Dust, `[]` evaluates to `false` in conditionals:

```js
{?items}Has items{:else}No items{/items}
// With items = [] → "No items"
```

**5. Async rendering only**

All rendering methods return Promises. There is no callback-based API.

## Quick Start

```js
const dust = require('@igojs/dust');

const result = await dust.render('Hello, {name}!', { name: 'World' });
// => Hello, World!
```

## Installation

```bash
npm install @igojs/dust
```

## Using with Express

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

app.get('/', (req, res) => {
  res.render('welcome/index', { name: 'World' });
});

app.listen(3000);
```

**Template** (`views/welcome/index.dust`):
```html
<!DOCTYPE html>
<html>
<head><title>{title}</title></head>
<body>
  <h1>Hello, {name}!</h1>
</body>
</html>
```

## Using the API

```js
const dust = require('@igojs/dust');

// Render from string
const html = await dust.render('<h1>Hello, {name}!</h1>', { name: 'World' });

// Render from file
dust.configure({ views: './templates' });
const html = await dust.renderFile('template.dust', { name: 'World' });
```

## Configuration

```js
dust.configure({
  views:      './views',   // Template directory
  cache:      true,        // Cache compiled templates (recommended in production)
  htmlencode: true,        // HTML-encode all output (default: true)
  htmltrim:   true,        // Trim whitespace (default: true)
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `views` | string | `'./views'` | Directory containing template files |
| `cache` | boolean | `false` | Cache compiled templates |
| `htmlencode` | boolean | `true` | HTML-encode all output (prevents XSS) |
| `htmltrim` | boolean | `true` | Remove line breaks and trim whitespace |

## Next Steps

* **[Basics](./basics)** — Syntax fundamentals
* **[Loops](./loops)** — Iterating over arrays and objects
* **[Logic](./logic)** — Conditional rendering
* **[Helpers](./helpers)** — Built-in and custom helpers
* **[Filters](./filters)** — Output transformation
* **[Partials](./partials)** — Template reuse and layouts
* **[API](./api)** — Full API reference
