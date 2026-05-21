
const Cache   = require('../Cache');
const Helpers = require('./Helpers');
const shared  = require('./shared');

// helpers
// Sync wrapper: returns whatever the helper returns (value or Promise).
// The compile-time `await u.h(...)` handles both — `await syncValue` is a fast path in V8.
const h = (t, p, l, body) => {
  if (!h.helpers || !h.helpers[t]) {
    throw new Error(`Error: helper @${t} not found!`);
  }
  return h.helpers[t](p, l, body);
};
h.helpers = Helpers;

// include file
const i = async (file) => {
  if (!file.endsWith('.dust')) {
    file = file + '.dust';
  }
  return await Cache.getCompiled(file);
};

module.exports = { ...shared, h, i };
