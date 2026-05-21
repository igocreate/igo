// @igojs/component - Reactive components with SSR for Igo.js

// Server-side exports
const server = require('./src/server/index.js');

module.exports = {
  init:         server.init,
  templates:    server.templates,
  component:    server.component,
  translations: server.translations,
  serialize:    server.serialize,
};
