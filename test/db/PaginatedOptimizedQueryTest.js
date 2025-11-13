// Tests unitaires sans dépendance sur la base de données
// On teste uniquement la génération SQL, pas l'exécution

const assert = require('assert');

const PaginatedOptimizedQuery = require('../../src/db/PaginatedOptimizedQuery');
const Model = require('../../src/db/Model');

// Helper pour mocker getDb
const mockGetDb = (query) => {
  query.getDb = () => ({
    driver: {
      dialect: {
        esc: '`',
        param: (i) => '?',
        in: 'IN',
        notin: 'NOT IN',
        limit: (offsetParam, limitParam) => `LIMIT ?, ?`
      }
    }
  });
  return query;
};

//
describe('db.PaginatedOptimizedQuery', function() {

  // Définition des modèles de test
  class Folder extends Model({
    table: 'folders',
    primary: ['id'],
    columns: {
      id: 'integer',
      type: 'string',
      status: 'string',
      applicant_id: 'integer',
      pme_folder_id: 'integer',
      created_at: 'datetime'
    },
    associations: [
      ['belongs_to', 'applicant', null, 'applicant_id', 'id'],
      ['belongs_to', 'pme_folder', null, 'pme_folder_id', 'id']
    ]
  }) {}

  class Applicant extends Model({
    table: 'applicants',
    primary: ['id'],
    columns: {
      id: 'integer',
      first_name: 'string',
      last_name: 'string',
      email: 'string'
    }
  }) {}

  class PmeFolder extends Model({
    table: 'pme_folders',
    primary: ['id'],
    columns: {
      id: 'integer',
      status: 'string',
      company_name: 'string'
    }
  }) {}

  // Mettre à jour les associations avec les vrais modèles
  Folder.schema.associations[0][2] = Applicant;
  Folder.schema.associations[1][2] = PmeFolder;

  //
  describe('filterJoin', function() {
    it('should add filterJoin to query', () => {
      const query = new PaginatedOptimizedQuery(Folder);
      query.filterJoin('applicant', { last_name: 'Dupont%' });

      assert.strictEqual(query.query.filterJoins.length, 1);
      assert.strictEqual(query.query.filterJoins[0].association[1], 'applicant');
      assert.deepStrictEqual(query.query.filterJoins[0].conditions, { last_name: 'Dupont%' });
    });

    it('should support multiple filterJoins', () => {
      const query = new PaginatedOptimizedQuery(Folder);
      query
        .filterJoin('applicant', { last_name: 'Dupont%' })
        .filterJoin('pme_folder', { status: 'ACTIVE' });

      assert.strictEqual(query.query.filterJoins.length, 2);
    });
  });

  //
  describe('countSQL with EXISTS', function() {
    it('should generate COUNT SQL with EXISTS for filterJoins', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count'; // Important: définir le verb
      query
        .where({ type: ['agp', 'avt'] })
        .filterJoin('applicant', { last_name: 'Dupont%' });

      const sql = query.toSQL();
      // console.log('SQL:', sql.sql); // Debug

      // Vérifier que le SQL contient EXISTS
      assert.ok(sql.sql.includes('EXISTS'), 'SQL should contain EXISTS');
      assert.ok(sql.sql.includes('SELECT 1 FROM'), 'SQL should contain SELECT 1 FROM');
      assert.ok(sql.sql.includes('applicants'), 'SQL should reference applicants table');
      assert.ok(sql.sql.includes('COUNT(0)'), 'SQL should contain COUNT(0)');

      // Vérifier qu'il n'y a pas de LEFT JOIN
      assert.ok(!sql.sql.includes('LEFT JOIN'), 'SQL should not contain LEFT JOIN');
    });

    it('should generate COUNT SQL with multiple EXISTS', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query
        .where({ type: 'agp' })
        .filterJoin('applicant', { last_name: 'Dupont%' })
        .filterJoin('pme_folder', { status: 'ACTIVE' });

      const sql = query.toSQL();

      // Vérifier qu'il y a 2 EXISTS
      const existsCount = (sql.sql.match(/EXISTS/g) || []).length;
      assert.strictEqual(existsCount, 2, 'SQL should contain 2 EXISTS clauses');

      // Vérifier les tables
      assert.ok(sql.sql.includes('applicants'), 'SQL should reference applicants');
      assert.ok(sql.sql.includes('pme_folders'), 'SQL should reference pme_folders');
    });
  });

  //
  describe('idsSQL', function() {
    it('should generate SELECT IDs SQL with EXISTS', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'agp' })
        .filterJoin('applicant', { last_name: 'Dupont%' })
        .order('folders.created_at DESC')
        .limit(50);

      const sql = query.toSQL();

      // Vérifier la structure
      assert.ok(sql.sql.includes('SELECT'), 'SQL should contain SELECT');
      assert.ok(sql.sql.includes('`folders`.`id`'), 'SQL should select folders.id');
      assert.ok(sql.sql.includes('EXISTS'), 'SQL should contain EXISTS');
      assert.ok(sql.sql.includes('ORDER BY'), 'SQL should contain ORDER BY');
      assert.ok(sql.sql.includes('LIMIT'), 'SQL should contain LIMIT');

      // Pas de LEFT JOIN
      assert.ok(!sql.sql.includes('LEFT JOIN'), 'SQL should not contain LEFT JOIN');
    });
  });

  //
  describe('Model.paginatedOptimized()', function() {
    it('should return PaginatedOptimizedQuery instance', () => {
      const query = Folder.paginatedOptimized();
      assert.ok(query instanceof PaginatedOptimizedQuery, 'Should return PaginatedOptimizedQuery instance');
      assert.strictEqual(query.query.optimized, true, 'Query should be marked as optimized');
    });

    it('should support method chaining', () => {
      const query = Folder.paginatedOptimized()
        .where({ type: 'agp' })
        .filterJoin('applicant', { last_name: 'Dupont%' })
        .order('folders.created_at DESC');

      assert.strictEqual(query.query.where.length, 1);
      assert.strictEqual(query.query.filterJoins.length, 1);
      assert.strictEqual(query.query.order.length, 1);
    });
  });

  //
  describe('SQL generation patterns', function() {
    it('should generate correct WHERE EXISTS clause', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query
        .where({ status: 'SUBMITTED' })
        .filterJoin('applicant', {
          last_name: 'Dupont%',
          email: 'test@example.com'
        });

      const sql = query.toSQL();

      // Vérifier la structure de EXISTS
      assert.ok(sql.sql.includes('WHERE `folders`.`status`'), 'Should have WHERE on folders.status');
      assert.ok(sql.sql.includes('AND EXISTS (SELECT 1 FROM `applicants`'), 'Should have EXISTS with applicants');
      assert.ok(sql.sql.includes('WHERE `applicants`.`id` = `folders`.`applicant_id`'), 'Should have join condition');
    });

    it('should handle LIKE patterns in filterJoin', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoin('applicant', { last_name: 'Dupont%' });

      const sql = query.toSQL();

      // Le % dans la valeur devrait générer un LIKE
      assert.ok(sql.sql.includes('LIKE'), 'Should generate LIKE for patterns with %');
    });

    it('should handle IN arrays in filterJoin', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoin('applicant', {
        last_name: ['Dupont', 'Martin', 'Bernard']
      });

      const sql = query.toSQL();

      // Les tableaux devraient générer un IN
      assert.ok(sql.sql.includes('IN'), 'Should generate IN for arrays');
    });
  });

  //
  describe('Performance optimization verification', function() {
    it('COUNT should not include LEFT JOIN', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query
        .where({ type: 'agp' })
        .filterJoin('applicant', { last_name: 'Dupont%' })
        .join('pme_folder'); // Ce join ne doit pas apparaître dans COUNT

      query.query.verb = 'count';
      const sql = query.toSQL();

      // Le COUNT ne doit pas avoir de LEFT JOIN
      assert.ok(!sql.sql.includes('LEFT JOIN'), 'COUNT should not have LEFT JOIN');

      // Mais doit avoir EXISTS pour le filterJoin
      assert.ok(sql.sql.includes('EXISTS'), 'COUNT should have EXISTS for filterJoin');
    });

    it('IDS query should be minimal', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'agp' })
        .filterJoin('applicant', { last_name: 'Dupont%' })
        .limit(50);

      const sql = query.toSQL();

      // Vérifier que seuls les IDs sont sélectionnés
      assert.ok(sql.sql.includes('SELECT `folders`.`id`'), 'Should only select IDs');

      // Pas de sélection d'autres colonnes
      assert.ok(!sql.sql.includes('`folders`.*'), 'Should not select all columns');

      // Pas de LEFT JOIN
      assert.ok(!sql.sql.includes('LEFT JOIN'), 'Should not have LEFT JOIN');
    });
  });

  //
  describe('Complex scenarios', function() {
    it('should handle multiple conditions with AND operator', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoin('applicant', {
        last_name: 'Dupont%',
        email: '%@example.com'
      }, 'AND');

      const sql = query.toSQL();

      // Vérifier que les 2 conditions sont présentes
      assert.ok(sql.sql.includes('last_name'), 'Should include last_name condition');
      assert.ok(sql.sql.includes('email'), 'Should include email condition');
      assert.ok(sql.sql.includes('AND'), 'Should use AND operator');
    });

    it('should handle multiple conditions with OR operator', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoin('applicant', {
        last_name: 'Dupont%',
        email: '%@example.com'
      }, 'OR');

      const sql = query.toSQL();

      // Vérifier que les 2 conditions sont présentes avec OR
      assert.ok(sql.sql.includes('last_name'), 'Should include last_name');
      assert.ok(sql.sql.includes('email'), 'Should include email');
      assert.ok(sql.sql.includes('OR'), 'Should use OR operator');
    });

    it('should combine WHERE and filterJoin correctly', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query
        .where({ type: ['agp', 'avt', 'cga'] })
        .where({ status: 'SUBMITTED' })
        .filterJoin('applicant', { last_name: 'Dupont%' });

      const sql = query.toSQL();

      // Vérifier que tous les WHERE sont présents
      assert.ok(sql.sql.includes('`folders`.`type`'), 'Should include type filter');
      assert.ok(sql.sql.includes('`folders`.`status`'), 'Should include status filter');
      assert.ok(sql.sql.includes('EXISTS'), 'Should include EXISTS for filterJoin');
    });
  });

  //
  describe('Sorting on joined tables', function() {
    it('should add INNER JOIN when sorting on joined table column', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: ['agp', 'avt'] })
        .order('applicants.last_name ASC')
        .join('applicant')
        .limit(50);

      const sql = query.toSQL();

      // Vérifier que l'INNER JOIN est présent
      assert.ok(sql.sql.includes('INNER JOIN'), 'SQL should contain INNER JOIN for sorting on joined table');
      assert.ok(sql.sql.includes('INNER JOIN `applicants`'), 'SQL should INNER JOIN the applicants table');
      assert.ok(sql.sql.includes('ON `applicants`.`id` = `folders`.`applicant_id`'), 'SQL should have correct join condition');

      // Vérifier que le ORDER BY est présent
      assert.ok(sql.sql.includes('ORDER BY applicants.last_name ASC'), 'SQL should have ORDER BY clause');
    });

    it('should NOT add INNER JOIN when sorting on main table column', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'agp' })
        .order('folders.created_at DESC')
        .limit(50);

      const sql = query.toSQL();

      // Vérifier qu'il n'y a PAS de JOIN
      assert.ok(!sql.sql.includes('INNER JOIN'), 'SQL should not contain INNER JOIN when sorting on main table');
      assert.ok(!sql.sql.includes('LEFT JOIN'), 'SQL should not contain LEFT JOIN when sorting on main table');

      // Vérifier que le ORDER BY est présent
      assert.ok(sql.sql.includes('ORDER BY'), 'SQL should have ORDER BY clause');
    });

    it('should add INNER JOIN for multiple sort columns on joined tables', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'agp' })
        .order('applicants.last_name ASC')
        .order('folders.created_at DESC')
        .join('applicant')
        .limit(50);

      const sql = query.toSQL();

      // Vérifier l'INNER JOIN
      assert.ok(sql.sql.includes('INNER JOIN `applicants`'), 'SQL should INNER JOIN applicants');

      // Vérifier les deux ORDER BY
      assert.ok(sql.sql.includes('ORDER BY applicants.last_name ASC'), 'SQL should sort by applicants.last_name');
      assert.ok(sql.sql.includes('folders.created_at DESC'), 'SQL should sort by folders.created_at');
    });

    it('should combine INNER JOIN for sorting with EXISTS for filtering', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'agp' })
        .filterJoin('applicant', { email: '%@example.com' })
        .order('applicants.last_name ASC')
        .join('applicant')
        .limit(50);

      const sql = query.toSQL();

      // Vérifier l'INNER JOIN pour le tri
      assert.ok(sql.sql.includes('INNER JOIN `applicants`'), 'SQL should have INNER JOIN for sorting');

      // Vérifier EXISTS pour le filtre
      assert.ok(sql.sql.includes('EXISTS'), 'SQL should have EXISTS for filtering');
      assert.ok(sql.sql.includes('email'), 'SQL should filter on email');

      // Vérifier ORDER BY
      assert.ok(sql.sql.includes('ORDER BY applicants.last_name ASC'), 'SQL should sort by applicants.last_name');
    });

    it('should NOT add INNER JOIN in COUNT phase even with sort on joined table', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query
        .where({ type: 'agp' })
        .order('applicants.last_name ASC')
        .join('applicant')
        .limit(50);

      const sql = query.toSQL();

      // COUNT ne devrait PAS avoir de JOIN (même si on trie sur une table jointe)
      assert.ok(!sql.sql.includes('INNER JOIN'), 'COUNT should not have INNER JOIN');
      assert.ok(!sql.sql.includes('LEFT JOIN'), 'COUNT should not have LEFT JOIN');

      // COUNT ne devrait PAS avoir de ORDER BY
      assert.ok(!sql.sql.includes('ORDER BY'), 'COUNT should not have ORDER BY');
    });
  });

  //
  describe('Advanced operators (LIKE, BETWEEN, comparison)', function() {
    it('should handle LIKE operator with % wildcard', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoin('applicant', { last_name: 'Dupont%' });

      const sql = query.toSQL();

      // Devrait générer LIKE pour les patterns avec %
      assert.ok(sql.sql.includes('LIKE'), 'Should generate LIKE for patterns with %');
      assert.ok(sql.params.includes('Dupont%'), 'Should include the pattern in params');
    });

    it('should handle LIKE operator with both % wildcards', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoin('applicant', { email: '%@example.com' });

      const sql = query.toSQL();

      // Devrait générer LIKE
      assert.ok(sql.sql.includes('LIKE'), 'Should generate LIKE');
      assert.ok(sql.params.includes('%@example.com'), 'Should include pattern in params');
    });

    it('should handle BETWEEN operator for dates', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query
        .where({ type: 'agp' })
        .filterJoin('applicant', {
          created_at: { $between: ['2024-01-01', '2024-12-31'] }
        });

      const sql = query.toSQL();

      // Devrait générer BETWEEN
      assert.ok(sql.sql.includes('BETWEEN'), 'Should generate BETWEEN operator');
      assert.ok(sql.sql.includes('AND'), 'Should include AND in BETWEEN clause');
      assert.ok(sql.params.includes('2024-01-01'), 'Should include start date in params');
      assert.ok(sql.params.includes('2024-12-31'), 'Should include end date in params');
    });

    it('should handle $gte (greater than or equal) operator', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoin('applicant', {
        created_at: { $gte: '2024-01-01' }
      });

      const sql = query.toSQL();

      // Devrait générer >=
      assert.ok(sql.sql.includes('>='), 'Should generate >= operator');
      assert.ok(sql.params.includes('2024-01-01'), 'Should include date in params');
    });

    it('should handle $lte (less than or equal) operator', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoin('applicant', {
        created_at: { $lte: '2024-12-31' }
      });

      const sql = query.toSQL();

      // Devrait générer <=
      assert.ok(sql.sql.includes('<='), 'Should generate <= operator');
      assert.ok(sql.params.includes('2024-12-31'), 'Should include date in params');
    });

    it('should handle $gt (greater than) operator', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoin('pme_folder', {
        amount: { $gt: 1000 }
      });

      const sql = query.toSQL();

      // Devrait générer >
      assert.ok(sql.sql.includes('>'), 'Should generate > operator');
      assert.ok(sql.params.includes(1000), 'Should include value in params');
    });

    it('should handle $lt (less than) operator', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoin('pme_folder', {
        amount: { $lt: 5000 }
      });

      const sql = query.toSQL();

      // Devrait générer <
      assert.ok(sql.sql.includes('<'), 'Should generate < operator');
      assert.ok(sql.params.includes(5000), 'Should include value in params');
    });

    it('should combine multiple advanced operators', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoin('applicant', {
        last_name: 'Dupont%',
        created_at: { $between: ['2024-01-01', '2024-12-31'] },
        email: '%@example.com'
      });

      const sql = query.toSQL();

      // Devrait générer LIKE, BETWEEN et LIKE
      assert.ok(sql.sql.includes('LIKE'), 'Should generate LIKE');
      assert.ok(sql.sql.includes('BETWEEN'), 'Should generate BETWEEN');

      // Vérifier les paramètres
      assert.ok(sql.params.includes('Dupont%'), 'Should include LIKE pattern');
      assert.ok(sql.params.includes('2024-01-01'), 'Should include start date');
      assert.ok(sql.params.includes('2024-12-31'), 'Should include end date');
      assert.ok(sql.params.includes('%@example.com'), 'Should include email pattern');
    });

    it('should work with BETWEEN in nested filterJoin', () => {
      // Ajouter un modèle imbriqué pour le test
      class Company extends Model({
        table: 'companies',
        primary: ['id'],
        columns: {
          id: 'integer',
          name: 'string',
          created_at: 'datetime'
        }
      }) {}

      PmeFolder.schema.associations = [
        ['belongs_to', 'company', Company, 'company_id', 'id']
      ];

      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoinNested({
        pme_folder: {
          conditions: { status: 'ACTIVE' },
          nested: {
            company: {
              conditions: {
                created_at: { $between: ['2024-01-01', '2024-12-31'] }
              }
            }
          }
        }
      });

      const sql = query.toSQL();

      // Devrait générer des EXISTS imbriqués avec BETWEEN
      assert.ok(sql.sql.includes('EXISTS'), 'Should generate EXISTS');
      assert.ok(sql.sql.includes('BETWEEN'), 'Should generate BETWEEN in nested EXISTS');
      assert.ok(sql.params.includes('2024-01-01'), 'Should include start date');
      assert.ok(sql.params.includes('2024-12-31'), 'Should include end date');
    });
  });

  //
  describe('Edge cases', function() {
    it('should handle empty filterJoin conditions', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoin('applicant', {});

      const sql = query.toSQL();

      // Devrait générer un EXISTS sans conditions supplémentaires
      assert.ok(sql.sql.includes('EXISTS'), 'Should generate EXISTS even with empty conditions');
    });

    it('should handle null values in filterJoin', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoin('applicant', { email: null });

      const sql = query.toSQL();

      // Devrait générer IS NULL
      assert.ok(sql.sql.includes('IS NULL'), 'Should generate IS NULL for null values');
    });

    it('should handle empty array in filterJoin', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.filterJoin('applicant', { last_name: [] });

      const sql = query.toSQL();

      // Un tableau vide devrait générer FALSE
      assert.ok(sql.sql.includes('FALSE'), 'Should generate FALSE for empty arrays');
    });
  });
});
