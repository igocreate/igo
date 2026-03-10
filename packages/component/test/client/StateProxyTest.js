const assert = require('assert');
const StateProxy = require('../../src/client/StateProxy.js');

describe('StateProxy', () => {

  function createMockComponent() {
    return {
      _isTracking: false,
      _trackedDeps: [],
      _isInitialized: true,
      _renderCount: 0,
      _triggerRender() { this._renderCount++; }
    };
  }

  it('should trigger render on property change', () => {
    const component = createMockComponent();
    const state = new StateProxy(component, 'state').create({ count: 0 });

    state.count = 5;

    assert.strictEqual(state.count, 5);
    assert.strictEqual(component._renderCount, 1);
  });

  it('should handle nested objects', () => {
    const component = createMockComponent();
    const state = new StateProxy(component, 'state').create({
      user: { name: 'John' }
    });

    state.user.name = 'Jane';

    assert.strictEqual(state.user.name, 'Jane');
    assert.strictEqual(component._renderCount, 1);
  });

  it('should trigger render on array methods', () => {
    const component = createMockComponent();
    const state = new StateProxy(component, 'state').create({ items: [] });

    state.items.push({ id: 1 });

    assert.strictEqual(state.items.length, 1);
    assert.strictEqual(component._renderCount, 1);
  });

  it('should track dependencies when tracking is enabled', () => {
    const component = createMockComponent();
    const state = new StateProxy(component, 'state').create({ count: 0 });

    component._isTracking = true;
    const _ = state.count;
    component._isTracking = false;

    assert.deepStrictEqual(component._trackedDeps[0], ['state', 'count']);
  });

});
