

require('../src/dev/test/init');


const assert    = require('assert');
const _         = require('lodash');

const cache     = require('../src/cache');

describe('igo.cache', () => {

  describe('cache.get', () => {
    it('should return undefined if key is not found', (done) => {
      cache.get('nsx', 0, (err, value) => {
        assert(value === undefined);
        done();
      });
    });
  });

  describe('cache.put', () => {

    it('should store string values', (done) => {
      cache.put('ns', 0, 'hello', () => {
        cache.get('ns', 0, (err, value) => {
          assert(value === 'hello');
          done();
        });
      });
    });

    it('should store null values', (done) => {
      cache.put('ns', 0, null, () => {
        cache.get('ns', 0, (err, value) => {
          assert(value === null);
          done();
        });
      })
    });

    it('should store dates', (done) => {
      cache.put('ns', 0, new Date(), () => {
        cache.get('ns', 0, (err, value) => {
          assert(value !== null);
          assert(_.isDate(value));
          done();
        });
      })
    });

    it('should store objects with dates', (done) => {
      cache.put('ns', 0, { t0: new Date() }, () => {
        cache.get('ns', 0, (err, value) => {
          assert(value !== null);
          assert(_.isDate(value.t0));
          done();
        });
      })
    });

    it('should store buffers', (done) => {
      const buffer = Buffer.from('hello world', 'utf8');
      cache.put('ns', 0, buffer, () => {
        cache.get('ns', 0, (err, value) => {
          assert(value !== null);
          assert(_.isBuffer(value));
          assert.strictEqual(buffer.toString(), value.toString());
          done();
        });
      })
    });
  });

  describe('cache.scan', () => {
    it('should scan for keys', (done) => {
      cache.put('scantest', 122, 'hello', () => {
        const keys = [];
        cache.scan('scantest/*', (key, callback) => {
          keys.push(key);
          callback();
        });
        setTimeout(() => {
          assert.strictEqual(keys.length, 1);
          assert.strictEqual(keys[0], 'scantest/122');
          done();
        }, 100);
      })
    });
  });
});
