
const config    = require('../config');
const logger    = require('../logger');
const problem   = require('./problem');
const validate  = require('./validate');
const { isApiRequest } = require('./request');

const mounted = [];

// app.api('/dossiers', router) mounts under config.api.prefix. igo owns the
// prefix so a project never repeats it, and knows which routers are APIs —
// Express 5 keeps a mount path only as an opaque matcher.
module.exports.init = (app) => {
  mounted.length = 0;

  app.api = (path, ...handlers) => {
    const mountPath = config.api.prefix + path;
    mounted.push({ path: mountPath, router: handlers[handlers.length - 1] });
    app.use(mountPath, ...handlers);
    return app;
  };
};

// Called once every route is mounted: wraps the handlers that declare a schema
// and reports the API routes that take a body without one.
module.exports.wire = () => {
  const unvalidated = mounted.flatMap(({ path, router }) =>
    validate.apply(router).map(route => `${path}${route}`)
  );

  if (unvalidated.length) {
    logger.warn(`igo: ${unvalidated.length} API route(s) without validation schema (${unvalidated.join(', ')})`);
  }
};

// Wraps a middleware that only serves rendered pages — flash scope, view
// locals, asset manifest — so an API request skips it. What it skips is not
// only wasted work: the flash scope writes to the session on every GET, and
// that alone made every JSON response set a session cookie nothing reads.
module.exports.unlessApi = (middleware) => (req, res, next) =>
  isApiRequest(req) ? next() : middleware(req, res, next);

module.exports.problem = problem;
