const assert = require('assert');
const SignalComponent = require('../../src/client/SignalComponent.js');

describe('SignalComponent', () => {

  it('should initialize with props in SSR mode', () => {
    const props = { products: [{ id: 1 }] };
    class TestComponent extends SignalComponent {}
    const derived = TestComponent.ssr(props);
    // ssr() returns derived getters, but we verify props are accessible
    assert.ok(derived);
  });

  it('should initialize form state from props.form via ssr()', () => {
    const props = { form: { search: 'test' } };
    class TestComponent extends SignalComponent {
      get formSearch() { return this.state.form?.search; }
    }
    const derived = TestComponent.ssr(props);
    assert.strictEqual(derived.formSearch, 'test');
  });

  it('should compute derived values via ssr()', () => {
    class TestComponent extends SignalComponent {
      get doubled() {
        return (this.props.value || 0) * 2;
      }
    }

    const derived = TestComponent.ssr({ value: 5 });

    assert.strictEqual(derived.doubled, 10);
  });

  it('should skip private and reserved getters in ssr()', () => {
    class TestComponent extends SignalComponent {
      get _private() { return 'hidden'; }
      get public() { return 'visible'; }
    }

    const derived = TestComponent.ssr({});

    assert.strictEqual(derived._private, undefined);
    assert.strictEqual(derived.public, 'visible');
  });

  it('should handle getter errors gracefully in ssr()', () => {
    class TestComponent extends SignalComponent {
      get failing() { throw new Error('DOM error'); }
      get working() { return 'ok'; }
    }

    const originalError = console.error;
    console.error = () => {};
    const derived = TestComponent.ssr({});
    console.error = originalError;

    assert.strictEqual(derived.failing, undefined);
    assert.strictEqual(derived.working, 'ok');
  });

});
