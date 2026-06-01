/* global document, window, cancelAnimationFrame, requestAnimationFrame, DataTransfer */
const { DiffDOM }   = require('diff-dom');
const { parse }     = require('devalue');

const DerivedCache  = require('./DerivedCache.js');
const StateProxy    = require('./StateProxy.js');
const Store         = require('./Store.js');
const EventBinder   = require('./EventBinder.js');
const FormHandler   = require('./FormHandler.js');

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
    this._eventBinder           = new EventBinder();
    this._derivedCache          = new DerivedCache();
    this._isInitialized         = false;
    this._renderFrame           = null;
    this._diffDom               = new DiffDOM();

    // Child → parent events. `_listeners` holds programmatic on()/off() handlers;
    // `_emitBindings` maps event → parent method name, read from the wrapper's
    // `data-emit-*` attributes ({@component on:event="method" /}) at _init().
    this._listeners             = new Map();
    this._emitBindings          = null;

    // Default events array (only if not defined as getter in subclass)
    if (!Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), 'events')?.get) {
      this.events = [];
    }

    // Auto-tracking system for smart dependencies
    this._isTracking = false;
    this._trackedDeps = [];

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

  // Compute a derived value with automatic dependency tracking
  _computeDerived(value, cacheKey) {
    if (typeof value !== 'function') return value;

    this._isTracking = true;
    this._trackedDeps = [];
    const boundFn = value.bind(this);
    const computedValue = boundFn();
    const deps = [...this._trackedDeps];
    this._isTracking = false;

    return this._derivedCache.memoize(cacheKey, boundFn, deps, this, computedValue);
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

    // Redefine getters on instance for lazy computation and tracking
    this._getterKeys.forEach(key => {
      Object.defineProperty(this, key, {
        get: () => {
          if (this._isTracking) {
            this._trackedDeps.push(['derived', key]);
          }
          // Compute if not yet computed this cycle
          if (!this._computedThisCycle?.has(key)) {
            this._computeGetter(key);
          }
          return this._derivedValues[key];
        },
        configurable: true
      });
    });
  }

  // Compute a single getter
  _computeGetter(key) {
    this._computedThisCycle?.add(key);
    const getterFn = this._getterDescriptors[key].get.bind(this);
    this._derivedValues[key] = this._computeDerived(getterFn, key);
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

  async render() {
    try {
      if (this._destroyed) return;

      // Drop previous render's store subscriptions; rebuilt by reads below.
      store.unsubscribeAll(this);

      // Tracker active during getter eval — `this.store.X` reads subscribe this
      // component and register as memoization deps.
      store.pushTracker(this);
      try {
        this._computeGettersAsDerived();
      } finally {
        store.popTracker();
      }

      const html = await this._dustTemplateFn(this._templateContext, Utils, null);
      if (this._destroyed) return;

      const tempElement = document.createElement('div');
      tempElement.innerHTML = html;

      // Preserve wrapper attributes: the template root doesn't have data-component/data-props/id
      // but the actual element does — copy them so DiffDOM doesn't remove them
      const virtualRoot = tempElement.firstElementChild;
      if (virtualRoot) {
        for (const attr of this.element.attributes) {
          if (!virtualRoot.hasAttribute(attr.name)) {
            virtualRoot.setAttribute(attr.name, attr.value);
          }
        }
      }

      // Detach child components and save file inputs before diff
      const savedChildren = this._detachChildComponents();
      const savedFiles = this._saveFileInputs();

      const diff = this._diffDom.diff(this.element, tempElement.firstElementChild);
      this._diffDom.apply(this.element, diff);

      // Restore child components and file inputs after diff
      this._reattachChildComponents(savedChildren);
      this._restoreFileInputs(savedFiles);

      // Sync props for child components (after DiffDOM updated data-props)
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
    this._formHandler?.unbind();
    const allEvents = [
      ...(Array.isArray(this.events) ? this.events : []),
      ...this._buildOnEvents()
    ];
    this._eventBinder.bind(this.element, allEvents, this);
    this._formHandler?.bind();
  }

  _detachChildComponents() {
    const saved = new Map();
    this.element.querySelectorAll('[data-component]').forEach(el => {
      // Only direct child components (skip grandchildren nested in other components)
      if (el.parentElement?.closest('[data-component]') !== this.element) {
        return;
      }
      const key = el.dataset.componentKey;
      if (!key) {
        return;
      }
      if (saved.has(key)) {
        console.warn(`[Component] Duplicate child key "${key}" on <${el.dataset.component}>. Add a unique key= to {@component} to preserve state correctly.`);
        return;
      }
      saved.set(key, el);
      const placeholder = document.createElement('div');
      placeholder.setAttribute('data-component-key', key);
      placeholder.setAttribute('data-component', el.dataset.component);
      if (el.dataset.props) {
        placeholder.setAttribute('data-props', el.dataset.props);
      }
      el.replaceWith(placeholder);
    });
    return saved;
  }

  _reattachChildComponents(saved) {
    saved.forEach((el, key) => {
      const target = this.element.querySelector(`[data-component-key="${key}"]`);
      if (target) {
        if (target.dataset.props) {
          el.dataset.props = target.dataset.props;
        }
        target.replaceWith(el);
      }
    });
  }

  _saveFileInputs() {
    const saved = new Map();
    this.element.querySelectorAll('input[type="file"]').forEach(input => {
      if (input.files?.length > 0) {
        saved.set(input.name, Array.from(input.files));
      }
    });
    return saved;
  }

  _restoreFileInputs(saved) {
    if (saved.size === 0) return;
    this.element.querySelectorAll('input[type="file"]').forEach(input => {
      const files = saved.get(input.name);
      if (files) {
        const dt = new DataTransfer();
        files.forEach(f => dt.items.add(f));
        input.files = dt.files;
      }
    });
  }

  // Scan DOM for data-on-* attributes and build events array
  _buildOnEvents() {
    const events = [];
    const seen = new Set();

    const allElements = [this.element, ...this.element.querySelectorAll('*')];
    allElements.forEach(el => {
      // Skip elements inside child components
      if (el !== this.element) {
        const closestComponent = el.closest('[data-component]');
        if (closestComponent && closestComponent !== this.element) return;
      }

      for (const attr of el.attributes) {
        if (!attr.name.startsWith('data-on-')) continue;
        const eventType = attr.name.slice(8); // "data-on-click" → "click"
        const methodName = attr.value;
        const handler = this[methodName];
        if (typeof handler !== 'function') {
          console.warn(`[Component] Method "${methodName}" not found on component "${this.template}"`);
          continue;
        }
        const key = `${eventType}:${methodName}`;
        if (!seen.has(key)) {
          seen.add(key);
          if (eventType === 'clickoutside') {
            const targetEl = el;
            events.push({
              selector: 'document',
              eventType: 'click',
              handler: (e) => {
                if (!targetEl.contains(e.target)) {
                  handler.call(this, e);
                }
              }
            });
          } else {
            events.push({
              selector: `[data-on-${eventType}="${methodName}"]`,
              eventType,
              handler
            });
          }
        }
      }
    });

    return events;
  }

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
  // truth — survives DiffDOM detach/reattach of child components).
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
    this._eventBinder.unbind();
    this._formHandler?.unbind();
    this._formHandler = null;
    this._derivedCache.clear();

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
    this._eventBinder       = null;
    this._derivedCache      = null;
    this._templateContext   = null;

    this._state             = {};
    this._derivedValues     = {};
    this._trackedDeps       = [];
  }

  // Lifecycle hooks (can be overridden in subclasses)
  async init() { }              // once, before the first render
  async afterRender() { }       // after each render
  async onError(_error) { }     // on render error

}

module.exports = IgoComponent;
