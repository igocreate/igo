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
        const value = target[property];

        // Don't wrap primitives, functions, Date, RegExp
        if (!value || typeof value !== 'object' || value instanceof Date || value instanceof RegExp) {
          return value;
        }

        // Reuse the cached child proxy when present — only build the extended path
        // (an allocation) on the first wrap.
        const cached = this.cache.get(value);
        if (cached) return cached;
        return this.create(value, [...path, property]);
      },

      set: (target, property, value) => {
        const oldValue = target[property];
        target[property] = value;

        // Trigger render if changed
        if (this.component._isInitialized && !Object.is(oldValue, value)) {
          this.component._triggerRender();
          this.component._fireLocalWatchers?.(this.namespace, [...path, property], value);
        }

        return true;
      }
    });

    // Wrap array methods — in-place mutations re-render and fire watchers on the
    // array's own path (mirrors Store; the array ref is both old and new value).
    if (Array.isArray(target)) {
      ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'].forEach(method => {
        const original = Array.prototype[method];
        Object.defineProperty(target, method, {
          value: (...args) => {
            const result = original.apply(target, args);
            if (this.component._isInitialized) {
              this.component._triggerRender();
              this.component._fireLocalWatchers?.(this.namespace, path, target);
            }
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
