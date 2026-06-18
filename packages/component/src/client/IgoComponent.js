/* global document, window, cancelAnimationFrame, requestAnimationFrame */
// webpack resolves morphdom's ESM build (`export default`), so the require yields
// a `{ default }` namespace; in plain CJS (Node tests) it's the function directly.
const morphdom      = require('morphdom').default || require('morphdom');
const { parse }     = require('devalue');

const StateProxy    = require('./StateProxy.js');
const Store         = require('./Store.js');
const EventDelegator = require('./EventDelegator.js');
const FormHandler   = require('./FormHandler.js');
const Transitions   = require('./Transitions.js');

const Templates     = require('./dust/Templates.js');
const Utils         = require('./dust/Utils.js');

const store = new Store();

class IgoComponent {
  // Component registry for auto-discovery
  static _registry = {};


  // Register components for auto-initialization
  static register(components) {
    Object.assign(this._registry, components);
  }

  // Mount all registered components found on the page
  static mountAll() {
    document.querySelectorAll('[data-component]').forEach(element => {
      const componentName = element.dataset.component;
      const ComponentClass = this._registry[componentName];

      if (ComponentClass) {
        if (element.__componentInstance) {
          console.warn(`Component "${componentName}" already mounted on`, element);
          return;
        }
        new ComponentClass(element);
      } else {
        console.warn(`Component "${componentName}" not registered`);
      }
    });
  }

  constructor(element, template) {

    this.template = template;

    this.element = element;
    this.element.__componentInstance  = this;
    this._dustTemplateFn        = null;
    this._eventDelegator        = new EventDelegator(this.element, this);
    this._inlineEventTypes      = new Set();
    this._isInitialized         = false;
    this._renderFrame           = null;
    this._hasRendered           = false;
    this._morphOptions          = this._buildMorphOptions();

    // Child → parent events. `_listeners` holds programmatic on()/off() handlers;
    // `_emitBindings` maps event → parent method name, read from the wrapper's
    // `data-emit-*` attributes ({@component on:event="method" /}) at _init().
    this._listeners             = new Map();
    this._emitBindings          = null;

    // Default events array (only if not defined as getter in subclass)
    if (!Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), 'events')?.get) {
      this.events = [];
    }

    this._state = {};
    this._derivedValues = {};

    // SFC: seed default state from definition
    const _defaultState = Object.getPrototypeOf(this).__defaultState;
    if (_defaultState) {
      Object.assign(this._state, JSON.parse(JSON.stringify(_defaultState)));
    }

    // SSR ships props in an inert <script type="application/json"> island (read once,
    // then dropped); client re-renders use the data-props attribute. Both are devalue
    // payloads read with devalue.parse — no eval, CSP-safe.
    let localProps = {};
    const island = this.element.querySelector(':scope > script[data-igo-props]');
    try {
      if (island) {
        localProps = parse(island.textContent);
        island.remove();
      } else if (this.element.dataset.props) {
        localProps = parse(this.element.dataset.props);
      }
    } catch (e) {
      console.error('Failed to parse props for component', this.element, e);
    }

    // SFC: merge default props from definition
    const _defaultProps = Object.getPrototypeOf(this).__defaultProps;
    this._props = { ...(_defaultProps || {}), ...localProps };

    if (this._props.form) {
      this._state.form = this._props.form;
    } else if (FormHandler.getSharedForm()) {
      this._state.form = FormHandler.getSharedForm();
    }

    this.props = new StateProxy(this, 'props').create(this._props);
    this.state = new StateProxy(this, 'state').create(this._state);

    // Page store + reactive subscriptions for this instance.
    this.store              = store.proxy;
    this._storeKeys         = new Set();
    this._destroyed         = false;

    this._setupWatchers();
    this._templateContext = this._buildTemplateContext();

    this._init();
  }

  // Read a dotted path from an object (e.g. 'form.client_id' on this._state)
  _readPath(obj, path) {
    let cur = obj;
    for (const part of path.split('.')) {
      if (cur == null) {
        return undefined;
      }
      cur = cur[part];
    }
    return cur;
  }

  // Parse `watch:` definition and split into local (state/props) vs store watchers.
  // Flat keys default to `store.` since shared state is the common case.
  _setupWatchers() {
    let watchDef = Object.getPrototypeOf(this).__watch;
    if (typeof watchDef === 'function') {
      watchDef = watchDef.call(this);
    }
    if (!watchDef || typeof watchDef !== 'object') {
      return;
    }

    this._localWatchers = { state: new Map(), props: new Map() };  // path -> [{ handler, prevValue }]
    this._storeWatchers = [];

    for (const [key, handler] of Object.entries(watchDef)) {
      let ns, path;
      if (key.startsWith('state.')) {
        ns   = 'state';
        path = key.slice(6);
      } else if (key.startsWith('props.')) {
        ns   = 'props';
        path = key.slice(6);
      } else if (key.startsWith('store.')) {
        ns   = 'store';
        path = key.slice(6);
      } else {
        ns   = 'store';
        path = key;
      }

      if (ns === 'store') {
        this._storeWatchers.push(store.addWatcher(path, handler, this));
        continue;
      }

      const map = this._localWatchers[ns];
      if (!map.has(path)) {
        map.set(path, []);
      }
      const initialFrom = ns === 'state' ? this._state : this._props;
      map.get(path).push({ handler, prevValue: this._readPath(initialFrom, path) });
    }
  }

  // Called by StateProxy after a successful write to state.X or props.X.
  // `prev` comes from each watcher's own tracked prevValue, not the caller.
  _fireLocalWatchers(namespace, pathArray, newValue) {
    if (!this._localWatchers) {
      return;
    }
    const map = this._localWatchers[namespace];
    if (!map) {
      return;
    }
    const key = pathArray.join('.');
    const watchers = map.get(key);
    if (!watchers) {
      return;
    }
    for (const w of watchers) {
      const prev  = w.prevValue;
      w.prevValue = newValue;
      w.handler.call(this, newValue, prev);
    }
  }

  // Proxy template context: resolves derived > state > props > store on reads,
  // writes pass through to the target so Dust can stash `_it`, `$idx`, etc.
  // Built once per instance — captured refs (derived/state/props) are stable.
  _buildTemplateContext() {
    const component = this;
    const derived   = this._derivedValues;
    const state     = this._state;
    const props     = this._props;
    const hasOwn    = Object.prototype.hasOwnProperty;

    const has = (prop) => {
      if (typeof prop === 'symbol') return false;
      return hasOwn.call(derived, prop)
          || hasOwn.call(state, prop)
          || hasOwn.call(props, prop)
          || prop in store.proxy;
    };

    return new Proxy({}, {
      get(target, prop) {
        if (typeof prop === 'symbol')    return target[prop];
        if (hasOwn.call(target, prop))   return target[prop];
        if (hasOwn.call(derived, prop))  return derived[prop];
        if (hasOwn.call(state, prop))    return state[prop];
        if (hasOwn.call(props, prop))    return props[prop];
        store.subscribe(component, prop);
        return store.getRaw(prop);
      },
      // Explicit set: without it, the default [[Set]] consults getOwnPropertyDescriptor
      // and creates keys shadowing derived/state/props as writable:false — freezing them.
      set(target, prop, value) {
        target[prop] = value;
        return true;
      },
      has(target, prop) {
        return hasOwn.call(target, prop) || has(prop);
      },
      ownKeys(target) {
        const out = new Set(Reflect.ownKeys(target));
        for (const src of [derived, state, props]) {
          for (const k of Object.keys(src)) out.add(k);
        }
        for (const k of store.keys()) out.add(k);
        return [...out];
      },
      getOwnPropertyDescriptor(target, prop) {
        if (typeof prop === 'symbol') {
          return Object.getOwnPropertyDescriptor(target, prop);
        }
        if (hasOwn.call(target, prop)) {
          return Object.getOwnPropertyDescriptor(target, prop);
        }
        for (const src of [derived, state, props]) {
          if (hasOwn.call(src, prop)) {
            return { configurable: true, enumerable: true, writable: true, value: src[prop] };
          }
        }
        if (prop in store.proxy) {
          return { configurable: true, enumerable: true, writable: true, value: store.getRaw(prop) };
        }
        return undefined;
      },
    });
  }

  // Expose raw state for internal use (bypasses Proxy, no auto-render)
  get rawState() {
    return this._state;
  }

  // Initialize getters once (redefine on instance for lazy computation)
  _initGetters() {
    if (this._getterKeys) return; // Already initialized

    const proto = Object.getPrototypeOf(this);
    const descriptors = Object.getOwnPropertyDescriptors(proto);
    const reserved = ['rawState', 'events'];

    this._getterKeys = Object.keys(descriptors).filter(key => {
      const desc = descriptors[key];
      return desc.get && !reserved.includes(key) && !key.startsWith('_');
    });

    this._getterDescriptors = descriptors;

    // Redefine getters on instance for lazy, once-per-cycle computation. A getter
    // reading another getter triggers its computation on demand.
    this._getterKeys.forEach(key => {
      Object.defineProperty(this, key, {
        get: () => {
          if (!this._computedThisCycle?.has(key)) {
            this._computeGetter(key);
          }
          return this._derivedValues[key];
        },
        configurable: true
      });
    });
  }

  // Compute a single getter, caching its value for the rest of the render cycle.
  _computeGetter(key) {
    this._computedThisCycle?.add(key);
    this._derivedValues[key] = this._getterDescriptors[key].get.call(this);
  }

  // Compute all getters for this render cycle
  _computeGettersAsDerived() {
    this._initGetters();
    this._computedThisCycle = new Set();
    this._getterKeys.forEach(key => this._computeGetter(key));
  }

  // Internal bootstrap (called automatically by constructor). Loads the template,
  // wires the form handler, runs the user `init()` hook, then does the first render.
  async _init() {
    // SFC components have template pre-compiled; legacy components fetch from server
    const _definitionTemplateFn = Object.getPrototypeOf(this).__definitionTemplateFn;
    this._dustTemplateFn = _definitionTemplateFn || await Templates.loadTemplate(this.template);
    this._isInitialized = true;

    // Read parent → child event bindings from the wrapper's data-emit-* attributes,
    // before the first render collapses/reconciles the element.
    this._emitBindings = this._readEmitBindings();

    // Initialize form handler if props.form exists
    if (this.props.form) {
      this._formHandler = new FormHandler(this, this.props.form);
    }

    // User one-time init, before the first render — store/props/state are ready.
    await this.init();

    await this.render();
  }

  // One render at a time: overlapping renders race on the shared _templateContext.
  async render() {
    if (this._rendering) {
      this._renderPending = true;
      return;
    }
    this._rendering = true;
    try {
      do {
        this._renderPending = false;
        await this._renderOnce();
      } while (this._renderPending && !this._destroyed);
    } finally {
      this._rendering = false;
    }
  }

  async _renderOnce() {
    try {
      if (this._destroyed) return;

      // Drop previous render's store subscriptions; rebuilt by reads below.
      store.unsubscribeAll(this);

      // Tracker active during getter eval — `this.store.X` reads subscribe this
      // component so store changes re-render it.
      store.pushTracker(this);
      try {
        this._computeGettersAsDerived();
      } finally {
        store.popTracker();
      }

      const html = await this._dustTemplateFn(this._templateContext, Utils, null);
      if (this._destroyed) return;

      // Collect inline event types straight from the rendered markup — cheaper
      // than walking the DOM, and catches types that appear conditionally.
      this._inlineEventTypes = this._collectEventTypes(html);

      const tempElement = document.createElement('div');
      tempElement.innerHTML = html;
      const newRoot = tempElement.firstElementChild;

      // The template root lacks the wrapper attributes (data-component/data-props/id)
      // that live on the mounted element — copy them so morphdom keeps them.
      if (newRoot) {
        for (const attr of this.element.attributes) {
          if (!newRoot.hasAttribute(attr.name)) {
            newRoot.setAttribute(attr.name, attr.value);
          }
        }
      }

      // Child components and file inputs are preserved in-place via _morphOptions.
      morphdom(this.element, newRoot, this._morphOptions);
      this._hasRendered = true;

      // Sync props for child components (after morphdom refreshed their data-props)
      this._syncChildProps();

      this._bindEvents();
      this._mountChildComponents();
      await this.afterRender();

    } catch (error) {
      console.error('Component render failed:', error);
      await this.onError?.(error);
    }
  }

  _bindEvents() {
    // Delegated listeners on the root — attached once, resolved at dispatch.
    this._eventDelegator.sync(this._inlineEventTypes, this.events);
    // Idempotent: the form's input/change listeners also live on the root.
    this._formHandler?.bind();
  }

  // Extract the set of inline event types (`data-on-<type>`) from rendered HTML.
  _collectEventTypes(html) {
    const types = new Set();
    const re = /\bdata-on-([a-z]+)=/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      types.add(m[1]);
    }
    return types;
  }

  // morphdom hooks, built once per instance. They replace the old detach/reattach
  // dance: child components are matched by key and left untouched (props refreshed
  // in place), and file-input selections are protected from being cleared.
  _buildMorphOptions() {
    return {
      // Key matching: child components by data-component-key, then an explicit
      // data-key (stabilises a node whose sibling order varies — e.g. an animated
      // element next to a conditional block), else fall back to id (morphdom's
      // default) so keyed list items keep their nodes across renders.
      getNodeKey: (el) => (el.dataset && (el.dataset.componentKey || el.dataset.key)) || el.id,

      // Enter transition: skip the first render (SSR nodes already exist and
      // aren't "added"; class-based components get no enter on initial paint —
      // matching Vue's no-appear-by-default). Only nodes morphdom creates fire this.
      onNodeAdded: (node) => {
        if (this._hasRendered) {
          Transitions.enterAdded(node);
        }
        return node;
      },

      // Leave transition: when morphdom would discard a node carrying a leave
      // transition, keep it (return false), play the transition, then remove it
      // ourselves. `__igoLeaving` guards against re-processing on later renders.
      onBeforeNodeDiscarded: (node) => {
        if (node.nodeType !== 1) {
          return true;
        }
        if (node.__igoLeaving) {
          return false;
        }
        if (Transitions.leave(node, () => node.remove())) {
          node.__igoLeaving = true;
          return false;
        }
        return true;
      },

      onBeforeElUpdated: (fromEl, toEl) => {
        // A node mid-leave was re-matched (re-added before its leave finished,
        // e.g. a fast re-toggle of a data-key'd element). Cancel the pending
        // removal so it updates in place instead of vanishing when the stale
        // leave timer fires.
        if (fromEl.__igoLeaving) {
          Transitions.cancelLeave(fromEl);
          fromEl.__igoLeaving = false;
        }

        // A mounted child component owns its own subtree — refresh its props from
        // the new markup, then skip morphing inside it (returning false stops
        // descent, so grandchildren are never touched either).
        if (fromEl !== this.element && fromEl.dataset && fromEl.dataset.component) {
          if (toEl.dataset.props) {
            fromEl.dataset.props = toEl.dataset.props;
          } else {
            delete fromEl.dataset.props;
          }
          return false;
        }

        // morphdom's INPUT handler resets `.value` to '', which clears a file
        // input's selection — skip it while files are selected.
        if (fromEl.tagName === 'INPUT' && fromEl.type === 'file' && fromEl.files?.length) {
          return false;
        }

        return true;
      },
    };
  }

  // Scan DOM for data-on-* attributes and build events array
  _mountChildComponents() {
    // Mount any child components that were added during render
    // Use global mountElement from component/index.js
    const mountElement = window.__igo?.mountElement;
    if (!mountElement) {
      return;
    }

    this.element.querySelectorAll('[data-component]').forEach(childElement => {
      if (childElement === this.element) return;
      if (childElement.__componentInstance) return;
      mountElement(childElement);
    });
  }

  // ---------------------------------------------------------------------------
  // Child → parent events
  //
  // A child emits with `this.emit('change', payload)`. The payload is delivered
  // to (a) any programmatic listeners added via `this.on('change', fn)`, and
  // (b) the parent method declared in markup as `{@component on:change="m" /}`,
  // called with `this` bound to the parent. This is the parent↔child channel —
  // props flow down, events flow up — so a child never reaches into a shared
  // store to talk to its parent.
  // ---------------------------------------------------------------------------

  // Read event → parent-method bindings from the wrapper's data-emit-* attributes.
  _readEmitBindings() {
    const bindings = {};
    if (!this.element?.attributes) {
      return bindings;
    }
    for (const attr of this.element.attributes) {
      if (attr.name.startsWith('data-emit-')) {
        bindings[attr.name.slice('data-emit-'.length)] = attr.value;
      }
    }
    return bindings;
  }

  // Nearest ancestor component instance, resolved live (the DOM is the source of
  // truth — survives morphdom reconciliation of child components).
  _resolveParent() {
    const host = this.element?.parentElement?.closest('[data-component]');
    return host?.__componentInstance || null;
  }

  // Register a programmatic listener. Returns an unsubscribe function.
  on(event, handler) {
    let set = this._listeners.get(event);
    if (!set) {
      set = new Set();
      this._listeners.set(event, set);
    }
    set.add(handler);
    return () => this.off(event, handler);
  }

  // Remove a programmatic listener (or all listeners for an event if no handler).
  off(event, handler) {
    if (!handler) {
      this._listeners.delete(event);
      return;
    }
    this._listeners.get(event)?.delete(handler);
  }

  // Emit an event: notifies programmatic listeners, then calls the parent method
  // bound in markup (if any). Returns the parent handler's result.
  emit(event, ...args) {
    const set = this._listeners.get(event);
    if (set) {
      for (const fn of [...set]) {
        fn(...args);
      }
    }

    const methodName = this._emitBindings?.[event];
    if (!methodName) {
      return;
    }
    const parent = this._resolveParent();
    if (!parent) {
      return;
    }
    const handler = parent[methodName];
    if (typeof handler !== 'function') {
      console.warn(`[Component] on:${event}="${methodName}" — method not found on parent <${parent.template}>`);
      return;
    }
    return handler.apply(parent, args);
  }

  _triggerRender() {
    if (!this._isInitialized) {
      return;
    }
    // Cancel any pending render
    if (this._renderFrame) {
      cancelAnimationFrame(this._renderFrame);
    }
    // Schedule render synchronized with browser paint
    this._renderFrame = requestAnimationFrame(() => this.render());
  }

  // Sync props from parent (called after parent render)
  _syncProps() {
    if (!this.element?.dataset.props) {
      return;
    }

    try {
      const newLocalProps = parse(this.element.dataset.props);

      // Write through the reactive proxy — triggers re-render automatically if changed
      for (const key in newLocalProps) {
        this.props[key] = newLocalProps[key];
      }
    } catch (e) {
      console.error('Failed to sync props', e);
    }
  }

  // Sync props for all child components
  _syncChildProps() {
    this.element.querySelectorAll('[data-component]').forEach(childElement => {
      if (childElement === this.element) return;
      if (childElement.__componentInstance) {
        childElement.__componentInstance._syncProps();
      }
    });
  }

  async destroy() {
    this._destroyed = true;

    if (this._renderFrame) {
      cancelAnimationFrame(this._renderFrame);
    }
    this._eventDelegator.destroy();
    this._formHandler?.unbind();
    this._formHandler = null;

    store.unsubscribeAll(this);
    if (this._storeWatchers) {
      for (const entry of this._storeWatchers) store.removeWatcher(entry);
      this._storeWatchers = null;
    }
    this._localWatchers = null;

    this._listeners.clear();
    this._emitBindings = null;

    if (this.element) {
      this.element.__componentInstance = null;
    }
    this.element            = null;
    this._dustTemplateFn    = null;
    this._eventDelegator    = null;
    this._templateContext   = null;

    this._state             = {};
    this._derivedValues     = {};
  }

  // Lifecycle hooks (can be overridden in subclasses)
  async init() { }              // once, before the first render
  async afterRender() { }       // after each render
  async onError(_error) { }     // on render error

}

module.exports = IgoComponent;
