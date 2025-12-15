// Tests unitaires sans dépendance sur la base de données
// On teste uniquement la génération SQL, pas l'exécution

const assert = require('assert');

const PaginatedOptimizedQuery = require('@igojs/db').PaginatedOptimizedQuery;
const Model = require('@igojs/db').Model;

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
  class Country extends Model({
    table: 'countries',
    columns: {
      id: 'integer',
      code: 'string',
      name: 'string'
    }
  }) {}

  class Company extends Model({
    table: 'companies',
    primary: ['id'],
    columns: {
      id: 'integer',
      name: 'string',
      siret: 'string',
      country_id: 'integer'
    },
    associations: [
      ['belongs_to', 'country', Country, 'country_id', 'id']
    ]
  }) {}

  class PmeFolder extends Model({
    table: 'pme_folders',
    primary: ['id'],
    columns: {
      id: 'integer',
      status: 'string',
      company_id: 'integer',
      company_name: 'string',
      block_studies_id: 'integer'
    },
    associations: [
      ['belongs_to', 'company', Company, 'company_id', 'id']
    ]
  }) {}

  // Separate class to avoid circular dependencies in test setup
  // This will be used for testing nested block paths
  class PmeFolderWithBlocks extends PmeFolder {}

  // Define associations after class declaration to handle forward references
  PmeFolderWithBlocks.schema.columns.block_studies_id = 'integer';
  PmeFolderWithBlocks.schema.columns.block_travel_wishes_id = 'integer';
  PmeFolderWithBlocks.schema.colsByName = PmeFolderWithBlocks.schema.colsByName || {};
  PmeFolderWithBlocks.schema.colsByName.block_studies_id = 'integer';
  PmeFolderWithBlocks.schema.colsByName.block_travel_wishes_id = 'integer';

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
      ['belongs_to', 'applicant', Applicant, 'applicant_id', 'id'],
      ['belongs_to', 'pme_folder', PmeFolder, 'pme_folder_id', 'id']
    ]
  }) {}

  // Modèles de test pour les "blocks" (sous-tables)
  class StudiesBlock extends Model({
    table: 'block_studies',
    primary: ['id'],
    columns: [
      'id',
      'ine_number',
      'student_status',
      'studies_year',
      'studies_field',
      { name: 'bac_year', type: 'integer' }
    ]
  }) {}

  class TravelWishesBlock extends Model({
    table: 'block_travel_wishes',
    primary: ['id'],
    columns: [
      'id',
      { name: 'departure_date', type: 'date' },
      { name: 'return_date', type: 'date' },
      'destination'
    ]
  }) {}

  // Now add block associations to PmeFolderWithBlocks (must be after block classes are defined)
  PmeFolderWithBlocks.schema.associations = [
    ['belongs_to', 'company', Company, 'company_id', 'id'],
    ['belongs_to', 'block_study', StudiesBlock, 'block_studies_id', 'id'],
    ['belongs_to', 'block_travel_wish', TravelWishesBlock, 'block_travel_wishes_id', 'id']
  ];

  // Folder variant with PmeFolderWithBlocks for testing nested block paths
  class FolderWithNestedBlocks extends Model({
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
      ['belongs_to', 'applicant', Applicant, 'applicant_id', 'id'],
      ['belongs_to', 'pme_folder', PmeFolderWithBlocks, 'pme_folder_id', 'id']
    ]
  }) {}

  class PMEFolderWithBlocks extends Model({
    table: 'pme_folders_with_blocks',
    primary: ['id'],
    columns: [
      'id',
      { name: 'block_studies_id', type: 'integer' },
      { name: 'block_travel_wishes_id', type: 'integer' },
      'professional_activity',
      { name: 'is_initial', type: 'boolean' }
    ],
    associations: () => [
      ['belongs_to', 'studies', StudiesBlock, 'block_studies_id', 'id'],
      ['belongs_to', 'travel_wishes', TravelWishesBlock, 'block_travel_wishes_id', 'id']
    ]
  }) {}

  //
  describe('Simplified Syntax - where() with nested paths', function() {
    it('should detect simple path (1 level)', () => {
      const query = new PaginatedOptimizedQuery(Folder);
      query.where({
        status: 'SUBMITTED',
        'applicant.last_name': 'Dupont'
      });

      // Vérifier que filterJoins a été créé
      assert.ok(query.query.filterJoins.length > 0, 'filterJoins should contain at least one element');

      // Vérifier que le filtre sur la table principale est dans where
      assert.ok(query.query.where.length > 0, 'where should contain the condition on status');
    });

    it('should detect nested path (3 levels)', () => {
      const query = new PaginatedOptimizedQuery(Folder);
      query.where({
        'pme_folder.company.country.code': 'FR'
      });

      // Vérifier que filterJoins nested a été créé
      assert.ok(query.query.filterJoins.length > 0, 'filterJoins should be created');
      assert.equal(query.query.filterJoins[0].type, 'nested', 'filterJoin should be of type nested');
    });

    it('should group conditions on the same table', () => {
      const query = new PaginatedOptimizedQuery(Folder);
      query.where({
        'applicant.last_name': 'Dupont',
        'applicant.first_name': 'Jean',
        'applicant.email': 'test@test.com'
      });

      // Vérifier qu'un seul filterJoin a été créé (regroupement)
      assert.equal(query.query.filterJoins.length, 1, 'Should create a single filterJoin for applicant');
    });
  });

  //
  describe('countSQL with EXISTS', function() {
    it('should generate COUNT SQL with EXISTS for nested paths', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        type: ['agp', 'avt'],
        'applicant.last_name': 'Dupont%'
      });

      const sql = query.toSQL();

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
      query.where({
        type: 'agp',
        'applicant.last_name': 'Dupont%',
        'pme_folder.status': 'ACTIVE'
      });

      const sql = query.toSQL();

      // Vérifier qu'il y a 2 EXISTS
      const existsCount = (sql.sql.match(/EXISTS/g) || []).length;
      assert.strictEqual(existsCount, 2, 'SQL should contain 2 EXISTS clauses');

      // Vérifier les tables
      assert.ok(sql.sql.includes('applicants'), 'SQL should reference applicants');
      assert.ok(sql.sql.includes('pme_folders'), 'SQL should reference pme_folders');
    });

    it('should generate nested EXISTS for deep paths', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        'pme_folder.company.country.code': 'FR'
      });

      const sql = query.toSQL();

      // Vérifier que des EXISTS imbriqués sont générés
      const existsCount = (sql.sql.match(/EXISTS/g) || []).length;
      assert.ok(existsCount >= 3, 'SQL should contain at least 3 nested EXISTS');

      // Vérifier que les tables sont mentionnées
      assert.ok(sql.sql.includes('pme_folders'), 'SQL should reference pme_folders');
      assert.ok(sql.sql.includes('companies'), 'SQL should reference companies');
      assert.ok(sql.sql.includes('countries'), 'SQL should reference countries');
    });
  });

  //
  describe('idsSQL', function() {
    it('should generate SELECT IDs SQL with EXISTS', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query.where({
        type: 'agp',
        'applicant.last_name': 'Dupont%'
      })
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

    it('should support method chaining with new syntax', () => {
      const query = Folder.paginatedOptimized()
        .where({
          type: 'agp',
          'applicant.last_name': 'Dupont%'
        })
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
      query.where({
        status: 'SUBMITTED',
        'applicant.last_name': 'Dupont%',
        'applicant.email': 'test@example.com'
      });

      const sql = query.toSQL();

      // Vérifier la structure de EXISTS
      assert.ok(sql.sql.includes('WHERE `folders`.`status`'), 'Should have WHERE on folders.status');
      assert.ok(sql.sql.includes('AND EXISTS (SELECT 1 FROM `applicants`'), 'Should have EXISTS with applicants');
      assert.ok(sql.sql.includes('WHERE `applicants`.`id` = `folders`.`applicant_id`'), 'Should have join condition');
    });

    it('should handle LIKE patterns with %', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        'applicant.last_name': 'Dupont%'
      });

      const sql = query.toSQL();

      // Le % dans la valeur devrait générer un LIKE
      assert.ok(sql.sql.includes('LIKE'), 'Should generate LIKE for patterns with %');
    });

    it('should handle IN arrays', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        status: ['SUBMITTED', 'VALIDATED', 'APPROVED']
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
        .where({
          type: 'agp',
          'applicant.last_name': 'Dupont%'
        })
        .join('pme_folder'); // Ce join ne doit pas apparaître dans COUNT

      query.query.verb = 'count';
      const sql = query.toSQL();

      // Le COUNT ne doit pas avoir de LEFT JOIN
      assert.ok(!sql.sql.includes('LEFT JOIN'), 'COUNT should not have LEFT JOIN');

      // Mais doit avoir EXISTS pour le filtre
      assert.ok(sql.sql.includes('EXISTS'), 'COUNT should have EXISTS for filter');
    });

    it('IDS query should be minimal', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query.where({
        type: 'agp',
        'applicant.last_name': 'Dupont%'
      })
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
    it('should handle $and with multiple conditions', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        $and: [
          { status: 'SUBMITTED' },
          { 'applicant.last_name': 'Dupont%' },
          { 'applicant.first_name': 'Jean%' }
        ]
      });

      const sql = query.toSQL();

      // Vérifier que les conditions sont présentes
      assert.ok(sql.sql.includes('status'), 'Should include status condition');
      assert.ok(sql.sql.includes('EXISTS'), 'Should include EXISTS for applicant');
    });

    it('should combine main table and joined table filters', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        type: ['agp', 'avt', 'cga'],
        status: 'SUBMITTED',
        'applicant.last_name': 'Dupont%',
        'pme_folder.status': 'ACTIVE'
      });

      const sql = query.toSQL();

      // Vérifier que tous les WHERE sont présents
      assert.ok(sql.sql.includes('`folders`.`type`'), 'Should include type filter');
      assert.ok(sql.sql.includes('`folders`.`status`'), 'Should include status filter');
      assert.ok(sql.sql.includes('EXISTS'), 'Should include EXISTS for filterJoin');

      // Vérifier qu'il y a 2 EXISTS (applicant + pme_folder)
      const existsCount = (sql.sql.match(/EXISTS/g) || []).length;
      assert.ok(existsCount >= 2, 'Should have at least 2 EXISTS');
    });
  });

  //
  describe('Sorting on joined tables', function() {
    it('should add INNER JOIN when sorting on joined table column', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({
          type: ['agp', 'avt']
        })
        .order('applicants.last_name ASC')
        .join('applicant')
        .limit(50);

      const sql = query.toSQL();

      // Vérifier que l'INNER JOIN est présent
      assert.ok(sql.sql.includes('LEFT JOIN'), 'SQL should contain LEFT JOIN for sorting on joined table');
      assert.ok(sql.sql.includes('LEFT JOIN `applicants`'), 'SQL should INNER JOIN the applicants table');
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

    it('should add INNER JOIN for nested sorted columns', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({
          type: 'agp',
          'pme_folder.company.country.code': 'FR'
        })
        .order('companies.name ASC')  // Tri sur une table imbriquée
        .join('pme_folder.company.country')
        .limit(50);

      const sql = query.toSQL();

      // Vérifier que les INNER JOIN en cascade sont présents
      assert.ok(sql.sql.includes('LEFT JOIN `pme_folders`'), 'SQL should INNER JOIN pme_folders');
      assert.ok(sql.sql.includes('LEFT JOIN `companies`'), 'SQL should INNER JOIN companies');

      // Vérifier le ORDER BY
      assert.ok(sql.sql.includes('ORDER BY companies.name ASC'), 'SQL should sort by companies.name');
    });

    it('should combine INNER JOIN for sorting with EXISTS for filtering', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({
          type: 'agp',
          'applicant.email': '%@example.com'
        })
        .order('applicants.last_name ASC')
        .join('applicant')
        .limit(50);

      const sql = query.toSQL();

      // Vérifier l'INNER JOIN pour le tri
      assert.ok(sql.sql.includes('LEFT JOIN `applicants`'), 'SQL should have INNER JOIN for sorting');

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
      assert.ok(!sql.sql.includes('LEFT JOIN'), 'COUNT should not have LEFT JOIN for sorting');
      assert.ok(!sql.sql.includes('LEFT JOIN'), 'COUNT should not have LEFT JOIN');

      // COUNT ne devrait PAS avoir de ORDER BY
      assert.ok(!sql.sql.includes('ORDER BY'), 'COUNT should not have ORDER BY');
    });

    it('should transform association names to table names in ORDER BY (pmfp_folder.company case)', () => {
      // Test pour vérifier que "pmfp_folder.company.name" devient "companies.name"
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'agp' })
        .order('pme_folder.company.name ASC')
        .join('pme_folder.company')
        .limit(50);

      const sql = query.toSQL();

      // Vérifier les INNER JOIN en cascade
      assert.ok(sql.sql.includes('LEFT JOIN `pme_folders`'), 'SQL should INNER JOIN pme_folders');
      assert.ok(sql.sql.includes('LEFT JOIN `companies`'), 'SQL should INNER JOIN companies');

      // Vérifier que le ORDER BY utilise le nom de TABLE (companies) et non d'association (company)
      assert.ok(sql.sql.includes('ORDER BY companies.name ASC'), 'SQL should use table name "companies" in ORDER BY');
      assert.ok(!sql.sql.includes('company.name'), 'SQL should NOT use association name "company" in ORDER BY');
    });
  });

  describe('ORDER BY avec Fonctions SQL', function() {
    it('devrait gérer COALESCE avec plusieurs colonnes de la même table', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'agp' })
        .join('applicant')
        .order('COALESCE(`applicant`.`last_name`, `applicant`.`first_name`) ASC')
        .limit(50);

      const sql = query.toSQL();

      // Doit contenir l'INNER JOIN
      assert.ok(sql.sql.includes('LEFT JOIN `applicants`'), 'SQL should INNER JOIN applicants');

      // Doit conserver la fonction COALESCE dans ORDER BY
      assert.ok(sql.sql.includes('ORDER BY COALESCE'), 'SQL should preserve COALESCE function');
      assert.ok(sql.sql.includes('applicants.last_name'), 'SQL should include last_name column (transformed from association to table name)');
      assert.ok(sql.sql.includes('applicants.first_name'), 'SQL should include first_name column (transformed from association to table name)');
    });

    it('devrait gérer IFNULL avec table imbriquée', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'pme' })
        .join('pme_folder.company')
        .order('IFNULL(`companies`.`name`, "N/A") ASC')
        .limit(50);

      const sql = query.toSQL();

      // Doit contenir les INNER JOIN pour la chaîne d'associations
      assert.ok(sql.sql.includes('LEFT JOIN `pme_folders`'), 'SQL should INNER JOIN pme_folders');
      assert.ok(sql.sql.includes('LEFT JOIN `companies`'), 'SQL should INNER JOIN companies');

      // Doit conserver IFNULL dans ORDER BY
      assert.ok(sql.sql.includes('ORDER BY IFNULL'), 'SQL should preserve IFNULL function');
    });

    it('devrait gérer CONCAT avec colonnes multiples', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'agp' })
        .join('applicant')
        .order('CONCAT(`applicant`.`last_name`, " ", `applicant`.`first_name`) ASC')
        .limit(50);

      const sql = query.toSQL();

      // Doit contenir l'INNER JOIN
      assert.ok(sql.sql.includes('LEFT JOIN `applicants`'), 'SQL should INNER JOIN applicants');

      // Doit conserver CONCAT dans ORDER BY
      assert.ok(sql.sql.includes('ORDER BY CONCAT'), 'SQL should preserve CONCAT function');
      assert.ok(sql.sql.includes('applicants.last_name'), 'SQL should include last_name column (transformed from association to table name)');
      assert.ok(sql.sql.includes('applicants.first_name'), 'SQL should include first_name column (transformed from association to table name)');
    });

    it('devrait gérer COALESCE avec tables imbriquées', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'pme' })
        .join('applicant')
        .join('pme_folder.company')
        .order('COALESCE(`applicant`.`last_name`, `companies`.`name`) ASC')
        .limit(50);

      const sql = query.toSQL();

      // Doit contenir les INNER JOIN
      assert.ok(sql.sql.includes('LEFT JOIN `applicants`'), 'SQL should INNER JOIN applicants');
      assert.ok(sql.sql.includes('LEFT JOIN `pme_folders`'), 'SQL should INNER JOIN pme_folders');
      assert.ok(sql.sql.includes('LEFT JOIN `companies`'), 'SQL should INNER JOIN companies');

      // Doit conserver COALESCE dans ORDER BY
      assert.ok(sql.sql.includes('ORDER BY COALESCE'), 'SQL should preserve COALESCE function');
    });

    it('ne devrait pas ajouter de JOIN pour les fonctions sur la table principale', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'agp' })
        .order('UPPER(`folders`.`name`) ASC')
        .limit(50);

      const sql = query.toSQL();

      // Ne doit pas contenir de INNER JOIN (seulement la table principale)
      assert.ok(!sql.sql.includes('LEFT JOIN'), 'SQL should not contain LEFT JOIN for functions on main table');

      // Doit conserver la fonction UPPER
      assert.ok(sql.sql.includes('ORDER BY UPPER'), 'SQL should preserve UPPER function');
    });

    it('should not double-transform paths in COALESCE (idempotence)', () => {
      // Test pour vérifier qu'il n'y a pas de double-transformation
      // Ce test vérifie le bug: applicant.last_name dans un COALESCE
      // ne doit PAS être transformé 2 fois et devenir applicants.something.last_name
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'agp' })
        .join('applicant')
        .join('pme_folder.company')
        .order('COALESCE(applicant.last_name, applicant.first_name, pme_folder.company_name, companies.name) ASC')
        .limit(25);

      const sql = query.toSQL();

      // Doit transformer correctement SANS double transformation
      assert.ok(sql.sql.includes('applicants.last_name'), 'Should transform applicant to applicants');
      assert.ok(sql.sql.includes('applicants.first_name'), 'Should transform applicant fields');
      assert.ok(sql.sql.includes('pme_folders.company_name'), 'Should transform pme_folder to pme_folders');
      assert.ok(sql.sql.includes('companies.name'), 'Should transform company to companies');

      // NE DOIT PAS contenir de chemins avec 3 niveaux (double transformation)
      assert.ok(!sql.sql.includes('.applicants.'), 'Should NOT have double-transformed paths like table.applicants.column');
      assert.ok(!sql.sql.includes('.companies.'), 'Should NOT have double-transformed paths like table.companies.column');
      assert.ok(!sql.sql.includes('.pme_folders.'), 'Should NOT have double-transformed paths like table.pme_folders.column');
    });

    it('transformation should be idempotent (_transformSinglePath)', () => {
      // Test pour vérifier que transformer 2 fois donne le même résultat
      const PaginatedOptimizedSql = require('@igojs/db').PaginatedOptimizedSql;
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      const sqlGenerator = new PaginatedOptimizedSql(query);

      const original = 'applicant.last_name';
      const transformed1 = sqlGenerator._transformSinglePath(original);
      const transformed2 = sqlGenerator._transformSinglePath(transformed1);

      assert.strictEqual(transformed1, 'applicants.last_name',
        'First transformation should give correct result');
      assert.strictEqual(transformed1, transformed2,
        'Transforming twice should give the same result (idempotent)');
    });
  });

  describe('LEFT JOIN preserves rows with NULL', function() {
    it('should use LEFT JOIN (not INNER JOIN) when sorting on joined table', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'agp' })
        .order('applicants.last_name ASC')
        .limit(50);

      const sql = query.toSQL();

      // Doit utiliser LEFT JOIN, pas INNER JOIN
      assert.ok(sql.sql.includes('LEFT JOIN'), 'SQL should use LEFT JOIN');
      assert.ok(!sql.sql.includes('INNER JOIN'), 'SQL should not use INNER JOIN');

      // Vérifier que c'est bien un LEFT JOIN sur applicants
      assert.ok(sql.sql.includes('LEFT JOIN `applicants`'), 'SQL should LEFT JOIN applicants');

      // Le ORDER BY doit être présent
      assert.ok(sql.sql.includes('ORDER BY applicants.last_name ASC'), 'SQL should have ORDER BY');
    });

    it('should use LEFT JOIN for nested table sorting', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'pme' })
        .order('pme_folder.company.name ASC')
        .limit(50);

      const sql = query.toSQL();

      // Tous les JOIN doivent être des LEFT JOIN
      assert.ok(sql.sql.includes('LEFT JOIN'), 'SQL should use LEFT JOIN');
      assert.ok(!sql.sql.includes('INNER JOIN'), 'SQL should not use INNER JOIN');

      // Vérifier les LEFT JOIN en cascade
      const leftJoinCount = (sql.sql.match(/LEFT JOIN/g) || []).length;
      assert.ok(leftJoinCount >= 2, 'SQL should have at least 2 LEFT JOINs for nested path');
    });

    it('should use LEFT JOIN with SQL functions (COALESCE)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'agp' })
        .join('applicant')
        .order('COALESCE(`applicant`.`last_name`, "Unknown") ASC')
        .limit(50);

      const sql = query.toSQL();

      // Doit utiliser LEFT JOIN même avec des fonctions SQL
      assert.ok(sql.sql.includes('LEFT JOIN `applicants`'), 'SQL should LEFT JOIN applicants');
      assert.ok(!sql.sql.includes('INNER JOIN'), 'SQL should not use INNER JOIN');
    });

    it('should verify LEFT JOIN preserves all rows conceptually', () => {
      // Ce test vérifie que le SQL généré utilise LEFT JOIN
      // qui préserve toutes les lignes, même celles avec NULL
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'agp' })
        .order('applicants.last_name ASC')
        .limit(50);

      const sql = query.toSQL();

      // Vérifier structure SQL complète
      assert.ok(sql.sql.includes('SELECT'), 'SQL should have SELECT');
      assert.ok(sql.sql.includes('FROM `folders`'), 'SQL should have FROM folders');
      assert.ok(sql.sql.includes('LEFT JOIN `applicants`'), 'SQL should have LEFT JOIN applicants');
      assert.ok(sql.sql.includes('WHERE `folders`.`type` = ?'), 'SQL should have WHERE clause');
      assert.ok(sql.sql.includes('ORDER BY applicants.last_name ASC'), 'SQL should have ORDER BY');
      assert.ok(sql.sql.includes('LIMIT'), 'SQL should have LIMIT');

      // Avec LEFT JOIN, les folders sans applicant seront inclus avec last_name=NULL
      // Ce comportement est correct et préserve toutes les lignes
    });
  });

  //
  describe('Advanced operators', function() {
    it('should handle LIKE operator with % wildcard', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        'applicant.last_name': 'Dupont%'
      });

      const sql = query.toSQL();

      assert.ok(sql.sql.includes('LIKE'), 'Should generate LIKE for patterns with %');
      assert.ok(sql.params.includes('Dupont%'), 'Should include the pattern in params');
    });

    it('should handle BETWEEN operator', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        created_at: { $between: ['2024-01-01', '2024-12-31'] }
      });

      const sql = query.toSQL();

      assert.ok(sql.sql.includes('BETWEEN'), 'Should generate BETWEEN operator');
      assert.ok(sql.params.includes('2024-01-01'), 'Should include start date in params');
      assert.ok(sql.params.includes('2024-12-31'), 'Should include end date in params');
    });

    it('should handle $gte operator', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        created_at: { $gte: '2024-01-01' }
      });

      const sql = query.toSQL();

      assert.ok(sql.sql.includes('>='), 'Should generate >= operator');
      assert.ok(sql.params.includes('2024-01-01'), 'Should include date in params');
    });

    it('should handle $lte operator', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        created_at: { $lte: '2024-12-31' }
      });

      const sql = query.toSQL();

      assert.ok(sql.sql.includes('<='), 'Should generate <= operator');
      assert.ok(sql.params.includes('2024-12-31'), 'Should include date in params');
    });

    it('should handle $like operator explicitly', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        'applicant.last_name': { $like: 'Dup%' }
      });

      const sql = query.toSQL();

      assert.ok(sql.sql.includes('LIKE'), 'Should generate LIKE');
      assert.ok(sql.params.includes('Dup%'), 'Should include pattern in params');
    });

    it('should combine multiple advanced operators', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        created_at: { $between: ['2024-01-01', '2024-12-31'] },
        status: ['SUBMITTED', 'VALIDATED'],
        'applicant.last_name': 'Dupont%',
        'applicant.email': '%@example.com'
      });

      const sql = query.toSQL();

      assert.ok(sql.sql.includes('LIKE'), 'Should generate LIKE');
      assert.ok(sql.sql.includes('BETWEEN'), 'Should generate BETWEEN');
      assert.ok(sql.sql.includes('IN'), 'Should generate IN');
    });
  });

  //
  describe('Edge cases', function() {
    it('should handle null values', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        status: 'SUBMITTED',
        deleted_at: null
      });

      const sql = query.toSQL();

      assert.ok(sql.sql.includes('IS NULL'), 'Should generate IS NULL for null values');
    });

    it('should handle empty array', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        status: []
      });

      const sql = query.toSQL();

      // Un tableau vide devrait générer une condition qui est toujours fausse
      // (Query.js le gère automatiquement)
      assert.ok(sql.sql, 'Should generate SQL even with empty array');
    });

    it('should handle empty where object', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({});

      const sql = query.toSQL();

      // Devrait générer un SQL valide sans conditions
      assert.ok(sql.sql.includes('SELECT COUNT(0)'), 'Should generate COUNT SQL');
      assert.ok(!sql.sql.includes('WHERE'), 'Should not have WHERE clause for empty conditions');
    });
  });

  //
  describe('Block tables (sub-tables) support', function() {
    it('should detect ORDER BY on block column without prefix and add LEFT JOIN', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      query.query.verb = 'select_ids';
      query
        .where({ is_initial: true })
        .order('studies_year DESC')  // Colonne dans block_studies, sans préfixe
        .limit(50);

      const sql = query.toSQL();

      // Doit ajouter un LEFT JOIN vers block_studies
      assert.ok(sql.sql.includes('LEFT JOIN `block_studies`'), 'SQL should LEFT JOIN block_studies for sorting on block column');
      assert.ok(sql.sql.includes('ON `block_studies`.`id` = `pme_folders_with_blocks`.`block_studies_id`'), 'SQL should have correct join condition');

      // Doit transformer ORDER BY en block_studies.studies_year
      assert.ok(sql.sql.includes('ORDER BY block_studies.studies_year DESC'), 'SQL should prefix column with table name');
    });

    it('should handle multiple block columns in ORDER BY', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      query.query.verb = 'select_ids';
      query
        .where({ is_initial: true })
        .order('studies_year DESC')
        .order('bac_year ASC')  // Autre colonne du même block
        .limit(50);

      const sql = query.toSQL();

      // Un seul LEFT JOIN doit être ajouté (pas de duplication)
      const leftJoinCount = (sql.sql.match(/LEFT JOIN `block_studies`/g) || []).length;
      assert.strictEqual(leftJoinCount, 1, 'Should have exactly one LEFT JOIN to block_studies');

      // Les deux colonnes doivent être préfixées
      assert.ok(sql.sql.includes('ORDER BY block_studies.studies_year DESC'), 'Should prefix studies_year');
      assert.ok(sql.sql.includes('block_studies.bac_year ASC'), 'Should prefix bac_year');
    });

    it('should handle ORDER BY on different blocks', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      query.query.verb = 'select_ids';
      query
        .where({ is_initial: true })
        .order('studies_year DESC')  // Colonne dans block_studies
        .order('destination ASC')    // Colonne dans block_travel_wishes
        .limit(50);

      const sql = query.toSQL();

      // Doit ajouter deux LEFT JOIN (un pour chaque block)
      assert.ok(sql.sql.includes('LEFT JOIN `block_studies`'), 'Should LEFT JOIN block_studies');
      assert.ok(sql.sql.includes('LEFT JOIN `block_travel_wishes`'), 'Should LEFT JOIN block_travel_wishes');

      // Les colonnes doivent être préfixées correctement
      assert.ok(sql.sql.includes('ORDER BY block_studies.studies_year DESC'), 'Should prefix studies_year with block_studies');
      assert.ok(sql.sql.includes('block_travel_wishes.destination ASC'), 'Should prefix destination with block_travel_wishes');
    });

    it('should NOT add JOIN if column exists in main table', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      query.query.verb = 'select_ids';
      query
        .where({ is_initial: true })
        .order('professional_activity DESC')  // Colonne dans la table principale
        .limit(50);

      const sql = query.toSQL();

      // Ne doit PAS ajouter de LEFT JOIN
      assert.ok(!sql.sql.includes('LEFT JOIN'), 'Should not add LEFT JOIN for main table column');

      // ORDER BY doit rester simple
      assert.ok(sql.sql.includes('ORDER BY professional_activity DESC'), 'Should keep simple ORDER BY for main table column');
    });

    it('should handle COUNT without JOIN for block ORDER BY', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      query.query.verb = 'count';
      query
        .where({ is_initial: true })
        .order('studies_year DESC')  // ORDER BY est ignoré dans COUNT
        .limit(50);

      const sql = query.toSQL();

      // COUNT ne doit PAS avoir de LEFT JOIN
      assert.ok(!sql.sql.includes('LEFT JOIN'), 'COUNT should not have LEFT JOIN');

      // COUNT ne doit PAS avoir de ORDER BY
      assert.ok(!sql.sql.includes('ORDER BY'), 'COUNT should not have ORDER BY');
    });

    it('should combine block ORDER BY with WHERE filters', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      query.query.verb = 'select_ids';
      query
        .where({
          is_initial: true,
          professional_activity: 'STUDENT'
        })
        .order('studies_year DESC')
        .limit(50);

      const sql = query.toSQL();

      // Doit avoir WHERE sur la table principale
      assert.ok(sql.sql.includes('WHERE'), 'Should have WHERE clause');
      assert.ok(sql.sql.includes('`pme_folders_with_blocks`.`is_initial`'), 'Should filter on is_initial');
      assert.ok(sql.sql.includes('`pme_folders_with_blocks`.`professional_activity`'), 'Should filter on professional_activity');

      // Doit avoir LEFT JOIN pour le tri
      assert.ok(sql.sql.includes('LEFT JOIN `block_studies`'), 'Should LEFT JOIN for ORDER BY');

      // Doit avoir ORDER BY
      assert.ok(sql.sql.includes('ORDER BY block_studies.studies_year DESC'), 'Should have ORDER BY on block column');
    });

    it('should handle SQL functions with block columns', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      query.query.verb = 'select_ids';
      query
        .where({ is_initial: true })
        .order('COALESCE(`studies_year`, "N/A") DESC')
        .limit(50);

      const sql = query.toSQL();

      // Doit ajouter LEFT JOIN pour block_studies
      assert.ok(sql.sql.includes('LEFT JOIN `block_studies`'), 'Should LEFT JOIN block_studies');

      // Doit transformer studies_year en block_studies.studies_year dans la fonction
      assert.ok(sql.sql.includes('COALESCE'), 'Should preserve COALESCE function');
      assert.ok(sql.sql.includes('block_studies.studies_year'), 'Should prefix column in function with table name');
    });

    it('should work with explicit join() on block associations', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      query.query.verb = 'select_ids';
      query
        .where({ is_initial: true })
        .join('studies')  // Join explicite sur l'association
        .order('studies_year DESC')
        .limit(50);

      const sql = query.toSQL();

      // Même comportement : LEFT JOIN ajouté
      assert.ok(sql.sql.includes('LEFT JOIN `block_studies`'), 'Should LEFT JOIN block_studies');
      assert.ok(sql.sql.includes('ORDER BY block_studies.studies_year DESC'), 'Should prefix column with table name');
    });

    it('should transform nested association paths in ORDER BY for phase FULL', () => {
      // Test pour vérifier que les chemins d'associations imbriqués sont transformés
      // dans la phase FULL (qui utilise Query standard, pas PaginatedOptimizedSql)
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'pme' })
        .join('pme_folder.company')
        .order('pme_folder.company.name ASC')  // Chemin d'association imbriqué
        .limit(50);

      const sql = query.toSQL();

      // Dans la phase IDS, le ORDER BY doit être transformé
      assert.ok(sql.sql.includes('ORDER BY companies.name ASC'), 'Should transform nested path to table name in IDS phase');
    });

    it('should transform nested block paths with dot notation (association.block.column)', () => {
      // Test pour vérifier que les chemins imbriqués vers des blocks sont transformés
      // Exemple : pme_folder.company.name doit être transformé en companies.name
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query
        .where({ type: 'pme' })
        .join('pme_folder.company')
        .order('pme_folder.company.name ASC')
        .limit(50);

      const sql = query.toSQL();

      // Le ORDER BY doit être transformé
      assert.ok(sql.sql.includes('ORDER BY companies.name ASC'),
        'Should transform pme_folder.company.name to companies.name in ORDER BY');
    });

    it('should handle nested path to block with 3 levels (folder.pme_folder.block_study.column)', () => {
      // Test pour la hiérarchie complète : Folder -> PMEFolder -> StudiesBlock
      // Ce test correspond au cas réel de l'utilisateur
      const query = mockGetDb(new PaginatedOptimizedQuery(FolderWithNestedBlocks));
      query.query.verb = 'select_ids';
      query
        .where({ type: ['agp', 'avt'] })
        .order('pme_folder.block_study.bac_year DESC')  // Chemin imbriqué vers un block
        .limit(50);

      const sql = query.toSQL();

      // Doit ajouter les LEFT JOIN nécessaires
      assert.ok(sql.sql.includes('LEFT JOIN `pme_folders`'), 'Should LEFT JOIN pme_folders');
      assert.ok(sql.sql.includes('LEFT JOIN `block_studies`'), 'Should LEFT JOIN block_studies');

      // Doit avoir les bonnes conditions de jointure
      assert.ok(sql.sql.includes('ON `pme_folders`.`id` = `folders`.`pme_folder_id`'),
        'Should have correct join condition for pme_folders');
      assert.ok(sql.sql.includes('ON `block_studies`.`id` = `pme_folders`.`block_studies_id`'),
        'Should have correct join condition for block_studies');

      // Le ORDER BY doit être transformé
      assert.ok(sql.sql.includes('ORDER BY block_studies.bac_year DESC'),
        'Should transform pme_folder.block_study.bac_year to block_studies.bac_year');
    });

    it('should transform ORDER BY correctly for FULL phase with block columns', () => {
      // Test pour vérifier que la transformation pour la phase FULL utilise les alias (noms d'associations)
      // au lieu des noms de tables
      const PaginatedOptimizedSql = require('@igojs/db').PaginatedOptimizedSql;
      const query = mockGetDb(new PaginatedOptimizedQuery(FolderWithNestedBlocks));

      query
        .where({ type: ['agp', 'avt'] })
        .order('pme_folder.block_study.bac_year')  // Chemin imbriqué
        .order('created_at DESC')  // Colonne de la table principale
        .limit(50);

      const sqlGenerator = new PaginatedOptimizedSql(query);

      // Test de transformation pour phase IDS (noms de tables)
      const transformedForIDS = sqlGenerator._transformOrderClause('pme_folder.block_study.bac_year');
      assert.strictEqual(transformedForIDS, 'block_studies.bac_year',
        'IDS phase should use table name (block_studies)');

      // Test de transformation pour phase FULL (noms d'associations = alias)
      const transformedForFULL = sqlGenerator._transformOrderClauseForFullQuery('pme_folder.block_study.bac_year');
      assert.strictEqual(transformedForFULL, 'block_study.bac_year',
        'FULL phase should use association name as alias (block_study)');

      // Test avec colonne simple de block (uniquement pour modèles avec associations directes)
      const queryWithBlocks = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      const sqlGeneratorWithBlocks = new PaginatedOptimizedSql(queryWithBlocks);
      const transformedSimpleForFULL = sqlGeneratorWithBlocks._transformOrderClauseForFullQuery('studies_year');
      assert.strictEqual(transformedSimpleForFULL, 'studies.studies_year',
        'FULL phase should find block association for simple column name in direct associations');
    });
  });
});
