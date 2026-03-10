/**
 * @igojs/component - Server-side SSR support
 *
 * This module provides:
 * - ComponentController: Express middleware for SSR and template serving
 * - SerializeUtils: Model serialization with deduplication
 */

const ComponentController = require('./ComponentController.js');
const SerializeUtils = require('./SerializeUtils.js');

module.exports = {
  middleware: ComponentController.middleware,
  templates: ComponentController.templates,
  component: ComponentController.component,
  configure: ComponentController.configure,
  serialize: SerializeUtils.serialize
};
