
import IgoDust from '@igojs/dust';
import { uneval } from 'devalue';

import SerializeUtils from './SerializeUtils.js';
import { createSerializeHelper } from '../shared/serialize.js';

// Translations are loaded from user's project (configured via signal.configure())
let translations = {};

// Register @serialize helper
IgoDust.helpers.serialize = createSerializeHelper(uneval);


/**
 * Signal middleware - Handles SSR for SignalComponents
 *
 * Usage in controllers:
 *   res.locals.signal_props = { session, products, form, ... };
 *   res.locals.signal_components = [NewRegistrationForm];  // optional: for SSR derived values
 *   res.render('view');
 *
 * The middleware will:
 * 1. Serialize signal_props with deduplication (Model.serialize() called once per instance)
 * 2. Compute SSR derived values from registered signal_components
 * 3. Merge everything into res.locals for template rendering
 */
const middleware = async (req, res, next) => {

  // Inject translations for frontend i18next
  res.locals.__signal_translations = uneval(translations);

  const originalRender = res.render.bind(res);

  res.render = (view, locals, callback) => {
    const props = locals?.signal_props || res.locals.signal_props || {};
    const components = res.locals.signal_components || [];

    try {
      // Serialize props with deduplication
      const serializedProps = SerializeUtils.serialize(props);

      // Store serialized props for client hydration (devalue for XSS safety)
      res.locals.__signal_props = uneval(serializedProps);

      // Merge raw props into res.locals for template access
      Object.assign(res.locals, props);

      // Compute and merge SSR derived values from each component
      for (const ComponentClass of components) {
        if (ComponentClass?.ssr) {
          const derived = ComponentClass.ssr(props);
          Object.assign(res.locals, derived);
        }
      }

    } catch (error) {
      console.error('[Signal] Serialization error:', error);
      res.locals.__signal_props = '{}';
    }

    return originalRender(view, locals, callback);
  };

  next();
};

//
const templates = async (req, res) => {
  const file = req.query.file;
  const source = await IgoDust.getSource(`${file}.dust`);
  res.json({ file, source });
};

// Configure Signal (called from user's app)
const configure = (options) => {
  if (options.translations) {
    translations = options.translations;
  }
};

export default { middleware, templates, configure };
