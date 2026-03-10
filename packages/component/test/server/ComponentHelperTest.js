const assert = require('assert');
const { evalDefinition, computeDerived } = require('../../src/server/ComponentHelper');

describe('ComponentHelper', () => {

  describe('evalDefinition', () => {

    it('should evaluate a bare object', () => {
      const def = evalDefinition(`{
        props: { count: 0 },
        state: { loading: false },
        increment() { this.state.count++; }
      }`);

      assert.deepStrictEqual(def.props, { count: 0 });
      assert.deepStrictEqual(def.state, { loading: false });
      assert.strictEqual(typeof def.increment, 'function');
    });

    it('should evaluate getters', () => {
      const def = evalDefinition(`{
        props: { items: [] },
        get count() { return this.props.items.length; }
      }`);

      assert.deepStrictEqual(def.props, { items: [] });
      const desc = Object.getOwnPropertyDescriptor(def, 'count');
      assert.ok(desc.get);
    });

    it('should handle empty definition', () => {
      const def = evalDefinition('{}');
      assert.deepStrictEqual(def, {});
    });

  });

  describe('computeDerived', () => {

    it('should compute derived values from getters', () => {
      const def = evalDefinition(`{
        get doubled() { return this.props.value * 2; }
      }`);

      const derived = computeDerived(def, { value: 5 }, {});
      assert.strictEqual(derived.doubled, 10);
    });

    it('should provide access to state in getters', () => {
      const def = evalDefinition(`{
        get total() { return this.props.price + this.state.tax; }
      }`);

      const derived = computeDerived(def, { price: 100 }, { tax: 20 });
      assert.strictEqual(derived.total, 120);
    });

    it('should skip non-getter properties', () => {
      const def = evalDefinition(`{
        props: { x: 1 },
        state: { y: 2 },
        doSomething() { return 42; }
      }`);

      const derived = computeDerived(def, { x: 1 }, { y: 2 });
      assert.strictEqual(derived.props, undefined);
      assert.strictEqual(derived.state, undefined);
      assert.strictEqual(derived.doSomething, undefined);
    });

    it('should handle getter errors gracefully', () => {
      const def = evalDefinition(`{
        get failing() { throw new Error('DOM error'); },
        get working() { return 'ok'; }
      }`);

      const originalError = console.error;
      console.error = () => {};
      const derived = computeDerived(def, {}, {});
      console.error = originalError;

      assert.strictEqual(derived.failing, undefined);
      assert.strictEqual(derived.working, 'ok');
    });

  });

});
