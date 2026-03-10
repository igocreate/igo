/**
 * @igojs/component - Reactive components with SSR (browser entry point)
 *
 * Usage:
 *   const { start } = require('@igojs/component/client');
 *
 *   // Component mode (single-file .dust components, no manual registration)
 *   start();
 *
 *   // Legacy mode (class-based components)
 *   start({
 *     components: { 'Counter': Counter },
 *     helpers: helpers
 *   });
 */

const IgoComponent = require('./IgoComponent.js');
const ComponentLoader = require('./ComponentLoader.js');

const isServer = typeof window === 'undefined';

if (!isServer) {
  require('./dust/i18n.js');
}

const Utils = require('./dust/Utils.js');

if (!isServer) {
  window.__igo = {
    IgoDustUtils: Utils
  };
}

let registry = {};

// Mount a single element — loads SFC on demand if not in registry
async function mountElement(el) {
  if (el.__componentInstance) {
    return;
  }
  const name = el.dataset.component;
  let Comp = registry[name];

  // Auto-load SFC component if not registered
  if (!Comp) {
    try {
      Comp = await ComponentLoader.load(name);
      registry[name] = Comp;
    } catch (e) {
      console.error(`[component] Component "${name}" not found`, e);
      return;
    }
  }

  new Comp(el);
}

async function mountAll(root = document) {
  // Only mount top-level components (not nested inside another [data-component])
  // Child components will be mounted by their parent via _mountChildComponents()
  const elements = root.querySelectorAll('[data-component]');
  const topLevel = Array.from(elements).filter(el => {
    const parent = el.parentElement?.closest('[data-component]');
    return !parent;
  });
  for (const el of topLevel) {
    await mountElement(el);
  }
}

function start(config = {}) {
  const { components, helpers } = config;

  // Register application helpers
  if (helpers) {
    Utils.setHelpers(helpers);
  }

  // Build component registry (legacy class-based components)
  if (components) {
    // Support webpack require.context
    if (typeof components.keys === 'function') {
      components.keys().forEach(key => {
        const mod = components(key);
        if (mod?.prototype instanceof IgoComponent) {
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

if (!isServer) {
  window.__igo.mountElement = mountElement;
}

module.exports = { IgoComponent, start };
