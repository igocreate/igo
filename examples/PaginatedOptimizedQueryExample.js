/**
 * Exemple d'utilisation de OptimizedQuery pour optimiser les requêtes avec de nombreuses jointures
 *
 * Ce fichier illustre comment utiliser le pattern COUNT/IDS/FULL pour améliorer drastiquement
 * les performances sur des tables volumineuses avec de nombreuses jointures.
 *
 * Contexte : Table `folders` avec ~2 millions de lignes et 10 jointures vers d'autres tables
 * (applicants, pme_folders, delegations, users, etc.)
 *
 * Problème initial : COUNT et SELECT avec LEFT JOIN prennent plusieurs secondes (voire minutes)
 * Solution : Pattern optimisé avec EXISTS pour le filtrage et pagination en 2 phases
 */

const Model = require('../src/db/Model');

// ============================
// 1. DÉFINITION DES MODÈLES
// ============================

/**
 * Modèle Folder
 *
 * Table principale avec millions de lignes
 */
class Folder extends Model({
  table: 'folders',
  columns: {
    id: 'integer',
    type: 'string',
    status: 'string',
    applicant_id: 'integer',
    pme_folder_id: 'integer',
    delegation_id: 'integer',
    user_id: 'integer',
    created_at: 'datetime',
    updated_at: 'datetime'
  },
  associations: [
    ['belongs_to', 'applicant', Applicant, 'applicant_id', 'id'],
    ['belongs_to', 'pme_folder', PmeFolder, 'pme_folder_id', 'id'],
    ['belongs_to', 'delegation', Delegation, 'delegation_id', 'id'],
    ['belongs_to', 'user', User, 'user_id', 'id']
  ]
}) {}

/**
 * Modèle Applicant
 */
class Applicant extends Model({
  table: 'applicants',
  columns: {
    id: 'integer',
    first_name: 'string',
    last_name: 'string',
    email: 'string',
    phone: 'string',
    created_at: 'datetime'
  }
}) {}

/**
 * Modèle PmeFolder
 */
class PmeFolder extends Model({
  table: 'pme_folders',
  columns: {
    id: 'integer',
    status: 'string',
    company_name: 'string',
    siret: 'string',
    created_at: 'datetime'
  }
}) {}

/**
 * Modèle Delegation
 */
class Delegation extends Model({
  table: 'delegations',
  columns: {
    id: 'integer',
    code: 'string',
    name: 'string'
  }
}) {}

/**
 * Modèle User
 */
class User extends Model({
  table: 'users',
  columns: {
    id: 'integer',
    email: 'string',
    name: 'string'
  }
}) {}

// ============================
// 2. COMPARAISON AVANT/APRÈS
// ============================

/**
 * AVANT : Méthode traditionnelle avec LEFT JOIN
 *
 * Problème : Cette requête fait un LEFT JOIN sur toutes les tables, ce qui crée
 * un produit cartésien énorme et rend la requête très lente.
 *
 * SQL généré (simplifié) :
 *
 * SELECT COUNT(0) FROM folders f
 * LEFT JOIN applicants a ON a.id = f.applicant_id
 * LEFT JOIN pme_folders p ON p.id = f.pme_folder_id
 * LEFT JOIN delegations d ON d.id = f.delegation_id
 * WHERE f.type IN ('agp', 'avt', 'cga', ...)
 * AND a.last_name LIKE '%Dupont%'
 * AND p.status = 'ACTIVE'
 * AND d.code = 'MAY'
 *
 * Temps d'exécution : 5-10 secondes (voire plus)
 */
async function traditionalQuery() {
  console.log('=== MÉTHODE TRADITIONNELLE (LENTE) ===\n');

  const startTime = Date.now();

  const result = await Folder
    .join(['applicant', 'pme_folder', 'delegation', 'user'])
    .where({
      'folders.type': ['agp', 'avt', 'cga', 'cgp', 'cpa', 'cva']
    })
    .where([
      'applicants.last_name LIKE $?',
      '%Dupont%'
    ])
    .where({
      'pme_folders.status': 'ACTIVE'
    })
    .where({
      'delegations.code': 'MAY'
    })
    .order('folders.created_at DESC')
    .page(1, 50);

  const duration = Date.now() - startTime;

  console.log(`Résultats : ${result.pagination.count} lignes trouvées`);
  console.log(`Temps d'exécution : ${duration}ms`);
  console.log(`Page : ${result.pagination.page}/${result.pagination.nb_pages}`);
  console.log(`Nombre de résultats : ${result.rows.length}\n`);

  return result;
}

/**
 * APRÈS : Méthode optimisée avec pattern COUNT/IDS/FULL
 *
 * Solution : Cette requête utilise EXISTS pour le filtrage (COUNT et IDS)
 * et fait les LEFT JOIN uniquement sur les IDs trouvés (FULL).
 *
 * SQL généré :
 *
 * Phase 1 - COUNT :
 * SELECT COUNT(0) FROM folders f
 * WHERE f.type IN ('agp', 'avt', 'cga', ...)
 * AND EXISTS (
 *   SELECT 1 FROM applicants a
 *   WHERE a.id = f.applicant_id
 *   AND a.last_name LIKE '%Dupont%'
 * )
 * AND EXISTS (
 *   SELECT 1 FROM pme_folders p
 *   WHERE p.id = f.pme_folder_id
 *   AND p.status = 'ACTIVE'
 * )
 * AND EXISTS (
 *   SELECT 1 FROM delegations d
 *   WHERE d.id = f.delegation_id
 *   AND d.code = 'MAY'
 * )
 *
 * Phase 2 - SELECT IDS :
 * SELECT f.id FROM folders f
 * WHERE ... (mêmes conditions qu'au-dessus)
 * ORDER BY f.created_at DESC
 * LIMIT 50 OFFSET 0
 *
 * Phase 3 - SELECT FULL :
 * SELECT f.*, a.*, p.*, d.*, u.*
 * FROM folders f
 * LEFT JOIN applicants a ON a.id = f.applicant_id
 * LEFT JOIN pme_folders p ON p.id = f.pme_folder_id
 * LEFT JOIN delegations d ON d.id = f.delegation_id
 * LEFT JOIN users u ON u.id = f.user_id
 * WHERE f.id IN (101, 102, 103, ..., 150)
 * ORDER BY f.created_at DESC
 *
 * Temps d'exécution : 50-200ms (amélioration de 50x à 100x)
 */
async function optimizedQuery() {
  console.log('=== MÉTHODE OPTIMISÉE (RAPIDE) ===\n');

  const startTime = Date.now();

  const result = await Folder.paginatedOptimized()
    // Filtres sur la table principale
    .where({
      type: ['agp', 'avt', 'cga', 'cgp', 'cpa', 'cva']
    })

    // Filtres sur tables jointes → convertis en EXISTS
    .filterJoin('applicant', { last_name: 'Dupont%' })
    .filterJoin('pme_folder', { status: 'ACTIVE' })
    .filterJoin('delegation', { code: 'MAY' })

    // Jointures pour récupérer les données (LEFT JOIN dans phase FULL uniquement)
    .join(['applicant', 'pme_folder', 'delegation', 'user'])

    // Tri et pagination
    .order('folders.created_at DESC')
    .page(1, 50)
    .execute();

  const duration = Date.now() - startTime;

  console.log(`Résultats : ${result.pagination.count} lignes trouvées`);
  console.log(`Temps d'exécution : ${duration}ms`);
  console.log(`Page : ${result.pagination.page}/${result.pagination.nb_pages}`);
  console.log(`Nombre de résultats : ${result.rows.length}\n`);

  return result;
}

// ============================
// 3. AUTRES EXEMPLES D'USAGE
// ============================

/**
 * Exemple 1 : Filtres imbriqués
 *
 * Utilise filterJoinNested pour des associations à plusieurs niveaux
 */
async function nestedFiltersExample() {
  console.log('=== EXEMPLE : FILTRES IMBRIQUÉS ===\n');

  const result = await Folder.paginatedOptimized()
    .where({ status: 'SUBMITTED' })
    .filterJoinNested({
      pme_folder: {
        conditions: { status: 'ACTIVE' },
        nested: {
          // Si pme_folder avait une association 'company'
          company: {
            conditions: { country: 'FR' }
          }
        }
      }
    })
    .join('pme_folder')
    .page(1, 25)
    .execute();

  console.log(`Résultats : ${result.pagination.count} lignes\n`);
  return result;
}

/**
 * Exemple 2 : Filtres complexes avec OR
 *
 * Utilise l'opérateur OR pour des conditions alternatives
 */
async function orFiltersExample() {
  console.log('=== EXEMPLE : FILTRES AVEC OR ===\n');

  const result = await Folder.paginatedOptimized()
    .where({ type: 'agp' })
    // Chercher les applicants dont le nom OU l'email correspond
    .filterJoin('applicant', {
      last_name: 'Dupont%',
      email: '%dupont%'
    }, 'OR')
    .join('applicant')
    .limit(10)
    .execute();

  console.log(`Résultats : ${result.length} lignes\n`);
  return result;
}

/**
 * Exemple 3 : Sans pagination (simple liste)
 *
 * Démontre l'utilisation sans pagination (pas de COUNT)
 */
async function withoutPaginationExample() {
  console.log('=== EXEMPLE : SANS PAGINATION ===\n');

  const folders = await Folder.paginatedOptimized()
    .where({ status: 'APPROVED' })
    .filterJoin('delegation', { code: 'PAR' })
    .join(['applicant', 'delegation'])
    .order('folders.created_at DESC')
    .limit(20)
    .execute();

  console.log(`Résultats : ${folders.length} lignes\n`);
  return folders;
}

/**
 * Exemple 4 : Tri sur colonnes jointes
 *
 * Démontre le tri sur des colonnes de tables jointes
 */
async function sortOnJoinedColumnsExample() {
  console.log('=== EXEMPLE : TRI SUR COLONNES JOINTES ===\n');

  // Note : Pour trier sur une colonne jointe, il faut utiliser une approche différente
  // car dans la phase IDS on ne peut trier que sur les colonnes de la table principale.
  // Solution : utiliser un subquery ou matérialiser les données nécessaires au tri.

  // Pour l'instant, cette limitation existe et nécessite une amélioration future
  console.log('⚠️  Le tri sur colonnes jointes nécessite une implémentation spéciale\n');
  console.log('Solution temporaire : trier en mémoire après récupération\n');

  const result = await Folder.paginatedOptimized()
    .where({ type: 'agp' })
    .filterJoin('applicant', { last_name: 'D%' })
    .join('applicant')
    .order('folders.created_at DESC')
    .limit(20)
    .execute();

  // Tri en mémoire sur le nom de l'applicant
  result.sort((a, b) => {
    const nameA = a.applicant?.last_name || '';
    const nameB = b.applicant?.last_name || '';
    return nameA.localeCompare(nameB);
  });

  console.log(`Résultats : ${result.length} lignes triées par nom d'applicant\n`);
  return result;
}

// ============================
// 4. BENCHMARKING
// ============================

/**
 * Compare les performances entre méthode traditionnelle et optimisée
 */
async function benchmark() {
  console.log('\n'.repeat(2));
  console.log('═'.repeat(70));
  console.log('  BENCHMARK : COMPARAISON DES PERFORMANCES');
  console.log('═'.repeat(70));
  console.log('\n');

  // Méthode traditionnelle
  try {
    await traditionalQuery();
  } catch (err) {
    console.log(`Erreur méthode traditionnelle : ${err.message}\n`);
  }

  console.log('─'.repeat(70));
  console.log('\n');

  // Méthode optimisée
  try {
    await optimizedQuery();
  } catch (err) {
    console.log(`Erreur méthode optimisée : ${err.message}\n`);
  }

  console.log('═'.repeat(70));
  console.log('\n');
}

// ============================
// 5. EXPORT ET EXÉCUTION
// ============================

module.exports = {
  traditionalQuery,
  optimizedQuery,
  nestedFiltersExample,
  orFiltersExample,
  withoutPaginationExample,
  sortOnJoinedColumnsExample,
  benchmark
};

// Exécuter le benchmark si lancé directement
if (require.main === module) {
  benchmark().catch(console.error);
}
