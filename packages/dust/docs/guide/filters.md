# Filters

---

Filters are used to transform a variable before outputting it. You can attach one or many filters to a variable, and you can add your own filters to augment the ones built-in to Dust.

Filters are attached to a Dust reference by adding a pipe `|` and the filter name after the reference name. You can chain filters by adding multiple pipes. The filters will be run from left-to-right.

## Built-in Filters

* `h` – HTML-encode
* `s` – turn off automatic HTML encoding
* `j` – Javascript string encode
* `u` – encodeURI
* `uc` – encodeURIComponent
* `js` – JSON.stringify
* `jp` – JSON.parse
* `uppercase` - Uppercase
* `lowercase` - Lowercase

!> Dust applies the `h` filter to all references by default, ensuring that variables are HTML-escaped. You can undo this autoescaping by appending the `s` filter.

## Examples

No filter:

```js
// Template
{title}

// Data
{
  title: '"All is <Fair> in Love & War"'
}

// Output
"All is <Fair> in Love & War"
```

`turn off automatic HTML encoding` filter:

```js
// Template
{title|s}

// Data
{
  title: '"All is <Fair> in Love & War"'
}

// Output
"All is <Fair> in Love & War"
```

`JSON.stringify` & `turn off automatic HTML encoding`:

```js
// Template
{title|js|s}

// Data
{
  title: '"All is <Fair> in Love & War"'
}

// Output
"\"All is \u003cFair> in Love & War\""
```

## Real-world examples

### Displaying user-generated content safely

```js
// Template
<div class="comment">{comment.text}</div>

// Data
{
  comment: {
    text: '<script>alert("XSS")</script>Safe comment'
  }
}

// Output (HTML-encoded by default)
<div class="comment">&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;Safe comment</div>
```

### Building URLs with encoding

```js
// Template
<a href="/search?q={query|uc}">Search for {query}</a>

// Data
{
  query: 'hello world & more'
}

// Output
<a href="/search?q=hello%20world%20%26%20more">Search for hello world &amp; more</a>
```

### Displaying rich HTML content

```js
// Template
<article>{content|s}</article>

// Data
{
  content: '<h1>Title</h1><p>Rich <strong>HTML</strong> content</p>'
}

// Output (HTML not encoded)
<article><h1>Title</h1><p>Rich <strong>HTML</strong> content</p></article>
```

### Preparing data for JavaScript

```js
// Template
<script>
const userData = {data|js|s};
console.log(userData);
</script>

// Data
{
  data: { name: "O'Brien", age: 30 }
}

// Output
<script>
const userData = {"name":"O'Brien","age":30};
console.log(userData);
</script>
```

---