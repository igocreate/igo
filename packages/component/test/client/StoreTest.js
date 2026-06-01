const assert = require('assert');
const Store = require('../../src/client/Store.js');

// Minimal component stand-in: Store only touches these fields.
const mockComponent = () => ({
  _destroyed:   false,
  _storeKeys:   new Set(),
  renders:      0,
  _triggerRender() { this.renders++; },
});

// Subscribe `c` to whatever keys it reads inside `fn` (mimics a render cycle).
const track = (store, c, fn) => {
  store.pushTracker(c);
  try {
    fn();
  } finally {
    store.popTracker();
  }
};

describe('Store', () => {
  let store, s;

  beforeEach(() => {
    store = new Store();
    s     = store.proxy;
  });

  describe('reactivity', () => {
    it('re-renders subscribers on a top-level write', () => {
      const c = mockComponent();
      track(store, c, () => s.count);
      s.count = 1;
      assert.strictEqual(c.renders, 1);
    });

    it('does not re-render when the value is unchanged (Object.is)', () => {
      const c = mockComponent();
      s.count = 1;
      track(store, c, () => s.count);
      s.count = 1;
      assert.strictEqual(c.renders, 0);
    });

    it('re-renders on a DEEP write, keyed by the top-level key', () => {
      s.user = { name: 'a' };
      const c = mockComponent();
      track(store, c, () => s.user.name);     // subscribes to `user`
      assert.deepStrictEqual([...c._storeKeys], ['user']);
      s.user.name = 'b';                       // nested write
      assert.strictEqual(c.renders, 1);
    });

    it('re-renders on an array mutator', () => {
      s.items = [1];
      const c = mockComponent();
      track(store, c, () => s.items.length);
      s.items.push(2);
      assert.strictEqual(c.renders, 1);
      assert.deepStrictEqual(store.getRaw('items'), [1, 2]);
    });

    it('stops re-rendering destroyed subscribers', () => {
      const c = mockComponent();
      track(store, c, () => s.count);
      c._destroyed = true;
      s.count = 1;
      assert.strictEqual(c.renders, 0);
    });
  });

  describe('watchers', () => {
    it('fires a top-level watcher with (new, old)', () => {
      const c = mockComponent();
      const seen = [];
      store.addWatcher('count', (v, old) => seen.push([v, old]), c);
      s.count = 5;
      assert.deepStrictEqual(seen, [[5, undefined]]);
    });

    it('fires a DEEP watcher on the exact dotted path', () => {
      s.user = { name: 'a' };
      const c = mockComponent();
      const seen = [];
      store.addWatcher('user.name', (v, old) => seen.push([v, old]), c);
      s.user.name = 'b';
      assert.deepStrictEqual(seen, [['b', 'a']]);
    });

    it('does not fire an ancestor watcher on a nested change (exact-path only)', () => {
      s.user = { name: 'a' };
      const c = mockComponent();
      let fired = false;
      store.addWatcher('user', () => { fired = true; }, c);
      s.user.name = 'b';
      assert.strictEqual(fired, false);
    });

    it('fires a watcher on an array mutator', () => {
      s.items = [1];
      const c = mockComponent();
      let fired = 0;
      store.addWatcher('items', () => { fired++; }, c);
      s.items.push(2);
      assert.strictEqual(fired, 1);
    });

    it('removeWatcher stops further notifications', () => {
      const c = mockComponent();
      let fired = 0;
      const entry = store.addWatcher('count', () => { fired++; }, c);
      s.count = 1;
      store.removeWatcher(entry);
      s.count = 2;
      assert.strictEqual(fired, 1);
    });
  });

  describe('subscriptions lifecycle', () => {
    it('unsubscribeAll detaches a component from re-renders', () => {
      const c = mockComponent();
      track(store, c, () => s.count);
      store.unsubscribeAll(c);
      s.count = 1;
      assert.strictEqual(c.renders, 0);
      assert.strictEqual(c._storeKeys.size, 0);
    });
  });
});
