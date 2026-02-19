
# Static Site Generation

Igo can generate a full static site from Dust templates and Markdown files.

## Configuration

Create an `app/static.js` file:

```js
// app/static.js
module.exports = {
  // Directory containing pages to generate (relative to views/)
  root: 'static',

  // Output directory (default: 'public')
  output: 'public',

  // Default Dust layout for Markdown files (default: '<root>/_md_layout')
  md_layout: 'static/_md_layout',

  // Global data available in all templates
  globals: async () => ({
    site: { name: 'My Site', url: 'https://example.com' },
  }),

  // Dynamic pages (in addition to files in root)
  pages: async () => [
    { template: 'products/show', output: 'products/my-product/index.html', data: { title: 'My Product' } },
  ],
};
```

## File conventions

All `.dust` and `.md` files in `views/<root>/` are automatically generated:

```
views/
  static/                 <- root defined in static.js
    _md_layout.dust       <- default layout for markdown (not generated)
    index.dust            -> public/index.html
    about.dust            -> public/about/index.html
    blog/
      index.dust          -> public/blog/index.html
      my-article.md       -> public/blog/my-article/index.html
```

Non-index files produce clean URLs: `about.dust` generates `about/index.html` so the URL is `/about/`.

## Markdown support

Markdown files use YAML frontmatter for metadata:

```markdown
---
title: My blog post
layout: layouts/blog
description: A great article
---

# Introduction

Content here...
```

The `layout` field overrides the default `md_layout`. The markdown content is converted to HTML and injected as `{content|s}` in the Dust layout.

Files starting with `_` are not generated as pages (useful for layouts and partials).

Example layout (`views/static/_md_layout.dust`):

```dust
{> "layouts/main" /}

{<content}
  <article>
    <h1>{title}</h1>
    {content|s}
  </article>
{/content}
```

## Usage

```bash
igo generate
```

## Dynamic pages

The `pages` function in `static.js` returns an array of pages to generate:

```js
module.exports = {
  // ...
  pages: async () => [
    {
      template: 'products/show',
      output: 'products/widget/index.html',
      data: { product: { name: 'Widget', price: 42 } },
    },
  ],
};
```

Each page specifies a Dust template, an output path, and data to inject into the template context.
