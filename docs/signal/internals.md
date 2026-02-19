
# Internals

This page explains how Signal works under the hood. You don't need this to use Signal — see [Getting Started](./getting-started) for the user-facing documentation.

## Architecture overview

```
Server                              Browser
──────                              ──────
Controller sets signal_props        1. Parse __signal_props (devalue)
Middleware serializes props         2. Mount [data-component] elements
Component.ssr() computes getters    3. Create reactive Proxies
Dust renders full HTML              4. Load template via /__signal/templates
HTML sent to client →               5. Render with DiffDOM on state change
```

## Reactive state (StateProxy)

Signal uses JavaScript Proxies to provide deep, automatic reactivity — similar to Vue 3.

When you access `this.state`, you're interacting with a `StateProxy`:

- **Deep wrapping**: every nested object and array is automatically wrapped in a Proxy
- **WeakMap caching**: proxied objects are cached to avoid double-wrapping
- **Array mutation interception**: `push`, `pop`, `splice`, `sort`, `reverse`, `shift`, `unshift` are all intercepted
- **Automatic render trigger**: any mutation calls `component._triggerRender()`

### Render batching

Multiple state mutations in the same synchronous block are batched into a single render via `requestAnimationFrame`:

```js
this.state.loading = true;
this.state.error = null;
this.state.items = [];
// → Only ONE render happens (next animation frame)
```

## Computed values (DerivedCache)

Getters are memoized with automatic dependency tracking:

1. Before computing a getter, Signal enables tracking mode
2. Every access to `this.props.*`, `this.state.*`, or another getter is recorded as a dependency
3. The result is cached along with its dependency snapshot
4. On re-render, dependencies are checked with `Object.is` — if unchanged, the cached value is reused

## Render cycle

```
[state mutation]
    ↓
requestAnimationFrame (batching)
    ↓
beforeRender()
    ↓
compute all getters (DerivedCache)
    ↓
merge context: { ...props, ...state, ...derived }
    ↓
dust template renders to HTML string
    ↓
DiffDOM compares new HTML with current DOM
    ↓
filter out diffs touching child components
    ↓
apply minimal diff to live DOM
    ↓
sync data-props for child components
    ↓
bind events (reuse existing via WeakMap)
    ↓
mount newly added child components
    ↓
afterRender()
```

## Event binding (EventBinder)

EventBinder uses a WeakMap to cache listeners per element:

- If DiffDOM preserves an element, its listener is **reused** (no rebind)
- If an element is removed, the WeakMap allows garbage collection
- Events don't cross component boundaries — binding to elements inside a child `data-component` logs a warning

## Form binding (FormHandler)

When `props.form` exists, FormHandler:

1. Binds to all `<input>`, `<select>`, and `<textarea>` inside the component
2. Listens for `input` (text fields) or `change` (checkboxes, radios, selects) events
3. Updates `component.state.form[fieldName]` on each change
4. Skips inputs inside child `data-component` elements
5. Form state is shared across all components via `window.__signal_form`

## Serialization (SerializeUtils)

The server-side serializer:

- Uses a WeakMap for deduplication (same Model instance serialized only once)
- Detects circular references and skips them
- Calls `.serialize()` on Model instances, `.getValues()` on Form objects
- Encodes the result with [devalue](https://github.com/Rich-Harris/devalue) for XSS safety

## Initialization flow: props, state, and form

### CSR (browser)

```
constructor(element, props)
    ↓
1. Hydrate props:
   - globalProps = window.__signal_props
   - localProps  = JSON.parse(element.dataset.props)
   - this._props = { ...globalProps, ...localProps }
    ↓
2. Initialize form in state (if props.form exists):
   - this._state.form = this._props.form
    ↓
3. Create reactive proxies:
   - this.props = trackingProxy(this._props)    ← read-only, tracks deps
   - this.state = StateProxy(this._state)       ← deep reactive, triggers render
    ↓
4. init() (async):
   - Load Dust template
   - If props.form: create FormHandler
     → FormHandler.initForm() replaces _state.form with window.__signal_form (shared singleton)
   - First render()
```

Key points:
- `this.props` is a tracking Proxy (records dependency access, no setter)
- `this.state` is a deep reactive Proxy (triggers `_triggerRender()` on mutation)
- State mutations before `init()` completes don't trigger renders (`_isInitialized` is false)

### SSR (server)

```
static ssr(props)
    ↓
1. new this(null, props) — constructor with element=null
   - isServer=true → no Proxy, no EventBinder, no DiffDOM
   - this._props = props, this.props = props
   - this._state = {}, this.state = this._state
   - if props.form → this._state.form = props.form
    ↓
2. Assign props directly:
   - instance.props = props     (plain object, no Proxy)
   - instance._props = props    (defensive, not used by SSR getters)
    ↓
3. Initialize form (if props.form exists):
   - instance._state.form = props.form
    ↓
4. Evaluate all prototype getters:
   - desc.get.call(instance) for each non-reserved getter
   - Getters access this.state.form and this.props directly (no Proxy)
    ↓
5. Return derived values → merged into res.locals
```

Key points:
- No Proxy on server — `this.state` and `this.props` are plain objects
- No `init()` is called — no template loading, no FormHandler
- Getters that access the DOM will throw and are caught/skipped

## SSR mechanism

When `signal_components` is set:

1. For each component, the middleware creates a temporary instance with `element=null`
2. Props are passed directly (no DOM)
3. All prototype getters are evaluated (excluding `_private`, `rawState`, `events`)
4. Results are merged into `res.locals` for the Dust template
5. The page renders with full HTML — no JavaScript needed for the initial view

## Template loading

In the browser, when a component initializes:

1. It requests the Dust template source from `GET /__signal/templates?file=<name>`
2. The server returns the compiled template source as JSON
3. The source is compiled into an `AsyncFunction` and cached
4. Subsequent renders use the cached function

## Child component isolation

During parent re-render:

- DiffDOM diffs may try to remove/replace child component elements
- Signal filters these diffs out, preserving child DOM and state
- Attribute changes (like `data-props` updates) are allowed through
- After the parent render, child `data-props` are re-evaluated and children re-render if their props changed
