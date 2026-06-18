/* global document, window */
/**
 * EventDelegator — one delegated listener per event type on the component root.
 *
 * Replaces per-element binding: instead of scanning the DOM and (re)attaching a
 * listener to every `data-on-*` element on each render, a single listener per
 * event type sits on the root and the target handler is resolved at dispatch
 * time by walking up from `event.target`. Root listeners are attached once and
 * survive every morphdom re-render (the root node is never replaced); they are
 * removed only on destroy.
 *
 * Handled sources:
 * - inline events:  `data-on-<type>="method"` → calls `component[method]`
 * - manual events:  the component's `events` array ({selector, eventType, handler})
 * - clickoutside:   `data-on-clickoutside="method"` → document listener, fires
 *                   when a click lands outside the element
 *
 * Ownership: a handler only fires for elements this component owns — i.e. whose
 * nearest `[data-component]` ancestor-or-self is our root. Elements inside (or
 * the root of) a child component are skipped; the child's own delegator handles
 * them. This mirrors normal bubbling: a click inside a child still triggers an
 * owned ancestor handler in the parent.
 */

// Events that don't bubble must be listened for in the capture phase to reach
// the root; everything else uses bubbling, so native `stopPropagation()` and
// handler ordering behave as if the listener were on the element itself.
const NON_BUBBLING = new Set(['blur', 'focus']);

class EventDelegator {
  constructor(root, component) {
    this.root          = root;
    this.component     = component;
    this._rootListeners = new Map();  // eventType -> listener fn (attached on root)
    this._globals       = [];         // { target, type, listener } document/window + clickoutside
    this._events        = [];         // current manual events array
  }

  // Called each render. `inlineTypes` is the Set of data-on-* types present in
  // the markup; `events` is the component's manual events array.
  sync(inlineTypes, events) {
    this._events = Array.isArray(events) ? events : [];

    // Root listeners for inline types + manual CSS-selector types (attach once).
    for (const type of inlineTypes) {
      if (type !== 'clickoutside') {
        this._ensureRootListener(type);
      }
    }
    for (const ev of this._events) {
      if (ev.selector !== 'document' && ev.selector !== 'window') {
        this._ensureRootListener(ev.eventType);
      }
    }

    // Globals (document/window manual events + clickoutside) point at specific
    // targets/elements that may change between renders, so rebind them each time.
    this._clearGlobals();
    for (const ev of this._events) {
      if (ev.selector === 'document' || ev.selector === 'window') {
        const target = ev.selector === 'document' ? document : window;
        this._addGlobal(target, ev.eventType, (e) => ev.handler.call(this.component, e));
      }
    }
    if (inlineTypes.has('clickoutside')) {
      this.root.querySelectorAll('[data-on-clickoutside]').forEach(el => {
        if (!this._owns(el)) {
          return;
        }
        const method = el.getAttribute('data-on-clickoutside');
        this._addGlobal(document, 'click', (e) => {
          if (!el.contains(e.target)) {
            this._invoke(method, e, el);
          }
        });
      });
    }
  }

  _ensureRootListener(type) {
    if (this._rootListeners.has(type)) {
      return;
    }
    const listener = (e) => this._dispatch(type, e);
    this._rootListeners.set(type, listener);
    this.root.addEventListener(type, listener, NON_BUBBLING.has(type));
  }

  // Walk up from e.target to the root, firing every owned element that declares
  // this event (inline data-on-* and/or a matching manual selector).
  _dispatch(type, e) {
    const manual = this._events.filter(ev =>
      ev.eventType === type && ev.selector !== 'document' && ev.selector !== 'window');

    let node = e.target;
    while (node && node.nodeType === 1) {
      if (this._owns(node)) {
        if (node.hasAttribute(`data-on-${type}`)) {
          this._invoke(node.getAttribute(`data-on-${type}`), e, node);
        }
        for (const ev of manual) {
          if (e.cancelBubble) {
            break;
          }
          if (node.matches(ev.selector)) {
            this._run(ev.handler, e, node);
          }
        }
      }
      // A handler that called stopPropagation() stops the walk, mirroring how
      // bubbling would have kept the event from reaching owned ancestors.
      if (node === this.root || e.cancelBubble) {
        break;
      }
      node = node.parentNode;
    }
  }

  _invoke(method, e, currentTarget) {
    const fn = this.component[method];
    if (typeof fn !== 'function') {
      console.warn(`[Component] Method "${method}" not found on component "${this.component.template}"`);
      return;
    }
    this._run(fn, e, currentTarget);
  }

  // Run a handler as `method(event, element)`, with `event.currentTarget` also
  // pointing at the matched element. Delegation puts the real listener on the
  // root, so currentTarget would otherwise be the root rather than the element
  // bearing the on:* attribute; the element is passed as the 2nd argument too.
  _run(fn, e, currentTarget) {
    const prev = Object.getOwnPropertyDescriptor(e, 'currentTarget');
    Object.defineProperty(e, 'currentTarget', { configurable: true, value: currentTarget });
    try {
      fn.call(this.component, e, currentTarget);
    } finally {
      if (prev) {
        Object.defineProperty(e, 'currentTarget', prev);
      } else {
        delete e.currentTarget;
      }
    }
  }

  // True if `el` belongs to this component (nearest [data-component] is our root).
  _owns(el) {
    return el.closest('[data-component]') === this.root;
  }

  _addGlobal(target, type, listener) {
    target.addEventListener(type, listener);
    this._globals.push({ target, type, listener });
  }

  _clearGlobals() {
    for (const { target, type, listener } of this._globals) {
      target.removeEventListener(type, listener);
    }
    this._globals = [];
  }

  destroy() {
    for (const [type, listener] of this._rootListeners) {
      this.root.removeEventListener(type, listener, NON_BUBBLING.has(type));
    }
    this._rootListeners.clear();
    this._clearGlobals();
    this.root      = null;
    this.component = null;
    this._events   = [];
  }
}

module.exports = EventDelegator;
