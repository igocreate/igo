// @igojs/component - Reactive components with SSR for Igo.js

// Server-side exports
const server = require('./src/server/index.js');

module.exports = {
  middleware: server.middleware,
  templates: server.templates,
  component: server.component,
  configure: server.configure,
  serialize: server.serialize,
};
