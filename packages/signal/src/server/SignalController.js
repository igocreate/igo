
const { dust: IgoDust } = require('@igojs/server');

const SerializeUtils  = require('./SerializeUtils');
const { createSerializeHelper } = require('../shared/serialize');

// Load devalue dynamically (ES module)
let uneval;
let helperRegistered = false;
const devaluePromise = import('devalue').then(mod => {
  uneval = mod.uneval;
});

// Translations are loaded from user's project (configured via signal.configure())
let translations = {};

// Register @serialize helper (called once after devalue is loaded)
const registerHelper = () => {
  if (helperRegistered) return;
  helperRegistered = true;
  IgoDust.helpers.serialize = createSerializeHelper(uneval);
};


/**
 * Signal middleware - Handles SSR for SignalComponents
 *
 * Usage in controllers:
 *   res.locals.signal_props = { session, products, form, ... };
 *   res.locals.signal_components = [NewRegistrationForm];  // optional: for SSR derived values
 *   res.render('view');
 *
 * The middleware will:
 * 1. Serialize signal_props with deduplication (Model.serialize() called once per instance)
 * 2. Compute SSR derived values from registered signal_components
 * 3. Merge everything into res.locals for template rendering
 */
module.exports.middleware = async (req, res, next) => {

  // Wait for devalue to be loaded, then register helper
  await devaluePromise;
  registerHelper();

  // Inject translations for frontend i18next
  res.locals.__signal_translations = uneval(translations);

  const originalRender = res.render.bind(res);

  res.render = (view, locals, callback) => {
    const props = locals?.signal_props || res.locals.signal_props || {};
    const components = res.locals.signal_components || [];

    try {
      // Serialize props with deduplication
      const serializedProps = SerializeUtils.serialize(props);

      // Store serialized props for client hydration (devalue for XSS safety)
      res.locals.__signal_props = uneval(serializedProps);

      // Merge raw props into res.locals for template access
      Object.assign(res.locals, props);

      // Compute and merge SSR derived values from each component
      for (const ComponentClass of components) {
        if (ComponentClass?.ssr) {
          const derived = ComponentClass.ssr(props);
          Object.assign(res.locals, derived);
        }
      }

    } catch (error) {
      console.error('[Signal] Serialization error:', error);
      res.locals.__signal_props = '{}';
    }

    return originalRender(view, locals, callback);
  };

  next();
};

//
module.exports.templates = async (req, res) => {
  const file = req.query.file;
  const source = await IgoDust.getSource(`${file}.dust`);
  res.json({ file, source });
};

// Configure Signal (called from user's app)
module.exports.configure = (options) => {
  if (options.translations) {
    translations = options.translations;
  }
};
