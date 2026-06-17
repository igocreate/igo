# Changelog

## 6.1.1 - 2026-06-17

### @igojs/db

- **Fixed**: `order()`, `group()` and `distinct()` accept comma-separated lists, multiple arguments and arrays again (e.g. `order('last_name, first_name')`), restoring the ergonomics narrowed by the 6.1.0 SQL hardening; each column is still validated individually. `distinct()` also accepts table-qualified columns (`table.column`). Backticks remain optional.

## 6.1.0 - 2026-06-17

### @igojs/server

- **Security**: the server refuses to start in production when `COOKIE_SECRET` / `COOKIE_SESSION_KEYS` are left at their default values (forgeable sessions).
- **Security**: multipart uploads are bounded (50 MB default, overridable via `config.multiparty`) and temp files are removed once the response ends.

### @igojs/db

- **Security**: hardened SQL generation — `where` column names and `order`/`group`/`distinct`/`from` clauses are validated as identifiers (use the new `orderRaw()` for raw SQL expressions); missing or nested associations in `$or` filters now throw instead of silently returning unfiltered rows.
- **Fixed**: `whereNot({ $or })` expands to `NOT a AND NOT b`; `COUNT` is correct on `group`/`distinct` queries.
- **Performance**: lightweight query clone instead of deep clone; `COUNT`/`SELECT` and same-depth `includes` run in parallel; the cache invalidates per table via a single versioning `INCR` instead of a blocking flush.
- **Changed**: query execution is split into a builder (`Query`) and dedicated executors (`executors/Standard`, `executors/PaginatedOptimized`) instead of the `PaginatedOptimizedQuery` subclass; the internal `PaginatedOptimizedQuery` export is removed.

## 6.0.4 - 2026-06-10

### @igojs/dust

- **Fixed**: adjacent comments (`{! a !}{! b !}`) no longer leak the second comment into the output.
- **Fixed**: backslashes are preserved when `htmltrim` is disabled (were corrupted or caused a compile error).
- **Fixed**: `uppercase` / `lowercase` filters pass non-string values through instead of throwing.
- **Changed**: concurrent compilations of the same template now share one promise; per-call regexes hoisted to module scope.

### @igojs/server

- **Fixed**: `igo i18n update` no longer crashes (`fs.exists is not a function`).
- **Fixed**: crash notification emails redact sensitive keys (cookies, authorization, passwords, tokens) and HTML-escape their contents.
- **Fixed**: cache stores falsy values (`0`, `''`, `false`) correctly, and the date-revival regex no longer mangles strings that merely contain an ISO date.

### @igojs/db

- **Fixed**: database drivers are loaded per name — apps using both MySQL and PostgreSQL no longer get the wrong driver.
- **Fixed**: the migration advisory lock is always released, even when a migration throws.

### @igojs/component

- **Fixed**: template-context writes that shadow a prop/state/store key are no longer silently frozen on first assignment (missing Proxy `set` trap).
- **Fixed**: overlapping renders are serialized — a render requested mid-flight coalesces into a single trailing re-run instead of racing on the shared template context.

## 6.0.3 - 2026-06-05

### @igojs/dust

- **Fixed**: param keys containing `-` no longer break `{>}` includes (compile-time `SyntaxError`).

### @igojs/server

- **Fixed**: only body-parser JSON errors are now treated as client errors — other `SyntaxError`s (template/component compile) are logged and alerted instead of returning a silent 500.

## 6.0.2 - 2026-06-01

### @igojs/server

- **Changed**: scaffolding templates use the positional `{@component "components/X" /}` syntax.

### @igojs/db

- **Fixed**: an explicit `limit()` now overrides a default scope limit instead of being clobbered when scopes are applied.

### @igojs/dust

- **Added**: helper param names may contain `-`, and a positional string param is exposed as `$`; generated object-literal keys are now quoted — enables `{@component "name"}` and `on:event="method"` bindings.

### @igojs/component

- **Added**: child → parent events — `this.emit(event, ...args)` on a child, wired in markup with `{@component "X" on:event="method" /}` (plus programmatic `on()` / `off()`).
- **Changed**: positional component name — `{@component "components/Select" /}` instead of `name="..."`, freeing `name` as a regular prop.
- **Changed**: CSP-safe hydration — SSR props ship in an inert `<script type="application/json">` island read with `devalue.parse`; removes inline-script execution and `new Function`/eval (no `unsafe-inline` / `unsafe-eval` needed).
- **Changed**: lifecycle — `init()` now runs once before the first render (replaces `beforeRender`); shared form state via `FormHandler.getSharedForm()`.
- **Added**: page-level shared store — `this.store`, deeply reactive (nested objects and array mutators), auto-subscribing components that read it during render.
- **Added**: `watch` map — react to changes on `state.` / `props.` / `store.` paths, called with `(newValue, oldValue)`.
- **Changed**: DOM reconciliation now uses `morphdom` instead of `diff-dom` — smaller bundle (~8 KB vs 31 KB min), native key matching, and child-component / file-input preservation via `onBeforeElUpdated` (replaces the detach/reattach + save/restore dance).
- **Changed**: inline events are now **delegated** — one listener per event type on the component root, resolved at dispatch by walking up from `event.target`; no per-render DOM scan or rebinding (replaces `EventBinder`). `FormHandler` is delegated the same way.
- **Removed**: getter `DerivedCache` — its memoization never engaged (getters were always recomputed to collect dependencies). Getters now recompute once per render cycle; the tracking machinery it required is gone. No behaviour change; slightly less per-render work.
- **Fixed**: array mutators on `state` (`push`, `splice`, …) now fire `watch` handlers, matching the store's behaviour.

## 6.0.1 - 2026-05-22

### @igojs/dust

- **Performance**: built-in helpers (`eq`, `ne`, `lt`, `lte`, `gt`, `gte`, `first`, `last`, `sep`, `select`, `none`, `any`) are now inlined at compile time, skipping the runtime helper dispatch.

### @igojs/component

- **Fix**: relaxed component name validation — components no longer need to live under `views/components/`. The `SAFE_NAME_RE` regex now only guards against path traversal.

## 6.0.0 - 2026-05-21

First stable release of Igo.js 6, now distributed as an npm monorepo under the `@igojs/*` scope.

### General

- **BREAKING**: Reorganized as an npm monorepo under the `@igojs/*` scope:
  - `igo` is now split between `@igojs/server` (Express framework) and `@igojs/db` (database layer — previously bundled inside `igo`)
  - `igo-dust` becomes `@igojs/dust`
  - `@igojs/component` is new in v6 — a reactive components module with SSR
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
- **BREAKING**: `Model.unscoped()` renamed to `Model.unscope()` and made selective — pass clause names (e.g. `Model.unscope('order', 'limit')`) to remove only those, or no args to drop the default scope entirely.
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

New reactive components module shipped with v6:

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
- `@igojs/dust` and `i18next` declared as `peerDependencies`

### @igojs/igo (meta-package)

- New meta-package that depends on all sub-packages
- Single version line for the whole stack

### Roadmap (v7)

- Full ESM (`"type": "module"` across all packages)
- Vite for builds and dev server
- Vitest for testing

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
