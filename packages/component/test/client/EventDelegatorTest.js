const assert = require('assert');
const EventDelegator = require('../../src/client/EventDelegator.js');

// ---------------------------------------------------------------------------
// Minimal DOM mock — just enough for EventDelegator's dispatch logic:
// closest/matches/hasAttribute/getAttribute/parentNode/nodeType. No real events;
// we call `_dispatch` directly with a `{ target }` to exercise resolution.
// ---------------------------------------------------------------------------
function matchSel(node, sel) {
  let m;
  if ((m = sel.match(/^\[([\w-]+)="([^"]*)"\]$/))) return node.attrs[m[1]] === m[2];
  if ((m = sel.match(/^\[([\w-]+)\]$/)))            return m[1] in node.attrs;
  if ((m = sel.match(/^\.(.+)$/)))                  return (node.attrs.class || '').split(/\s+/).includes(m[1]);
  return node.tagName === sel.toUpperCase();
}

function el(tag, attrs = {}, parent = null) {
  const node = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    attrs,
    parentNode: parent,
    hasAttribute(n) { return n in this.attrs; },
    getAttribute(n) { return this.attrs[n]; },
    matches(sel) { return matchSel(this, sel); },
    closest(sel) {
      let n = this;
      while (n) {
        if (matchSel(n, sel)) return n;
        n = n.parentNode;
      }
      return null;
    },
    addEventListener() {},
    removeEventListener() {},
  };
  return node;
}

describe('EventDelegator', () => {

  // root (data-component)
  //   btn       (data-on-click="onAdd")
  //   childRoot (data-component)
  //     childBtn (data-on-click="onChild")   ← child-owned
  function buildTree() {
    const root      = el('div', { 'data-component': 'Form' });
    const btn       = el('button', { 'data-on-click': 'onAdd', class: 'add' }, root);
    const childRoot = el('div', { 'data-component': 'Child' }, root);
    const childBtn  = el('button', { 'data-on-click': 'onChild' }, childRoot);
    return { root, btn, childRoot, childBtn };
  }

  function makeDelegator(root, calls) {
    const component = {
      template: 'Form',
      onAdd()   { calls.push('onAdd'); },
      onOuter() { calls.push('onOuter'); },
    };
    return new EventDelegator(root, component);
  }

  it('invokes the owned element method on dispatch', () => {
    const { root, btn } = buildTree();
    const calls = [];
    const d = makeDelegator(root, calls);

    d._dispatch('click', { target: btn });

    assert.deepStrictEqual(calls, ['onAdd']);
  });

  it('sets event.currentTarget to the matched element (not the root)', () => {
    const { root, btn } = buildTree();
    let seen = null;
    const component = { template: 'Form', onAdd(e) { seen = e.currentTarget; } };
    const d = new EventDelegator(root, component);

    d._dispatch('click', { target: btn });

    assert.strictEqual(seen, btn);
  });

  it('does not fire a handler owned by a child component', () => {
    const { root, childBtn } = buildTree();
    const calls = [];
    const d = makeDelegator(root, calls);

    d._dispatch('click', { target: childBtn });

    assert.deepStrictEqual(calls, []);
  });

  it('fires an owned ancestor when the event bubbles from inside a child', () => {
    // root > wrapper(data-on-click=onOuter) > childRoot(data-component) > childBtn
    const root      = el('div', { 'data-component': 'Form' });
    const wrapper   = el('div', { 'data-on-click': 'onOuter' }, root);
    const childRoot = el('div', { 'data-component': 'Child' }, wrapper);
    const childBtn  = el('button', { 'data-on-click': 'onChild' }, childRoot);
    const calls = [];
    const d = makeDelegator(root, calls);

    d._dispatch('click', { target: childBtn });

    // childBtn + childRoot are child-owned (skipped); wrapper is ours → fires.
    assert.deepStrictEqual(calls, ['onOuter']);
  });

  it('stops the walk when a handler calls stopPropagation()', () => {
    // root > wrapper(onOuter) > btn(onStop)
    const root    = el('div', { 'data-component': 'Form' });
    const wrapper = el('div', { 'data-on-click': 'onOuter' }, root);
    const btn     = el('button', { 'data-on-click': 'onStop' }, wrapper);
    const calls = [];
    const component = {
      template: 'Form',
      onStop(e)  { calls.push('onStop'); e.stopPropagation(); },
      onOuter()  { calls.push('onOuter'); },
    };
    const d = new EventDelegator(root, component);

    d._dispatch('click', { target: btn, cancelBubble: false, stopPropagation() { this.cancelBubble = true; } });

    assert.deepStrictEqual(calls, ['onStop']);
  });

  it('warns (does not throw) when the method is missing', () => {
    const root = el('div', { 'data-component': 'Form' });
    const btn  = el('button', { 'data-on-click': 'nope' }, root);
    const d    = new EventDelegator(root, { template: 'Form' });

    const original = console.warn;
    const warnings = [];
    console.warn = (msg) => warnings.push(msg);
    try {
      assert.doesNotThrow(() => d._dispatch('click', { target: btn }));
    } finally {
      console.warn = original;
    }
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /not found on component/);
  });

  it('dispatches manual selector-based events to owned matches', () => {
    const root = el('div', { 'data-component': 'Form' });
    const link = el('a', { class: 'tab' }, root);
    const calls = [];
    const d = new EventDelegator(root, { template: 'Form' });
    d._events = [{ selector: '.tab', eventType: 'click', handler() { calls.push('manual'); } }];

    d._dispatch('click', { target: link });

    assert.deepStrictEqual(calls, ['manual']);
  });

});
