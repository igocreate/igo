/**
 * Exemple : Tri sur une colonne d'une table jointe
 *
 * Ce fichier démontre comment OptimizedQuery gère automatiquement le tri
 * sur des colonnes de tables jointes en ajoutant les INNER JOIN nécessaires.
 */

const Model = require('../src/db/Model');

// ============================
// DÉFINITION DES MODÈLES
// ============================

class Applicant extends Model({
  table: 'applicants',
  columns: {
    id: 'integer',
    first_name: 'string',
    last_name: 'string',
    email: 'string'
  }
}) {}

class Folder extends Model({
  table: 'folders',
  columns: {
    id: 'integer',
    type: 'string',
    status: 'string',
    applicant_id: 'integer',
    created_at: 'datetime'
  },
  associations: [
    ['belongs_to', 'applicant', Applicant, 'applicant_id', 'id']
  ]
}) {}

// ============================
// EXEMPLES
// ============================

/**
 * Exemple 1 : Tri sur la table principale (pas de JOIN nécessaire)
 */
function example1_SortOnMainTable() {
  console.log('=== EXEMPLE 1 : TRI SUR TABLE PRINCIPALE ===\n');

  const query = Folder.paginatedOptimized()
    .where({ type: ['agp', 'avt'] })
    .order('folders.created_at DESC')
    .limit(50);

  console.log('Configuration :');
  console.log('- Tri sur folders.created_at (table principale)');
  console.log('- Pas de JOIN nécessaire\n');

  return query;
}

/**
 * Exemple 2 : Tri sur une table jointe (INNER JOIN automatique)
 */
function example2_SortOnJoinedTable() {
  console.log('=== EXEMPLE 2 : TRI SUR TABLE JOINTE ===\n');

  const query = Folder.paginatedOptimized()
    .where({ type: ['agp', 'avt'] })
    .order('applicants.last_name ASC')
    .join('applicant')
    .limit(50);

  console.log('Configuration :');
  console.log('- Tri sur applicants.last_name (table jointe)');
  console.log('- INNER JOIN automatiquement ajouté pour le tri\n');

  return query;
}

/**
 * Exemple 3 : Tri avec filtres sur table jointe
 */
function example3_SortAndFilterOnJoinedTable() {
  console.log('=== EXEMPLE 3 : TRI + FILTRES SUR TABLE JOINTE ===\n');

  const query = Folder.paginatedOptimized()
    .where({ type: ['agp', 'avt'] })
    .filterJoin('applicant', { email: '%@example.com' })
    .order('applicants.last_name ASC')
    .join('applicant')
    .limit(50);

  console.log('Configuration :');
  console.log('- Filtre : applicant.email LIKE "%@example.com"');
  console.log('- Tri : applicants.last_name ASC');
  console.log('- INNER JOIN pour le tri + EXISTS pour le filtre\n');

  return query;
}

/**
 * Exemple 4 : Tri multiple (table principale + table jointe)
 */
function example4_MultipleSortColumns() {
  console.log('=== EXEMPLE 4 : TRI MULTIPLE ===\n');

  const query = Folder.paginatedOptimized()
    .where({ type: 'agp' })
    .order('applicants.last_name ASC')
    .order('folders.created_at DESC')
    .join('applicant')
    .limit(50);

  console.log('Configuration :');
  console.log('- Tri primaire : applicants.last_name ASC');
  console.log('- Tri secondaire : folders.created_at DESC');
  console.log('- INNER JOIN pour le tri sur applicants\n');

  return query;
}

/**
 * Afficher le SQL généré
 */
function showGeneratedSQL(query, phase) {
  // Mock getDb pour générer le SQL
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

  query.query.verb = phase;
  const sql = query.toSQL();

  console.log(`SQL ${phase.toUpperCase()} généré :`);
  console.log('─'.repeat(70));
  console.log(sql.sql);
  console.log('─'.repeat(70));
  console.log(`Paramètres : ${JSON.stringify(sql.params)}`);
  console.log('\n');
}

/**
 * Comparaison AVANT / APRÈS
 */
function comparisonBeforeAfter() {
  console.log('=== COMPARAISON : TRI SUR TABLE JOINTE ===\n');

  console.log('SANS optimisation (approche naïve) :');
  console.log('─'.repeat(70));
  console.log(`
Problème : On ne peut pas trier sur une table jointe dans la phase IDS
car on n'a pas fait de JOIN. Solution naïve : trier en mémoire après
avoir récupéré toutes les données → TRÈS LENT.
  `);

  console.log('AVEC optimisation (INNER JOIN automatique) :');
  console.log('─'.repeat(70));
  console.log(`
Phase IDS avec INNER JOIN :
SELECT f.id
FROM folders f
INNER JOIN applicants a ON a.id = f.applicant_id
WHERE f.type IN ('agp', 'avt')
ORDER BY a.last_name ASC
LIMIT 50 OFFSET 0

Avantages :
✅ Tri effectué côté base de données (rapide)
✅ Pagination correcte (les bons 50 résultats triés)
✅ INNER JOIN uniquement dans IDS (pas dans COUNT)
✅ Détection automatique des colonnes de tri

Note : On utilise INNER JOIN (pas LEFT JOIN) car si on trie sur
applicants.last_name, on veut uniquement les folders qui ONT un applicant.
  `);
}

// ============================
// EXÉCUTION
// ============================

module.exports = {
  example1_SortOnMainTable,
  example2_SortOnJoinedTable,
  example3_SortAndFilterOnJoinedTable,
  example4_MultipleSortColumns,
  comparisonBeforeAfter
};

if (require.main === module) {
  (async () => {
    console.log('\n');

    const q1 = example1_SortOnMainTable();
    showGeneratedSQL(q1, 'select_ids');

    const q2 = example2_SortOnJoinedTable();
    showGeneratedSQL(q2, 'select_ids');

    const q3 = example3_SortAndFilterOnJoinedTable();
    showGeneratedSQL(q3, 'select_ids');

    const q4 = example4_MultipleSortColumns();
    showGeneratedSQL(q4, 'select_ids');

    comparisonBeforeAfter();
  })().catch(console.error);
}
