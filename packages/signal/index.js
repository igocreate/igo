// @igojs/signal - Reactive frontend/SSR framework for Igo.js

// Server-side exports
const server = require('./src/server');
const SignalComponent = require('./src/client/SignalComponent');

// Re-export server utilities
module.exports = {
  // Server middleware for SSR
  middleware: server.middleware,

  // Template serving endpoint
  templates: server.templates,

  // Configure signal (translations, etc.)
  configure: server.configure,

  // Serialization for client hydration
  serialize: server.serialize,

  // SignalComponent for SSR rendering
  SignalComponent,
};
