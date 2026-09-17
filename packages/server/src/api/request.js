
const config = require('../config');

// Whether a request is served as JSON — under the API prefix, or from a client
// that asked for JSON and cannot render a dust page anyway.
//
// The question is one of routing, not of error format: the security headers,
// `unlessApi()`, the 404 and the error handler all ask it, and none of them is
// about problem documents.
module.exports.isApiRequest = (req) => {
  const prefix = config.api?.prefix;
  const path   = req.path || req.url || '';
  if (prefix && (path === prefix || path.startsWith(prefix + '/'))) {
    return true;
  }
  return !!req.headers?.accept?.includes('application/json');
};
