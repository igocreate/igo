
const IgoComponent = require('./IgoComponent.js');

const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;

const _CACHE = {};

/**
 * Evaluate the bare object from a <script> block
 */
const evalDefinition = (scriptSrc) => {
  return new Function('return (' + scriptSrc + ')')();
};

/**
 * Build an IgoComponent subclass from a definition object and compiled template
 */
const buildClass = (name, def, templateSource) => {
  const templateFn = new AsyncFunction('l', 'u', 'c', 's', templateSource);

  class DefinedComponent extends IgoComponent {
    constructor(element) {
      super(element, name);
    }
  }

  // Store template function on prototype for init() override
  DefinedComponent.prototype.__definitionTemplateFn = templateFn;

  // Store default state and props on prototype
  DefinedComponent.prototype.__defaultState = def.state || {};
  DefinedComponent.prototype.__defaultProps = def.props || {};

  // Copy methods from definition to prototype
  for (const [key, val] of Object.entries(def)) {
    if (key === 'props' || key === 'state') continue;
    if (typeof val === 'function') {
      DefinedComponent.prototype[key] = val;
    }
  }

  // Copy getters from definition to prototype
  const descs = Object.getOwnPropertyDescriptors(def);
  for (const [key, desc] of Object.entries(descs)) {
    if (desc.get) {
      Object.defineProperty(DefinedComponent.prototype, key, {
        get: desc.get,
        configurable: true
      });
    }
  }

  return DefinedComponent;
};

/**
 * Load a single-file component by name
 * Fetches from /__component/component endpoint, evaluates definition, builds class
 * @param {string} name - Component name (e.g. "products/List")
 * @returns {Promise<typeof IgoComponent>} - Component class
 */
const _doLoad = async (name) => {
  const resp = await fetch(`/__component/component?name=${encodeURIComponent(name)}`);
  if (!resp.ok) {
    throw new Error(`[ComponentLoader] Failed to load component "${name}": ${resp.status}`);
  }

  const { scriptSrc, templateSource } = await resp.json();
  const def = evalDefinition(scriptSrc);
  return buildClass(name, def, templateSource);
};

// Cache promises to prevent duplicate in-flight requests
const load = (name) => {
  if (!_CACHE[name]) {
    _CACHE[name] = _doLoad(name);
  }
  return _CACHE[name];
};

module.exports = { load, buildClass, evalDefinition, _CACHE };
