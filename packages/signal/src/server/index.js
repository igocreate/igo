/**
 * Signal - Server-side SSR support for SignalComponents
 *
 * This module provides:
 * - SignalController: Express middleware for SSR and template serving
 * - SerializeUtils: Model serialization with deduplication
 */

const SignalController = require('./SignalController.js');
const SerializeUtils = require('./SerializeUtils.js');

module.exports = {
  middleware: SignalController.middleware,
  templates: SignalController.templates,
  configure: SignalController.configure,
  serialize: SerializeUtils.serialize
};
