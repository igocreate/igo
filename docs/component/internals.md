
# Internals

This page explains how the component system works under the hood. You don't need this to use the component system — see [Getting Started](./getting-started) for the user-facing documentation.

## Architecture overview

```
Server                                       Browser
──────                                       ──────
1. Template invokes {@component .../}        1. start() finds [data-component]
2. componentHelper loads .dust SFC           2. Fetch /__component/component
3. evalDefinition() runs <script>            3. evalDefinition() rebuilds class
4. computeDerived() runs getters             4. Hydrate props from JSON island
5. Template renders to HTML                  5. Create reactive Proxies
6. Props serialized via devalue              6. Bind events (on:*)
7. Wrapped in <div data-component> + island  7. Re-render with morphdom on mutation
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

## Computed values

Getters defined in the component are recomputed once per render cycle:

1. Before rendering, `_computeGettersAsDerived()` evaluates every getter and stores the result in `_derivedValues`
2. A getter that reads another getter triggers it on demand; a `_computedThisCycle` set ensures each getter runs at most once per cycle
3. The template reads the precomputed values

There is **no cross-render memoization** — getters re-run on every render. This keeps the model simple and is negligible for typical derivations (formatting, small computations). If a getter is genuinely expensive over large data, hoist or guard the work yourself.

## Render cycle

```
[state mutation]
    ↓
requestAnimationFrame (batching)
    ↓
compute all getters
    ↓
merge context: { ...props, ...state, ...derived }
    ↓
dust template renders to HTML string
    ↓
morphdom reconciles the new HTML into the live DOM
    ↓
child components & file inputs preserved in-place (onBeforeElUpdated → false)
    ↓
sync data-props for child components
    ↓
sync delegated event listeners
    ↓
mount newly added child components
    ↓
afterRender()
```

## Event delegation (EventDelegator)

Inline `on:*` handlers are dispatched by delegation rather than bound per element:

- One listener per event type lives on the component **root**, attached once and kept across renders (morphdom never replaces the root node)
- On an event, the delegator walks up from `event.target` and invokes every **owned** element declaring `data-on-<type>` (or matching a manual `events` selector)
- "Owned" means the element's nearest `[data-component]` ancestor is this root — events originating in a child component are handled by the child's own delegator
- The set of event types is collected cheaply from the rendered HTML each render, so handlers that appear conditionally still get a listener

## Form binding (FormHandler)

When `props.form` exists, FormHandler:

1. Attaches one `input` and one `change` listener to the component root (once — also delegated)
2. Routes each event to the field's matching kind: `input` for text fields, `change` for checkboxes, radios and selects
3. Updates `component.state.form[fieldName]` on each change
4. Skips file inputs and fields inside child `data-component` elements
5. Form state is shared across all components via a module-level singleton (`FormHandler.getSharedForm()`)

## Serialization (SerializeUtils)

The server-side serializer:

- Uses a WeakMap for deduplication (same Model instance serialized only once)
- Detects circular references and skips them
- Calls `.serialize()` on Model instances, `.getValues()` on Form objects
- Encodes the result with [devalue](https://github.com/Rich-Harris/devalue) for XSS safety

## Initialization flow: props, state, and form

### SSR (server, `{@component}` helper)

```
{@component "foo" x=1 y=2 /} in a Dust template
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
7. devalue.stringify(mergedProps) → serializable string
    ↓
8. <div data-component-key="..." data-component="..."><script type="application/json" data-igo-props>...</script>html</div>
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
     → FormHandler.initForm() replaces _state.form with the shared singleton (module-level _sharedForm)
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

- morphdom would normally descend into child component elements; the `onBeforeElUpdated` hook returns `false` for any `[data-component]`, leaving its DOM and state untouched
- Before skipping, the child's `data-props` attribute is refreshed from the new markup
- After the parent render, child `data-props` are re-evaluated and children re-render if their props changed
