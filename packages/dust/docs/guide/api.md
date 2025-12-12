# API

## Render

Render a Dust template string with data.

```js
const igodust = require('igo-dust');

igodust.render('Hello, {name}!', { name: 'World' });
// => Hello, World!
```

## Render File

Render a Dust template file with data.

```js
const igodust = require('igo-dust');

igodust.renderFile('path/to/template.dust', { name: 'World' });
// => Hello, World!
```

