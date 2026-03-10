
const IgoDust = require('@igojs/dust');

const { createSerializeHelper } = require('../shared/serialize.js');
const { componentHelper } = require('./ComponentHelper.js');

// Translations are loaded from user's project (configured via component.configure())
let translations = {};

// devalue is ESM-only, load it dynamically at startup
let uneval;
const devalueReady = import('devalue').then(m => {
  uneval = m.uneval;
  // Register @serialize helper once devalue is loaded
  IgoDust.helpers.serialize = createSerializeHelper(uneval);
});

// Register @component helper
IgoDust.helpers.component = componentHelper;


/**
 * Component middleware
 *
 * Handles:
 * - Injecting translations for client-side i18n
 */
const middleware = async (req, res, next) => {

  // Ensure devalue is loaded
  await devalueReady;

  // Inject translations for frontend i18next
  res.locals.__component_translations = uneval(translations);

  next();
};

const templates = async (req, res) => {
  const file = req.query.file;
  const source = await IgoDust.getSource(`${file}.dust`);
  res.json({ file, source });
};

// Validate component name to prevent path traversal
const SAFE_NAME_RE = /^[a-zA-Z0-9_/-]+$/;

// Serve component data (script + template source) for client hydration
const component = async (req, res) => {
  const name = req.query.name;
  if (!name || !SAFE_NAME_RE.test(name) || name.includes('..')) {
    return res.status(400).json({ error: 'Invalid component name' });
  }
  try {
    const { scriptSrc, templateSource } = await IgoDust.getComponent(`${name}.dust`);
    res.json({ name, scriptSrc, templateSource });
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
};

// Configure (called from user's app)
const configure = (options) => {
  if (options.translations) {
    translations = options.translations;
  }
};

module.exports = { middleware, templates, component, configure };
