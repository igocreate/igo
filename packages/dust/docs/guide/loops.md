# Loops

---

* Looping: Iterate through arrays or objects using `{#}`.
* Loop Helpers: Utilize loop helpers like `@first`, `@last`, and `@sep`.

## Simple loop

Render a section of text for each element in an array. `{.}` or `{it}` is a reference to the current element in the loop.

```js
// Template
Hello {#COL1}{.}{/COL1}

// Data
{
  COL1: [1, 2, 3]
}

// Output
Hello 123
```

## Context inside loops

> ⚠️ **Warning:** Unlike good old Dust.js, **Igo-dust is stricter regarding context resolution**.

When inside a loop such as `{#users}`, you must use **`{.first_name}`** to access properties of the current element.  
Using `{first_name}` (without the dot) will **not** work—it tries to resolve the key in the **global context**, not the current loop item.

### Example: loop context

```js
// Template
{#users}{.first_name}{@sep}, {/sep}{/users}

// Data
{
  users: [
    { first_name: "Alice" },
    { first_name: "Bob" }
  ]
}

// Output
Alice, Bob
```

## Dynamic includes based on current item

You can use a dynamic path in an include by referencing the current context with `.`.

### Example: dynamic include by status

```js
// Template
{#users}{> "users/status/_{.status}" /}{/users}

// users/status/_active.dust
Active user: {.name}

// users/status/_inactive.dust
Inactive user: {.name}

// Data
{
  users: [
    { name: "Alice", status: "active" },
    { name: "Bob", status: "inactive" }
  ]
}

// Output
Active user: Alice
Inactive user: Bob
```


## Nested Loops

Render nested sections of text using nested loops with `.` notation.

```js
// Template
Hello {#COL1}{.}{#COL2}{.}{/COL2} {/COL1}

// Data
{
  COL1: [1, 2, 3],
  COL2: ['a', 'b']
}

// Output
Hello 1ab 2ab 3ab
```

## Not an array

If the data is not an array, the loop will be executed once.

```js
// Template
Hello {#COL1}a{.}{/COL1}

// Data
{
  COL1: 1
}

// Output
Hello a1
```

## Else

Render different text if the input is a falsy value.

```js
// Template
Hello {#COL1}a{:else}b{/COL1}

// Data
{
  COL1: null
}

// Output
Hello b
```
!> Note: In Igo Dust.js, an empty array `[]` evaluates to false in conditional statements.

## Check

Loops can be rendered with a check on a specific field.

```js
// Template
Hello {#COL0}{?.a}{.b}{/.a}{/COL0}

// Data
{
  COL0: [{a: false, b: 'False'}, {a: true, b: 'True'}]
}

// Output
Hello True
```

## @first, @last, @sep

Use `@first` to render text only for the first element.

```js
// Template
Hello {#COL1}A{@first}{.}{/first}{/COL1}

// Data
{
  COL1: [1, 2, 3]
}

// Output
Hello A1AA
```

Use `@last` to render text only for the last element.

```js
// Template
Hello {#COL1}A{@last}{.}{/last}{/COL1}

// Data
{
  COL1: [1, 2, 3]
}

// Output
Hello AAA3
```

Use `@sep` to render separator between elements.

```js
// Template
Hello {#COL1}A{@sep}{.},{/sep}{/COL1}

// Data
{
  COL1: [1, 2, 3]
}

// Output
Hello A1,A2,A
```

## Parameters

Render a loop with additional parameters.

```js
// Template
Hello {#COL1 w="World"}World{@sep}{.},{/sep}{/COL1}

// Data
{
  COL1: [1, 2, 3]
}

// Output
Hello World1,World2,World
```

It is possible to pass the current context as a parameter to another model.

```js
// Template
Hello {#COL2}A{> "./test/templates/_world_ref" world=. /}{@sep} {/sep}{/COL2}

// ./test/templates/_world_ref
{world}!

// Data
{
  COL2: ['a', 'b']
}

// Output
Hello Aa! Ab!
```

It is possible to pass an attribute of the current element as a parameter to another model.

```js
// Template
Hello {#COL}A{> "./test/templates/_world_ref" world=.a /}{@sep} {/sep}{/COL}

// ./test/templates/_world_ref
{world}!

// Data
{
  COL: [{a: 1}, {a: 2}]
}

// Output
Hello A1! A2!
```

## Includes

Render a loop with an include.

```js
// Template
Hello {> "./test/templates/_array" world=w /}.

// ./test/templates/_array
{#array}{world} {.}{@sep}, {/sep}{/array}

// Data
{
  w: 'World',
  array: [1, 2, 3]
}

// Output
Hello World 1, World 2, World 3.
```

## Complex loops

Render a loop with a complex object.

```js
// Template
{#friends}#{.id} {.name}: {#.friends}{.name}{@sep}, {/sep}{/.friends}{@sep}<br/>{/sep}{/friends}

// Data
{
  friends: [{
    id:   1,
    name: 'Gardner Alvarez',
    friends: [{'name': 'Gates Lewis'},{'name': 'Britt Stokes'}]
  },{
    id:   2,
    name: 'Gates Lewis',
    friends: [{'name': 'Gardner Alvarez'}]
  }]
}

// Output
#1 Gardner Alvarez: Gates Lewis, Britt Stokes<br/>#2 Gates Lewis: Gardner Alvarez
```

## Functions

Execute a function if tag is a function.

```js
// Template
Hello {#t key="World" /}

// Data
{
  t: (params) => params.key
}

// Output
Hello World
```

## Sections

Sections are used to conditionally render blocks of content based on the value of a key in your context.

```js
// Template
{! Outside of the section, Igo Dust.js looks for values at the root of the JSON context !} 
The value of name is: {name} <br/>

{#extraData }
 {! Inside this section, Igo Dust.js looks for values within the extraData object !} 
 Inside the section, the value of name is: {.name} <br/>
{/extraData}

The value of name is: {name}, again. <br/>

{#nonExistentContext}
 This is only output if "nonExistentContext" exists. <br/>
{:else}
 Because "nonExistentContext" does not exist, the else body is output. <br/>
{/nonExistentContext}

// Data
{
  "name": "Jimmy",
  "extraData": {
    "name": "Kate"
  }
}

// Output
The value of name is: Jimmy
Inside the section, the value of name is: Kate
The value of name is: Jimmy, again.
Because "nonExistentContext" does not exist, the else body is output.
```

## Rename "it"

Rename the "it" attribute of a loop.

```js
Hello {#users it="user"}{user.id}{@sep}, {/sep}{/users}!

// Data
{
  users: [{id: 1}, {id: 2}]
}

// Output
Hello 1, 2!
```

You can also rename the "it" attribute of a nested loop.

```js
// Template
Hello {#users it="user"}#{user.id}: {#user.friends it="friend"}{friend.name}{@sep}, {/sep}{/user.friends} #{user.id}{@sep}<br/>{/sep}{/users}

// Data
{
  users: [{
    id:   1,
    name: 'Gardner Alvarez',
    friends: [{'name': 'Gates Lewis'},{'name': 'Britt Stokes'}]
  },{
    id:   2,
    name: 'Gates Lewis',
    friends: [{'name': 'Gardner Alvarez'}]
  }]
}

// Output
Hello #1: Gates Lewis, Britt Stokes #1<br/>#2: Gardner Alvarez #2
```

## Real-world examples

### Building a product list with pricing

```js
// Template
<ul class="products">
{#products}
  <li>
    <strong>{.name}</strong> - ${.price}
    {?.onSale}
      <span class="badge">SALE!</span>
    {/.onSale}
  </li>
  {@sep}<hr/>{/sep}
{/products}
</ul>

// Data
{
  products: [
    { name: 'Laptop', price: 999, onSale: true },
    { name: 'Mouse', price: 29, onSale: false },
    { name: 'Keyboard', price: 79, onSale: true }
  ]
}

// Output
<ul class="products">
  <li>
    <strong>Laptop</strong> - $999
    <span class="badge">SALE!</span>
  </li>
  <hr/>
  <li>
    <strong>Mouse</strong> - $29
  </li>
  <hr/>
  <li>
    <strong>Keyboard</strong> - $79
    <span class="badge">SALE!</span>
  </li>
</ul>
```

### Displaying a table with row numbers

```js
// Template
<table>
  <thead>
    <tr><th>#</th><th>Name</th><th>Email</th></tr>
  </thead>
  <tbody>
  {#users it="user"}
    <tr>
      <td>{$idx}</td>
      <td>{user.name}</td>
      <td>{user.email}</td>
    </tr>
  {/users}
  </tbody>
</table>

// Data
{
  users: [
    { name: 'Alice', email: 'alice@example.com' },
    { name: 'Bob', email: 'bob@example.com' },
    { name: 'Charlie', email: 'charlie@example.com' }
  ]
}

// Output
<table>
  <thead>
    <tr><th>#</th><th>Name</th><th>Email</th></tr>
  </thead>
  <tbody>
    <tr>
      <td>0</td>
      <td>Alice</td>
      <td>alice@example.com</td>
    </tr>
    <tr>
      <td>1</td>
      <td>Bob</td>
      <td>bob@example.com</td>
    </tr>
    <tr>
      <td>2</td>
      <td>Charlie</td>
      <td>charlie@example.com</td>
    </tr>
  </tbody>
</table>
```

### Navigation menu with active state

```js
// Template
<nav>
  <ul>
  {#menu it="item"}
    <li class="{@eq key=item.id value=currentPage}active{/eq}">
      <a href="{item.url}">{item.label}</a>
    </li>
  {/menu}
  </ul>
</nav>

// Data
{
  currentPage: 'about',
  menu: [
    { id: 'home', label: 'Home', url: '/' },
    { id: 'about', label: 'About', url: '/about' },
    { id: 'contact', label: 'Contact', url: '/contact' }
  ]
}

// Output
<nav>
  <ul>
    <li class="">
      <a href="/">Home</a>
    </li>
    <li class="active">
      <a href="/about">About</a>
    </li>
    <li class="">
      <a href="/contact">Contact</a>
    </li>
  </ul>
</nav>
```


---