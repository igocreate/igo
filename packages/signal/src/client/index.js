/**
 * Signal - Zero-boilerplate reactive framework (browser entry point)
 *
 * Usage:
 *   require('@igo/signal/src/client').start({
 *     components: { 'Counter': Counter },
 *     helpers: require('./helpers')
 *   });
 */

require('./dust/i18n');

const SignalComponent = require('./SignalComponent');
const Utils = require('./dust/Utils');

window.__signal = {
  IgoDustUtils: Utils
};

let registry = {};

function mountElement(el) {
  if (el.__igoInstance) {
    return;
  }
  const Comp = registry[el.dataset.component];
  if (Comp) {
    new Comp(el);
  } else {
    console.error(`[signal] Component "${el.dataset.component}" not found`);
  }
}

function mountAll(root = document) {
  root.querySelectorAll('[data-component]').forEach(mountElement);
}

function start(config = {}) {
  const { components, helpers } = config;

  // Register application helpers
  if (helpers) {
    Utils.setHelpers(helpers);
  }

  // Build component registry
  if (components) {
    // Support webpack require.context
    if (typeof components.keys === 'function') {
      components.keys().forEach(key => {
        const mod = components(key);
        if (mod?.prototype instanceof SignalComponent) {
          registry[key.replace(/^\.\//, '').replace(/\.js$/, '')] = mod;
        }
      });
    } else {
      // Support plain object { 'path': ComponentClass }
      Object.assign(registry, components);
    }
  }

  // Mount components
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => mountAll());
  } else {
    mountAll();
  }
}

window.__signal.mountElement = mountElement;

module.exports = { SignalComponent, start, mountAll, mountElement };
