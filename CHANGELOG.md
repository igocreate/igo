# Changelog

## 6.2.3 - 2026-08-26

### @igojs/db

- **Fixed**: a query whose raw SQL reads another table is no longer cached. A subquery inside `where()`, `orderRaw()` or `select()` reads a table that is in neither `query.table` nor `query.joins`, so no version stamps the entry: a write on that table invalidated nothing, and stale rows were served for the whole TTL. `Session.where('training_type_id IN (SELECT id FROM training_types WHERE active = 1)')` was enough to hit it. Any raw fragment containing a `SELECT` is now left uncached — deliberately blunt, since a false positive costs a cache miss where a false negative serves stale rows. This is the read-side counterpart of the 6.2.1 fix on tables reached by inference in the paginated executor. Applications using raw subqueries on cached models will see those queries stop being cached, and their hit rate drop accordingly.
- **Added**: `CacheStats.getStats()` reports `skipped`, the queries a cached model could not cache — a join on an uncached model, or a raw subquery. They never reach the cache, so they count as neither hits nor misses and stay out of `total` and `rate`. Both call sites report, including the paginated executor, which reaches `QueryCache` without going through `CachedQuery`.
- **Added**: `config.cache_warnings` logs one warning per query shape when a cached model runs a query the cache cannot serve, naming the cause and the SQL. Off by default: it is meant for development, and an application with a legitimately uncached join would otherwise start logging on its next deploy.
- The dependency injection container moved from `src/context.js` to `src/dependencies.js`. Internal to the package, but `context` already meant a request context in `@igojs/server` and a rendering context in `@igojs/component`, while this one is a static registry filled once at boot.

## 6.2.2 - 2026-08-26

### @igojs/db

- **Fixed**: a table named inside an `orderRaw()` function resolves to the join it names. The search that matched it was depth-first, so it descended into the first declared association before testing the direct ones, and could return a deeper route to the same table. Since 6.2.1 drops a sort path whose levels are not all joined, that route crossed an unjoined table and was discarded whole — leaving the `ORDER BY` referencing an alias no join had defined, and the query failing at the database. `Folder.join(['applicant', 'beneficiary']).orderRaw('COALESCE(beneficiary.expires_at, applicant.expires_at)').page(1, 25)` was enough to hit it, whenever `beneficiary` was also reachable through `applicant`.
- Removed the internal `select_ids` verb of the paginated executor: `query.select` already carried the primary keys, and the one flag reading the verb was always true.

## 6.2.1 - 2026-08-25

### @igojs/db

- **Breaking**: an association path in `where()` or `order()` requires the association to be joined. The optimized paginated executor used to reach another table on its own — turning a dot-path condition into an `EXISTS`, and inferring a `LEFT JOIN` for a sort from an association path, a table prefix, a bare column found in an associated block, or a table named inside a `COALESCE`. Nothing failed, so `Book.where({ 'library.city.name': 'Lyon' }).join('library').page(1, 10)` worked while the same condition raised `Unknown column` on `count()`. It now only extracts a path whose association is joined, and only adds the sort joins it was told about; anything else is sent to the database as written and fails there, as it already did outside the optimized path. Declare the levels you filter or sort on — `join({ library: 'city' })` — and the plan is unchanged: those filters still compile to `EXISTS`.
- **Fixed**: a cached paginated query is invalidated by writes to the tables it filters or sorts on. Those reached by inference were absent from `query.joins`, so they were absent from the version stamp the entry is compared against: writes to them invalidated nothing, and stale rows, stale counts and a frozen page ordering were served for the whole TTL.

### @igojs/server

- **Fixed**: a value the cache cannot serialize no longer fails the write. `v8.serialize` rejects functions, class references and Proxies where JSON silently dropped them, and `cache.put()` is often called without `await` — in flash, the failure was invisible: the UUID stayed in the session, the next GET read `null`, and the flash came back empty. The parts that cannot be cloned are now dropped, with a warning naming the key. Nothing is cloned twice on a value that serializes.
- **Fixed**: `req.flash()` sends a cyclic value to `cacheflash` whatever its size. The session is stored as JSON, so `JSON.stringify` threw while writing the response headers, out of reach of any handler.
- **Removed**: `req.sessionOptions`, an unused `cookie-session` convention. It only half-worked: the cookie attribute followed a per-request `maxAge`, the expiry embedded in the encrypted payload did not, so a longer `maxAge` produced a cookie the browser keeps and the server rejects.
- **Fixed**: `cache.mget()` with an empty list returns `[]` instead of calling Redis with no key.

## 6.2.0 - 2026-08-24

### @igojs/server

- **Security**: the session cookie is now encrypted and authenticated (AES-256-GCM, one key derived per `COOKIE_SESSION_KEYS` entry via HKDF), replacing `cookie-session`'s signed-but-readable cookie. Its contents are opaque to the client, and `maxAge` is enforced server-side from an expiry stamped in the payload instead of being left to the browser. Existing sessions are invalidated on upgrade; key rotation works by prepending the new key (older keys still decrypt). `config.cookieSessionMiddleware` is removed — `config.cookieSession` options (`name`, `maxAge`, `httpOnly`, `secure`, …) are unchanged.
- **Changed**: cache values are serialized with `v8.serialize` instead of JSON. `Date`, `Buffer`, `Map`, `Set` and `RegExp` survive the round trip, and falsy values (`0`, `''`, `false`) are valid hits. Stored values are binary, so they are no longer readable with `redis-cli`; entries written by an earlier release — or by another Node major — are treated as misses and rewritten, never served with degraded types. Counters written by `incr`/`incrby` stay plain integers.
- **Added**: `cache.mget(namespace, ids)` (single round trip, missing keys as `0`) and `cache.incrby(namespace, id, value)`.
- **Fixed**: the `igo` CLI reads its version from `@igojs/server` instead of `@igojs/igo`, so it no longer crashes when the meta-package isn't installed.

### @igojs/db

- **Fixed**: `count()` on a cached model goes through the cache — it built a plain `Query`, so every count hit the database.
- **Fixed**: a cached query is invalidated by writes to its joined tables, not just its own. Entries are stamped with the versions of every table they were built from and stop matching as soon as one moves; a query joining a model without its own cache is not cached at all, since its writes would go unnoticed.
- **Performance**: the optimized paginated executor caches its three phases (COUNT, SELECT IDS, SELECT FULL) instead of always hitting the database.
- **Performance**: cache hit/miss counters are buffered in memory and flushed by traffic (30 s window) instead of one Redis `INCR` per query; `getStats()` flushes first, so the numbers stay exact.
- **Changed**: the default cache TTL drops from 24 h to 1 h — invalidated entries are now overwritten on the next miss rather than waiting for expiration.

### @igojs/component

- **Security**: the component and template endpoints reject absolute paths, and a missing file returns a generic 404 instead of an error message that leaked the resolved filesystem path.

### Dependencies

- **Breaking**: the `i18next` peer moves from `^25.0.0` to `^26.0.0` (in `@igojs/server` and `@igojs/component`). i18next is an auto-installed peer, so upgrading igo pulls 26 in by itself and most apps have nothing to do. Two cases do break: an app that declares `i18next` in its own dependencies as `^25.0.0` gets an `ERESOLVE` until it widens the range, and an app using an option v26 dropped has to migrate — of those, only the legacy `interpolation.format` function really matters (`initImmediate` was already mapped to `initAsync`, `simplifyPluralSuffix` was unused, and `showSupportNotice`, which igo no longer passes, was cosmetic).
- **Breaking**: the `redis` peer moves from `^5.0.0` to `^6.0.0`. Same as above: node-redis 6 comes in on its own, unless the app declares `redis` itself. No igo code changed — node-redis 6 defaults to RESP3, but every command the cache uses keeps its shape (`scan` still returns a string cursor, `withTypeMapping` still yields a `Buffer`), and the suite passes on both majors. Two things to check before upgrading: node-redis 6 introduces a 5 s default command timeout, and RESP3 requires a Redis **server** >= 6.0.
- `nodemailer` 8 → 9: HTTPS fetches of remote content (attachment `href`/`path`, OAuth2 token endpoints, proxy `CONNECT`) now validate TLS certificates by default — opt out per request with `tls.rejectUnauthorized: false`.
- `webpack-dev-server` 5 → 6 (requires Node >= 22.15), `webpack` 5.109, `webpack-cli` 7.2, `mysql2` 3.24, `pg` 8.23, `devalue` 5.9 and other minor bumps. The `igo create` skeleton moves to `eslint` 10.9 and `tailwindcss` 4.3.3.


## 6.1.3 - 2026-06-25

### @igojs/db

- **Fixed**: `where` and `order` clauses now resolve nested association paths (3+ segments, e.g. `pme_folder.studies.studies_year`) to the joined leaf alias (`studies.studies_year`) in the standard executor, as the optimized paginated executor already did. Previously such a key produced an invalid multi-part SQL identifier (`Unknown column`) on non-paginated `list()`/`count()`. Single-segment columns and `alias.column` references are unchanged; the resolution is idempotent.

## 6.1.2 - 2026-06-18

### @igojs/component

- **Added**: declarative enter/exit transitions — `transition:*` attributes (inline class lists or named presets via `Transitions.preset`), hooked into morphdom add/discard; CSS-agnostic and Tailwind-purge-safe. A re-add mid-leave reuses the node; no enter on the first (SSR) paint; duration-0 and a timeout fallback prevent leaked nodes.
- **Added**: explicit `data-key` on plain elements is honored by reconciliation (not just `data-component-key`/`id`), pinning a node whose sibling order varies so it isn't silently recreated.
- **Fixed**: inline event handlers receive the matched element as a second argument (`handler(e, el)`), in addition to `e.currentTarget`.
- **Fixed**: SSR getters can call component methods (`computeDerived` exposes them), avoiding a silent first-paint mismatch.
- **Fixed**: the client silences i18next's Locize promo banner; the skeleton's translations preload uses `crossorigin` so it isn't fetched twice.

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
