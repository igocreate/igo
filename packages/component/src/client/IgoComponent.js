/* global document, window, cancelAnimationFrame, requestAnimationFrame, DataTransfer */
const DerivedCache = require('./DerivedCache.js');
const StateProxy = require('./StateProxy.js');
const { DiffDOM } = require('diff-dom');
const EventBinder = require('./EventBinder.js');
const Templates = require('./dust/Templates.js');
const FormHandler = require('./FormHandler.js');

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

    // Hydrate props from element
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
    this._props = { ...(_defaultProps || {}), ...localProps };

    if (this._props.form) {
      this._state.form = this._props.form;
    } else if (FormHandler.getSharedForm()) {
      this._state.form = FormHandler.getSharedForm();
    }

    this.props = new StateProxy(this, 'props').create(this._props);
    this.state = new StateProxy(this, 'state').create(this._state);

    // Async init (fire-and-forget): load template, set up form handler, first render
    this.init();
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
  async onError(_error) { }

}

module.exports = IgoComponent;
