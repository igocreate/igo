/**
 * @igojs/component - Server-side SSR support
 *
 * This module provides:
 * - ComponentController: SSR @component helper + template/component/translations endpoints
 * - SerializeUtils: Model serialization with deduplication
 */

const ComponentController = require('./ComponentController.js');
const SerializeUtils = require('./SerializeUtils.js');

module.exports = {
  init:         ComponentController.init,
  templates:    ComponentController.templates,
  component:    ComponentController.component,
  translations: ComponentController.translations,
  serialize:    SerializeUtils.serialize
};
