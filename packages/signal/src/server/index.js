/**
 * Signal - Server-side SSR support for SignalComponents
 *
 * This module provides:
 * - SignalController: Express middleware for SSR and template serving
 * - SerializeUtils: Model serialization with deduplication
 */

import SignalController from './SignalController.js';
import SerializeUtils from './SerializeUtils.js';

export default {
  middleware: SignalController.middleware,
  templates: SignalController.templates,
  configure: SignalController.configure,
  serialize: SerializeUtils.serialize
};
