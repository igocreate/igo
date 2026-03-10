
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
 * Create serialize helper function with the provided uneval function
 * @param {Function} uneval - The uneval function from devalue
 * @returns {Function} The serialize helper
 */
const createSerializeHelper = (uneval) => {
  return (params, locals) => {
    const data = {};
    const keys = (params.props || '').split(',').map(p => p.trim()).filter(Boolean);
    keys.forEach(key => {
      data[key] = locals[key];
    });
    return htmlencode(uneval(data));
  };
};

module.exports = { createSerializeHelper, htmlencode };
