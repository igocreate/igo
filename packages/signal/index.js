// @igojs/signal - Reactive frontend/SSR framework for Igo.js

// Server-side exports
const server = require('./src/server/index.js');
const SignalComponent = require('./src/client/SignalComponent.js');

module.exports = {
  middleware: server.middleware,
  templates: server.templates,
  configure: server.configure,
  serialize: server.serialize,
  SignalComponent,
};
