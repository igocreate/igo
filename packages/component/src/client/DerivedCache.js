/**
 * DerivedCache - Memoization with auto-tracked dependencies (like Vue 3 computed)
 *
 * Caches expensive calculations and recalculates only when dependencies change.
 * Uses Proxy-based dependency tracking to automatically detect what values are accessed.
 */
class DerivedCache {
  constructor() {
    this._cache = new Map(); // Map<key, { value, deps }>
  }

  // Memoize a derived value with optional precomputed value
  memoize(key, fn, deps, context, precomputedValue) {
    const resolvedDeps = context ? this._resolveDeps(deps, context) : deps;

    // If precomputed value provided, use it directly (first render optimization)
    if (precomputedValue !== undefined) {
      this._cache.set(key, { value: precomputedValue, deps: [...resolvedDeps], fn });
      return precomputedValue;
    }

    // Check cache for existing value
    const cached = this._cache.get(key);
    if (cached && this._areDepsEqual(cached.deps, resolvedDeps)) {
      return cached.value;
    }

    // Recompute
    const value = fn();
    this._cache.set(key, { value, deps: [...resolvedDeps] });
    return value;
  }

  // Resolve dependency paths like ['props', 'products'] to actual values
  _resolveDeps(deps, context) {
    return deps.map(dep => {
      if (!Array.isArray(dep)) return dep;

      let value = context;
      for (const key of dep) value = value?.[key];
      return value;
    });
  }

  // Shallow comparison (Object.is like React)
  _areDepsEqual(prevDeps, nextDeps) {
    if (prevDeps.length !== nextDeps.length) return false;
    for (let i = 0; i < prevDeps.length; i++) {
      if (!Object.is(prevDeps[i], nextDeps[i])) return false;
    }
    return true;
  }

  clear() {
    this._cache.clear();
  }

  invalidate(key) {
    this._cache.delete(key);
  }
}

module.exports = DerivedCache;
