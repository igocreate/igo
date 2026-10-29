require('./init');

const assert = require('assert');

const { parseDuration } = require('../src/utils');


describe('utils', () => {

  describe('parseDuration', () => {

    it('should read a bare number as seconds', () => {
      assert.strictEqual(parseDuration('90', null), 90 * 1000);
      assert.strictEqual(parseDuration('0', null), 0);
    });

    it('should read units', () => {
      assert.strictEqual(parseDuration('30s', null), 30 * 1000);
      assert.strictEqual(parseDuration('15m', null), 15 * 60 * 1000);
      assert.strictEqual(parseDuration('12h', null), 12 * 60 * 60 * 1000);
      assert.strictEqual(parseDuration('31d', null), 31 * 24 * 60 * 60 * 1000);
    });

    it('should ignore surrounding spaces', () => {
      assert.strictEqual(parseDuration(' 1h ', null), 60 * 60 * 1000);
    });

    it('should return the fallback when unset', () => {
      assert.strictEqual(parseDuration(undefined, 42), 42);
      assert.strictEqual(parseDuration('', 42), 42);
      assert.strictEqual(parseDuration(null, null), null);
    });

    it('should throw when not understood', () => {
      for (const value of [ 'abc', '1h30', '1.5h', '-1h', '1H', '1 h', '1w', 'h' ]) {
        assert.throws(() => parseDuration(value, null), /Invalid duration/, value);
      }
    });

  });

});
