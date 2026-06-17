
require('./init');

const assert    = require('assert');
const _         = require('lodash');

const Query     = require('@igojs/db').Query;
const Model     = require('@igojs/db').Model;
const PaginatedOptimized = require('../src/executors/PaginatedOptimized');

const mockGetDb = (query) => {
  query.getDb = () => ({
    driver: {
      dialect: {
        esc: '`',
        param: () => '?',
        in: 'IN',
        notin: 'NOT IN',
        limit: () => 'LIMIT ?, ?'
      }
    }
  });
  return query;
};

//
describe('db.Query', function() {

  class Applicant extends Model({
    table: 'applicants',
    primary: ['id'],
    columns: { id: 'integer', last_name: 'string' }
  }) {}

  class Folder extends Model({
    table: 'folders',
    primary: ['id'],
    columns: { id: 'integer', status: 'string', applicant_id: 'integer' },
    associations: [
      ['belongs_to', 'applicant', Applicant, 'applicant_id', 'id']
    ]
  }) {}

  //
  describe('first', function() {
    it('should return correct SQL', function() {
      const query = mockGetDb(new Query(Folder));
      query.query.verb = 'select';
      query.query.take = 'first';
      query.query.limit = 1;
      // Simuler applyScopes + order par défaut
      query.query.order.push('`folders`.`id` ASC');
      const { sql } = query.toSQL();
      assert.strictEqual(sql, 'SELECT `folders`.* FROM `folders` ORDER BY `folders`.`id` ASC LIMIT ?, ?');
    });
  });

  //
  describe('auto-activation of optimized mode', function() {

    it('should activate optimized mode when page + joins are present', async () => {
      const query = mockGetDb(new Query(Folder));
      query.where({ status: 'SUBMITTED' });
      query.join('applicant');
      query.page(1, 25);

      let optimizedCalled = false;
      const original = PaginatedOptimized.prototype.run;
      PaginatedOptimized.prototype.run = async function() {
        optimizedCalled = true;
        return { pagination: {}, rows: [] };
      };

      try {
        await query.execute();
        assert.ok(optimizedCalled, 'run should be called when page + joins are present');
      } finally {
        PaginatedOptimized.prototype.run = original;
      }
    });

    it('should extract dot-path where conditions into filterJoins', async () => {
      const query = mockGetDb(new Query(Folder));
      query.where({ status: 'SUBMITTED', 'applicant.last_name': 'Dupont' });
      query.join('applicant');
      query.page(1, 25);

      let capturedQuery = null;
      const original = PaginatedOptimized.prototype.run;
      PaginatedOptimized.prototype.run = async function() {
        capturedQuery = this.query;
        return { pagination: {}, rows: [] };
      };

      try {
        await query.execute();
        // Dot-path should be extracted to filterJoins, not left in where
        assert.ok(capturedQuery.filterJoins.length > 0, 'dot-path conditions should be in filterJoins');
        // Main table condition should still be in where
        const whereHasDotPath = capturedQuery.where.some(w =>
          _.isPlainObject(w) && Object.keys(w).some(k => k.includes('.'))
        );
        assert.ok(!whereHasDotPath, 'dot-path conditions should NOT remain in where');
      } finally {
        PaginatedOptimized.prototype.run = original;
      }
    });

    it('should NOT activate optimized mode when page without joins', async () => {
      const query = new Query(Folder);

      const originalGetDb = Query.prototype.getDb;
      const originalRunQuery = Query.prototype.runQuery;
      Query.prototype.getDb = () => ({ driver: { dialect: { esc: '`', param: () => '?', in: 'IN', notin: 'NOT IN', limit: () => 'LIMIT ?, ?' } } });
      Query.prototype.runQuery = async () => [{ count: 0 }];

      query.where({ status: 'SUBMITTED' });
      query.page(1, 25);

      let optimizedCalled = false;
      const original = PaginatedOptimized.prototype.run;
      PaginatedOptimized.prototype.run = async function() {
        optimizedCalled = true;
        return { pagination: {}, rows: [] };
      };

      try {
        await query.execute();
        assert.ok(!optimizedCalled, 'run should NOT be called without joins');
      } finally {
        PaginatedOptimized.prototype.run = original;
        Query.prototype.getDb = originalGetDb;
        Query.prototype.runQuery = originalRunQuery;
      }
    });

    it('should NOT activate optimized mode for non-select verbs', async () => {
      const query = new Query(Folder);
      query.query.verb = 'delete';
      query.where({ status: 'SUBMITTED' });
      query.join('applicant');
      query.query.page = 1;

      const originalGetDb = Query.prototype.getDb;
      const originalRunQuery = Query.prototype.runQuery;
      Query.prototype.getDb = () => ({ driver: { dialect: { esc: '`', param: () => '?', in: 'IN', notin: 'NOT IN', limit: () => 'LIMIT ?, ?' } } });
      Query.prototype.runQuery = async () => [];

      let optimizedCalled = false;
      const original = PaginatedOptimized.prototype.run;
      PaginatedOptimized.prototype.run = async function() {
        optimizedCalled = true;
        return { pagination: {}, rows: [] };
      };

      try {
        await query.execute();
        assert.ok(!optimizedCalled, 'run should NOT be called for delete');
      } finally {
        PaginatedOptimized.prototype.run = original;
        Query.prototype.getDb = originalGetDb;
        Query.prototype.runQuery = originalRunQuery;
      }
    });
  });

  describe('order/group/distinct/from validation', function() {

    it('should accept identifier order clauses', function() {
      const query = new Query(Folder).order('status DESC').order('`folders`.`id` ASC').order('applicant.last_name');
      assert.strictEqual(query.query.order.length, 3);
    });

    it('should reject SQL expressions in order()', function() {
      assert.throws(() => new Query(Folder).order('id; DROP TABLE folders'), /Invalid order/);
      assert.throws(() => new Query(Folder).order('COALESCE(a, b) ASC'), /Invalid order/);
      assert.throws(() => new Query(Folder).order('(SELECT 1)'), /Invalid order/);
    });

    it('should accept SQL expressions via orderRaw()', function() {
      const query = new Query(Folder).orderRaw('COALESCE(a, b) ASC');
      assert.strictEqual(query.query.order.length, 1);
    });

    it('should reject invalid group/distinct/from clauses', function() {
      assert.throws(() => new Query(Folder).group('a; --'), /Invalid group/);
      assert.throws(() => new Query(Folder).distinct('a`b'), /Invalid distinct/);
      assert.throws(() => new Query(Folder).from('folders; DROP TABLE folders'), /Invalid from/);
    });

    it('should accept comma lists, multiple args and arrays in order()', function() {
      assert.strictEqual(new Query(Folder).order('first_name, last_name').query.order.length, 2);
      assert.strictEqual(new Query(Folder).order('first_name', 'last_name DESC').query.order.length, 2);
      assert.strictEqual(new Query(Folder).order(['first_name', 'last_name']).query.order.length, 2);
      assert.deepStrictEqual(new Query(Folder).order('`created_at` DESC', 'id').query.order, ['`created_at` DESC', 'id']);
    });

    it('should accept comma lists, multiple args and arrays in group()', function() {
      assert.deepStrictEqual(new Query(Folder).group('status, kind').query.group, ['status', 'kind']);
      assert.deepStrictEqual(new Query(Folder).group('status', 'folders.kind').query.group, ['status', 'folders.kind']);
      assert.deepStrictEqual(new Query(Folder).group(['status', 'kind']).query.group, ['status', 'kind']);
    });

    it('should accept comma lists, multiple args and arrays in distinct()', function() {
      assert.deepStrictEqual(new Query(Folder).distinct('status, kind').query.distinct, ['status', 'kind']);
      assert.deepStrictEqual(new Query(Folder).distinct('status', 'kind').query.distinct, ['status', 'kind']);
      assert.deepStrictEqual(new Query(Folder).distinct(['status', 'kind']).query.distinct, ['status', 'kind']);
      assert.deepStrictEqual(new Query(Folder).distinct('folders.status').query.distinct, ['folders.status']);
    });

    it('should reject SQL injection in group()/distinct() comma lists', function() {
      assert.throws(() => new Query(Folder).group('id, (SELECT 1)'), /Invalid group/);
      assert.throws(() => new Query(Folder).group('id, name; DROP TABLE folders'), /Invalid group/);
      assert.throws(() => new Query(Folder).distinct('id, (SELECT password FROM users)'), /Invalid distinct/);
      assert.throws(() => new Query(Folder).distinct('id) UNION SELECT 1--'), /Invalid distinct/);
    });
  });

  describe('_checkOptimizedCompatibility', function() {

    it('should fall back when $or mixes main and joined tables', function() {
      const query = mockGetDb(new Query(Folder).join('applicant')
      .where({ $or: [{ status: 'A' }, { 'applicant.last_name': 'X' }] }));
      assert.strictEqual(query._checkOptimizedCompatibility(), false);
    });

    it('should fall back when a $or branch mixes main and joined keys', function() {
      const query = mockGetDb(new Query(Folder).join('applicant')
      .where({ $or: [{ status: 'A', 'applicant.last_name': 'X' }, { 'applicant.last_name': 'Y' }] }));
      assert.strictEqual(query._checkOptimizedCompatibility(), false);
    });

    it('should stay optimized for a $or on the main table only', function() {
      const query = mockGetDb(new Query(Folder).join('applicant')
      .where({ $or: [{ status: 'A' }, { status: 'B' }] }));
      assert.strictEqual(query._checkOptimizedCompatibility(), true);
    });

    it('should detect raw where on join aliases even without quoting', function() {
      const query = mockGetDb(new Query(Folder).join('applicant').where('applicant.last_name = 1'));
      assert.strictEqual(query._checkOptimizedCompatibility(), false);
    });
  });

  describe('pagination', function() {

    const withMockedQueries = async (fn) => {
      const originalGetDb    = Query.prototype.getDb;
      const originalRunQuery = Query.prototype.runQuery;
      Query.prototype.getDb = () => ({ driver: { dialect: { esc: '`', param: () => '?', in: 'IN', notin: 'NOT IN', limit: () => 'LIMIT ?, ?' } } });
      try {
        await fn();
      } finally {
        Query.prototype.getDb    = originalGetDb;
        Query.prototype.runQuery = originalRunQuery;
      }
    };

    it('should run COUNT and SELECT in parallel for an in-range page', async function() {
      await withMockedQueries(async () => {
        const offsets = [];
        Query.prototype.runQuery = async function() {
          if (this.query.verb === 'count') {
            return [{ count: 12 }];
          }
          offsets.push(this.query.offset);
          return [];
        };

        const result = await new Query(Folder).where({ status: 'A' }).page(2, 10).execute();
        assert.deepStrictEqual(offsets, [10], 'SELECT should run once with the requested offset');
        assert.strictEqual(result.pagination.page, 2);
        assert.strictEqual(result.pagination.count, 12);
        assert.strictEqual(result.pagination.nb_pages, 2);
      });
    });

    it('should clamp out-of-range pages and re-run the SELECT', async function() {
      await withMockedQueries(async () => {
        const offsets = [];
        Query.prototype.runQuery = async function() {
          if (this.query.verb === 'count') {
            return [{ count: 12 }];
          }
          offsets.push(this.query.offset);
          return [];
        };

        const result = await new Query(Folder).where({ status: 'A' }).page(5, 10).execute();
        assert.deepStrictEqual(offsets, [40, 10], 'SELECT should re-run with the clamped offset');
        assert.strictEqual(result.pagination.page, 2);
        assert.strictEqual(result.pagination.nb_pages, 2);
        assert.strictEqual(result.pagination.start, 11);
        assert.strictEqual(result.pagination.end, 12);
      });
    });

    it('should clamp to page 1 when there are no results', async function() {
      await withMockedQueries(async () => {
        Query.prototype.runQuery = async function() {
          return this.query.verb === 'count' ? [{ count: 0 }] : [];
        };

        const result = await new Query(Folder).where({ status: 'A' }).page(3, 10).execute();
        assert.strictEqual(result.pagination.page, 1);
        assert.strictEqual(result.pagination.count, 0);
        assert.deepStrictEqual(result.rows, []);
      });
    });
  });
});
