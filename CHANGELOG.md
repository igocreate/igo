# Changelog

## 6.0.0-beta.12 - 2026-04-10

- **@igojs/component 6.0.0-beta.3**:
  - Robust child component preservation across re-renders via `data-component-key` (detach/reattach instead of diff filtering)
  - `{@component}` helper now defaults `data-component-key` to the component name when no `key=` is provided; warns on duplicate keys among siblings
  - Preserve wrapper attributes (`data-component`, `data-props`, `id`, etc.) during DiffDOM apply
  - Preserve `<input type="file">` selection across re-renders using `DataTransfer`
  - Replace `window.__component_form` with module-level shared form state
  - Skip file inputs in `FormHandler` (handled separately)
  - SSR: mirror client-side behavior by copying `props.form` into `state.form`
  - SSR: log component name on script evaluation errors for better DX
  - Exclude `key` parameter from serialized props on both client and server `@component` helpers
- **@igojs/igo 6.0.0-beta.27**:
  - Remove invalid `main` field from meta-package
- **skel/tailwind**: rename `webpack-prod` script to `build`

## 6.0.0-beta.11 - 2026-02-09

- Fixed LEFT JOIN 1-N duplicates with JavaScript deduplication in paginated optimized queries
- Fixed migrations line return issue
- Added per-error email throttling to prevent crash loop spam
- Moved heavy dependencies (express, redis, sass, etc.) to peerDependencies in @igojs/server
- Moved @igojs/dust and i18next to peerDependencies in @igojs/signal

## 6.0.0 - TBD

- Added `igo db seed` command to run seed files from `seeds/` directory
- Added `igo db reseed` command to reset database and run seeds
- **BREAKING**: `silent` query option now swallows errors and returns `null` instead of just suppressing logs
- **BREAKING**: Upgraded to Express 5.1
- **BREAKING**: Removed Bootstrap skeleton template
- Improved migration system to silently skip hidden files (`.gitkeep`, etc.)
- Removed Tailwind UI placeholder image from default template

**v7 roadmap**:
- Full ESM (`"type": "module"` across all packages)
- Vite for builds and dev server
- Vitest for testing
- Replace `diff-dom` with `morphdom` in `@igojs/component` (smaller bundle, native key matching via `getNodeKey`, simpler child-component preservation via `onBeforeElUpdated`)

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
