const Templates = require('./Templates.js');
const { uneval } = require('devalue');
const igoDustHelpers = require('@igojs/dust/src/render/Helpers');
const shared = require('@igojs/dust/src/render/shared');
const { createSerializeHelper, htmlencode } = require('../../shared/serialize.js');

// helpers
const h = (t, p, l) => {
  if (!h.helpers || !h.helpers[t]) {
    throw new Error(`Error: helper @${t} not found!`);
  }
  return h.helpers[t](p, l);
};

// Client-side @component helper
// Generates the wrapper div; the child component auto-mounts via _mountChildComponents()
const componentHelper = (params) => {
  const { name, key, ...props } = params;
  if (!name) {
    throw new Error('[@component] "name" parameter is required');
  }
  const dataProps = htmlencode(uneval(props));
  // Default key to component name; explicit key= recommended for dynamic lists
  return `<div data-component-key="${key || name}" data-component="${name}" data-props="${dataProps}"></div>`;
};

// Initialize with igo-dust base helpers
h.helpers = {
  ...igoDustHelpers,
  serialize: createSerializeHelper(uneval),
  component: componentHelper,
};

// Register application helpers (called by component.start())
const setHelpers = (appHelpers) => {
  Object.assign(h.helpers, appHelpers);
};

// include file
const i = async (file) => {
  return await Templates.loadTemplate(file);
};

module.exports = { ...shared, h, i, setHelpers };
