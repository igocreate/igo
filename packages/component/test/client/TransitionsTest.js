const assert = require('assert');
const Transitions = require('../../src/client/Transitions.js');

// Mock element — only the attribute reads the pure helpers touch. The rAF /
// transitionend orchestration needs a real browser and is verified manually.
function el(attrs = {}) {
  return {
    nodeType: 1,
    hasAttribute(n) { return n in attrs; },
    getAttribute(n) { return (n in attrs) ? attrs[n] : null; },
  };
}

describe('Transitions', () => {

  describe('hasTransition', () => {
    it('is true when any transition:* attribute is present', () => {
      assert.strictEqual(Transitions.hasTransition(el({ 'transition:leave-to': 'opacity-0' })), true);
    });
    it('is false with no transition attributes', () => {
      assert.strictEqual(Transitions.hasTransition(el({ class: 'drawer' })), false);
    });
    it('is false for non-elements', () => {
      assert.strictEqual(Transitions.hasTransition({ nodeType: 3 }), false);
      assert.strictEqual(Transitions.hasTransition(null), false);
    });
  });

  describe('readSpec', () => {
    it('parses each phase into a class list', () => {
      const spec = Transitions.readSpec(el({
        'transition:enter':      'transition duration-300',
        'transition:enter-from': '-translate-x-full',
        'transition:enter-to':   'translate-x-0',
        'transition:leave':      'transition duration-200',
        'transition:leave-to':   '-translate-x-full',
      }));
      assert.deepStrictEqual(spec.enter,     ['transition', 'duration-300']);
      assert.deepStrictEqual(spec.enterFrom, ['-translate-x-full']);
      assert.deepStrictEqual(spec.enterTo,   ['translate-x-0']);
      assert.deepStrictEqual(spec.leave,     ['transition', 'duration-200']);
      assert.deepStrictEqual(spec.leaveFrom, []);
      assert.deepStrictEqual(spec.leaveTo,   ['-translate-x-full']);
    });
    it('returns empty lists for missing phases', () => {
      const spec = Transitions.readSpec(el({}));
      assert.deepStrictEqual(spec.enter, []);
      assert.deepStrictEqual(spec.leaveTo, []);
    });
  });

  describe('preset', () => {
    it('resolves transition:preset into a spec', () => {
      Transitions.preset('fade', {
        enter: 'transition duration-200', enterFrom: 'opacity-0', enterTo: 'opacity-100',
        leave: 'transition duration-150', leaveTo: 'opacity-0',
      });
      const spec = Transitions.readSpec(el({ 'transition:preset': 'fade' }));
      assert.deepStrictEqual(spec.enter,   ['transition', 'duration-200']);
      assert.deepStrictEqual(spec.enterTo, ['opacity-100']);
      assert.deepStrictEqual(spec.leaveTo, ['opacity-0']);
      assert.deepStrictEqual(spec.leaveFrom, []);
    });

    it('lets explicit phase attributes override the preset', () => {
      Transitions.preset('fade', { enterFrom: 'opacity-0', enterTo: 'opacity-100' });
      const spec = Transitions.readSpec(el({
        'transition:preset': 'fade',
        'transition:enter-from': '-translate-x-full',
      }));
      assert.deepStrictEqual(spec.enterFrom, ['-translate-x-full']);  // overridden
      assert.deepStrictEqual(spec.enterTo,   ['opacity-100']);        // from preset
    });

    it('hasTransition is true for a preset-only element', () => {
      assert.strictEqual(Transitions.hasTransition(el({ 'transition:preset': 'fade' })), true);
    });

    it('unknown preset resolves to empty lists', () => {
      const spec = Transitions.readSpec(el({ 'transition:preset': 'nope' }));
      assert.deepStrictEqual(spec.enter, []);
      assert.deepStrictEqual(spec.enterFrom, []);
    });
  });

  describe('hasEnter / hasLeave', () => {
    it('detect declared phases', () => {
      const spec = Transitions.readSpec(el({ 'transition:enter-from': 'opacity-0' }));
      assert.ok(Transitions.hasEnter(spec));
      assert.ok(!Transitions.hasLeave(spec));
    });
  });

  describe('leave', () => {
    it('returns false (does not take ownership) with no transition attrs', () => {
      let removed = false;
      const handled = Transitions.leave(el({ class: 'x' }), () => { removed = true; });
      assert.strictEqual(handled, false);
      assert.strictEqual(removed, false);
    });
    it('returns false when only an enter transition is declared', () => {
      const handled = Transitions.leave(el({ 'transition:enter-from': 'opacity-0' }), () => {});
      assert.strictEqual(handled, false);
    });
  });

  describe('cancelLeave', () => {
    it('returns false when no leave is in flight', () => {
      assert.strictEqual(Transitions.cancelLeave(el({})), false);
      assert.strictEqual(Transitions.cancelLeave(null), false);
    });
    it('invokes and clears the stashed canceller', () => {
      let called = 0;
      const node = { __igoCancelLeave() { called++; delete this.__igoCancelLeave; } };
      assert.strictEqual(Transitions.cancelLeave(node), true);
      assert.strictEqual(called, 1);
      assert.strictEqual(Transitions.cancelLeave(node), false);  // gone after firing
    });
  });

});
