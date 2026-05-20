# Changelog

## [6.0.0] - 2026-05-20

First stable release under the `@igojs/dust` name, part of the Igo.js 6.0 monorepo.

### Added

- Single-file `.dust` component support (`<script>` + template), consumed by `@igojs/component` for SSR (`getComponent`, `getCompiledComponent`, `ComponentSplitter`)
- `@select`, `@any`, `@none` helpers for grouping comparators under a single key
- Helpers can receive an async `body` function as third parameter, enabling helpers like `@repeat` that re-render their content
- Shorthand parameter syntax in tags
- `getSource()` to retrieve compiled template source as a JS string

### Removed

- **Breaking**: experimental stream mode (`render(src, data, stream)` third parameter). Never delivered TTFB gains in practice and was not validated for ETag/304 handling.
- Browser bundle (`dist/igo-dust-*.min.js`) and webpack build. The bundle was unmaintained (filename / global-name mismatch, no publish-time rebuild). `@igojs/dust` is Node-only.

### Changed

- Package renamed from `igo-dust` to `@igojs/dust`
- Improved whitespace handling: preserves multiple spaces on same line, normalizes newlines, removes whitespace between HTML tags

## Pre-monorepo history (`igo-dust`)

### [0.5.0] - 2025-10-08

- Performance: Optimized template compilation by using array joins instead of string concatenation
- Performance: Cached AsyncFunction constructor to avoid repeated object prototype lookups
- Performance: Made regex patterns static in Parser to avoid recreation on each parse
- Fixed bug with single quotes in params

### [0.4.1] - 2024-06-30

- Fixed normalized paths handling

### [0.4.0] - 2024-06-30

- **Breaking**: Igo-dust is now fully async - all rendering operations return promises
- Templates are now compiled to async functions
- Exposed `getSource` function to retrieve compiled template source code
- Added documentation on loops

### [0.3.5] - 2023-12-01

- Fixed Config views handling
- Fixed isJsDom check when navigator is undefined

### [0.3.4] - 2023-11-XX

- Refactored API for better consistency

### [0.3.3] - 2023-XX-XX

- Fixed include functionality

### [0.3.2] - 2023-XX-XX

- Fixed params parsing

### [0.3.1] - 2023-XX-XX

- Fixed handling of "=" signs in params

### [0.3.0] - 2023-XX-XX

- Includes with body support
- Additional test coverage

### Earlier Versions

See [git history](https://github.com/igocreate/igo-dust/commits/master) for changes in versions prior to 0.3.0.
