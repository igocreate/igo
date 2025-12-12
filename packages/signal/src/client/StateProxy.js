/**
 * StateProxy - Deep reactive state with Proxy (like Vue 3)
 *
 * Features:
 * - Deep reactivity (nested objects/arrays)
 * - Array mutation detection (push, pop, splice, etc.)
 * - WeakMap caching to avoid double-wrapping
 */
class StateProxy {
  constructor(component, namespace) {
    this.component = component;
    this.namespace = namespace;
    this.cache = new WeakMap();
  }

  create(target, path = []) {
    if (this.cache.has(target)) return this.cache.get(target);

    const proxy = new Proxy(target, {
      get: (target, property) => {
        // Track dependency
        if (this.component._isTracking) {
          this.component._trackedDeps.push([this.namespace, ...path, property]);
        }

        const value = target[property];

        // Don't wrap primitives, functions, Date, RegExp
        if (!value || typeof value !== 'object' || value instanceof Date || value instanceof RegExp) {
          return value;
        }

        // Recursively wrap objects/arrays
        return this.create(value, [...path, property]);
      },

      set: (target, property, value) => {
        const oldValue = target[property];
        target[property] = value;

        // Trigger render if changed
        if (this.component._isInitialized && !Object.is(oldValue, value)) {
          this.component._triggerRender();
        }

        return true;
      }
    });

    // Wrap array methods
    if (Array.isArray(target)) {
      ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(method => {
        const original = Array.prototype[method];
        Object.defineProperty(target, method, {
          value: (...args) => {
            const result = original.apply(target, args);
            if (this.component._isInitialized) this.component._triggerRender();
            return result;
          },
          enumerable: false,
          writable: true,
          configurable: true
        });
      });
    }

    this.cache.set(target, proxy);
    return proxy;
  }


}

module.exports = StateProxy;
