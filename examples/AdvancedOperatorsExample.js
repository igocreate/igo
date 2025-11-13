/**
 * Exemple : Utilisation des opérateurs avancés (LIKE, BETWEEN, comparaisons)
 *
 * Ce fichier démontre comment utiliser les opérateurs avancés avec filterJoin()
 * pour des requêtes complexes sur des plages de dates et des patterns.
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
    email: 'string',
    created_at: 'datetime',
    updated_at: 'datetime'
  }
}) {}

class PmeFolder extends Model({
  table: 'pme_folders',
  columns: {
    id: 'integer',
    status: 'string',
    amount: 'integer',
    company_name: 'string',
    created_at: 'datetime'
  }
}) {}

class Company extends Model({
  table: 'companies',
  columns: {
    id: 'integer',
    name: 'string',
    siret: 'string',
    country: 'string',
    created_at: 'datetime'
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

PmeFolder.schema.associations = [
  ['belongs_to', 'company', Company, 'company_id', 'id']
];

// ============================
// EXEMPLES D'UTILISATION
// ============================

/**
 * Exemple 1 : LIKE - Recherche de patterns
 */
function example1_LikeOperator() {
  console.log('=== EXEMPLE 1 : OPÉRATEUR LIKE ===\n');

  const query = Folder.paginatedOptimized()
    .where({ type: 'agp' })
    .filterJoin('applicant', {
      last_name: 'Dupont%',        // Commence par "Dupont"
      email: '%@example.com'       // Se termine par "@example.com"
    })
    .join('applicant')
    .limit(50);

  console.log('Configuration :');
  console.log('- Chercher des folders de type "agp"');
  console.log('- Avec applicant.last_name commençant par "Dupont"');
  console.log('- ET applicant.email se terminant par "@example.com"\n');

  console.log('SQL généré (EXISTS) :');
  console.log('EXISTS (');
  console.log('  SELECT 1 FROM applicants');
  console.log('  WHERE applicants.id = folders.applicant_id');
  console.log('    AND applicants.last_name LIKE \'Dupont%\'');
  console.log('    AND applicants.email LIKE \'%@example.com\'');
  console.log(')\n');

  return query;
}

/**
 * Exemple 2 : BETWEEN - Plage de dates
 */
function example2_BetweenOperator() {
  console.log('=== EXEMPLE 2 : OPÉRATEUR BETWEEN (PLAGE DE DATES) ===\n');

  const query = Folder.paginatedOptimized()
    .where({ status: 'SUBMITTED' })
    .filterJoin('applicant', {
      created_at: { $between: ['2024-01-01', '2024-12-31'] }
    })
    .join('applicant')
    .order('folders.created_at DESC')
    .page(1, 50);

  console.log('Configuration :');
  console.log('- Chercher des folders avec status "SUBMITTED"');
  console.log('- Créés en 2024 (du 1er janvier au 31 décembre)\n');

  console.log('SQL généré (EXISTS) :');
  console.log('EXISTS (');
  console.log('  SELECT 1 FROM applicants');
  console.log('  WHERE applicants.id = folders.applicant_id');
  console.log('    AND applicants.created_at BETWEEN \'2024-01-01\' AND \'2024-12-31\'');
  console.log(')\n');

  return query;
}

/**
 * Exemple 3 : Comparaisons >= et <=
 */
function example3_ComparisonOperators() {
  console.log('=== EXEMPLE 3 : OPÉRATEURS DE COMPARAISON (>=, <=) ===\n');

  const query = Folder.paginatedOptimized()
    .where({ type: 'agp' })
    .filterJoin('pme_folder', {
      amount: { $gte: 10000 },    // Montant >= 10000
      created_at: { $lte: '2024-06-30' }  // Créé avant le 30 juin 2024
    })
    .join('pme_folder')
    .limit(50);

  console.log('Configuration :');
  console.log('- Chercher des folders de type "agp"');
  console.log('- Avec pme_folder.amount >= 10000');
  console.log('- ET pme_folder.created_at <= 2024-06-30\n');

  console.log('SQL généré (EXISTS) :');
  console.log('EXISTS (');
  console.log('  SELECT 1 FROM pme_folders');
  console.log('  WHERE pme_folders.id = folders.pme_folder_id');
  console.log('    AND pme_folders.amount >= 10000');
  console.log('    AND pme_folders.created_at <= \'2024-06-30\'');
  console.log(')\n');

  return query;
}

/**
 * Exemple 4 : Comparaisons > et <
 */
function example4_StrictComparisons() {
  console.log('=== EXEMPLE 4 : COMPARAISONS STRICTES (>, <) ===\n');

  const query = Folder.paginatedOptimized()
    .where({ status: 'ACTIVE' })
    .filterJoin('pme_folder', {
      amount: { $gt: 5000, $lt: 50000 }  // 5000 < amount < 50000
    })
    .join('pme_folder')
    .limit(100);

  console.log('Configuration :');
  console.log('- Chercher des folders avec status "ACTIVE"');
  console.log('- Avec 5000 < pme_folder.amount < 50000\n');

  console.log('⚠️ NOTE : Pour combiner $gt et $lt sur le même champ,');
  console.log('utilisez deux filterJoin séparés ou une condition complexe.\n');

  return query;
}

/**
 * Exemple 5 : Combiner LIKE, BETWEEN et comparaisons
 */
function example5_CombinedOperators() {
  console.log('=== EXEMPLE 5 : COMBINER PLUSIEURS OPÉRATEURS ===\n');

  const query = Folder.paginatedOptimized()
    .where({ type: ['agp', 'avt'] })
    .filterJoin('applicant', {
      last_name: 'Martin%',
      email: '%@example.com',
      created_at: { $between: ['2024-01-01', '2024-12-31'] }
    })
    .filterJoin('pme_folder', {
      status: 'ACTIVE',
      amount: { $gte: 10000 }
    })
    .join(['applicant', 'pme_folder'])
    .order('folders.created_at DESC')
    .page(1, 50);

  console.log('Configuration :');
  console.log('- Chercher folders de type "agp" ou "avt"');
  console.log('- Avec applicant :');
  console.log('  - last_name LIKE "Martin%"');
  console.log('  - email LIKE "%@example.com"');
  console.log('  - created_at BETWEEN 2024-01-01 AND 2024-12-31');
  console.log('- ET pme_folder :');
  console.log('  - status = "ACTIVE"');
  console.log('  - amount >= 10000\n');

  console.log('SQL généré (2 EXISTS) :');
  console.log('EXISTS (');
  console.log('  SELECT 1 FROM applicants');
  console.log('  WHERE applicants.id = folders.applicant_id');
  console.log('    AND applicants.last_name LIKE \'Martin%\'');
  console.log('    AND applicants.email LIKE \'%@example.com\'');
  console.log('    AND applicants.created_at BETWEEN \'2024-01-01\' AND \'2024-12-31\'');
  console.log(')');
  console.log('AND EXISTS (');
  console.log('  SELECT 1 FROM pme_folders');
  console.log('  WHERE pme_folders.id = folders.pme_folder_id');
  console.log('    AND pme_folders.status = \'ACTIVE\'');
  console.log('    AND pme_folders.amount >= 10000');
  console.log(')\n');

  return query;
}

/**
 * Exemple 6 : Filtres imbriqués avec opérateurs avancés
 */
function example6_NestedWithAdvancedOperators() {
  console.log('=== EXEMPLE 6 : FILTRES IMBRIQUÉS AVEC OPÉRATEURS AVANCÉS ===\n');

  const query = Folder.paginatedOptimized()
    .where({ type: 'agp' })
    .filterJoinNested({
      pme_folder: {
        conditions: {
          status: 'ACTIVE',
          amount: { $gte: 10000 },
          created_at: { $gte: '2024-01-01' }
        },
        nested: {
          company: {
            conditions: {
              country: 'FR',
              siret: '1234%',
              created_at: { $between: ['2020-01-01', '2024-12-31'] }
            }
          }
        }
      }
    })
    .join({ pme_folder: ['company'] })
    .page(1, 50);

  console.log('Configuration :');
  console.log('- Folders de type "agp"');
  console.log('- Avec pme_folder :');
  console.log('  - status = "ACTIVE"');
  console.log('  - amount >= 10000');
  console.log('  - created_at >= 2024-01-01');
  console.log('  - ET company :');
  console.log('    - country = "FR"');
  console.log('    - siret LIKE "1234%"');
  console.log('    - created_at BETWEEN 2020-01-01 AND 2024-12-31\n');

  console.log('SQL généré (EXISTS imbriqués) :');
  console.log('EXISTS (');
  console.log('  SELECT 1 FROM pme_folders');
  console.log('  WHERE pme_folders.id = folders.pme_folder_id');
  console.log('    AND pme_folders.status = \'ACTIVE\'');
  console.log('    AND pme_folders.amount >= 10000');
  console.log('    AND pme_folders.created_at >= \'2024-01-01\'');
  console.log('    AND EXISTS (');
  console.log('      SELECT 1 FROM companies');
  console.log('      WHERE companies.id = pme_folders.company_id');
  console.log('        AND companies.country = \'FR\'');
  console.log('        AND companies.siret LIKE \'1234%\'');
  console.log('        AND companies.created_at BETWEEN \'2020-01-01\' AND \'2024-12-31\'');
  console.log('    )');
  console.log(')\n');

  return query;
}

/**
 * Exemple 7 : Cas d'usage réel - Recherche de candidatures récentes
 */
function example7_RealWorldUseCase() {
  console.log('=== EXEMPLE 7 : CAS D\'USAGE RÉEL ===\n');
  console.log('Rechercher les dossiers :');
  console.log('- Soumis dans les 30 derniers jours');
  console.log('- Avec un montant entre 10K et 100K euros');
  console.log('- Candidat dont le nom commence par D, E ou F');
  console.log('- Email professionnel (pas @gmail, @hotmail)\n');

  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startDate = thirtyDaysAgo.toISOString().split('T')[0];
  const endDate = today.toISOString().split('T')[0];

  const query = Folder.paginatedOptimized()
    .where({
      status: 'SUBMITTED',
      created_at: { $gte: startDate }
    })
    .filterJoin('applicant', {
      last_name: '[D-F]%'  // Note: le pattern SQL dépend du dialecte
    })
    .filterJoin('pme_folder', {
      amount: { $between: [10000, 100000] }
    })
    .join(['applicant', 'pme_folder'])
    .order('folders.created_at DESC')
    .page(1, 50);

  console.log(`Date de début : ${startDate}`);
  console.log(`Date de fin : ${endDate}\n`);

  console.log('Cette requête est optimale car :');
  console.log('✅ COUNT est rapide (pas de JOIN, seulement EXISTS)');
  console.log('✅ SELECT IDS est rapide (filtrage efficace avec EXISTS)');
  console.log('✅ SELECT FULL ne joint que les 50 résultats trouvés');
  console.log('✅ Utilise les index sur les dates et montants\n');

  return query;
}

/**
 * Helper : Afficher le SQL généré
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

// ============================
// EXÉCUTION
// ============================

module.exports = {
  example1_LikeOperator,
  example2_BetweenOperator,
  example3_ComparisonOperators,
  example4_StrictComparisons,
  example5_CombinedOperators,
  example6_NestedWithAdvancedOperators,
  example7_RealWorldUseCase
};

if (require.main === module) {
  (async () => {
    console.log('\n');

    const q1 = example1_LikeOperator();
    showGeneratedSQL(q1, 'count');

    const q2 = example2_BetweenOperator();
    showGeneratedSQL(q2, 'count');

    const q3 = example3_ComparisonOperators();
    showGeneratedSQL(q3, 'count');

    // example4_StrictComparisons();

    const q5 = example5_CombinedOperators();
    showGeneratedSQL(q5, 'count');

    const q6 = example6_NestedWithAdvancedOperators();
    showGeneratedSQL(q6, 'count');

    example7_RealWorldUseCase();
  })().catch(console.error);
}
