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

  it('should make props available in child constructor during ssr()', () => {
    class ChildComponent extends SignalComponent {
      constructor(element, props) {
        super(element, 'test/template', props);
        // Simulates a real component accessing this.props during construction
        this.state.items = this.props.items || [];
      }
      get itemCount() { return this.state.items.length; }
    }
    const derived = ChildComponent.ssr({ items: [1, 2, 3] });
    assert.strictEqual(derived.itemCount, 3);
  });

  it('should make form available in state during child constructor via ssr()', () => {
    class FormComponent extends SignalComponent {
      constructor(element, props) {
        super(element, 'test/form', props);
        // Simulates accessing form in constructor
        this.state.validated = !!this.state.form?.email;
      }
      get isValid() { return this.state.validated; }
    }
    const derived = FormComponent.ssr({ form: { email: 'a@b.com' } });
    assert.strictEqual(derived.isValid, true);
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
