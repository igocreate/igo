# Changelog

## 6.0.0 - 2026-05-21

First stable release of Igo.js 6, now distributed as an npm monorepo under the `@igojs/*` scope.

### General

- **BREAKING**: Packages migrated from individual repos to a monorepo. Imports change:
  - `igo` → `@igojs/server`
  - `igo-dust` → `@igojs/dust`
  - `igo-db` → `@igojs/db`
  - `@igojs/signal` → `@igojs/component` (with significant rework)
- The meta-package `@igojs/igo` pulls in all sub-packages.

### @igojs/dust

- **Added**: Single-file `.dust` component support (`<script>` + template), consumed by `@igojs/component` for SSR (`getComponent`, `getCompiledComponent`)
- **Added**: `@select`, `@any`, `@none` helpers for grouping comparators under a single key
- **Added**: Helpers can receive an async `body` function as third parameter (enables helpers like `@repeat`)
- **Added**: `getSource()` to retrieve compiled template source as a JS string
- **Added**: Shorthand parameter syntax in tags
- **Removed**: Experimental stream mode (`render(src, data, stream)` third parameter) — never validated for ETag/304 handling
- **Removed**: Browser bundle (`dist/igo-dust-*.min.js`) and webpack build — `@igojs/dust` is now Node-only
- Improved whitespace handling: preserves multiple spaces on same line, normalizes newlines, removes whitespace between HTML tags

### @igojs/db

- **Added**: `igo db seed` and `igo db reseed` CLI commands
- **Added**: `PaginatedOptimizedQuery` — automatic COUNT/IDS/FULL pattern for large tables with joins (activates when `.page()` + `.join()` are used together)
- **Added**: MongoDB-style operators (`$like`, `$between`, `$gte`, `$lte`, `$gt`, `$lt`, `$or`, `$and`) — with explicit errors on unknown operators
- **Added**: PostgreSQL driver alongside MySQL
- **Added**: Multi-database support (`config.databases`)
- **Added**: MySQL `enableKeepAlive: true` by default (exposed as pool option)
- **Added**: PostgreSQL `keepAlive: true` by default
- **BREAKING**: `silent` query option now swallows errors and returns `null` (previously just suppressed logs)
- Transactions API on `Db` is internal/test-only (used by the test framework for per-test isolation). Renamed with `_` prefix to make the contract explicit.
- Fixed LEFT JOIN 1-N duplicates in paginated optimized queries (JS-side dedup)
- Migrations: silently skip hidden files (`.gitkeep`, etc.)
- Fixed migration line-return handling

### @igojs/server

- **BREAKING**: Upgraded to Express 5.1
- **BREAKING**: Removed Bootstrap skeleton template
- **BREAKING**: Plugin system removed (unused)
- **BREAKING**: `igo compress` CLI removed (use `npm run compress`)
- Express, Redis, Sass and other heavy dependencies moved to `peerDependencies`
- Error handler migrated from deprecated `domain` module to `AsyncLocalStorage`
- Added per-error email throttling to prevent crash-loop spam
- Flash middleware: automatic Redis-backed fallback for large objects (>1KB), warnings >10KB, parallel loading
- Parallel service initialization for faster startup
- Language validation uses `Set` for O(1) lookup
- Replaced `clean-webpack-plugin` with Webpack 5 native `output.clean`
- Removed IE 11 compatibility for smaller bundles
- Removed dependencies: sharp, cheerio, pg-hstore, file-loader, url-loader, imagemin, imagemin-cli
- Removed Tailwind UI placeholder image from default template

### @igojs/component

Replaces and significantly extends the former `@igojs/signal`:

- **Added**: Single-file `.dust` components — `<script>` block (definition) + template, no manual registration
- **Added**: Deep reactivity via JavaScript Proxy with automatic dependency tracking for computed values
- **Added**: SSR via `{@component}` Dust helper with client-side hydration
- **Added**: Inline events (`on:click="method"`) and two-way form binding
- **Added**: DiffDOM-based DOM reconciliation
- **Added**: Robust child component preservation across re-renders via `data-component-key` (detach/reattach)
- **Added**: `{@component}` helper defaults `data-component-key` to the component name; warns on duplicate keys among siblings
- **Added**: SSR mirrors client-side `props.form` → `state.form` copying
- Preserve `<input type="file">` selection across re-renders using `DataTransfer`
- Preserve wrapper attributes (`data-component`, `data-props`, `id`) during DiffDOM apply
- Replace `window.__component_form` with module-level shared form state
- Exclude `key` parameter from serialized props
- `@igojs/dust` and `i18next` moved to `peerDependencies`

### @igojs/igo (meta-package)

- New meta-package that depends on all sub-packages
- Single version line for the whole stack

### Roadmap (v7)

- Full ESM (`"type": "module"` across all packages)
- Vite for builds and dev server
- Vitest for testing
- Replace `diff-dom` with `morphdom` in `@igojs/component` (smaller bundle, native key matching, simpler child-component preservation)

## 5.2.3 - 2025-10-16

- **Flash middleware improvements**:
  - Automatic fallback to Redis-backed `cacheflash` for large objects (>1KB)
  - Warning logs for very large flash objects (>10KB)
  - Parallel loading of cacheflash objects for better performance

## 5.2.2 - 2025-10-13

- **Important**: Migrated error handler from deprecated `domain` module to `AsyncLocalStorage`
- Express 5 compatibility preparation

## 5.2.1 - 2025-09-08

- Upgrade Igo Dust

## 5.2.0 - 2025-09-08

- Parallel service initialization for faster startup
- Language validation now uses Set for O(1) lookup performance
- New `npm run compress` script using @squoosh/cli
- Replaced clean-webpack-plugin with Webpack 5 native `output.clean`
- Removed IE 11 compatibility for smaller/faster bundles
- Updated documentation (Webpack 2 → 5, jshint → eslint)
- **BREAKING**: Plugin system removed (unused feature)
- **BREAKING**: `igo compress` CLI command removed (use `npm run compress`)
- Removed dependencies: sharp, cheerio, pg-hstore, file-loader, url-loader, imagemin, imagemin-cli, clean-webpack-plugin
- Fixed all npm audit vulnerabilities and deprecation warnings

## 5.1.7

- **Important fix**: Fixed lodash forEach vs forOwn usage in Query and Sql classes

## 5.1.6

- Fixed typed columns in joins
- Fixed lodash forEach vs forOwn usage

## 5.1.5

- Rewrite Sql as a class + refactor whereNot
- Fixed joins and filter handling on joined columns

## 5.1.3

- Updated dependencies
- Fixed migration (10s delay)

## 5.1.2

- Fixed nested has_many includes
- Allow nested includes
- Added ORM joins support

## 5.1.1

- Removed babel

## 5.1.0

- Async igo-dust support
- Upgrade igo-dust dependency

## 5.0.11

- Fixed default tailwind project with webpack config

## 5.0.10

- Updated dependencies
- Fixed limit/offset
- Fixed default tailwind project
- Fixed migrations list function

## 5.0.9

- Updated dependencies + minor fixes
- Moved webpack-assets.json file (to avoid webpack restarting)

## 5.0.8

- Fixed Db error handling and logging
- Fixed joins in count queries

## 5.0.7

- Fixed migrations error handling

## 5.0.6

- Fixed migrations error

## 5.0.5

- Fixed migrations lock

## 5.0.4

- Fixed migrations

## 5.0.3

- Fixed async db initialization
- Added req.hasError() method to validator

## 5.0.2

- Fixed CLI: igo db

## 5.0.1

- Fixed Query.count()

## 5.0.0

- **BREAKING**: Removed callback support, async/await only
