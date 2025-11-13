/**
 * Exemple d'utilisation de OptimizedQuery avec des jointures imbriquées sur plusieurs niveaux
 *
 * Ce fichier démontre comment utiliser filterJoinNested() pour filtrer sur des associations
 * à plusieurs niveaux de profondeur.
 */

const Model = require('../src/db/Model');

// ============================
// DÉFINITION DES MODÈLES
// ============================

/**
 * Hiérarchie :
 * Folder → PmeFolder → Company → Country
 *         ↓
 *      Applicant → Address → City
 */

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

class City extends Model({
  table: 'cities',
  columns: {
    id: 'integer',
    name: 'string',
    postal_code: 'string'
  }
}) {}

class Address extends Model({
  table: 'addresses',
  columns: {
    id: 'integer',
    street: 'string',
    city_id: 'integer'
  },
  associations: [
    ['belongs_to', 'city', City, 'city_id', 'id']
  ]
}) {}

class Applicant extends Model({
  table: 'applicants',
  columns: {
    id: 'integer',
    first_name: 'string',
    last_name: 'string',
    address_id: 'integer'
  },
  associations: [
    ['belongs_to', 'address', Address, 'address_id', 'id']
  ]
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
// EXEMPLES D'UTILISATION
// ============================

/**
 * Exemple 1 : Filtre imbriqué sur 2 niveaux
 *
 * Chercher les folders dont le pme_folder a une company avec country = 'FR'
 */
async function example1_TwoLevelsDeep() {
  console.log('=== EXEMPLE 1 : FILTRES IMBRIQUÉS 2 NIVEAUX ===\n');

  const query = Folder.paginatedOptimized()
    .where({ status: 'SUBMITTED' })
    .filterJoinNested({
      pme_folder: {
        conditions: { status: 'ACTIVE' },
        nested: {
          company: {
            conditions: { country_id: 1 } // France
          }
        }
      }
    })
    .join({ pme_folder: ['company'] })
    .page(1, 50);

  // SQL généré (COUNT) :
  // SELECT COUNT(0)
  // FROM folders
  // WHERE folders.status = 'SUBMITTED'
  // AND EXISTS (
  //   SELECT 1 FROM pme_folders
  //   WHERE pme_folders.id = folders.pme_folder_id
  //   AND pme_folders.status = 'ACTIVE'
  //   AND EXISTS (
  //     SELECT 1 FROM companies
  //     WHERE companies.id = pme_folders.company_id
  //     AND companies.country_id = 1
  //   )
  // )

  console.log('Query configurée avec filtres imbriqués sur 2 niveaux');
  console.log('- Niveau 1: pme_folder.status = ACTIVE');
  console.log('- Niveau 2: company.country_id = 1');
  console.log('\nSQL attendu : EXISTS imbriqués sur 2 niveaux\n');

  return query;
}

/**
 * Exemple 2 : Filtre imbriqué sur 3 niveaux
 *
 * Chercher les folders dont :
 * - pme_folder → company → country = 'FR'
 */
async function example2_ThreeLevelsDeep() {
  console.log('=== EXEMPLE 2 : FILTRES IMBRIQUÉS 3 NIVEAUX ===\n');

  const query = Folder.paginatedOptimized()
    .where({ type: 'agp' })
    .filterJoinNested({
      pme_folder: {
        nested: {
          company: {
            nested: {
              country: {
                conditions: { code: 'FR' }
              }
            }
          }
        }
      }
    })
    .join({ pme_folder: { company: ['country'] } })
    .limit(20);

  // SQL généré (COUNT) :
  // SELECT COUNT(0)
  // FROM folders
  // WHERE folders.type = 'agp'
  // AND EXISTS (
  //   SELECT 1 FROM pme_folders
  //   WHERE pme_folders.id = folders.pme_folder_id
  //   AND EXISTS (
  //     SELECT 1 FROM companies
  //     WHERE companies.id = pme_folders.company_id
  //     AND EXISTS (
  //       SELECT 1 FROM countries
  //       WHERE countries.id = companies.country_id
  //       AND countries.code = 'FR'
  //     )
  //   )
  // )

  console.log('Query configurée avec filtres imbriqués sur 3 niveaux');
  console.log('- Niveau 1: pme_folder');
  console.log('- Niveau 2: company');
  console.log('- Niveau 3: country.code = FR');
  console.log('\nSQL attendu : EXISTS imbriqués sur 3 niveaux\n');

  return query;
}

/**
 * Exemple 3 : Filtres imbriqués multiples (plusieurs branches)
 *
 * Chercher les folders avec des filtres sur DEUX branches distinctes :
 * 1. pme_folder → company → country
 * 2. applicant → address → city
 */
async function example3_MultipleBranches() {
  console.log('=== EXEMPLE 3 : FILTRES IMBRIQUÉS MULTIPLES ===\n');

  const query = Folder.paginatedOptimized()
    .where({ status: 'SUBMITTED' })
    // Branche 1 : pme_folder → company → country
    .filterJoinNested({
      pme_folder: {
        conditions: { status: 'ACTIVE' },
        nested: {
          company: {
            conditions: { siret: '1234%' },
            nested: {
              country: {
                conditions: { code: 'FR' }
              }
            }
          }
        }
      }
    })
    // Branche 2 : applicant → address → city
    .filterJoinNested({
      applicant: {
        conditions: { last_name: 'Dupont%' },
        nested: {
          address: {
            nested: {
              city: {
                conditions: { postal_code: '75%' } // Paris
              }
            }
          }
        }
      }
    })
    .join({
      pme_folder: { company: ['country'] },
      applicant: { address: ['city'] }
    })
    .page(1, 50);

  // SQL généré (COUNT) :
  // SELECT COUNT(0)
  // FROM folders
  // WHERE folders.status = 'SUBMITTED'
  // AND EXISTS (
  //   SELECT 1 FROM pme_folders WHERE ... AND EXISTS (
  //     SELECT 1 FROM companies WHERE ... AND EXISTS (
  //       SELECT 1 FROM countries WHERE code = 'FR'
  //     )
  //   )
  // )
  // AND EXISTS (
  //   SELECT 1 FROM applicants WHERE ... AND EXISTS (
  //     SELECT 1 FROM addresses WHERE ... AND EXISTS (
  //       SELECT 1 FROM cities WHERE postal_code LIKE '75%'
  //     )
  //   )
  // )

  console.log('Query configurée avec 2 branches de filtres imbriqués :');
  console.log('Branche 1 : pme_folder → company → country');
  console.log('Branche 2 : applicant → address → city');
  console.log('\nSQL attendu : 2 EXISTS principaux, chacun avec EXISTS imbriqués\n');

  return query;
}

/**
 * Exemple 4 : Mélange de filtres simples et imbriqués
 */
async function example4_MixedFilters() {
  console.log('=== EXEMPLE 4 : MÉLANGE FILTRES SIMPLES ET IMBRIQUÉS ===\n');

  const query = Folder.paginatedOptimized()
    .where({ type: ['agp', 'avt'] })
    // Filtre simple (1 niveau)
    .filterJoin('applicant', { last_name: 'Dupont%' })
    // Filtre imbriqué (3 niveaux)
    .filterJoinNested({
      pme_folder: {
        conditions: { status: 'ACTIVE' },
        nested: {
          company: {
            conditions: { siret: '123%' },
            nested: {
              country: {
                conditions: { code: 'FR' }
              }
            }
          }
        }
      }
    })
    .join(['applicant', { pme_folder: { company: ['country'] } }])
    .order('folders.created_at DESC')
    .page(1, 50);

  console.log('Query configurée avec :');
  console.log('- 1 filtre simple : applicant.last_name');
  console.log('- 1 filtre imbriqué 3 niveaux : pme_folder → company → country');
  console.log('\nSQL attendu : 2 EXISTS, un simple et un imbriqué\n');

  return query;
}

/**
 * Comparaison de performance : imbriqué vs LEFT JOIN multiples
 */
async function benchmark() {
  console.log('\n'.repeat(2));
  console.log('═'.repeat(70));
  console.log('  BENCHMARK : FILTRES IMBRIQUÉS');
  console.log('═'.repeat(70));
  console.log('\n');

  console.log('Avec des jointures imbriquées sur 3 niveaux :');
  console.log('- Méthode traditionnelle : 3 LEFT JOIN (très lent)');
  console.log('- Méthode optimisée : EXISTS imbriqués (rapide)');
  console.log('\nGain de performance attendu : 100x à 1000x\n');

  console.log('─'.repeat(70));
  console.log('\n');
}

/**
 * Afficher le SQL généré (pour debugging)
 */
function showGeneratedSQL(query) {
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

  query.query.verb = 'count';
  const sql = query.toSQL();

  console.log('SQL généré :');
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
  example1_TwoLevelsDeep,
  example2_ThreeLevelsDeep,
  example3_MultipleBranches,
  example4_MixedFilters,
  benchmark
};

if (require.main === module) {
  (async () => {
    console.log('\n');
    const q1 = await example1_TwoLevelsDeep();
    showGeneratedSQL(q1);

    const q2 = await example2_ThreeLevelsDeep();
    showGeneratedSQL(q2);

    const q3 = await example3_MultipleBranches();
    showGeneratedSQL(q3);

    const q4 = await example4_MixedFilters();
    showGeneratedSQL(q4);

    await benchmark();
  })().catch(console.error);
}
