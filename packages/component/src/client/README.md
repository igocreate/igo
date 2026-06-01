# @igojs/component - Internal architecture (client)

Reactive framework built on Igo-Dust, with deep reactivity via Proxy.

## Overview

```
Props (immutable) → State (reactive) → Derived (computed) → Template → DOM
                          ↓                                           ↓
                    Proxy tracking                       morphdom reconciliation
```

## Files

| File | Responsibility |
|---------|----------------|
| `IgoComponent.js` | IgoComponent base class, lifecycle, render |
| `ComponentLoader.js` | Auto-loading of SFCs from the server |
| `StateProxy.js` | Deep reactivity via Proxy |
| `Store.js` | Page-level reactive shared store |
| `EventDelegator.js` | Delegated event handling |
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

## Computed getters

Getters defined on the component are computed each render by `_computeGettersAsDerived()`, stored in `_derivedValues`. A `_computedThisCycle` set guarantees each getter runs at most once per render, even when composed. There is no cross-render memoization — getters re-run on every render (cheap for typical derivations).

---

## EventDelegator.js

Delegated event handling — one listener per event type on the component root.

### How it works

1. Event types are collected from the rendered HTML each render
2. A single listener per type is attached to the root **once** and kept across renders
3. On an event, the delegator walks up from `event.target` and invokes every owned element declaring `data-on-<type>` (or matching a manual `events` selector)
4. "Owned" = the element's nearest `[data-component]` ancestor is this root — child-owned elements are skipped
5. Supports the manual `events` array, including `selector: 'document'` / `'window'` and `clickoutside`

---

## Communication between components

Default convention: **props down / events up**, like React / Vue / Svelte.

- **Parent → child**: pass `props` (immutable on the child side).
- **Child → parent**: `this.emit('change', payload)`, wired via `{@component "X" on:change="onPick" /}` which calls `onPick(payload)` on the parent.
- Orchestration lives in the common parent; the child stays generic and reusable.

The `Store` (`this.store`) and `watch` (`'state.x'`, `'props.x'`, `'store.x'`) remain available but are **reserved for cross-tree state** (components with no common parent). For two components that share a common parent, prefer events + props: no seeding at mount, SSR without flash, explicit data flow.

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
morphdom reconcile      │
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

1. Preserved by morphdom (`onBeforeElUpdated → false`; only `data-props` is refreshed)
2. Mounted automatically after the parent render
3. Synchronized via `_syncChildProps()` when their `data-props` change
4. Only top-level components are mounted at startup (not the children)
