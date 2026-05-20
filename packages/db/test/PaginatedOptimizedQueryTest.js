const assert = require('assert');

const PaginatedOptimizedQuery = require('@igojs/db').PaginatedOptimizedQuery;
const PaginatedOptimizedSql = require('@igojs/db').PaginatedOptimizedSql;
const Model = require('@igojs/db').Model;

const mockGetDb = (query) => {
  query.getDb = () => ({
    driver: {
      dialect: {
        esc: '`',
        param: (_i) => '?',
        in: 'IN',
        notin: 'NOT IN',
        limit: (_offsetParam, _limitParam) => 'LIMIT ?, ?'
      }
    }
  });
  return query;
};

describe('db.PaginatedOptimizedQuery', function() {

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

  class PmeFolderWithBlocks extends PmeFolder {}

  PmeFolderWithBlocks.schema.columns.block_studies_id = 'integer';
  PmeFolderWithBlocks.schema.columns.block_travel_wishes_id = 'integer';
  PmeFolderWithBlocks.schema.colsByName = PmeFolderWithBlocks.schema.colsByName || {};
  PmeFolderWithBlocks.schema.colsByName.block_studies_id = 'integer';
  PmeFolderWithBlocks.schema.colsByName.block_travel_wishes_id = 'integer';

  class Applicant extends Model({
    table: 'applicants',
    primary: ['id'],
    columns: [
      'id',
      'first_name',
      'last_name',
      'email'
    ]
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

  PmeFolderWithBlocks.schema.associations = [
    ['belongs_to', 'company', Company, 'company_id', 'id'],
    ['belongs_to', 'block_study', StudiesBlock, 'block_studies_id', 'id'],
    ['belongs_to', 'block_travel_wish', TravelWishesBlock, 'block_travel_wishes_id', 'id']
  ];

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

  class Library extends Model({
    table: 'libraries',
    primary: ['id'],
    columns: {
      id: 'integer',
      title: 'string',
      collection: 'string'
    }
  }) {}

  class BookWithExtraWhere extends Model({
    table: 'books',
    primary: ['id'],
    columns: {
      id: 'integer',
      code: 'string',
      title: 'string',
      library_id: 'integer'
    },
    associations: () => ([
      ['belongs_to', 'library', Library, 'library_id', 'id', { collection: 'A' }]
    ])
  }) {}

  class BookWithMultipleExtraWhere extends Model({
    table: 'books_multi',
    primary: ['id'],
    columns: {
      id: 'integer',
      title: 'string',
      library_id: 'integer'
    },
    associations: () => ([
      ['belongs_to', 'library', Library, 'library_id', 'id', { collection: 'A', title: 'Main' }]
    ])
  }) {}

  class BookWithNullExtraWhere extends Model({
    table: 'books_null',
    primary: ['id'],
    columns: {
      id: 'integer',
      code: 'string',
      title: 'string',
      library_id: 'integer'
    },
    associations: () => ([
      ['belongs_to', 'library', Library, 'library_id', 'id', { collection: null }]
    ])
  }) {}

  class Author extends Model({
    table: 'authors',
    primary: ['id'],
    columns: {
      id: 'integer',
      name: 'string',
      pseudonym: 'string'
    }
  }) {}

  class LibraryWithNullExtraAuthor extends Model({
    table: 'libraries_with_author',
    primary: ['id'],
    columns: {
      id: 'integer',
      title: 'string',
      author_id: 'integer'
    },
    associations: () => ([
      ['belongs_to', 'author', Author, 'author_id', 'id', { pseudonym: null }]
    ])
  }) {}

  class BookWithNestedNullExtra extends Model({
    table: 'books_nested_null',
    primary: ['id'],
    columns: {
      id: 'integer',
      title: 'string',
      library_id: 'integer'
    },
    associations: () => ([
      ['belongs_to', 'library', LibraryWithNullExtraAuthor, 'library_id', 'id']
    ])
  }) {}

  // -------------------------------------------------------
  // 1. Unit operators
  // -------------------------------------------------------
  describe('Unit operators on main table', function() {
    it('should generate equality condition', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ status: 'SUBMITTED' });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE `folders`.`status` = ?');
      assert.deepStrictEqual(params, ['SUBMITTED']);
    });

    it('should generate IS NULL', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ applicant_id: null });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE `folders`.`applicant_id` IS NULL');
      assert.deepStrictEqual(params, []);
    });

    it('should generate IN for array values', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ status: ['SUBMITTED', 'VALIDATED'] });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE `folders`.`status` IN (?)');
      assert.deepStrictEqual(params, [['SUBMITTED', 'VALIDATED']]);
    });

    it('should generate FALSE for empty array', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ status: [] });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE FALSE');
      assert.deepStrictEqual(params, []);
    });

    it('should generate explicit $like', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ status: { $like: 'TRANS%' } });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE `folders`.`status` LIKE ?');
      assert.deepStrictEqual(params, ['TRANS%']);
    });

    it('should treat string with % as equality (no implicit LIKE)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ status: 'TRANS%' });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE `folders`.`status` = ?');
      assert.deepStrictEqual(params, ['TRANS%']);
    });

    it('should generate $between', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ created_at: { $between: ['2024-01-01', '2024-12-31'] } });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE `folders`.`created_at` BETWEEN ? AND ?');
      assert.deepStrictEqual(params, ['2024-01-01', '2024-12-31']);
    });

    it('should generate $gte, $lte, $gt, $lt', () => {
      const operators = [
        { op: '$gte', symbol: '>=' },
        { op: '$lte', symbol: '<=' },
        { op: '$gt',  symbol: '>'  },
        { op: '$lt',  symbol: '<'  },
      ];

      for (const { op, symbol } of operators) {
        const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
        query.query.verb = 'count';
        query.where({ created_at: { [op]: '2024-01-01' } });
        const { sql, params } = query.toSQL();

        assert.strictEqual(sql, `SELECT COUNT(0) as \`count\` FROM \`folders\` WHERE \`folders\`.\`created_at\` ${symbol} ?`);
        assert.deepStrictEqual(params, ['2024-01-01']);
      }
    });
  });

  // -------------------------------------------------------
  // 2. Logical operators
  // -------------------------------------------------------
  describe('Logical operators', function() {
    it('should generate implicit AND', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ status: 'SUBMITTED', type: 'agp' });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE `folders`.`status` = ? AND `folders`.`type` = ?');
      assert.deepStrictEqual(params, ['SUBMITTED', 'agp']);
    });

    it('should generate explicit $and', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ $and: [{ status: 'SUBMITTED' }, { type: 'agp' }] });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE (`folders`.`status` = ? AND `folders`.`type` = ?)');
      assert.deepStrictEqual(params, ['SUBMITTED', 'agp']);
    });

    it('should generate simple $or', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ $or: [{ applicant_id: null }, { pme_folder_id: null }] });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE (`folders`.`applicant_id` IS NULL OR `folders`.`pme_folder_id` IS NULL)');
      assert.deepStrictEqual(params, []);
    });

    it('should generate $or with sibling condition (implicit AND)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        status: 'TRANSMIS',
        $or: [{ applicant_id: null }, { pme_folder_id: null }]
      });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE (`folders`.`applicant_id` IS NULL OR `folders`.`pme_folder_id` IS NULL) AND `folders`.`status` = ?');
      assert.deepStrictEqual(params, ['TRANSMIS']);
    });

    it('should generate $or with implicit AND inside one branch', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        $or: [
          { applicant_id: null },
          { pme_folder_id: null, type: 'agp' }
        ]
      });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE (`folders`.`applicant_id` IS NULL OR (`folders`.`pme_folder_id` IS NULL AND `folders`.`type` = ?))');
      assert.deepStrictEqual(params, ['agp']);
    });

    it('should generate nested $or / $and at 3 levels', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        type: 'agp',
        $or: [
          { applicant_id: null },
          {
            $and: [
              { pme_folder_id: null },
              { $or: [
                { status: { $like: 'TRANS%' } },
                { status: 'DRAFT' }
              ]}
            ]
          }
        ]
      });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE (`folders`.`applicant_id` IS NULL OR (`folders`.`pme_folder_id` IS NULL AND (`folders`.`status` LIKE ? OR `folders`.`status` = ?))) AND `folders`.`type` = ?');
      assert.deepStrictEqual(params, ['TRANS%', 'DRAFT', 'agp']);
    });

    it('should not produce WHERE clause for empty where({})', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({});
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders`');
      assert.deepStrictEqual(params, []);
    });
  });

  // -------------------------------------------------------
  // 3. EXISTS joins (verb 'count')
  // -------------------------------------------------------
  describe('EXISTS joins', function() {
    it('should generate 1-level EXISTS', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ status: 'SUBMITTED', 'applicant.last_name': { $like: 'Dupont%' } });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE `folders`.`status` = ? AND EXISTS (SELECT 1 FROM `applicants` WHERE `applicants`.`id` = `folders`.`applicant_id` AND `applicants`.`last_name` LIKE ? )');
      assert.deepStrictEqual(params, ['SUBMITTED', 'Dupont%']);
    });

    it('should group conditions on the same table into one EXISTS', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ 'applicant.last_name': { $like: 'Dupont%' }, 'applicant.email': 'test@test.com' });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE EXISTS (SELECT 1 FROM `applicants` WHERE `applicants`.`id` = `folders`.`applicant_id` AND `applicants`.`last_name` LIKE ? AND `applicants`.`email` = ? )');
      assert.deepStrictEqual(params, ['Dupont%', 'test@test.com']);
    });

    it('should generate 2 separate EXISTS for 2 different joined tables', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ 'applicant.last_name': { $like: 'Dupont%' }, 'pme_folder.status': 'ACTIVE' });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE EXISTS (SELECT 1 FROM `applicants` WHERE `applicants`.`id` = `folders`.`applicant_id` AND `applicants`.`last_name` LIKE ? ) AND EXISTS (SELECT 1 FROM `pme_folders` WHERE `pme_folders`.`id` = `folders`.`pme_folder_id` AND `pme_folders`.`status` = ? )');
      assert.deepStrictEqual(params, ['Dupont%', 'ACTIVE']);
    });

    it('should generate deeply nested EXISTS (3 levels)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ 'pme_folder.company.country.code': 'FR' });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE EXISTS (SELECT 1 FROM `pme_folders` WHERE `pme_folders`.`id` = `folders`.`pme_folder_id` AND EXISTS (SELECT 1 FROM `companies` WHERE `companies`.`id` = `pme_folders`.`company_id` AND EXISTS (SELECT 1 FROM `countries` WHERE `countries`.`id` = `companies`.`country_id` AND `countries`.`code` = ? ) ) )');
      assert.deepStrictEqual(params, ['FR']);
    });

    it('should generate OR-ed EXISTS for $or with joined table conditions', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({
        $or: [
          { 'applicant.last_name': { $like: 'Dupont%' } },
          { 'pme_folder.status': 'ACTIVE' }
        ]
      });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE (EXISTS (SELECT 1 FROM `applicants` WHERE `applicants`.`id` = `folders`.`applicant_id` AND `applicants`.`last_name` LIKE ?) OR EXISTS (SELECT 1 FROM `pme_folders` WHERE `pme_folders`.`id` = `folders`.`pme_folder_id` AND `pme_folders`.`status` = ?))');
      assert.deepStrictEqual(params, ['Dupont%', 'ACTIVE']);
    });

    it('should include extraWhere in EXISTS clause', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(BookWithExtraWhere));
      query.query.verb = 'count';
      query.where({ 'library.title': { $like: 'Test%' } });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `books` WHERE EXISTS (SELECT 1 FROM `libraries` WHERE `libraries`.`id` = `books`.`library_id` AND `libraries`.`collection` = ? AND `libraries`.`title` LIKE ? )');
      assert.deepStrictEqual(params, ['A', 'Test%']);
    });
  });

  // -------------------------------------------------------
  // 4. COUNT and IDS phases (optimizations)
  // -------------------------------------------------------
  describe('COUNT and IDS phase optimizations', function() {
    it('COUNT should have no LEFT JOIN, no ORDER BY, and use EXISTS for filters', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'count';
      query.where({ type: 'agp', 'applicant.last_name': { $like: 'Dupont%' } })
      .order('applicants.last_name ASC')
      .join('applicant');
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `folders` WHERE `folders`.`type` = ? AND EXISTS (SELECT 1 FROM `applicants` WHERE `applicants`.`id` = `folders`.`applicant_id` AND `applicants`.`last_name` LIKE ? )');
      assert.deepStrictEqual(params, ['agp', 'Dupont%']);
    });

    it('IDS should SELECT only id, use EXISTS, ORDER BY + LIMIT, and no LEFT JOIN when sort is on main table', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query.where({ type: 'agp', 'applicant.last_name': { $like: 'Dupont%' } })
      .order('folders.created_at DESC')
      .limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `folders`.`id` FROM `folders` WHERE `folders`.`type` = ? AND EXISTS (SELECT 1 FROM `applicants` WHERE `applicants`.`id` = `folders`.`applicant_id` AND `applicants`.`last_name` LIKE ? ) ORDER BY folders.created_at DESC LIMIT ?, ?');
      assert.deepStrictEqual(params, ['agp', 'Dupont%', 0, 50]);
    });
  });

  // -------------------------------------------------------
  // 5. Sort on joined tables
  // -------------------------------------------------------
  describe('Sort on joined tables', function() {
    it('should add LEFT JOIN when sorting on a joined table column', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query.where({ type: 'agp' }).order('applicants.last_name ASC').limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `folders`.`id` FROM `folders` LEFT JOIN `applicants` ON `applicants`.`id` = `folders`.`applicant_id` WHERE `folders`.`type` = ? ORDER BY applicants.last_name ASC LIMIT ?, ?');
      assert.deepStrictEqual(params, ['agp', 0, 50]);
    });

    it('should add cascading LEFT JOINs for nested sort path', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query.where({ type: 'pme' }).order('pme_folder.company.name ASC').limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `folders`.`id` FROM `folders` LEFT JOIN `pme_folders` ON `pme_folders`.`id` = `folders`.`pme_folder_id` LEFT JOIN `companies` ON `companies`.`id` = `pme_folders`.`company_id` WHERE `folders`.`type` = ? ORDER BY companies.name ASC LIMIT ?, ?');
      assert.deepStrictEqual(params, ['pme', 0, 50]);
    });

    it('should not add any JOIN when sorting on main table column', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query.where({ type: 'agp' }).order('folders.created_at DESC').limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `folders`.`id` FROM `folders` WHERE `folders`.`type` = ? ORDER BY folders.created_at DESC LIMIT ?, ?');
      assert.deepStrictEqual(params, ['agp', 0, 50]);
    });

    it('should transform association name to table name in ORDER BY', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query.where({ type: 'agp' }).order('pme_folder.company.name ASC').join('pme_folder.company').limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `folders`.`id` FROM `folders` LEFT JOIN `pme_folders` ON `pme_folders`.`id` = `folders`.`pme_folder_id` LEFT JOIN `companies` ON `companies`.`id` = `pme_folders`.`company_id` WHERE `folders`.`type` = ? ORDER BY companies.name ASC LIMIT ?, ?');
      assert.deepStrictEqual(params, ['agp', 0, 50]);
    });

    it('should preserve SQL functions (COALESCE, CONCAT, IFNULL) in ORDER BY', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query.where({ type: 'agp' }).join('applicant')
      .order('COALESCE(`applicant`.`last_name`, `applicant`.`first_name`) ASC')
      .limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `folders`.`id` FROM `folders` LEFT JOIN `applicants` ON `applicants`.`id` = `folders`.`applicant_id` WHERE `folders`.`type` = ? ORDER BY COALESCE(applicants.last_name, applicants.first_name) ASC LIMIT ?, ?');
      assert.deepStrictEqual(params, ['agp', 0, 50]);
    });

    it('should be idempotent when transforming paths (_transformSinglePath)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      const sqlGenerator = new PaginatedOptimizedSql(query);

      const transformed1 = sqlGenerator._transformSinglePath('applicant.last_name');
      const transformed2 = sqlGenerator._transformSinglePath(transformed1);

      assert.strictEqual(transformed1, 'applicants.last_name');
      assert.strictEqual(transformed1, transformed2);
    });

    // Bug repro: CASE expression in ORDER BY gets mangled by _transformOrderClauseForFullQuery.
    // Encountered on Certigo's CRM /crm/clients page, where the Client model's default scope is:
    //   order("CASE `clients`.`type` WHEN 'P' THEN `clients`.`last_name` ELSE `clients`.`name` END ASC, `clients`.`first_name`")
    // The transform strips backticks then calls _transformPathForFullQuery, which splits by '.'
    // and mangles the CASE into invalid SQL like "name END ASC, clients.first_name", producing
    // a MySQL syntax error at the FULL phase of paginated queries.
    it('should preserve CASE expression with trailing column in ORDER BY (FULL phase)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      const sqlGenerator = new PaginatedOptimizedSql(query);
      const orderClause = 'CASE `folders`.`type` WHEN \'P\' THEN `folders`.`status` ELSE `folders`.`created_at` END ASC, `folders`.`id`';

      const transformed = sqlGenerator._transformOrderClauseForFullQuery(orderClause);

      // The transformed clause must be valid SQL. Current buggy output:
      //   "name END ASC, clients.first_name"-style mangle where split-by-dot treats
      //   the CASE body as an association path.
      assert.ok(
        !/\bEND\b(?!\s+(ASC|DESC))/i.test(transformed) || /CASE/i.test(transformed),
        `CASE expression was mangled: ${transformed}`
      );
      assert.ok(
        /CASE/i.test(transformed),
        `CASE keyword lost: ${transformed}`
      );
    });

    it('should preserve CASE-only ORDER BY clause (FULL phase)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      const sqlGenerator = new PaginatedOptimizedSql(query);
      const orderClause = 'CASE `folders`.`type` WHEN \'P\' THEN `folders`.`status` ELSE `folders`.`created_at` END ASC';

      const transformed = sqlGenerator._transformOrderClauseForFullQuery(orderClause);

      assert.ok(
        /CASE/i.test(transformed),
        `CASE keyword lost: ${transformed}`
      );
      assert.ok(
        /\bEND\s+ASC$/i.test(transformed),
        `CASE...END structure mangled: ${transformed}`
      );
    });

    it('should transform association paths inside CASE (IDS phase)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      const sqlGenerator = new PaginatedOptimizedSql(query);
      const orderClause = 'CASE `folders`.`type` WHEN \'P\' THEN `applicant`.`last_name` ELSE `applicant`.`first_name` END ASC';

      const transformed = sqlGenerator._transformOrderClause(orderClause);

      assert.strictEqual(
        transformed,
        'CASE folders.type WHEN \'P\' THEN applicants.last_name ELSE applicants.first_name END ASC'
      );
    });

    it('should handle multi-clause ORDER BY with comma (IDS phase)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      const sqlGenerator = new PaginatedOptimizedSql(query);

      const transformed = sqlGenerator._transformOrderClause(
        'applicant.last_name ASC, applicant.first_name DESC'
      );

      assert.strictEqual(
        transformed,
        'applicants.last_name ASC, applicants.first_name DESC'
      );
    });

    it('should handle multi-clause ORDER BY with comma (FULL phase)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      const sqlGenerator = new PaginatedOptimizedSql(query);

      const transformed = sqlGenerator._transformOrderClauseForFullQuery(
        '`applicant`.`last_name` ASC, `applicant`.`first_name` DESC'
      );

      assert.strictEqual(
        transformed,
        'applicant.last_name ASC, applicant.first_name DESC'
      );
    });

    it('should transform paths inside IF() (IDS phase)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      const sqlGenerator = new PaginatedOptimizedSql(query);

      const transformed = sqlGenerator._transformOrderClause(
        'IF(`folders`.`type` = \'P\', `applicant`.`last_name`, `applicant`.`first_name`) ASC'
      );

      assert.strictEqual(
        transformed,
        'IF(folders.type = \'P\', applicants.last_name, applicants.first_name) ASC'
      );
    });

    it('should transform paths inside NULLIF() (IDS phase)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      const sqlGenerator = new PaginatedOptimizedSql(query);

      const transformed = sqlGenerator._transformOrderClause(
        'NULLIF(`applicant`.`last_name`, \'\') ASC'
      );

      assert.strictEqual(
        transformed,
        'NULLIF(applicants.last_name, \'\') ASC'
      );
    });

    it('should handle arithmetic expressions with block columns (IDS phase)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      const sqlGenerator = new PaginatedOptimizedSql(query);

      const transformed = sqlGenerator._transformOrderClause('studies_year + bac_year DESC');

      assert.strictEqual(transformed, 'block_studies.studies_year + block_studies.bac_year DESC');
    });

    it('should preserve CASE keyword and transform block columns (IDS phase)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      const sqlGenerator = new PaginatedOptimizedSql(query);

      const transformed = sqlGenerator._transformOrderClause(
        'CASE WHEN `studies_year` > 2020 THEN 1 ELSE 0 END DESC'
      );

      assert.ok(/^CASE /i.test(transformed), `CASE prefix lost: ${transformed}`);
      assert.ok(/\bEND\s+DESC$/i.test(transformed), `END DESC suffix lost: ${transformed}`);
      assert.ok(
        /block_studies\.studies_year/.test(transformed) || /`block_studies`\.`studies_year`/.test(transformed),
        `studies_year not prefixed with block table: ${transformed}`
      );
    });

  });

  // -------------------------------------------------------
  // 6. Block tables
  // -------------------------------------------------------
  describe('Block tables', function() {
    it('should add LEFT JOIN and prefix ORDER BY for a block column', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      query.query.verb = 'select_ids';
      query.where({ is_initial: true }).order('studies_year DESC').limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `pme_folders_with_blocks`.`id` FROM `pme_folders_with_blocks` LEFT JOIN `block_studies` ON `block_studies`.`id` = `pme_folders_with_blocks`.`block_studies_id` WHERE `pme_folders_with_blocks`.`is_initial` = ? ORDER BY block_studies.studies_year DESC LIMIT ?, ?');
      assert.deepStrictEqual(params, [true, 0, 50]);
    });

    it('should deduplicate LEFT JOINs when multiple columns from the same block', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      query.query.verb = 'select_ids';
      query.where({ is_initial: true }).order('studies_year DESC').order('bac_year ASC').limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `pme_folders_with_blocks`.`id` FROM `pme_folders_with_blocks` LEFT JOIN `block_studies` ON `block_studies`.`id` = `pme_folders_with_blocks`.`block_studies_id` WHERE `pme_folders_with_blocks`.`is_initial` = ? ORDER BY block_studies.studies_year DESC, block_studies.bac_year ASC LIMIT ?, ?');
      assert.deepStrictEqual(params, [true, 0, 50]);
    });

    it('should add separate LEFT JOINs for columns from different blocks', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      query.query.verb = 'select_ids';
      query.where({ is_initial: true }).order('studies_year DESC').order('destination ASC').limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `pme_folders_with_blocks`.`id` FROM `pme_folders_with_blocks` LEFT JOIN `block_studies` ON `block_studies`.`id` = `pme_folders_with_blocks`.`block_studies_id` LEFT JOIN `block_travel_wishes` ON `block_travel_wishes`.`id` = `pme_folders_with_blocks`.`block_travel_wishes_id` WHERE `pme_folders_with_blocks`.`is_initial` = ? ORDER BY block_studies.studies_year DESC, block_travel_wishes.destination ASC LIMIT ?, ?');
      assert.deepStrictEqual(params, [true, 0, 50]);
    });

    it('should not add JOIN when sorting on a main table column', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      query.query.verb = 'select_ids';
      query.where({ is_initial: true }).order('professional_activity DESC').limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `pme_folders_with_blocks`.`id` FROM `pme_folders_with_blocks` WHERE `pme_folders_with_blocks`.`is_initial` = ? ORDER BY professional_activity DESC LIMIT ?, ?');
      assert.deepStrictEqual(params, [true, 0, 50]);
    });

    it('should add LEFT JOIN for unprefixed column found in explicitly joined table', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(Folder));
      query.query.verb = 'select_ids';
      query.join('applicant');
      query.where({ type: 'agp' }).order('first_name ASC').limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `folders`.`id` FROM `folders` LEFT JOIN `applicants` ON `applicants`.`id` = `folders`.`applicant_id` WHERE `folders`.`type` = ? ORDER BY applicants.first_name ASC LIMIT ?, ?');
      assert.deepStrictEqual(params, ['agp', 0, 50]);
    });

    it('should handle nested path 3 levels (folder -> pme_folder -> block_study)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(FolderWithNestedBlocks));
      query.query.verb = 'select_ids';
      query.where({ type: ['agp', 'avt'] }).order('pme_folder.block_study.bac_year DESC').limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `folders`.`id` FROM `folders` LEFT JOIN `pme_folders` ON `pme_folders`.`id` = `folders`.`pme_folder_id` LEFT JOIN `block_studies` ON `block_studies`.`id` = `pme_folders`.`block_studies_id` WHERE `folders`.`type` IN (?) ORDER BY block_studies.bac_year DESC LIMIT ?, ?');
      assert.deepStrictEqual(params, [['agp', 'avt'], 0, 50]);
    });

    it('should transform nested path correctly for FULL phase (alias vs table name)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(FolderWithNestedBlocks));
      query.where({ type: ['agp', 'avt'] }).order('pme_folder.block_study.bac_year').limit(50);

      const sqlGenerator = new PaginatedOptimizedSql(query);

      const idsTransform = sqlGenerator._transformOrderClause('pme_folder.block_study.bac_year');
      assert.strictEqual(idsTransform, 'block_studies.bac_year');

      const fullTransform = sqlGenerator._transformOrderClauseForFullQuery('pme_folder.block_study.bac_year');
      assert.strictEqual(fullTransform, 'block_study.bac_year');

      const queryBlocks = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      const sqlGenBlocks = new PaginatedOptimizedSql(queryBlocks);
      assert.strictEqual(sqlGenBlocks._transformOrderClauseForFullQuery('studies_year'), 'studies.studies_year');
    });

    it('should handle COALESCE with block column', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(PMEFolderWithBlocks));
      query.query.verb = 'select_ids';
      query.where({ is_initial: true }).order('COALESCE(`studies_year`, "N/A") DESC').limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `pme_folders_with_blocks`.`id` FROM `pme_folders_with_blocks` LEFT JOIN `block_studies` ON `block_studies`.`id` = `pme_folders_with_blocks`.`block_studies_id` WHERE `pme_folders_with_blocks`.`is_initial` = ? ORDER BY COALESCE(block_studies.studies_year, "N/A") DESC LIMIT ?, ?');
      assert.deepStrictEqual(params, [true, 0, 50]);
    });
  });

  // -------------------------------------------------------
  // 7. extraWhere on associations
  // -------------------------------------------------------
  describe('extraWhere on associations', function() {
    it('should apply extraWhere in LEFT JOIN condition (verb select_ids)', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(BookWithExtraWhere));
      query.query.verb = 'select_ids';
      query.where({ code: 'ABC' }).order('library.title ASC').limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `books`.`id` FROM `books` LEFT JOIN `libraries` ON `libraries`.`id` = `books`.`library_id` AND `libraries`.`collection` = ? WHERE `books`.`code` = ? ORDER BY libraries.title ASC LIMIT ?, ?');
      assert.deepStrictEqual(params, ['A', 'ABC', 0, 50]);
    });

    it('should apply extraWhere in both EXISTS and LEFT JOIN when combined', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(BookWithExtraWhere));
      query.query.verb = 'select_ids';
      query.where({ code: 'ABC', 'library.title': { $like: 'Test%' } }).order('library.title ASC').limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `books`.`id` FROM `books` LEFT JOIN `libraries` ON `libraries`.`id` = `books`.`library_id` AND `libraries`.`collection` = ? WHERE `books`.`code` = ? AND EXISTS (SELECT 1 FROM `libraries` WHERE `libraries`.`id` = `books`.`library_id` AND `libraries`.`collection` = ? AND `libraries`.`title` LIKE ? ) ORDER BY libraries.title ASC LIMIT ?, ?');
      assert.deepStrictEqual(params, ['A', 'ABC', 'A', 'Test%', 0, 50]);
    });

    it('COUNT should not include LEFT JOIN even with extraWhere sort', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(BookWithExtraWhere));
      query.query.verb = 'count';
      query.where({ code: 'ABC' }).order('library.title ASC');
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `books` WHERE `books`.`code` = ?');
      assert.deepStrictEqual(params, ['ABC']);
    });

    it('should apply multiple extraWhere conditions', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(BookWithMultipleExtraWhere));
      query.query.verb = 'count';
      query.where({ 'library.title': { $like: 'Test%' } });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `books_multi` WHERE EXISTS (SELECT 1 FROM `libraries` WHERE `libraries`.`id` = `books_multi`.`library_id` AND `libraries`.`collection` = ? AND `libraries`.`title` = ? AND `libraries`.`title` LIKE ? )');
      assert.deepStrictEqual(params, ['A', 'Main', 'Test%']);
    });

    it('should render extraWhere with null value as IS NULL in simple EXISTS', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(BookWithNullExtraWhere));
      query.query.verb = 'count';
      query.where({ 'library.title': { $like: 'Test%' } });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `books_null` WHERE EXISTS (SELECT 1 FROM `libraries` WHERE `libraries`.`id` = `books_null`.`library_id` AND `libraries`.`collection` IS NULL AND `libraries`.`title` LIKE ? )');
      assert.deepStrictEqual(params, ['Test%']);
    });

    it('should render extraWhere with null value as IS NULL in LEFT JOIN sort', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(BookWithNullExtraWhere));
      query.query.verb = 'select_ids';
      query.where({ code: 'ABC' }).order('library.title ASC').limit(50);
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT `books_null`.`id` FROM `books_null` LEFT JOIN `libraries` ON `libraries`.`id` = `books_null`.`library_id` AND `libraries`.`collection` IS NULL WHERE `books_null`.`code` = ? ORDER BY libraries.title ASC LIMIT ?, ?');
      assert.deepStrictEqual(params, ['ABC', 0, 50]);
    });

    it('should render extraWhere with null value as IS NULL in nested EXISTS', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(BookWithNestedNullExtra));
      query.query.verb = 'count';
      query.where({ 'library.author.name': 'Hugo' });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `books_nested_null` WHERE EXISTS (SELECT 1 FROM `libraries_with_author` WHERE `libraries_with_author`.`id` = `books_nested_null`.`library_id` AND EXISTS (SELECT 1 FROM `authors` WHERE `authors`.`id` = `libraries_with_author`.`author_id` AND `authors`.`pseudonym` IS NULL AND `authors`.`name` = ? ) )');
      assert.deepStrictEqual(params, ['Hugo']);
    });

    it('should render extraWhere with null value as IS NULL in OR-group EXISTS', () => {
      const query = mockGetDb(new PaginatedOptimizedQuery(BookWithNullExtraWhere));
      query.query.verb = 'count';
      query.where({
        $or: [
          { 'library.title': { $like: 'Dupont%' } },
          { 'library.collection': 'B' }
        ]
      });
      const { sql, params } = query.toSQL();

      assert.strictEqual(sql, 'SELECT COUNT(0) as `count` FROM `books_null` WHERE (EXISTS (SELECT 1 FROM `libraries` WHERE `libraries`.`id` = `books_null`.`library_id` AND `libraries`.`collection` IS NULL AND `libraries`.`title` LIKE ?) OR EXISTS (SELECT 1 FROM `libraries` WHERE `libraries`.`id` = `books_null`.`library_id` AND `libraries`.`collection` IS NULL AND `libraries`.`collection` = ?))');
      assert.deepStrictEqual(params, ['Dupont%', 'B']);
    });
  });
});
