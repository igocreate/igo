
const path    = require('path');
const IgoDust = require('@igojs/dust');

const { createSerializeHelper } = require('../shared/serialize.js');
const { componentHelper } = require('./ComponentHelper.js');

// devalue is ESM-only, load it dynamically at startup
import('devalue').then(m => {
  // Register @serialize helper once devalue is loaded
  IgoDust.helpers.serialize = createSerializeHelper(m.stringify);
});

// Register @component helper
IgoDust.helpers.component = componentHelper;


// Validate component path: prevents path traversal.
// Charset excludes '.', so '..' is impossible; also reject absolute paths
// (leading '/') so input can never escape the views root.
const SAFE_NAME_RE = /^[a-zA-Z0-9_/-]+$/;
const isValidName = (name) => !!name && SAFE_NAME_RE.test(name) && !path.isAbsolute(name);

const templates = async (req, res) => {
  const file = req.query.file;
  if (!isValidName(file)) {
    return res.status(400).json({ error: 'Invalid file name' });
  }
  try {
    // Use getComponent to split out <script> block from single-file components
    const { templateSource }  = await IgoDust.getComponent(`${file}.dust`);
    const source              = templateSource || await IgoDust.getSource(`${file}.dust`);
    res.json({ file, source });
  } catch {
    res.status(404).json({ error: 'Template not found' });
  }
};

// Serve component data (script + template source) for client hydration
const component = async (req, res) => {
  const name = req.query.name;
  if (!isValidName(name)) {
    return res.status(400).json({ error: 'Invalid component name' });
  }
  try {
    const { scriptSrc, templateSource } = await IgoDust.getComponent(`${name}.dust`);
    res.json({ name, scriptSrc, templateSource });
  } catch {
    // Generic message: never leak resolved filesystem paths (e.g. ENOENT with absolute path)
    res.status(404).json({ error: 'Component not found' });
  }
};

// Serve the current request's translations as JSON.
// Read from req.i18n (attached by i18next-http-middleware) using the request language;
// returns {} when no i18next is attached.
const translations = (req, res) => {
  let data = {};
  if (req.i18n && typeof req.i18n.getResourceBundle === 'function') {
    const lang = req.language || req.i18n.language;
    data = req.i18n.getResourceBundle(lang, 'translation') || {};
  }
  res.json(data);
};

// Register the three GET endpoints used by the client runtime.
const init = (app) => {
  app.get('/__component/templates',    templates);
  app.get('/__component/component',    component);
  app.get('/__component/translations', translations);
};

module.exports = { init, templates, component, translations };
