const assert = require('assert');
const SignalComponent = require('../../src/client/SignalComponent');

describe('SignalComponent', () => {

  it('should initialize with props in SSR mode', () => {
    const props = { products: [{ id: 1 }] };
    const component = new SignalComponent(null, 'test', props);

    assert.deepStrictEqual(component.props, props);
  });

  it('should initialize form state from props.form', () => {
    const props = { form: { search: 'test' } };
    const component = new SignalComponent(null, 'test', props);

    assert.deepStrictEqual(component._state.form, props.form);
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
