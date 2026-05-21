
# Internals

This page explains how the component system works under the hood. You don't need this to use the component system — see [Getting Started](./getting-started) for the user-facing documentation.

## Architecture overview

```
Server                                       Browser
──────                                       ──────
1. Template invokes {@component .../}        1. start() finds [data-component]
2. componentHelper loads .dust SFC           2. Fetch /__component/component
3. evalDefinition() runs <script>            3. evalDefinition() rebuilds class
4. computeDerived() runs getters             4. Hydrate props from data-props
5. Template renders to HTML                  5. Create reactive Proxies
6. Props serialized via devalue              6. Bind events (on:*)
7. Wrapped in <div data-component data-props> 7. Re-render with DiffDOM on mutation
       ↓ HTML over the wire ↓
```

## Reactive state (StateProxy)

The component system uses JavaScript Proxies to provide deep, automatic reactivity — similar to Vue 3.

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

1. Before computing a getter, the component system enables tracking mode
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
5. Form state is shared across all components via `window.__igo_form`

## Serialization (SerializeUtils)

The server-side serializer:

- Uses a WeakMap for deduplication (same Model instance serialized only once)
- Detects circular references and skips them
- Calls `.serialize()` on Model instances, `.getValues()` on Form objects
- Encodes the result with [devalue](https://github.com/Rich-Harris/devalue) for XSS safety

## Initialization flow: props, state, and form

### SSR (server, `{@component}` helper)

```
{@component name="foo" x=1 y=2 /} in a Dust template
    ↓
1. IgoDust.getCompiledComponent('foo.dust')
   - Splits the file: <script> source + compiled template
    ↓
2. evalDefinition(scriptSrc)
   - new Function('return (' + scriptSrc + ')')() → bare object literal
    ↓
3. Merge props:
   - mergedProps = { ...definition.props, ...callerParams }
    ↓
4. Seed state:
   - state = { ...definition.state }
   - if mergedProps.form → state.form = mergedProps.form
    ↓
5. computeDerived(definition, mergedProps, state)
   - Evaluate every prototype getter on a context object
   - Getters can call other getters (defined on ctx with descriptors)
   - Errors are caught and skipped (DOM-accessing getters fail silently)
    ↓
6. templateFn({ ...mergedProps, ...state, ...derived })
    ↓
7. devalue.uneval(mergedProps) → serializable string
    ↓
8. <div data-component-key="..." data-component="..." data-props="...">html</div>
```

Key points:
- No Proxy on server — props and state are plain objects
- No `init()` is called — no template loading, no FormHandler
- Getters that access the DOM will throw and are caught/skipped

### CSR (browser, hydration)

```
mountElement(el)
    ↓
1. ComponentLoader.load(name):
   - fetch /__component/component?name=<name>
   - evalDefinition(scriptSrc) → bare object
   - buildClass(name, def, templateSource) → IgoComponent subclass
    ↓
2. new ComponentClass(element):
   - this._state = { ...definition.state }
   - this._props = { ...definition.props, ...JSON.parse(element.dataset.props) }
   - if props.form → this._state.form = props.form
    ↓
3. Create reactive proxies:
   - this.props = StateProxy(this._props)        ← reactive, mutations trigger render
   - this.state = StateProxy(this._state)        ← reactive, mutations trigger render
    ↓
4. init() (async):
   - Load Dust template via /__component/templates (or use the one bundled with the definition)
   - If props.form: create FormHandler
     → FormHandler.initForm() replaces _state.form with window.__igo_form (shared singleton)
   - First render()
```

Key points:
- Both `this.props` and `this.state` are reactive Proxies — mutating either triggers `_triggerRender()`
- State mutations before `init()` completes don't trigger renders (`_isInitialized` is false)

## Template loading

In the browser, when a component initializes:

1. It requests the Dust template source from `GET /__component/templates?file=<name>`
2. The server returns the compiled template source as JSON
3. The source is compiled into an `AsyncFunction` and cached
4. Subsequent renders use the cached function

## Child component isolation

During parent re-render:

- DiffDOM diffs may try to remove/replace child component elements
- The component system filters these diffs out, preserving child DOM and state
- Attribute changes (like `data-props` updates) are allowed through
- After the parent render, child `data-props` are re-evaluated and children re-render if their props changed
