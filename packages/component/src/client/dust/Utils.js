const Templates = require('./Templates.js');
const { stringify } = require('devalue');
const shared = require('@igojs/dust/src/render/shared');
const { createSerializeHelper, htmlencode } = require('../../shared/serialize.js');
const { extractEventBindings } = require('../../shared/events.js');

// helpers
const h = (t, p, l) => {
  if (!h.helpers || !h.helpers[t]) {
    throw new Error(`Error: helper @${t} not found!`);
  }
  return h.helpers[t](p, l);
};

// Client-side @component helper
// Generates the wrapper div; the child component auto-mounts via _mountChildComponents()
// Component name is the positional string: {@component "components/Select" /} (matches SSR),
// so `name` stays free as a regular prop (e.g. a form field name on the component).
const componentHelper = (params) => {
  const { $: name, key, ...allProps } = params;
  if (!name) {
    throw new Error('[@component] component name is required, e.g. {@component "components/Select" /}');
  }
  // Split parent → child event bindings (on:event="method") from real props.
  const { props, attrs: emitAttrs } = extractEventBindings(allProps);
  // devalue.stringify (JSON) so the child reads it back with devalue.parse — no
  // eval/new Function on the client → CSP-safe (no `unsafe-eval` needed).
  const dataProps = htmlencode(stringify(props));
  // Default key to component name; explicit key= recommended for dynamic lists
  return `<div data-component-key="${key || name}" data-component="${name}" data-props="${dataProps}"${emitAttrs}></div>`;
};

h.helpers = {
  serialize: createSerializeHelper(stringify),
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
