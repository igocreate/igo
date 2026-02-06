import assert from 'assert';
import SerializeUtils from '../../src/server/SerializeUtils.js';

describe('SerializeUtils', () => {

  it('should handle primitives and null', () => {
    assert.strictEqual(SerializeUtils.serialize(null), null);
    assert.strictEqual(SerializeUtils.serialize('hello'), 'hello');
    assert.strictEqual(SerializeUtils.serialize(42), 42);
  });

  it('should handle nested objects and arrays', () => {
    const data = { users: [{ id: 1, name: 'John' }] };
    const result = SerializeUtils.serialize(data);
    assert.deepStrictEqual(result, data);
  });

  it('should call serialize() on Model-like objects', () => {
    const model = {
      id: 1,
      _private: 'hidden',
      serialize() { return { id: this.id }; }
    };
    const result = SerializeUtils.serialize(model);
    assert.deepStrictEqual(result, { id: 1 });
  });

  it('should deduplicate same object references', () => {
    const user = { id: 1, serialize() { return { id: this.id }; } };
    const data = { author: user, reviewer: user };
    const result = SerializeUtils.serialize(data);
    assert.strictEqual(result.author, result.reviewer);
  });

});
