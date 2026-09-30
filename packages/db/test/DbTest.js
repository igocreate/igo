require('./init');

const assert  = require('assert');

const dbs     = require('@igojs/db').dbs;
const logger  = require('@igojs/server').logger;

describe('db.Db', () => {

  describe('query in test mode', () => {

    it('should not run queries in parallel on the shared connection', async () => {
      const db            = dbs.main;
      const originalQuery = db.driver.query;
      let running         = 0;
      let maxRunning      = 0;

      db.driver.query = async (...args) => {
        running++;
        maxRunning = Math.max(maxRunning, running);
        try {
          return await originalQuery(...args);
        } finally {
          running--;
        }
      };

      try {
        const results = await Promise.all([1, 2, 3, 4].map(i => db.query(`SELECT ${i} AS n`)));
        assert.deepStrictEqual(results.map(rows => Number(rows[0].n)), [1, 2, 3, 4]);
      } finally {
        db.driver.query = originalQuery;
      }

      assert.strictEqual(maxRunning, 1);
    });

    it('should run the next query when the previous one fails', async () => {
      const db = dbs.main;
      const [failed, succeeded] = await Promise.allSettled([
        db.query('SELECT * FROM unknown_table'),
        db.query('SELECT 1 AS n')
      ]);
      assert.strictEqual(failed.status, 'rejected');
      assert.strictEqual(Number(succeeded.value[0].n), 1);
    });
  });

  describe('a failed query', () => {

    it('should carry the statement it failed on, and log nothing itself', async () => {
      const lines = [];
      const { error, info } = logger;
      logger.error = logger.info = (...args) => lines.push(args);
      let err;
      try {
        await dbs.main.query('SELECT * FROM unknown_table WHERE id = ?', [42]);
      } catch (e) {
        err = e;
      } finally {
        Object.assign(logger, { error, info });
      }
      assert.deepStrictEqual(err.statement, { sql: 'SELECT * FROM unknown_table WHERE id = ?', params: [42] });
      assert.strictEqual(err.code, 'ER_NO_SUCH_TABLE');
      assert.deepStrictEqual(lines, []);
    });
  });
});
