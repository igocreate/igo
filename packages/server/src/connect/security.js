const config  = require('../config');
const { isApiRequest } = require('../api/request');

// The headers a penetration test asks for, with the values one accepted on an
// igo application in production. No page CSP by default: a working one is made
// of a project's own exceptions (fonts, CDNs, third-party APIs), and a default
// would only be turned off. On an API request the policy is safe to be strict:
// JSON never executes, and a response may carry personal data no intermediate
// cache should keep.
//
// HSTS is only sent in production, over a request that actually arrived in
// HTTPS: a browser ignores it over HTTP anyway, and an intranet served in plain
// HTTP must not be told otherwise.
module.exports = (req, res, next) => {
  const security = config.security;
  if (!security) {
    return next();
  }

  const set = (name, value) => {
    if (value) {
      res.setHeader(name, value);
    }
  };

  set('X-Content-Type-Options', security.noSniff && 'nosniff');
  set('X-Frame-Options',        security.frameOptions);
  set('Referrer-Policy',        security.referrerPolicy);
  set('Permissions-Policy',     security.permissionsPolicy);

  if (config.env === 'production' && req.secure) {
    set('Strict-Transport-Security', security.hsts);
  }

  if (isApiRequest(req)) {
    set('Content-Security-Policy', security.apiCsp);
    set('Cache-Control', security.apiCacheControl);
  } else {
    set('Content-Security-Policy', security.csp);
  }

  next();
};
