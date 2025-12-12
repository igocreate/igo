# Whitespace Handling

---

When `htmltrim` is enabled in the configuration (default), igo-dust applies intelligent whitespace normalization to your templates.

## Rules

### 1. Preserve multiple spaces on same line

Multiple consecutive spaces within a line are preserved as-is.

```js
// Template
Hello  World  !

// Output
Hello  World  !
```

### 2. Normalize newlines and indentation

Newlines and adjacent spaces (indentation) are normalized to a single space.

```js
// Template
Hello
  World

// Output
Hello World
```

### 3. Remove whitespace between HTML tags

All whitespace (including newlines) between HTML tags is removed.

```js
// Template
<div>
  <span>Text</span>
</div>

// Output
<div><span>Text</span></div>
```

### 4. Preserve spaces between inline tags

Simple spaces between inline tags are preserved to maintain proper spacing.

```js
// Template
<span>Hello</span> <span>World</span>

// Output
<span>Hello</span> <span>World</span>
```

### 5. Trim templates

Leading and trailing whitespace is removed from the entire template.

```js
// Template

  Template content


// Output
Template content
```

## Disable htmltrim

If you need to preserve exact whitespace (including newlines), disable `htmltrim`:

```js
const config = require('igo-dust/src/Config');
config.htmltrim = false;
```

When `htmltrim` is disabled:
- All whitespace is preserved exactly as written
- Newlines are escaped to generate valid JavaScript
- No normalization is applied

---
