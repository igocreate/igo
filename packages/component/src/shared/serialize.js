
// Shared serialize helper for @igojs/component
// Used both server-side (ComponentController) and client-side (Utils)

const HCHARS = /[&<>"']/;

const htmlencode = (s) => {
  if (!s || typeof s !== 'string' || !HCHARS.test(s)) {
    return s;
  }
  return s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');
};

/**
 * Create the @serialize helper with the provided devalue serializer.
 * Uses `devalue.stringify` (JSON) so the output is read back with
 * `devalue.parse` — no eval/new Function on the client (CSP-safe).
 * @param {Function} serialize - devalue.stringify
 * @returns {Function} The serialize helper
 */
const createSerializeHelper = (serialize) => {
  return (params, locals) => {
    const data = {};
    const keys = (params.props || '').split(',').map(p => p.trim()).filter(Boolean);
    keys.forEach(key => {
      data[key] = locals[key];
    });
    return htmlencode(serialize(data));
  };
};

module.exports = { createSerializeHelper, htmlencode };
