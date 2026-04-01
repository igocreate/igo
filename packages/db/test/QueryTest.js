
require('./init');

const assert    = require('assert');
const _         = require('lodash');

const Query     = require('@igojs/db').Query;
const Model     = require('@igojs/db').Model;
const PaginatedOptimizedQuery = require('@igojs/db').PaginatedOptimizedQuery;

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
      const original = PaginatedOptimizedQuery.prototype.executeOptimized;
      PaginatedOptimizedQuery.prototype.executeOptimized = async function() {
        optimizedCalled = true;
        return { pagination: {}, rows: [] };
      };

      try {
        await query.execute();
        assert.ok(optimizedCalled, 'executeOptimized should be called when page + joins are present');
      } finally {
        PaginatedOptimizedQuery.prototype.executeOptimized = original;
      }
    });

    it('should extract dot-path where conditions into filterJoins', async () => {
      const query = mockGetDb(new Query(Folder));
      query.where({ status: 'SUBMITTED', 'applicant.last_name': 'Dupont' });
      query.join('applicant');
      query.page(1, 25);

      let capturedQuery = null;
      const original = PaginatedOptimizedQuery.prototype.executeOptimized;
      PaginatedOptimizedQuery.prototype.executeOptimized = async function() {
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
        PaginatedOptimizedQuery.prototype.executeOptimized = original;
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
      const original = PaginatedOptimizedQuery.prototype.executeOptimized;
      PaginatedOptimizedQuery.prototype.executeOptimized = async function() {
        optimizedCalled = true;
        return { pagination: {}, rows: [] };
      };

      try {
        await query.execute();
        assert.ok(!optimizedCalled, 'executeOptimized should NOT be called without joins');
      } finally {
        PaginatedOptimizedQuery.prototype.executeOptimized = original;
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
      const original = PaginatedOptimizedQuery.prototype.executeOptimized;
      PaginatedOptimizedQuery.prototype.executeOptimized = async function() {
        optimizedCalled = true;
        return { pagination: {}, rows: [] };
      };

      try {
        await query.execute();
        assert.ok(!optimizedCalled, 'executeOptimized should NOT be called for delete');
      } finally {
        PaginatedOptimizedQuery.prototype.executeOptimized = original;
        Query.prototype.getDb = originalGetDb;
        Query.prototype.runQuery = originalRunQuery;
      }
    });
  });
});
