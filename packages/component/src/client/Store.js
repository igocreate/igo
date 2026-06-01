/**
 * Store - Page-level reactive store.
 *
 * One singleton per page (exposed at the bottom of this file). Components read
 * its reactive `proxy` through `this.store`. Reads during render auto-subscribe
 * the component; writes re-render subscribers and fire matching watchers.
 *
 * Reactivity is DEEP, mirroring StateProxy: nested objects/arrays are wrapped
 * lazily on access, so `store.user.name = 'x'` (and array mutators) notify just
 * like a top-level assignment. Re-render subscriptions stay keyed by the
 * top-level key (a component that read `store.user.*` is subscribed to `user`),
 * while watchers fire on the exact dotted path (`user.name`) — same granularity
 * as state/props watchers.
 *
 * Encapsulated in a class so tests (and future multi-store experiments) can
 * `new` a fresh instance and call `reset()`.
 */
const ARRAY_MUTATORS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];

class Store {
  constructor() {
    this._data        = {};
    this._subscribers = new Map();     // top-level key -> Set<component>
    this._watchers    = new Map();     // dotted path  -> Set<entry>
    this._trackerStk  = [];            // stack of trackers (nested renders safe)
    this._proxyCache  = new WeakMap(); // raw object -> its proxy (avoid re-wrap)
    this.proxy        = this._wrap(this._data, null, []);
  }

  // Wrap a target object reactively. `rootKey` is the top-level store key this
  // object lives under (null at the root, where each read establishes its own);
  // `path` is the full path from the root, used to address watchers.
  _wrap(target, rootKey, path) {
    const cached = this._proxyCache.get(target);
    if (cached) {
      return cached;
    }

    const proxy = new Proxy(target, {
      get: (t, prop) => {
        if (typeof prop === 'symbol') {
          return t[prop];
        }
        const key     = rootKey ?? prop;
        const tracker = this._trackerStk[this._trackerStk.length - 1];
        if (tracker) {
          this.subscribe(tracker, key);
        }
        const value = t[prop];
        if (!value || typeof value !== 'object' || value instanceof Date || value instanceof RegExp) {
          return value;
        }
        // Reuse the cached child proxy; only build the extended path on first wrap.
        const cached = this._proxyCache.get(value);
        if (cached) return cached;
        return this._wrap(value, key, [...path, prop]);
      },

      set: (t, prop, value) => {
        const oldValue = t[prop];
        if (Object.is(oldValue, value)) {
          return true;
        }
        t[prop] = value;
        const key = rootKey ?? prop;
        this._notify(key);
        this._notifyWatchers([...path, prop], value, oldValue);
        return true;
      },

      deleteProperty: (t, prop) => {
        if (!(prop in t)) {
          return true;
        }
        const oldValue = t[prop];
        delete t[prop];
        const key = rootKey ?? prop;
        this._notify(key);
        this._notifyWatchers([...path, prop], undefined, oldValue);
        return true;
      },
    });

    // Wrap array mutators so in-place mutations notify the root key + watchers.
    if (Array.isArray(target)) {
      ARRAY_MUTATORS.forEach(method => {
        const original = Array.prototype[method];
        Object.defineProperty(target, method, {
          value: (...args) => {
            const result = original.apply(target, args);
            if (rootKey != null) {
              this._notify(rootKey);
              this._notifyWatchers(path, target, target);
            }
            return result;
          },
          enumerable: false,
          writable: true,
          configurable: true,
        });
      });
    }

    this._proxyCache.set(target, proxy);
    return proxy;
  }

  // Read a dotted path from an object (e.g. 'user.name').
  _readPath(obj, path) {
    let cur = obj;
    for (const part of path.split('.')) {
      if (cur == null) {
        return undefined;
      }
      cur = cur[part];
    }
    return cur;
  }

  // Read without subscribing — used by the template context Proxy which manages
  // its own subscriptions explicitly.
  getRaw(key) {
    return this._data[key];
  }

  keys() {
    return Object.keys(this._data);
  }

  // Re-render every live component subscribed to a top-level key.
  _notify(key) {
    const subs = this._subscribers.get(key);
    if (!subs) {
      return;
    }
    for (const c of subs) {
      if (!c._destroyed) {
        c._triggerRender();
      }
    }
  }

  // Fire watchers registered on the exact dotted path of a change.
  _notifyWatchers(pathArray, value, oldValue) {
    const ws = this._watchers.get(pathArray.join('.'));
    if (!ws) {
      return;
    }
    for (const w of ws) {
      if (w.component._destroyed) {
        continue;
      }
      w.prevValue = value;
      w.handler.call(w.component, value, oldValue);
    }
  }

  pushTracker(c)  { this._trackerStk.push(c); }
  popTracker()    { this._trackerStk.pop(); }

  subscribe(component, key) {
    let set = this._subscribers.get(key);
    if (!set) {
      set = new Set();
      this._subscribers.set(key, set);
    }
    set.add(component);
    component._storeKeys?.add(key);
  }

  unsubscribeAll(component) {
    if (!component._storeKeys) {
      return;
    }
    for (const key of component._storeKeys) {
      this._subscribers.get(key)?.delete(component);
    }
    component._storeKeys.clear();
  }

  addWatcher(path, handler, component) {
    const entry = { path, handler, prevValue: this._readPath(this._data, path), component };
    let set = this._watchers.get(path);
    if (!set) {
      set = new Set();
      this._watchers.set(path, set);
    }
    set.add(entry);
    return entry;
  }

  removeWatcher(entry) {
    this._watchers.get(entry.path)?.delete(entry);
  }

  // Test helper — drops all state, subscribers, watchers.
  reset() {
    for (const k of Object.keys(this._data)) {
      delete this._data[k];
    }
    this._subscribers.clear();
    this._watchers.clear();
    this._trackerStk.length = 0;
    this._proxyCache = new WeakMap();
    this.proxy = this._wrap(this._data, null, []);
  }
}

module.exports = Store;
