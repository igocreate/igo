/**
 * Signal - Server-side SSR support for SignalComponents
 *
 * This module provides:
 * - SignalController: Express middleware for SSR and template serving
 * - SerializeUtils: Model serialization with deduplication
 */

const SignalController = require('./SignalController');
const SerializeUtils = require('./SerializeUtils');

module.exports = {
  middleware: SignalController.middleware,
  templates: SignalController.templates,
  configure: SignalController.configure,
  serialize: SerializeUtils.serialize
};
