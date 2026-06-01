# @igojs/component - Internal architecture (client)

Reactive framework built on Igo-Dust, with deep reactivity and automatic dependency tracking.

## Overview

```
Props (immutable) → State (reactive) → Derived (computed) → Template → DOM
                          ↓                                           ↓
                    Proxy tracking                         DiffDOM reconciliation
```

## Files

| File | Responsibility |
|---------|----------------|
| `IgoComponent.js` | IgoComponent base class, lifecycle, render |
| `ComponentLoader.js` | Auto-loading of SFCs from the server |
| `StateProxy.js` | Deep reactivity via Proxy |
| `EventBinder.js` | Optimized event handling |
| `DerivedCache.js` | Getter memoization |
| `FormHandler.js` | Two-way form binding |

---

## StateProxy.js

Wraps state in a recursive Proxy to detect mutations at any depth.

### How it works

1. Each object/array is wrapped in a Proxy
2. The `set` trap intercepts mutations and calls `_triggerRender()`
3. Array methods (push, pop, splice, etc.) are wrapped
4. A WeakMap avoids double-wrapping

### Supported mutations

```javascript
this.state.count = 5;                    // Level 1
this.state.user.name = 'John';           // Level 2
this.state.user.address.city = 'Paris';  // Level 3+
this.state.items.push({ id: 1 });        // Array methods
this.state.items[0].name = 'Updated';    // Array item mutation
```

---

## DerivedCache.js

Getter memoization with automatic dependency tracking.

### How it works

1. On a getter's first call, `_isTracking = true`
2. Each access to `this.props.x` or `this.state.y` is recorded
3. The result is cached along with its dependencies
4. On subsequent renders, it recomputes only if the dependencies changed

---

## EventBinder.js

Optimized event handling with a WeakMap.

### How it works

1. `WeakMap<Element, Map<eventType, handler>>` stores the listeners
2. On render, checks whether the listener already exists
3. If the element is preserved by DiffDOM, the listener is reused
4. If the element is replaced, a new listener is created
5. Removed elements are garbage-collected automatically
6. Supports `selector: 'document'` and `selector: 'window'`

---

## Communication between components

Default convention: **props down / events up**, like React / Vue / Svelte.

- **Parent → child**: pass `props` (immutable on the child side).
- **Child → parent**: `this.emit('change', payload)`, wired via `{@component "X" on:change="onPick" /}` which calls `onPick(payload)` on the parent.
- Orchestration lives in the common parent; the child stays generic and reusable.

### Props vs state

`props` are a reactive proxy: writing them (`this.props.value = ...`) triggers a render — useful to reflect a controlled value. Working data (a fetched list...) lives in `this.state`. Example: a select keeps its ajax results in `state.options` and reloads when its `ajax` prop (the url) changes.

---

## FormHandler.js

Automatic synchronization of form fields with `this.state.form`.

### Activation

The FormHandler activates if `this.props.form` exists in the constructor.

### Gotcha: cross-component reactivity

The form is a single shared object, but each component wraps it in **its own proxy**. A mutation through one component's proxy re-renders ONLY that component — not the others, even if they read the same field. For a component B to react to a field changed by A, pass it a prop that changes (e.g. the ajax url resolved on the parent side): the props sync forces its re-render.

### Supported types

| Input | Stored value |
|-------|----------------|
| `type="text"`, `textarea` | String |
| `type="number"` | String (convert with `Number()`) |
| `type="checkbox"` | Boolean or Array (`name="x[]"`) |
| `name="x[0][]"` | Nested array of strings |
| `select` | String |
| `select[multiple]` | Array of strings |

---

## ComponentLoader.js

Automatic loading of single-file components.

### How it works

1. `load(name)` → fetch `GET /__component/component?name=<name>`
2. Evaluates the `<script>` block to obtain the definition
3. `buildClass()` creates a subclass of IgoComponent
4. Copies methods and getters from the definition onto the prototype
5. Caches the promises to avoid duplicate requests

---

## IgoComponent (IgoComponent.js)

Base class orchestrating all the modules.

### Lifecycle

```
constructor()
    ↓
_init()
    ↓
loadTemplate()
    ↓
init()                  ← user hook, once
    ↓
render() ←──────────────┐
    ↓                   │
_computeGettersAsDerived()
    ↓                   │
dust.render()           │
    ↓                   │
DiffDOM.apply()         │
    ↓                   │
_syncChildProps()       │
    ↓                   │
_bindEvents()           │
    ↓                   │
_mountChildComponents() │
    ↓                   │
afterRender()           │
    ↓                   │
[state mutation] ───────┘
```

### Render optimization

Renders are debounced via `requestAnimationFrame`.

### Child components

1. Preserved by DiffDOM (only attributes can be modified)
2. Mounted automatically after the parent render
3. Synchronized via `_syncChildProps()` when their `data-props` change
4. Only top-level components are mounted at startup (not the children)
