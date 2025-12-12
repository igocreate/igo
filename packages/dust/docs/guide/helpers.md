# Helpers

---

* `@eq`: strictly equal to
* `@ne`: not strictly equal to
* `@gt`: greater than
* `@lt`: less than
* `@gte` : greater than or equal to
* `@lte` : less than or equal to

## Equal

Render content if the key equals the specified value.

```js
// Template
Hello {@eq key=w value="World"}{w}{/eq}

// Data
{
  w: 'World'
}

// Output
Hello World
```

## Not Equal

Render content if the key does not equal the specified value.

```js
// Template
Hello {@ne key=w value="Planet"}{w}{/ne}

// Data
{
  w: 'World'
}

// Output
Hello World
```

## Greater Than

Render content if the key is greater than the specified value.

```js
// Template
'Hello {@gt key=w value="2" {! or value=2 !} }World{/gt}'

// Data
{
  w: 3
}

// Output
Hello World
```

> Note: You can use `@gte` to render content if the key is greater than or equal to the specified value !

## Less than

Render content if the key is less than the specified value.

```js
// Template
'Hello {@lt key=w value="2"}World{/lt}'

// Data
{
  w: 1
}

// Output
Hello World
```
> Note: You can use `@lte` to render content if the key is less than or equal to the specified value !

## Else

Render different text based on a condition, with an alternative if the condition is not met.

```js
// Template
Hello {@eq key=w value="World"}World{:else}Planet{/eq}

// Data
{
  w: 'Planet'
}

// Output
Hello Planet
```

## Custom Helpers

You can define `custom helpers` to extend the functionality of Igo Dust.js.

```js
// Define custom helpers
const igodust = require('igo-dust');

// @nl2br helper
igodust.helpers.nl2br = (params, locals) => {
  if (params.value) {
    return params.value.replace(/(\r\n|\n\r|\r|\n)/g, '<br/>');
  }
};

// @boolean helper
igodust.helpers.boolean = (params, locals) => {
  const color = params.value ? 'success' : 'danger';
  return `<div class="bullet bullet-sm bullet-${color}"></div>`;
};
```

You can now use the `custom helpers` in your templates.

```js
// Template
Hello ? {@boolean value=b /}
{@nl2br value=text /}

// Data
{
  b: true,
  text: 'Hello\nWorld'
}

// Output
Hello ? <div class="bullet bullet-sm bullet-success"></div>
Hello<br/>World
```

## Advanced: Helpers with Body Function

Helpers can receive a third parameter `body`, which is an async function that renders the content inside the helper block. This allows you to create powerful helpers that can repeat or manipulate their content.

```js
// Define a repeat helper
const igodust = require('igo-dust');

igodust.helpers.repeat = async (params, locals, body) => {
  if (!body) {
    return '';
  }
  const times = Number(params.times) || 0;
  let result = '';

  for (let i = 0; i < times; i++) {
    // Call body with custom locals (like $idx)
    result += await body({ $idx: i });
  }

  return result;
};
```

Usage:

```js
// Template
{@repeat times=3}Hello{/repeat}

// Output
HelloHelloHello
```

You can access loop variables like `$idx` inside the helper body:

```js
// Template
{@repeat times=5}({$idx}){/repeat}

// Output
(0)(1)(2)(3)(4)
```

The body function can be called with custom locals that will be merged with the current context:

```js
// Template
{@repeat times=3}{name}-{$idx} {/repeat}

// Data
{ name: 'item' }

// Output
item-0 item-1 item-2
```

## Real-world examples

### Displaying product prices with comparison

```js
// Template
<div class="product">
  <h3>{product.name}</h3>
  <p class="price">${product.price}</p>
  {@gt key=product.price value=100}
    <span class="badge">Premium</span>
  {:else}
    <span class="badge">Affordable</span>
  {/gt}
</div>

// Data
{
  product: {
    name: 'Laptop',
    price: 1299
  }
}

// Output
<div class="product">
  <h3>Laptop</h3>
  <p class="price">$1299</p>
  <span class="badge">Premium</span>
</div>
```

### User status indicator

```js
// Template
<div class="user-status">
  {@eq key=user.status value="online"}
    <span class="dot green"></span> Online
  {/eq}
  {@eq key=user.status value="away"}
    <span class="dot yellow"></span> Away
  {/eq}
  {@eq key=user.status value="offline"}
    <span class="dot gray"></span> Offline
  {/eq}
</div>

// Data
{
  user: {
    status: 'away'
  }
}

// Output
<div class="user-status">
  <span class="dot yellow"></span> Away
</div>
```

### Age-based content filtering

```js
// Template
{@gte key=user.age value=18}
  <a href="/adult-content">View all content</a>
{:else}
  <p>Content restricted. You must be 18 or older.</p>
{/gte}

// Data
{
  user: {
    age: 16
  }
}

// Output
<p>Content restricted. You must be 18 or older.</p>
```

---