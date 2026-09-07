
const problem = require('./problem');

const SOURCES     = ['body', 'query', 'params'];
const WITH_BODY   = ['post', 'put', 'patch'];

// Any Standard Schema implementation (zod, valibot, arktype) exposes ~standard.
const isSchema = (value) =>
  !!value && (typeof value === 'object' || typeof value === 'function') && '~standard' in value;

// Schemas are attached to the handler itself: if the handler is mounted, its
// validation is too — no name to keep in sync, nothing to write in the routes.
//   exports.create.body = dto.CreerDossier;
const schemasOf = (handler) => {
  if (typeof handler !== 'function') {
    return null;
  }
  let schemas = null;
  for (const source of SOURCES) {
    if (isSchema(handler[source])) {
      schemas = schemas || {};
      schemas[source] = handler[source];
    }
  }
  return schemas;
};

// Express 5 exposes req.query through a getter: assigning to it fails silently.
const replace = (req, source, value) => {
  if (source === 'query') {
    Object.defineProperty(req, 'query', { value, writable: true, configurable: true });
    return;
  }
  req[source] = value;
};

const issuesOf = (result) => result.issues.map((issue) => ({
  path:    (issue.path || []).map(segment => segment?.key ?? segment).join('.'),
  message: issue.message,
}));

// Wraps a handler so its schemas are applied before it runs.
const wrap = (handler, schemas) => {
  const validated = async (req, res, next) => {
    try {
      for (const [source, schema] of Object.entries(schemas)) {
        const result = await schema['~standard'].validate(req[source]);
        if (result.issues) {
          return problem.send(res, 400, { title: 'Validation failed', errors: issuesOf(result) });
        }
        replace(req, source, result.value);
      }
    } catch (err) {
      return next(err);
    }
    return handler(req, res, next);
  };
  Object.assign(validated, handler);
  return validated;
};

const eachRoute = (router, fn) => {
  for (const layer of router.stack || []) {
    if (layer.route) {
      fn(layer.route);
    } else if (layer.handle?.stack) {
      eachRoute(layer.handle, fn);
    }
  }
};

// Walks an API router once at boot and wraps every handler that declares a
// schema. Returns the routes that take a body without declaring one.
module.exports.apply = (router) => {
  const unvalidated = [];

  eachRoute(router, (route) => {
    let validatedRoute = false;

    route.stack.forEach((layer) => {
      const schemas = schemasOf(layer.handle);
      if (schemas) {
        layer.handle   = wrap(layer.handle, schemas);
        validatedRoute = true;
      }
    });

    if (validatedRoute) {
      return;
    }
    Object.keys(route.methods)
    .filter(method => WITH_BODY.includes(method))
    .forEach(method => unvalidated.push(`${method.toUpperCase()} ${route.path}`));
  });

  return unvalidated;
};

module.exports.schemasOf = schemasOf;
module.exports.isSchema  = isSchema;
