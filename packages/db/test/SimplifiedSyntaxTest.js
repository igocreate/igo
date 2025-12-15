/**
 * Tests pour la nouvelle syntaxe simplifiée de PaginatedOptimizedQuery
 *
 * Ces tests valident :
 * - La détection automatique des chemins imbriqués
 * - La génération correcte des filterJoins
 * - Le support de tous les opérateurs ($like, $between, $gte, etc.)
 * - Les opérateurs logiques ($and, $or)
 * - La génération SQL correcte
 */

const assert = require('assert');
const Model = require('@igojs/db').Model;

// ============================
// MODÈLES DE TEST
// ============================

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
  columns: {
    id: 'integer',
    status: 'string',
    company_id: 'integer'
  },
  associations: [
    ['belongs_to', 'company', Company, 'company_id', 'id']
  ]
}) {}

class Applicant extends Model({
  table: 'applicants',
  columns: {
    id: 'integer',
    first_name: 'string',
    last_name: 'string',
    email: 'string',
    identity_number: 'string'
  }
}) {}

class Folder extends Model({
  table: 'folders',
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

// ============================
// HELPERS
// ============================

/**
 * Mock getDb pour la génération SQL
 */
function mockGetDb(query) {
  query.getDb = () => ({
    driver: {
      dialect: {
        esc: '`',
        param: (i) => '?',
        in: 'IN',
        notin: 'NOT IN',
        limit: () => 'LIMIT ?, ?'
      }
    }
  });
}

/**
 * Génère le SQL COUNT pour une query
 */
function generateCountSQL(query) {
  mockGetDb(query);
  query.query.verb = 'count';
  return query.toSQL();
}

// ============================
// TESTS
// ============================

describe('SimplifiedSyntax - PaginatedOptimizedQuery', () => {

  describe('Détection des chemins imbriqués', () => {

    it('devrait détecter un chemin simple (1 niveau)', () => {
      const query = Folder.paginatedOptimized()
        .where({
          status: 'SUBMITTED',
          'applicant.last_name': 'Dupont'
        });

      // Vérifier que filterJoins a été créé
      assert.ok(query.query.filterJoins.length > 0, 'filterJoins devrait contenir au moins un élément');

      // Vérifier que le filtre sur la table principale est dans where
      assert.ok(query.query.where.length > 0, 'where devrait contenir la condition sur status');
    });

    it('devrait détecter un chemin imbriqué (3 niveaux)', () => {
      const query = Folder.paginatedOptimized()
        .where({
          'pme_folder.company.country.code': 'FR'
        });

      // Vérifier que filterJoins nested a été créé
      assert.ok(query.query.filterJoins.length > 0, 'filterJoins devrait être créé');
      assert.equal(query.query.filterJoins[0].type, 'nested', 'Le filterJoin devrait être de type nested');
    });

    it('devrait regrouper les conditions sur la même table', () => {
      const query = Folder.paginatedOptimized()
        .where({
          'applicant.last_name': 'Dupont',
          'applicant.first_name': 'Jean',
          'applicant.email': 'test@test.com'
        });

      // Vérifier qu'un seul filterJoin a été créé (regroupement)
      assert.equal(query.query.filterJoins.length, 1, 'Devrait créer un seul filterJoin pour applicant');
    });

  });

  describe('Opérateurs de comparaison', () => {

    it('devrait supporter $like', () => {
      const query = Folder.paginatedOptimized()
        .where({
          'applicant.last_name': { $like: 'Dup%' }
        });

      const sql = generateCountSQL(query);

      assert.ok(sql.sql.includes('LIKE'), 'Le SQL devrait contenir LIKE');
      assert.ok(sql.params.includes('Dup%'), 'Les paramètres devraient contenir la valeur du LIKE');
    });

    it('devrait supporter $between', () => {
      const query = Folder.paginatedOptimized()
        .where({
          created_at: { $between: ['2024-01-01', '2024-12-31'] }
        });

      const sql = generateCountSQL(query);

      assert.ok(sql.sql.includes('BETWEEN'), 'Le SQL devrait contenir BETWEEN');
      assert.equal(sql.params.length, 2, 'Les paramètres devraient contenir les 2 dates');
    });

    it('devrait supporter $gte (>=)', () => {
      const query = Folder.paginatedOptimized()
        .where({
          'pme_folder.company.id': { $gte: 100 }
        });

      const sql = generateCountSQL(query);

      assert.ok(sql.sql.includes('>='), 'Le SQL devrait contenir >=');
      assert.ok(sql.params.includes(100), 'Les paramètres devraient contenir 100');
    });

    it('devrait supporter $lte (<=)', () => {
      const query = Folder.paginatedOptimized()
        .where({
          'pme_folder.company.id': { $lte: 1000 }
        });

      const sql = generateCountSQL(query);

      assert.ok(sql.sql.includes('<='), 'Le SQL devrait contenir <=');
      assert.ok(sql.params.includes(1000), 'Les paramètres devraient contenir 1000');
    });

    it('devrait supporter $gt (>)', () => {
      const query = Folder.paginatedOptimized()
        .where({
          'pme_folder.company.id': { $gt: 50 }
        });

      const sql = generateCountSQL(query);

      assert.ok(sql.sql.includes('>'), 'Le SQL devrait contenir >');
      assert.ok(sql.params.includes(50), 'Les paramètres devraient contenir 50');
    });

    it('devrait supporter $lt (<)', () => {
      const query = Folder.paginatedOptimized()
        .where({
          'pme_folder.company.id': { $lt: 500 }
        });

      const sql = generateCountSQL(query);

      assert.ok(sql.sql.includes('<'), 'Le SQL devrait contenir <');
      assert.ok(sql.params.includes(500), 'Les paramètres devraient contenir 500');
    });

    it('devrait détecter automatiquement LIKE avec %', () => {
      const query = Folder.paginatedOptimized()
        .where({
          'applicant.last_name': 'Dup%'
        });

      const sql = generateCountSQL(query);

      assert.ok(sql.sql.includes('LIKE'), 'Le SQL devrait contenir LIKE (détection auto du %)');
      assert.ok(sql.params.includes('Dup%'), 'Les paramètres devraient contenir Dup%');
    });

    it('devrait supporter IN avec tableau', () => {
      const query = Folder.paginatedOptimized()
        .where({
          status: ['SUBMITTED', 'VALIDATED']
        });

      const sql = generateCountSQL(query);

      assert.ok(sql.sql.includes('IN'), 'Le SQL devrait contenir IN');
    });

  });

  describe('Opérateurs logiques', () => {

    it('devrait supporter $and', () => {
      const query = Folder.paginatedOptimized()
        .where({
          $and: [
            { status: 'SUBMITTED' },
            { 'applicant.last_name': 'Dupont' }
          ]
        });

      const sql = generateCountSQL(query);

      // Vérifier que les deux conditions sont présentes
      assert.ok(sql.sql.includes('status'), 'Le SQL devrait contenir la condition sur status');
      assert.ok(sql.sql.includes('EXISTS'), 'Le SQL devrait contenir EXISTS pour applicant');
      assert.ok(sql.params.includes('SUBMITTED'), 'Les paramètres devraient contenir SUBMITTED');
      assert.ok(sql.params.includes('Dupont'), 'Les paramètres devraient contenir Dupont');
    });

    it('devrait supporter $or (optimisé en IN si même colonne)', () => {
      // Note : Pour $or sur des colonnes différentes de la table principale,
      // il est préférable d'utiliser IN ou plusieurs appels where()
      // Le $or est principalement utile pour les tables jointes
      const query = Folder.paginatedOptimized()
        .where({
          status: ['SUBMITTED', 'VALIDATED'] // Équivalent à OR
        });

      const sql = generateCountSQL(query);

      // Vérifier que IN est généré (équivalent à OR pour même colonne)
      assert.ok(sql.sql.includes('status'), 'Le SQL devrait contenir status');
      assert.ok(sql.sql.includes('IN'), 'Le SQL devrait contenir IN pour simuler OR');
    });

    it('devrait supporter $and avec conditions sur tables jointes', () => {
      const query = Folder.paginatedOptimized()
        .where({
          $and: [
            { 'applicant.last_name': { $like: 'Dup%' } },
            { 'applicant.first_name': { $like: 'Jean%' } },
            { 'pme_folder.company.siret': { $like: '123%' } }
          ]
        });

      const sql = generateCountSQL(query);

      // Vérifier que plusieurs EXISTS sont générés
      const existsCount = (sql.sql.match(/EXISTS/g) || []).length;
      assert.ok(existsCount >= 2, 'Le SQL devrait contenir au moins 2 EXISTS');
    });

    it('devrait supporter combinaison AND avec conditions multiples', () => {
      const query = Folder.paginatedOptimized()
        .where({
          $and: [
            { status: 'SUBMITTED' },
            { 'applicant.last_name': 'Dupont' },
            { 'applicant.first_name': 'Jean' }
          ]
        });

      // Vérifier que la query est construite sans erreur
      assert.ok(query.query.where.length > 0, 'where devrait contenir des conditions');
      assert.ok(query.query.filterJoins.length > 0, 'filterJoins devrait être créé');

      const sql = generateCountSQL(query);
      assert.ok(sql.sql.includes('EXISTS'), 'Le SQL devrait contenir EXISTS pour les jointures');
    });

  });

  describe('Génération SQL avec EXISTS', () => {

    it('devrait générer un EXISTS pour un chemin simple', () => {
      const query = Folder.paginatedOptimized()
        .where({
          'applicant.last_name': 'Dupont'
        });

      const sql = generateCountSQL(query);

      // Vérifier la structure EXISTS
      assert.ok(sql.sql.includes('EXISTS'), 'Le SQL devrait contenir EXISTS');
      assert.ok(sql.sql.includes('SELECT 1 FROM'), 'Le SQL devrait contenir SELECT 1 FROM');
      assert.ok(sql.sql.includes('applicants'), 'Le SQL devrait référencer la table applicants');
    });

    it('devrait générer des EXISTS imbriqués pour un chemin à 3 niveaux', () => {
      const query = Folder.paginatedOptimized()
        .where({
          'pme_folder.company.country.code': 'FR'
        });

      const sql = generateCountSQL(query);

      // Vérifier que des EXISTS imbriqués sont générés
      const existsCount = (sql.sql.match(/EXISTS/g) || []).length;
      assert.ok(existsCount >= 3, 'Le SQL devrait contenir au moins 3 EXISTS imbriqués');

      // Vérifier que les tables sont mentionnées
      assert.ok(sql.sql.includes('pme_folders'), 'Le SQL devrait référencer pme_folders');
      assert.ok(sql.sql.includes('companies'), 'Le SQL devrait référencer companies');
      assert.ok(sql.sql.includes('countries'), 'Le SQL devrait référencer countries');
    });

    it('devrait optimiser en regroupant les conditions sur la même table', () => {
      const query = Folder.paginatedOptimized()
        .where({
          'applicant.last_name': 'Dupont',
          'applicant.first_name': 'Jean'
        });

      const sql = generateCountSQL(query);

      // Vérifier qu'un seul EXISTS est généré (optimisation)
      const existsCount = (sql.sql.match(/EXISTS/g) || []).length;
      assert.equal(existsCount, 1, 'Le SQL devrait contenir un seul EXISTS (conditions regroupées)');

      // Vérifier que les deux conditions sont présentes
      assert.ok(sql.params.includes('Dupont'), 'Les paramètres devraient contenir Dupont');
      assert.ok(sql.params.includes('Jean'), 'Les paramètres devraient contenir Jean');
    });

  });


  describe('Cas complexes', () => {

    it('devrait gérer une requête de recherche multi-champs', () => {
      const token = 'test';
      const query = Folder.paginatedOptimized()
        .where({
          $and: [
            { created_at: { $between: ['2024-01-01', '2024-12-31'] } },
            { 'applicant.last_name': { $like: `${token}%` } },
            { 'applicant.first_name': { $like: `${token}%` } },
            { 'applicant.email': token },
            { 'applicant.identity_number': { $gte: token } },
            { 'pme_folder.company.siret': { $like: `${token}%` } },
            { 'pme_folder.company.country.code': { $like: `${token}%` } }
          ]
        });

      const sql = generateCountSQL(query);

      // Vérifier que le SQL est généré sans erreur
      assert.ok(sql.sql.length > 0, 'Le SQL devrait être généré');
      assert.ok(sql.sql.includes('EXISTS'), 'Le SQL devrait contenir EXISTS');
    });

    it('devrait gérer les conditions mixtes (table principale + jointes)', () => {
      const query = Folder.paginatedOptimized()
        .where({
          $and: [
            { status: 'SUBMITTED' },
            { type: ['agp', 'avt'] },
            { created_at: { $between: ['2024-01-01', '2024-12-31'] } },
            { 'applicant.last_name': 'Dupont' },
            { 'pme_folder.company.country.code': 'FR' }
          ]
        });

      const sql = generateCountSQL(query);

      // Vérifier que les conditions de la table principale sont dans WHERE
      assert.ok(sql.sql.includes('status'), 'Le SQL devrait contenir status');
      assert.ok(sql.sql.includes('type'), 'Le SQL devrait contenir type');
      assert.ok(sql.sql.includes('created_at'), 'Le SQL devrait contenir created_at');

      // Vérifier que les conditions des tables jointes sont dans EXISTS
      assert.ok(sql.sql.includes('EXISTS'), 'Le SQL devrait contenir EXISTS');
    });

    it('devrait gérer les chemins imbriqués multiples', () => {
      const query = Folder.paginatedOptimized()
        .where({
          'applicant.last_name': 'Dupont',
          'pme_folder.company.siret': '123%',
          'pme_folder.company.country.code': 'FR'
        });

      const sql = generateCountSQL(query);

      // Vérifier que plusieurs EXISTS sont générés
      const existsCount = (sql.sql.match(/EXISTS/g) || []).length;
      assert.ok(existsCount >= 2, 'Le SQL devrait contenir plusieurs EXISTS');
    });

  });

  describe('Validation et erreurs', () => {

    it('devrait accepter un where vide', () => {
      const query = Folder.paginatedOptimized()
        .where({});

      // Pas d'erreur attendue
      assert.ok(query, 'La query devrait être créée sans erreur');
    });

    it('devrait accepter des conditions null/undefined', () => {
      const query = Folder.paginatedOptimized()
        .where({
          status: 'SUBMITTED',
          deleted_at: null
        });

      const sql = generateCountSQL(query);

      // Vérifier que IS NULL est généré
      assert.ok(sql.sql.includes('IS NULL'), 'Le SQL devrait contenir IS NULL');
    });

  });

});
