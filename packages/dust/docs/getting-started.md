


# Igo Dust.js

![Build Status](https://github.com/igocreate/igo-dust/actions/workflows/node.js.yml/badge.svg) ![npm](https://img.shields.io/badge/version-0.5.0-0879BA) ![npm](https://img.shields.io/npm/dt/igo-dust)


## Introduction

Igo Dust.js is a high-performance templating library inspired by Dust.js, offering simplicity and efficiency in rendering dynamic content. With its clean syntax and seamless integration with Express, Igo Dust.js simplifies template creation, ensuring fast and responsive user experiences for web applications.

### Key Features

* **Simpler Syntax**: Easier to create and manage templates compared to Dust.js
* **High Performance**: Optimized compilation and rendering engine
* **Fully Async**: Built with modern async/await patterns
* **Modern JavaScript**: Compatible with the latest ECMAScript standards
* **Zero Dependencies**: Lightweight and fast

### Differences from Dust.js

* **Simpler Syntax**: Igo Dust.js offers a simpler syntax compared to Dust.js, making it easier to create and manage templates.
* **Improved Performance**: Igo Dust.js is optimized for performance, ensuring fast rendering of dynamic content.
* **Modern JavaScript**: Igo Dust.js is built using modern JavaScript, offering compatibility with the latest ECMAScript standards.

> Note: The VSCode extension for Igo Dust.js is available [here](https://marketplace.visualstudio.com/items?itemName=IGOCREATE.igo-dust-language-support).

> Benchmark [here](https://github.com/itsarnaud/templating-engine-bench.git)

## Quick Start

```js
const igodust = require('igo-dust');

// Render a simple template
const result = await igodust.render('Hello, {name}!', { name: 'World' });
console.log(result); // Hello, World!
```

## Installation

```bash
npm install --save igo-dust
```

## Using with Express

You can use Igo Dust.js with Express by setting the view engine to `dust` and rendering templates using the `res.render` method.

```js
const express = require('express');
const igodust = require('igo-dust');
const app     = express();

// Configure Igo Dust as the template engine
app.engine('dust', igodust.engine);
app.set('view engine', 'dust');
app.set('views', './views');

// Optional: Enable caching in production for better performance
if (app.get('env') === 'production') {
  igodust.configure({ cache: true });
}

app.get('/', (req, res) => {
  // Renders ./views/welcome/index.dust
  res.render('welcome/index', {
    name: 'World',
    title: 'Welcome Page'
  });
});

app.get('/users/:id', (req, res) => {
  // Example with dynamic data
  res.render('users/profile', {
    user: {
      id: req.params.id,
      name: 'John Doe',
      email: 'john@example.com'
    }
  });
});

app.listen(3000, () => {
  console.log(`Example app listening on port 3000`)
});
```

**Example template** (`./views/welcome/index.dust`):
```html
<!DOCTYPE html>
<html>
<head>
  <title>{title}</title>
</head>
<body>
  <h1>Hello, {name}!</h1>
</body>
</html>
```

That's it! You have now successfully set up Igo Dust.js with Express.


## Using the API

You can also use Igo Dust.js without Express by rendering templates using the `render` and `renderFile` methods.

> **Important**: All rendering methods are async and return Promises. Always use `await` or `.then()`.

### Render from string

```js
const igodust = require('igo-dust');

const result = await igodust.render('<h1>Hello, {name}!</h1>', { name: 'World' });
console.log(result);
// => <h1>Hello, World!</h1>
```

### Render from file

```js
const igodust = require('igo-dust');

// Configure views directory (optional, defaults to './views')
igodust.configure({
  views: './templates'
});

const result = await igodust.renderFile('template.dust', { name: 'World' });
console.log(result);
// => <h1>Hello, World!</h1>
```

## Configuration

Configure Igo Dust.js with various options:

```js
const igodust = require('igo-dust');

igodust.configure({
  // Directory where templates are located
  views: './views',

  // Enable template caching (recommended for production)
  cache: true,

  // Automatically HTML-encode output (default: true)
  htmlencode: true,

  // Remove line breaks and trim whitespace (default: true)
  htmltrim: true
});
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `views` | string | `'./views'` | Directory containing template files |
| `cache` | boolean | `false` | Cache compiled templates for better performance |
| `htmlencode` | boolean | `true` | Automatically HTML-encode all output (prevents XSS) |
| `htmltrim` | boolean | `true` | Remove line breaks and trim whitespace |

> **Tip**: Enable `cache` in production for significantly better performance!

## Next Steps

Now that you have Igo Dust.js set up, explore the documentation to learn more:

* **[Basics](guide/basics.md)** - Learn the fundamental syntax and features
* **[Loops](guide/loops.md)** - Iterate over arrays and objects
* **[Logic](guide/logic.md)** - Add conditional logic to your templates
* **[Helpers](guide/helpers.md)** - Use built-in helpers and create custom ones
* **[Filters](guide/filters.md)** - Transform output with filters
* **[Partials](guide/partials.md)** - Reuse templates with partials and layouts
* **[API Reference](guide/api.md)** - Complete API documentation

---