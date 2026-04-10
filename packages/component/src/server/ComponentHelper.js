
const IgoDust       = require('@igojs/dust');
const Utils         = require('@igojs/dust/src/render/Utils');
const SerializeUtils = require('./SerializeUtils.js');
const { htmlencode } = require('../shared/serialize.js');

// devalue is ESM-only, load it dynamically
let uneval;
const devalueReady = import('devalue').then(m => { uneval = m.uneval; });

/**
 * Evaluate the bare object from a <script> block
 * Uses new Function to parse the object literal
 */
const evalDefinition = (scriptSrc) => {
  return new Function('return (' + scriptSrc + ')')();
};

/**
 * Compute derived values (getters) from a component definition
 * Server-safe: no DOM access, errors are caught and skipped
 */
const computeDerived = (def, mergedProps, state) => {
  const descs = Object.getOwnPropertyDescriptors(def);
  const derived = {};

  // Build a context object with props and state accessible via this
  // Define all getters on ctx so chained getters work (e.g. totalPrice → filteredProducts)
  const ctx = {
    props: mergedProps,
    state: { ...state },
  };

  // First, define all getters on ctx so they can reference each other
  for (const [key, desc] of Object.entries(descs)) {
    if (!desc.get || key === 'props' || key === 'state') continue;
    Object.defineProperty(ctx, key, { get: desc.get, configurable: true });
  }

  // Then evaluate each getter and store the result
  for (const [key, desc] of Object.entries(descs)) {
    if (!desc.get || key === 'props' || key === 'state') continue;
    try {
      derived[key] = ctx[key];
    } catch (e) {
      // Getter may access DOM or throw → skip
      console.error(`[Component] SSR getter "${key}" error:`, e.message);
    }
  }

  return derived;
};

/**
 * @component Dust helper
 *
 * Usage in templates:
 *   {@component name="products/List" products=products title="Soldes" /}
 *
 * This helper:
 * 1. Loads and splits the .dust SFC file
 * 2. Evaluates the component definition (props defaults, state, getters)
 * 3. Merges caller props with defaults
 * 4. Computes derived values (getters) for SSR
 * 5. Renders the template with full context
 * 6. Serializes props for client hydration
 * 7. Returns wrapped HTML with data-component and data-props
 */
const componentHelper = async (params, _locals) => {
  await devalueReady;

  const { name, ...callerProps } = params;
  if (!name) {
    throw new Error('[@component] "name" parameter is required');
  }

  // Resolve caller props: values that are references to locals are already resolved by Dust
  // Load the SFC (compiled template + script source)
  const { scriptSrc, templateFn } = await IgoDust.getCompiledComponent(`${name}.dust`);

  if (!scriptSrc) {
    throw new Error(`[@component] "${name}" has no <script> block`);
  }
  if (!templateFn) {
    throw new Error(`[@component] "${name}" has no template content`);
  }

  // Evaluate the definition
  let def;
  try {
    def = evalDefinition(scriptSrc);
  } catch (e) {
    console.error(`[@component] "${name}" script evaluation error:`, e.message);
    throw e;
  }

  // Merge props: definition defaults + caller-passed props
  const defaultProps = def.props || {};
  const mergedProps = { ...defaultProps, ...callerProps };

  // Default state (mirror client-side: copy form from props to state)
  const state = def.state ? JSON.parse(JSON.stringify(def.state)) : {};
  if (mergedProps.form) {
    state.form = mergedProps.form;
  }

  // Compute derived values (getters)
  const derived = computeDerived(def, mergedProps, state);

  // Build template context: props + state + derived (flat merge, like IgoComponent.render)
  const context = { ...mergedProps, ...state, ...derived };

  // Render the template server-side
  const html = await templateFn(context, Utils, null, null);

  // Serialize props for client hydration (exclude key from serialized props)
  const { key, ...propsToSerialize } = mergedProps;
  const serializedProps = SerializeUtils.serialize(propsToSerialize);
  const dataProps = htmlencode(uneval(serializedProps));

  // Default key to component name; explicit key= recommended for dynamic lists
  return `<div data-component-key="${key || name}" data-component="${name}" data-props="${dataProps}">${html}</div>`;
};

module.exports = { componentHelper, evalDefinition, computeDerived, devalueReady };
