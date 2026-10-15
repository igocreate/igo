require('./init');

const assert  = require('assert');

const dbs     = require('@igojs/db').dbs;
const Model   = require('@igojs/db').Model;
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

  describe('transaction', () => {

    let db;
    before(() => {
      db = dbs.main;
    });

    class Book extends Model({
      table:   'books',
      columns: ['id', 'code', 'title', 'created_at']
    }) {}

    const countByCode  = code => Book.where({ code }).count();
    const createBookAs = code => Book.create({ code });

    // records the SQL and the connection of every statement sent to the driver
    const spyStatements = async (fn) => {
      const statements    = [];
      const originalQuery = db.driver.query;
      db.driver.query = (connection, sql, ...args) => {
        statements.push({ connection, sql });
        return originalQuery(connection, sql, ...args);
      };
      try {
        await fn();
      } finally {
        db.driver.query = originalQuery;
      }
      return statements;
    };

    it('should keep the writes and return what the callback returns', async () => {
      const book = await db.transaction(() => createBookAs('tx-commit'));
      assert.strictEqual(book.code, 'tx-commit');
      assert.strictEqual(await countByCode('tx-commit'), 1);
    });

    it('should roll back every write, raw or through a service, and rethrow', async () => {
      const failure = new Error('invoice rejected');
      await assert.rejects(db.transaction(async () => {
        await db.query('INSERT INTO books (code) VALUES (?)', ['tx-raw']);
        await createBookAs('tx-service');
        throw failure;
      }), failure);
      assert.strictEqual(await countByCode('tx-raw'), 0);
      assert.strictEqual(await countByCode('tx-service'), 0);
    });

    it('should roll back a nested transaction alone when its error is caught', async () => {
      await db.transaction(async () => {
        await createBookAs('tx-outer');
        await db.transaction(async () => {
          await createBookAs('tx-inner');
          throw new Error('inner');
        }).catch(() => {});
      });
      assert.strictEqual(await countByCode('tx-outer'), 1);
      assert.strictEqual(await countByCode('tx-inner'), 0);
    });

    it('should run sibling transactions one after the other on a shared connection', async () => {
      const failFirst = () => db.transaction(async () => {
        await createBookAs('tx-sibling-1');
        throw new Error('first');
      }).catch(() => {});
      const keepSecond = () => db.transaction(() => createBookAs('tx-sibling-2'));

      await Promise.all([failFirst(), keepSecond()]);
      await db.transaction(() => Promise.all([failFirst(), keepSecond()]));

      assert.strictEqual(await countByCode('tx-sibling-1'), 0);
      assert.strictEqual(await countByCode('tx-sibling-2'), 2);
    });

    it('should not let a nested transaction outlive its parent', async () => {
      let nested, transactionSeenLate;
      await db.transaction(async () => {
        nested = db.transaction(async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
          transactionSeenLate = db.currentTransaction();
        });
        await db.query('SELECT 1');
      });
      await assert.rejects(nested);
      assert.strictEqual(transactionSeenLate, null);
    });

    it('should send a query that starts after the end to the pool', async () => {
      let late, transactionSeenLate;
      await assert.rejects(db.transaction(async () => {
        late = new Promise(resolve => setTimeout(resolve, 20)).then(() => {
          transactionSeenLate = db.currentTransaction();
          return createBookAs('tx-late');
        });
        throw new Error('rollback');
      }));
      await late;
      assert.strictEqual(transactionSeenLate, null);
      assert.strictEqual(await countByCode('tx-late'), 1);
    });

    it('should become a savepoint inside the test transaction', async () => {
      const statements = await spyStatements(() => db.transaction(() => createBookAs('tx-savepoint')));
      assert.match(statements[0].sql, /^SAVEPOINT igo_sp_\d+$/);
      assert.match(statements.at(-1).sql, /^RELEASE SAVEPOINT igo_sp_\d+$/);
      assert.ok(statements.every(({ connection }) => connection === db.connection));
    });

    describe('outside the test transaction', () => {

      // these transactions really commit: what they write is deleted afterwards, on the pool too
      const outsideTestTransaction = async (fn) => {
        db.inTestTransaction = false;
        try {
          return await fn();
        } finally {
          db.inTestTransaction = true;
        }
      };

      afterEach(() => outsideTestTransaction(() => db.transaction(() => Book.where({ code: 'tx-pool' }).delete())));

      it('should commit on a connection of its own', async () => {
        const statements = await spyStatements(() => outsideTestTransaction(() => db.transaction(() => createBookAs('tx-pool'))));
        assert.ok(statements.length > 0);
        assert.ok(statements.every(({ connection }) => connection === statements[0].connection));
        assert.notStrictEqual(statements[0].connection, db.connection);
        assert.strictEqual(await countByCode('tx-pool'), 1);
      });

      it('should roll back on its own connection', async () => {
        await assert.rejects(outsideTestTransaction(() => db.transaction(async () => {
          await createBookAs('tx-pool');
          throw new Error('rollback');
        })));
        assert.strictEqual(await countByCode('tx-pool'), 0);
      });
    });
  });
});
