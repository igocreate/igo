const assert = require('assert');
const IgoComponent = require('../../src/client/IgoComponent.js');

// `emit`, `on`, `off`, `_resolveParent` and `_readEmitBindings` only touch
// `this.element`, `this._listeners` and `this._emitBindings`, so we exercise
// them on a lightweight mock — no DOM or full construction needed.
const { emit, on, off, _resolveParent, _readEmitBindings } = IgoComponent.prototype;

function mockChild({ attributes = [], parent = null } = {}) {
  const child = {
    _listeners:    new Map(),
    _emitBindings: null,
    element: {
      attributes,
      parentElement: parent
        ? { closest: (sel) => (sel === '[data-component]' ? { __componentInstance: parent } : null) }
        : { closest: () => null },
    },
    on, off, emit, _resolveParent, _readEmitBindings,
  };
  child._emitBindings = child._readEmitBindings();
  return child;
}

describe('IgoComponent events (emit / on / off)', () => {

  it('reads data-emit-* attributes into the bindings map', () => {
    const child = mockChild({ attributes: [
      { name: 'data-component', value: 'Select' },
      { name: 'data-emit-change', value: 'onClientChange' },
      { name: 'data-emit-open',   value: 'onOpen' },
    ] });
    assert.deepStrictEqual(child._emitBindings, { change: 'onClientChange', open: 'onOpen' });
  });

  it('calls the parent method bound in markup, with this = parent', () => {
    let seenThis = null;
    const parent = {
      template: 'Form',
      received: null,
      onClientChange(payload) { seenThis = this; this.received = payload; },
    };
    const child = mockChild({
      attributes: [{ name: 'data-emit-change', value: 'onClientChange' }],
      parent,
    });

    child.emit('change', { id: 42 });

    assert.deepStrictEqual(parent.received, { id: 42 });
    assert.strictEqual(seenThis, parent);
  });

  it('passes multiple args through to the parent handler', () => {
    const parent = { args: null, onPick(a, b) { this.args = [a, b]; } };
    const child = mockChild({
      attributes: [{ name: 'data-emit-pick', value: 'onPick' }],
      parent,
    });

    child.emit('pick', 'a', 'b');

    assert.deepStrictEqual(parent.args, ['a', 'b']);
  });

  it('notifies programmatic listeners registered with on()', () => {
    const child = mockChild();
    const calls = [];
    child.on('change', (v) => calls.push(v));
    child.on('change', (v) => calls.push(v * 2));

    child.emit('change', 5);

    assert.deepStrictEqual(calls, [5, 10]);
  });

  it('on() returns an unsubscribe, and off() removes a listener', () => {
    const child = mockChild();
    const calls = [];
    const unsub = child.on('change', (v) => calls.push(v));

    child.emit('change', 1);
    unsub();
    child.emit('change', 2);

    assert.deepStrictEqual(calls, [1]);
  });

  it('does nothing when there is neither a binding nor a listener', () => {
    const child = mockChild();
    assert.doesNotThrow(() => child.emit('whatever', 1));
  });

  it('warns (does not throw) when the binding points to a missing parent method', () => {
    const parent = { template: 'Form' };
    const child = mockChild({
      attributes: [{ name: 'data-emit-change', value: 'nope' }],
      parent,
    });

    const originalWarn = console.warn;
    const warnings = [];
    console.warn = (msg) => warnings.push(msg);
    try {
      assert.doesNotThrow(() => child.emit('change'));
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /method not found on parent/);
  });

});

// `render` only touches `_rendering`, `_renderPending`, `_destroyed` and
// `_renderOnce`, so the serialization contract is exercised on a mock too.
describe('IgoComponent render serialization', () => {

  const { render } = IgoComponent.prototype;

  function mockRenderer() {
    return {
      render,
      _destroyed: false,
      active:     0,
      maxActive:  0,
      runs:       0,
      async _renderOnce() {
        this.active++;
        this.maxActive = Math.max(this.maxActive, this.active);
        this.runs++;
        await new Promise(resolve => setImmediate(resolve));
        this.active--;
      },
    };
  }

  it('never runs two _renderOnce concurrently', async () => {
    const comp = mockRenderer();
    await Promise.all([comp.render(), comp.render(), comp.render()]);
    assert.strictEqual(comp.maxActive, 1);
  });

  it('coalesces renders requested mid-flight into a single trailing re-run', async () => {
    const comp = mockRenderer();
    const first = comp.render();
    comp.render();
    comp.render();
    comp.render();
    await first;
    assert.strictEqual(comp.runs, 2);
  });

  it('skips the trailing re-run when destroyed mid-render', async () => {
    const comp = mockRenderer();
    const first = comp.render();
    comp.render();
    comp._destroyed = true;
    await first;
    assert.strictEqual(comp.runs, 1);
  });

});

// `_buildMorphOptions` is pure — getNodeKey only reads el.dataset/id.
describe('IgoComponent getNodeKey', () => {

  const { getNodeKey } = IgoComponent.prototype._buildMorphOptions.call({});

  it('prefers data-component-key', () => {
    assert.strictEqual(getNodeKey({ dataset: { componentKey: 'c', key: 'k' }, id: 'i' }), 'c');
  });

  it('uses explicit data-key when no component key', () => {
    assert.strictEqual(getNodeKey({ dataset: { key: 'sidebar' }, id: 'i' }), 'sidebar');
  });

  it('falls back to id', () => {
    assert.strictEqual(getNodeKey({ dataset: {}, id: 'i' }), 'i');
  });

});

// `_buildTemplateContext` only reads `_derivedValues`/`_state`/`_props` and the
// page store, so the proxy contract is exercised on a mock instance.
describe('IgoComponent template context writes', () => {

  const { _buildTemplateContext } = IgoComponent.prototype;

  function mockContext({ props = {}, state = {}, derived = {} } = {}) {
    return _buildTemplateContext.call({
      _derivedValues: derived,
      _state:         state,
      _props:         props,
    });
  }

  it('keeps a key writable when it shadows a prop (include params reuse)', () => {
    // {> "_select" options=... /} writes `options` while a prop `options` exists:
    // without an explicit set trap the first write froze the key (writable:false).
    const ctx = mockContext({ props: { options: ['p1', 'p2'] } });

    ctx.options = ['families'];
    assert.deepStrictEqual(ctx.options, ['families']);

    ctx.options = [];
    assert.deepStrictEqual(ctx.options, []);

    ctx.options = ['types'];
    assert.deepStrictEqual(ctx.options, ['types']);
  });

  it('keeps loop locals writable across iterations', () => {
    const ctx = mockContext({ props: {} });
    ctx._it = 'a';
    ctx._it = 'b';
    assert.strictEqual(ctx._it, 'b');
  });

});
