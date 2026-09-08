
const config    = require('../config');
const logger    = require('../logger');
const problem   = require('./problem');
const validate  = require('./validate');

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

module.exports.problem = problem;
