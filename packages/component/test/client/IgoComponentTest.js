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

  it('does not throw when the binding points to a missing parent method', () => {
    const parent = { template: 'Form' };
    const child = mockChild({
      attributes: [{ name: 'data-emit-change', value: 'nope' }],
      parent,
    });
    assert.doesNotThrow(() => child.emit('change'));
  });

});
