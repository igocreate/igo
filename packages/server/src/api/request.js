const accepts = require('accepts');

const config = require('../config');

// Whether a request targets an API route, i.e. a path under the API prefix.
//
// This decides which middlewares run: the page-only ones (flash, locals,
// assets, igodust) are skipped, and the API security headers are set. Only the
// path is looked at, never the Accept header: a client must not be able to
// strip a page route of the middlewares its controller relies on.
module.exports.isApiRoute = (req) => {
  const prefix = config.api?.prefix;
  const path   = req.path || req.url || '';
  return !!prefix && (path === prefix || path.startsWith(prefix + '/'));
};

// Whether an error response (404, 500, problem…) should be sent as JSON: on an
// API route, or when the client prefers JSON over HTML. The q= weights count:
// a crawler sending `text/html,…,application/json;q=0.7` gets an HTML page,
// and so does `*/*`.
module.exports.wantsJson = (req) =>
  module.exports.isApiRoute(req) ||
  accepts({ headers: req.headers || {} }).type(['html', 'json']) === 'json';
