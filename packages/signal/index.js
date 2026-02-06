// @igojs/signal - Reactive frontend/SSR framework for Igo.js

// Server-side exports
import server from './src/server/index.js';
import SignalComponent from './src/client/SignalComponent.js';

// Re-export server utilities
export const middleware = server.middleware;
export const templates = server.templates;
export const configure = server.configure;
export const serialize = server.serialize;
export { SignalComponent };

export default {
  middleware: server.middleware,
  templates: server.templates,
  configure: server.configure,
  serialize: server.serialize,
  SignalComponent,
};
