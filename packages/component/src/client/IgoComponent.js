// Isomorphic imports (safe for Node.js)
const DerivedCache = require('./DerivedCache.js');
const StateProxy = require('./StateProxy.js');

// Browser-only imports (top-level, but only used in browser methods)
const { DiffDOM } = require('diff-dom');
const EventBinder = require('./EventBinder.js');
const Templates = require('./dust/Templates.js');
const FormHandler = require('./FormHandler.js');

// Detect server-side rendering
const isServer = typeof window === 'undefined';

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

  // Server-side rendering: compute derived values (getters) for Dust templates
  static ssr(props) {
    props = props || {};
    const instance = new this(null, props);
    // Ensure props are set (handles components that don't forward props to super)
    instance._props = props;
    instance.props = props;
    if (props.form) {
      instance._state.form = props.form;
    }

    const derived = {};
    const descriptors = Object.getOwnPropertyDescriptors(this.prototype);

    for (const [key, desc] of Object.entries(descriptors)) {
      if (!desc.get || key.startsWith('_') || key === 'rawState' || key === 'events') {
        continue;
      }
      try {
        derived[key] = desc.get.call(instance);
      } catch (e) {
        // Getter may access DOM or throw → log and skip
        console.error(`SSR getter "${key}" error:`, e.message);
      }
    }

    return derived;
  }

  constructor(element, template, props) {

    this.template = template;

    // Browser-only setup
    if (!isServer) {
      this.element = element;
      this.element.__componentInstance  = this;
      this._dustTemplateFn        = null;
      this._eventBinder           = new EventBinder();
      this._derivedCache          = new DerivedCache();
      this._isInitialized         = false;
      this._renderFrame           = null;
      this._diffDom               = new DiffDOM();
    }

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

    if (isServer) {
      this._props = props || {};
      this.props = this._props;
      this.state = this._state;
      if (this._props.form) {
        this._state.form = this._props.form;
      }
    } else {
      // Browser: hydrate props from window and element
      const globalProps = window.__igo_props || {};
      let localProps = {};

      if (this.element.dataset.props) {
        try {
          const hydrate = new Function('return ' + this.element.dataset.props);
          localProps = hydrate();
        } catch (e) {
          console.error('Failed to parse data-props for component', this.element, e);
        }
      }

      // SFC: merge default props from definition
      const _defaultProps = Object.getPrototypeOf(this).__defaultProps;
      this._props = { ...(_defaultProps || {}), ...globalProps, ...localProps };

      if (this._props.form) {
        this._state.form = this._props.form;
      }

      this.props = new StateProxy(this, 'props').create(this._props);
      this.state = new StateProxy(this, 'state').create(this._state);
    }

    // Initialize component (browser only, async fire-and-forget)
    if (!isServer) {
      this.init();
    }
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

  // Initialize component (called automatically by constructor)
  // Can be overridden in subclasses for custom initialization
  async init() {
    // SFC components have template pre-compiled; legacy components fetch from server
    const _definitionTemplateFn = Object.getPrototypeOf(this).__definitionTemplateFn;
    this._dustTemplateFn = _definitionTemplateFn || await Templates.loadTemplate(this.template);
    this._isInitialized = true;

    // Initialize form handler if props.form exists
    if (this.props.form) {
      this._formHandler = new FormHandler(this, this.props.form);
    }

    await this.render();
  }

  async render() {
    try {
      // beforeRender hook
      await this.beforeRender?.();

      // Calculate derived values (getters) with smart dependency tracking
      this._computeGettersAsDerived();

      // Merge props + state + derived for template context (flat)
      const context = { ...this._props, ...this._state, ...this._derivedValues };
      const html = await this._dustTemplateFn(context, window.__igo.IgoDustUtils, null);

      const tempElement = document.createElement('div');
      tempElement.innerHTML = html;

      const diff = this._diffDom.diff(this.element, tempElement.firstElementChild);
      const filteredDiff = this._filterChildComponentDiffs(diff);
      this._diffDom.apply(this.element, filteredDiff);

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

  // Filter diffs that touch child components (preserve their state)
  // Allow attribute modifications (like data-props) to pass through
  _filterChildComponentDiffs(diff) {
    return diff.filter(d => {
      if (d.action === 'modifyAttribute' || d.action === 'addAttribute' || d.action === 'removeAttribute') {
        return true;
      }
      let el = this.element;
      for (const step of d.route || []) {
        if (step === 'childNodes') continue;
        if (typeof step === 'number') {
          el = el?.childNodes?.[step];
          if (el?.nodeType === 1 && el.hasAttribute?.('data-component') && el !== this.element) {
            return false;
          }
        }
      }
      return true;
    });
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

  // Scan DOM for data-on-* attributes and build events array
  _buildOnEvents() {
    const events = [];
    const seen = new Set();

    this.element.querySelectorAll('*').forEach(el => {
      // Skip elements inside child components
      const closestComponent = el.closest('[data-component]');
      if (closestComponent && closestComponent !== this.element) return;

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
          events.push({
            selector: `[data-on-${eventType}="${methodName}"]`,
            eventType,
            handler
          });
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
      const hydrate = new Function('return ' + this.element.dataset.props);
      const newLocalProps = hydrate();

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

  // Cleanup component (unbind listeners, clear timers, remove references)
  async destroy() {
    // Cancel any pending render
    if (this._renderFrame) {
      cancelAnimationFrame(this._renderFrame);
    }

    // Unbind all event listeners
    this._eventBinder.unbind();

    // Unbind form handler
    this._formHandler?.unbind();
    this._formHandler = null;

    // Clear derived cache
    this._derivedCache.clear();

    // Clear references to help garbage collection
    if (this.element) {
      this.element.__componentInstance = null;
    }
    this.element = null;
    this._dustTemplateFn = null;
    this._eventBinder = null;
    this._derivedCache = null;

    this._state = {};
    this._derivedValues = {};
    this._trackedDeps = [];
  }

  // Lifecycle hooks (can be overridden in subclasses)
  async beforeRender() { }
  async afterRender() { }
  async onError(error) { }

}

module.exports = IgoComponent;
