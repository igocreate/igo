# Basics

---

## Replace simple text

Replace a placeholder `{w}` with a specified value in the template.

```js
// Template
Hello, {w}!

// Data
{ 
  w: 'world'
}

// Output
Hello, world!
```

Igo Dust.js will not crash when a key is missing in the data object.

```js
// Template
Hello, {w}!

// Output
Hello, !
```

## Comments

Comments are enclosed in `{!` and `!}`.

```js
// Template
Hello, {! comment !}world!

// Output
Hello, world!
```

Igo Dust.js will ignore data that are inside comments.

```js
// Template
Hello, {! comment {name} !}world!

// Data
{ 
  name: 'John'
}

// Output
Hello, world!
```

## Special characters

You can use special tags to escape Igo Dust.js tags.

- `{~s}`: ` `
- `{~lb}`: `{`
- `{~rb}`: `}`
- `{~n}`: `\\n`
- `{~r}`: `\\r\\n`

```js
// Template
{~lb}Hello!{~rb}

// Output
{Hello!}
```

## Function

You can use a function to replace a placeholder. (invoked without arguments)

```js
// Template
Hello, {w}!

// Data
{ 
  w: () => 'world'
}

// Output
Hello, world!
```

## Objects

Access objects by key in references in the template.

```js
// Template
Hello, {users[hello].lastname}!

// Data
{ 
  users: { 
    john : { 
      lastname: 'World' 
    }
  },
  hello: 'john'
}

// Output 
Hello, World!
```

Access objects by complex key in references in the template.

```js
// Template
Hello, {users[hello.one].lastname}!

// Data
{
  users: { 
    john : { 
      lastname: 'World' 
    }
  },
  hello: { one: 'john' } 
}

// Output 
Hello, World!
```

## Arrays

Access arrays by index in references in the template.

```js
// Template
Hello, {users[1]}!

// Data
{
  users: [ 'john', 'World' ]
}

// Output
Hello, World!
```

## Nested object access

Access deeply nested properties using dot notation.

```js
// Template
{user.profile.address.city}, {user.profile.address.country}

// Data
{
  user: {
    profile: {
      address: {
        city: 'Paris',
        country: 'France'
      }
    }
  }
}

// Output
Paris, France
```

## Dynamic property access

Combine multiple dynamic references.

```js
// Template
{products[category][selectedId].name}

// Data
{
  category: 'electronics',
  selectedId: 'laptop123',
  products: {
    electronics: {
      laptop123: { name: 'MacBook Pro' }
    }
  }
}

// Output
MacBook Pro
```

---