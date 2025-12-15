# Partials and Layouts

---

Igo Dust.js allows the insertion of reusable templates within your templates. Additionally, layouts can be constructed to provide a consistent structure for rendering content.

## Basics

Simple with parameters:

```js
// Template
Hello {> "./templates/_world_ref" world="World" /}

// ./templates/_world_ref
{world}!

// Output
Hello World!
```

With references parameters:

```js
// Template
Hello {> "./templates/_world_ref" world=w /}

// Data
{ 
  w: "World" 
}

// Output
Hello World!
```

With Nested Reference Parameters:

```js
// Template
Hello {> "./templates/_world_ref" world=test.w /}

// Data
{ 
  test: { w: "World" }
}

// Output
Hello World!
```

Dynamic:

```js
// Template 
Hello {> "./test/templates/{file}" /}

// Data
{
  file: "_world_ref",
  world: "World"
}

// .test/templates/_world_ref
{world}!

// Output
Hello World!
```

## Layouts

Layout with Content Insertion

```js
// Template
{> "./templates/layout_title" /}
{<content}
  {test.w}
{/content}

// ./templates/layout_title
{+title}Hello{/title}
{+content /}!

// Data
{ 
  test: { w: "World" }
}

// Output
Hello World!
```

Layout with Default Content, custom title and includes with body

```js
// Template
{> "./test/templates/layout_title" /} {<title}Hi{/title} {<content}World, {> "./test/templates/_body"}body{/>}{/content}

// ./test/templates/_body
The {+/} is inserted here

// Data
{
  company: { 
    name: 'World' 
  }
}

// Output
Hi World, The body is inserted here!  
```

Layout with content and loop

```js
// Template
{> "./test/templates/layout" /} {<content}{#company}{.name}{/company}{/content}

// ./test/templates/layout
Hello {+content /}!

// Data
{
  company: { 
    name: 'World' 
  }
}

// Output
Hello World!
```

## Recursive

```js
{#user}{> "./test/templates/_recursive" friends_list=.friends/}{.name}{/user}

// ./test/templates/_recursive
{#friends_list}
  {.name}, 
  {> "./test/templates/_recursive" friends_list=.friends /}
{/friends_list}

// Data
{
  user: {
    friends: [{
      name: 'John',
      friends: [{
        name: 'Jane',
        friends: []
      }]
    }],
    name: 'Bernard'
  }
}

// Output
John, Jane, Bernard
```

## Partials with body

```js
// Template
{> "./test/templates/_body"}
  BODY
{/>} !

// ./test/templates/_body
The {+/} is inserted here

// Output
The BODY is inserted here !
```

---