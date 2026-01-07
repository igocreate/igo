# PaginatedOptimizedQuery - Optimisation des requêtes avec jointures

## Vue d'ensemble

`PaginatedOptimizedQuery` est un module d'optimisation pour `igo-db` qui implémente le **pattern COUNT/IDS/FULL** pour améliorer drastiquement les performances des requêtes SQL avec de nombreuses jointures sur de grosses tables.

## Problème résolu

### Approche traditionnelle (LENTE)

Avec la méthode traditionnelle, les requêtes avec `LEFT JOIN` génèrent un produit cartésien énorme :

```javascript
// ❌ LENT : ~5-10 secondes sur 2M de lignes
const result = await Folder
  .join(['applicant', 'pme_folder', 'delegation'])
  .where({ 'folders.type': ['agp', 'avt'] })
  .where(['applicants.last_name LIKE $?', '%Dupont%'])
  .page(1, 50);
```

**SQL généré :**
```sql
SELECT COUNT(0) FROM folders f
LEFT JOIN applicants a ON a.id = f.applicant_id
LEFT JOIN pme_folders p ON p.id = f.pme_folder_id
WHERE f.type IN ('agp', 'avt')
AND a.last_name LIKE '%Dupont%'
-- Temps : 5-10 secondes
```

### Approche optimisée "COUNT / IDs / FULL"

Avec `PaginatedOptimizedQuery`, les requêtes utilisent le pattern COUNT/IDS/FULL avec une syntaxe simplifiée :

```javascript
// ✅ RAPIDE : ~50-200ms sur 2M de lignes
const result = await Folder.paginatedOptimized()
  .where({
    type: ['agp', 'avt'],
    'applicant.last_name': 'Dupont%'
  })
  .join(['applicant', 'pme_folder', 'delegation'])
  .page(1, 50);
```

**SQL généré (Phase 1 - COUNT) :**
```sql
SELECT COUNT(0) FROM folders f
WHERE f.type IN ('agp', 'avt')
AND EXISTS (
  SELECT 1 FROM applicants a
  WHERE a.id = f.applicant_id
  AND a.last_name LIKE 'Dupont%'
)
-- Temps : 10-50ms
```

**SQL généré (Phase 2 - SELECT IDS) :**
```sql
SELECT f.id FROM folders f
WHERE f.type IN ('agp', 'avt')
AND EXISTS (
  SELECT 1 FROM applicants a
  WHERE a.id = f.applicant_id
  AND a.last_name LIKE 'Dupont%'
)
ORDER BY f.created_at DESC
LIMIT 50 OFFSET 0
-- Temps : 20-80ms
```

**SQL généré (Phase 3 - SELECT FULL) :**
```sql
SELECT f.*, a.*, p.*, d.*
FROM folders f
LEFT JOIN applicants a ON a.id = f.applicant_id
LEFT JOIN pme_folders p ON p.id = f.pme_folder_id
LEFT JOIN delegations d ON d.id = f.delegation_id
WHERE f.id IN (101, 102, ..., 150)
ORDER BY f.created_at DESC
-- Temps : 20-70ms (seulement 50 lignes à joindre)
```

**Amélioration : 50x à 100x plus rapide sur les requêtes avec bcp de jointures et bcp de lignes**

## Installation

Le module est intégré dans `igo-db`. Aucune installation supplémentaire n'est nécessaire.

```javascript
const Model = require('@igojs/db').Model;

// La méthode .paginatedOptimized() est disponible sur tous les modèles
const query = MyModel.paginatedOptimized();
```

## Nouvelle syntaxe simplifiée ⭐

### Vue d'ensemble

La nouvelle syntaxe permet de filtrer sur des tables jointes directement dans `where()` en utilisant la notation pointée :

```javascript
// Une seule méthode pour tout !
Folder.paginatedOptimized()
  .where({
    // Table principale
    status: 'SUBMITTED',
    type: ['agp', 'avt'],

    // Tables jointes (1 niveau)
    'applicant.last_name': 'Dupont%',
    'applicant.email': '%@example.com',

    // Tables imbriquées (plusieurs niveaux)
    'pme_folder.company.country.code': 'FR',
    'pme_folder.company.siret': '1234%'
  })
```

**Avantages :**
- ✅ **Plus lisible** et moins verbeux
- ✅ **Détection automatique** des chemins imbriqués

### Syntaxe de base

```javascript
.where({
  // Colonne de la table principale : valeur normale
  column: value,
  // Colonne d'une table jointe : notation pointée
  'association.column': value,
  // Plusieurs niveaux d'imbrication
  'association1.association2.association3.column': value
})
```

## API

### Model.paginatedOptimized()

Retourne une instance de `PaginatedOptimizedQuery` au lieu de `Query`.

```javascript
const query = Folder.paginatedOptimized();
// query instanceof PaginatedOptimizedQuery === true
```

### .where(conditions)

Filtre sur la table principale ET les tables jointes avec détection automatique.

#### Filtres sur table principale

```javascript
// Égalité simple
query.where({ status: 'SUBMITTED' });

// IN (tableau)
query.where({ type: ['agp', 'avt'] });

// IS NULL
query.where({ deleted_at: null });
```

#### Filtres sur tables jointes (1 niveau)

```javascript
query.where({
  status: 'SUBMITTED',
  'applicant.last_name': 'Dupont%',
  'applicant.email': '%@example.com'
});
```

**SQL généré :**
```sql
WHERE folders.status = 'SUBMITTED'
AND EXISTS (
  SELECT 1 FROM applicants
  WHERE applicants.id = folders.applicant_id
  AND applicants.last_name LIKE 'Dupont%'
  AND applicants.email LIKE '%@example.com'
)
```

#### Filtres sur tables imbriquées (plusieurs niveaux)

```javascript
query.where({
  type: 'agp',
  'pme_folder.company.country.code': 'FR',
  'pme_folder.company.siret': '1234%'
});
```

**SQL généré :**
```sql
WHERE folders.type = 'agp'
AND EXISTS (
  SELECT 1 FROM pme_folders
  WHERE pme_folders.id = folders.pme_folder_id
  AND EXISTS (
    SELECT 1 FROM companies
    WHERE companies.id = pme_folders.company_id
    AND companies.siret LIKE '1234%'
    AND EXISTS (
      SELECT 1 FROM countries
      WHERE countries.id = companies.country_id
      AND countries.code = 'FR'
    )
  )
)
```

### Opérateurs supportés

#### Opérateurs de base

```javascript
// Égalité
{ status: 'ACTIVE' }
// → WHERE status = 'ACTIVE'

// IN (tableau)
{ status: ['ACTIVE', 'PENDING'] }
// → WHERE status IN ('ACTIVE', 'PENDING')

// IS NULL
{ email: null }
// → WHERE email IS NULL

// LIKE (auto-détecté avec %)
{ last_name: 'Dupont%' }
// → WHERE last_name LIKE 'Dupont%'
```

#### Opérateurs avancés

Utilisez un objet avec un opérateur `$` pour les comparaisons avancées :

```javascript
// $like - LIKE explicite
{ 'applicant.last_name': { $like: 'Dup%' } }
// → WHERE applicant.last_name LIKE 'Dup%'

// $between - Plages de dates/nombres
{ created_at: { $between: ['2024-01-01', '2024-12-31'] } }
// → WHERE created_at BETWEEN '2024-01-01' AND '2024-12-31'

// $gte - Greater than or equal (>=)
{ created_at: { $gte: '2024-01-01' } }
// → WHERE created_at >= '2024-01-01'

// $lte - Less than or equal (<=)
{ created_at: { $lte: '2024-12-31' } }
// → WHERE created_at <= '2024-12-31'

// $gt - Greater than (>)
{ 'pme_folder.amount': { $gt: 1000 } }
// → WHERE amount > 1000

// $lt - Less than (<)
{ 'pme_folder.amount': { $lt: 5000 } }
// → WHERE amount < 5000
```

#### Opérateurs logiques

##### $and - Toutes les conditions doivent être vraies

```javascript
query.where({
  $and: [
    { created_at: { $between: ['2024-01-01', '2024-12-31'] } },
    { status: 'SUBMITTED' },
    { 'applicant.last_name': { $like: 'Dup%' } },
    { 'pme_folder.company.country.code': 'FR' }
  ]
});
```

**Note :** Par défaut, plusieurs conditions dans `where()` sont combinées avec AND, donc `$and` est optionnel dans la plupart des cas.

##### $or - Au moins une condition doit être vraie

Pour simuler un OR sur la même colonne, utilisez IN :

```javascript
// OR sur même colonne → utilisez IN
query.where({
  status: ['SUBMITTED', 'VALIDATED']  // Équivalent à OR
});
// → WHERE status IN ('SUBMITTED', 'VALIDATED')
```

### .join(associations)

Ajoute des `LEFT JOIN` pour récupérer les données associées (phase FULL uniquement).

**✅ Nouvelle syntaxe avec notation pointée** :

```javascript
// Un seul join
query.join('applicant');

// Plusieurs joins simples
query.join(['applicant', 'pme_folder', 'delegation']);

// Join imbriqué avec notation pointée
query.join('pme_folder.company.country');

// Plusieurs joins dont certains imbriqués
query.join(['applicant', 'pme_folder.company.country']);
```

**Autre syntaxe** :

```javascript
// Joins imbriqués avec structure d'objet
query.join({ pme_folder: ['company'] });
query.join({ pme_folder: { company: ['country'] } });
```

**Note** : La notation pointée est plus lisible et cohérente avec la syntaxe de `where()`. Elle est automatiquement transformée en structure d'objet en interne.

**⚠️ Important** : Les colonnes filtrées via `where('association.column')` génèrent des EXISTS (pas de JOIN). Pour récupérer les données associées, ajoutez un `.join()` correspondant.

### .order(orderBy)

Tri sur colonnes de la table principale ou des tables jointes.

```javascript
// Tri sur la table principale
query.order('folders.created_at DESC');
query.order('folders.status ASC, folders.created_at DESC');

// Tri sur une table jointe (directe)
query.order('applicants.last_name ASC');

// Tri sur une table jointe imbriquée
query.order('companies.name DESC');  // via pme_folder.company
```

**✅** Le tri sur colonnes jointes est automatiquement optimisé !

Quand vous triez sur une colonne d'une table jointe, le système :
1. **Détecte automatiquement** la table nécessaire (même si imbriquée)
2. **Ajoute un JOIN** dans la phase IDS uniquement (pas dans COUNT)
3. **Crée les JOIN en cascade** pour les tables imbriquées

Voir la section [Tri sur colonnes jointes](#tri-sur-colonnes-jointes) pour plus de détails.

### .limit(limit) / .offset(offset)

Pagination manuelle.

```javascript
query.limit(50).offset(100);
```

### .page(page, nb)

Pagination automatique (utilise COUNT + LIMIT/OFFSET).

```javascript
query.page(1, 50); // Page 1, 50 résultats par page
```

**Retour** :
```javascript
{
  pagination: {
    page: 1,
    nb: 50,
    count: 1234,
    nb_pages: 25,
    previous: null,
    next: 2,
    start: 1,
    end: 50,
    links: [...]
  },
  rows: [...]
}
```

### .execute()

Exécute la requête optimisée (3 phases).

```javascript
const result = await query.execute();
```

## Exemples d'utilisation

### Exemple 1 : Requête simple avec pagination

```javascript
const result = await Folder.paginatedOptimized()
  .where({
    type: ['agp', 'avt'],
    'applicant.last_name': 'Dupont%'
  })
  .join('applicant') // Récupérer les données de l'applicant
  .order('folders.created_at DESC')
  .page(1, 50)
  .execute();

console.log(`Total : ${result.pagination.count} folders`);
console.log(`Résultats : ${result.rows.length}`);
result.rows.forEach(folder => {
  console.log(`${folder.id}: ${folder.applicant.last_name}`);
});
```

### Exemple 2 : Filtres multiples sur plusieurs tables

```javascript
const folders = await Folder.paginatedOptimized()
  .where({
    status: 'SUBMITTED',
    'applicant.last_name': 'Dupont%',
    'applicant.email': '%@example.com',
    'pme_folder.status': 'ACTIVE',
    'delegation.code': 'MAY'
  })
  .join(['applicant', 'pme_folder', 'delegation'])
  .limit(100)
  .execute();
```

### Exemple 3 : Filtres avec opérateurs avancés

```javascript
const folders = await Folder.paginatedOptimized()
  .where({
    created_at: { $between: ['2024-01-01', '2024-12-31'] },
    status: ['SUBMITTED', 'VALIDATED'],
    'applicant.last_name': { $like: 'Dup%' },
    'pme_folder.amount': { $gte: 1000, $lte: 5000 }
  })
  .join(['applicant', 'pme_folder'])
  .page(1, 50)
  .execute();
```

### Exemple 4 : Filtres imbriqués sur 3 niveaux

```javascript
const folders = await Folder.paginatedOptimized()
  .where({
    type: 'agp',
    'pme_folder.status': 'ACTIVE',
    'pme_folder.company.country.code': 'FR',
    'pme_folder.company.siret': '1234%',
    'pme_folder.company.created_at': { $gte: '2020-01-01' }
  })
  .join('pme_folder.company.country')
  .page(1, 50)
  .execute();
```

### Exemple 5 : Recherche multi-champs avec $and

```javascript
const token = 'test';

const folders = await Folder.paginatedOptimized()
  .where({
    $and: [
      { created_at: { $between: ['2024-01-01', '2024-12-31'] } },
      { status: ['SUBMITTED', 'VALIDATED'] },
      { 'applicant.last_name': { $like: `${token}%` } },
      { 'applicant.first_name': { $like: `${token}%` } },
      { 'applicant.email': token },
      { 'pme_folder.company.siret': { $like: `${token}%` } },
      { 'pme_folder.company.country.code': 'FR' }
    ]
  })
  .join(['applicant', { pme_folder: { company: ['country'] } }])
  .order('folders.created_at DESC')
  .page(1, 50)
  .execute();
```

### Exemple 6 : Sans pagination

```javascript
const folders = await Folder.paginatedOptimized()
  .where({
    status: 'APPROVED',
    'delegation.code': 'PAR'
  })
  .join('delegation')
  .limit(20)
  .execute();
// Retourne directement un array (pas de .pagination)
```

## Fonctionnalités avancées

### Regroupement automatique des conditions

Les conditions sur la même table sont automatiquement regroupées dans un seul EXISTS :

```javascript
query.where({
  'applicant.last_name': 'Dupont',
  'applicant.first_name': 'Jean',
  'applicant.email': '%@example.com'
});
```

**SQL généré :**
```sql
EXISTS (
  SELECT 1 FROM applicants
  WHERE applicants.id = folders.applicant_id
  AND applicants.last_name = 'Dupont'
  AND applicants.first_name = 'Jean'
  AND applicants.email LIKE '%@example.com'
)
-- Un seul EXISTS au lieu de 3 → Plus performant !
```

### Détection automatique du LIKE

Le caractère `%` déclenche automatiquement l'opérateur LIKE :

```javascript
// Détection automatique
{ 'applicant.last_name': 'Dup%' }
// → WHERE last_name LIKE 'Dup%'

// Ou explicite avec $like
{ 'applicant.last_name': { $like: 'Dup%' } }
// → WHERE last_name LIKE 'Dup%'
```

### Combinaison de plusieurs opérateurs

```javascript
query.where({
  created_at: { $between: ['2024-01-01', '2024-12-31'] },
  status: ['SUBMITTED', 'VALIDATED'],
  'applicant.last_name': 'Dupont%',
  'applicant.created_at': { $gte: '2024-01-01' },
  'pme_folder.amount': { $gt: 1000, $lt: 5000 }
});
```

## Performance

### Cas d'usage typiques

| Scénario | Traditionnel | Optimisé | Gain |
|----------|--------------|----------|------|
| Table 100K lignes, 3 joins | 500ms | 20ms | 25x |
| Table 1M lignes, 5 joins | 3000ms | 50ms | 60x |
| Table 2M lignes, 10 joins | 10000ms | 100ms | 100x |
| Table 5M lignes, 10 joins | 30000ms+ | 200ms | 150x+ |

### Recommandations

**Utilisez `PaginatedOptimizedQuery` quand :**
- Table principale > 100K lignes
- Nombre de joins > 3
- Requêtes avec pagination
- Filtres sur plusieurs tables jointes

**N'utilisez PAS `PaginatedOptimizedQuery` quand :**
- Table principale < 10K lignes (overhead inutile)
- Pas de jointures
- Requête sur clé primaire (`.find(id)`)

## Tri sur colonnes jointes

PaginatedOptimizedQuery détecte automatiquement les colonnes de tri qui proviennent de tables jointes et ajoute les INNER JOIN nécessaires dans la phase `SELECT IDS`.

Cette fonctionnalité garantit que :
- Le tri est effectué côté base de données (rapide)
- La pagination renvoie les bons résultats triés
- Les INNER JOIN sont ajoutés uniquement dans la phase IDS (pas dans COUNT)
- Les tables imbriquées sont gérées avec des INNER JOIN en cascade

### Détection Automatique

Le système parse les clauses `ORDER BY` et détecte automatiquement si une colonne de tri provient d'une table jointe :

```javascript
const query = Folder.paginatedOptimized()
  .where({ type: ['agp', 'avt'] })
  .order('applicants.last_name ASC')  // ← Colonne d'une table jointe
  .join('applicant')
  .limit(50);
```

### SQL Généré

#### Phase COUNT (sans JOIN)
```sql
SELECT COUNT(0) as `count`
FROM `folders`
WHERE `folders`.`type` IN ('agp', 'avt')
-- Pas de JOIN dans le COUNT !
```

#### Phase SELECT IDS
```sql
SELECT `folders`.`id`
FROM `folders`
LEFT JOIN `applicants` ON `applicants`.`id` = `folders`.`applicant_id`
WHERE `folders`.`type` IN ('agp', 'avt')
ORDER BY applicants.last_name ASC
LIMIT 50 OFFSET 0
```

#### Phase SELECT FULL (LEFT JOIN pour récupérer les données)
```sql
SELECT f.*, a.*
FROM `folders` f
LEFT JOIN `applicants` a ON a.id = f.applicant_id
WHERE f.id IN (101, 102, ..., 150)
ORDER BY applicants.last_name ASC
```

**Note** : Les JOIN sont créés en cascade pour permettre le tri, tandis que les filtres utilisent toujours EXISTS pour la performance.

#### Exemple 4 : Tri + Filtres sur Table Jointe

Combine JOIN pour le tri et EXISTS pour les filtres :

```javascript
const query = Folder.paginatedOptimized()
  .where({
    type: ['agp', 'avt'],
    'applicant.email': '%@example.com'  // ← Filtre (EXISTS)
  })
  .order('applicants.last_name ASC')    // ← Tri (JOIN)
  .join('applicant')
  .limit(50);
```

SQL généré (phase IDS) :
```sql
SELECT `folders`.`id`
FROM `folders`
INNER JOIN `applicants` ON `applicants`.`id` = `folders`.`applicant_id`
WHERE `folders`.`type` IN ('agp', 'avt')
  AND EXISTS (
    SELECT 1 FROM `applicants`
    WHERE `applicants`.`id` = `folders`.`applicant_id`
      AND `applicants`.`email` LIKE '%@example.com'
  )
ORDER BY applicants.last_name ASC
LIMIT 50 OFFSET 0
```

> **Note** : Le filtre utilise EXISTS (pour la performance), tandis que le tri utilise JOIN (nécessaire pour ORDER BY).

### Avantages

✅ **Performance** : Tri côté base de données, utilise les index, beaucoup plus rapide que le tri en mémoire
✅ **Pagination correcte** : Les bons 50 résultats triés sont retournés
✅ **COUNT sans JOIN** : Le COUNT reste rapide (pas de JOIN inutile)
✅ **Automatique** : Pas besoin de configuration manuelle, détection automatique des colonnes de tri
✅ **Tables imbriquées** : Gère automatiquement les chemins imbriqués avec LEFT JOIN en cascade
✅ **Combinaison intelligente** :
- **Filtres** → EXISTS (optimal pour filtrage)
- **Tri** → LEFT JOIN (préserve toutes les lignes)
- **Données** → LEFT JOIN (phase FULL uniquement)

### Tri avec Fonctions SQL (COALESCE, IFNULL, CONCAT, etc.)

La méthode `order()` supporte les fonctions SQL dans les clauses ORDER BY. Les tables référencées dans les fonctions seront automatiquement jointes dans la phase IDS.

#### COALESCE

Utile pour trier sur plusieurs colonnes avec une priorité de fallback :

```javascript
Folder.paginatedOptimized()
  .where({ type: 'agp' })
  .join(['beneficiary', 'applicant', 'beneficiarySnapshot', 'applicantSnapshot'])
  .order('COALESCE(`beneficiarySnapshot`.`identity_expires_at`, `beneficiary`.`identity_expires_at`, `applicantSnapshot`.`identity_expires_at`, `applicant`.`identity_expires_at`) DESC')
  .page(1, 50);
```

**SQL Généré (Phase IDS) :**
```sql
SELECT `folders`.`id`
FROM `folders`
LEFT JOIN `beneficiaries_snapshot` AS `beneficiarySnapshot`
  ON `beneficiarySnapshot`.`id` = `folders`.`beneficiary_snapshot_id`
LEFT JOIN `beneficiaries` AS `beneficiary`
  ON `beneficiary`.`id` = `folders`.`beneficiary_id`
LEFT JOIN `applicants_snapshot` AS `applicantSnapshot`
  ON `applicantSnapshot`.`id` = `folders`.`applicant_snapshot_id`
LEFT JOIN `applicants` AS `applicant`
  ON `applicant`.`id` = `folders`.`applicant_id`
WHERE `folders`.`type` = ?
ORDER BY COALESCE(`beneficiarySnapshot`.`identity_expires_at`,
                   `beneficiary`.`identity_expires_at`,
                   `applicantSnapshot`.`identity_expires_at`,
                   `applicant`.`identity_expires_at`) DESC
LIMIT ?, ?
```

#### IFNULL

Alternative à COALESCE pour deux valeurs :

```javascript
Folder.paginatedOptimized()
  .where({ type: 'agp' })
  .join(['company', 'pme_folder.company'])
  .order('IFNULL(`company`.`name`, `pme_folder.company`.`name`) ASC')
  .page(1, 50);
```

#### CONCAT

Tri sur des colonnes concaténées :

```javascript
Folder.paginatedOptimized()
  .where({ type: 'agp' })
  .join('applicant')
  .order('CONCAT(`applicant`.`last_name`, " ", `applicant`.`first_name`) ASC')
  .page(1, 50);
```

**Note:** Toutes les tables référencées dans les fonctions SQL doivent être explicitement déclarées avec `.join()`.

### Tri sur colonnes de blocks (sous-tables)

#### Comportement avec colonnes ambiguës

Si une colonne existe à la fois dans la table principale ET dans un block, **la table principale est prioritaire** :

```javascript
// Si "status" existe dans pme_folders ET dans block_studies
.order('status ASC')  // ← Trie sur pme_folders.status (table principale)

// Pour trier explicitement sur le block, utilisez le préfixe
.order('block_studies.status ASC')  // ← Trie sur block_studies.status
```

#### Combinaison avec WHERE sur blocks

Vous pouvez combiner filtres et tri sur les blocks :

```javascript
const result = await PMEFolder.paginatedOptimized()
  .where({
    is_initial: true,
    professional_activity: 'STUDENT',
    'studies.studies_field': 'Informatique'  // ← Filtre via EXISTS
  })
  .order('studies_year DESC')  // ← Tri via LEFT JOIN
  .page(1, 50)
  .execute();
```

**SQL Généré (Phase IDS) :**
```sql
SELECT `pme_folders`.`id`
FROM `pme_folders`
LEFT JOIN `block_studies` ON `block_studies`.`id` = `pme_folders`.`block_studies_id`
WHERE `pme_folders`.`is_initial` = ?
  AND `pme_folders`.`professional_activity` = ?
  AND EXISTS (
    SELECT 1 FROM `block_studies`
    WHERE `block_studies`.`id` = `pme_folders`.`block_studies_id`
      AND `block_studies`.`studies_field` = ?
  )
ORDER BY block_studies.studies_year DESC
LIMIT ?, ?
```

## Limitations

### 1. Agrégations complexes

Les agrégations avec `GROUP BY` sur plusieurs tables ne sont pas supportées.

**Contournement :**
- Utiliser des sous-requêtes SQL personnalisées
- Ou matérialiser les agrégations dans des vues/tables

### 3. Cache

`PaginatedOptimizedQuery` n'est pas compatible avec `CachedQuery` pour le moment.


## Architecture interne

### Fichiers créés

- `src/db/PaginatedOptimizedQuery.js` - Classe principale héritant de `Query`
- `src/db/PaginatedOptimizedSql.js` - Générateur SQL avec EXISTS et INNER JOIN pour tri
- `test/db/PaginatedOptimizedQueryTest.js` - Tests unitaires
- `examples/PaginatedOptimizedQueryExample.js` - Exemples complets d'utilisation (10 exemples)

### Pattern COUNT/IDS/FULL

```
┌─────────────────────────────────────────────────────────────┐
│                     PaginatedOptimizedQuery.execute()       │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
   ┌─────────┐          ┌──────────┐         ┌──────────┐
   │ Phase 1 │          │ Phase 2  │         │ Phase 3  │
   │  COUNT  │          │   IDS    │         │   FULL   │
   └─────────┘          └──────────┘         └──────────┘
        │                     │                     │
        │                     │                     │
        ▼                     ▼                     ▼
  COUNT(0)              SELECT id            SELECT *
  FROM folders          FROM folders         FROM folders
  WHERE ...             WHERE ...            WHERE id IN (...)
  AND EXISTS(...)       AND EXISTS(...)      LEFT JOIN ...
                        ORDER BY ...         ORDER BY ...
                        LIMIT ... OFFSET ...
        │                     │                     │
        └─────────────────────┴─────────────────────┘
                              │
                              ▼
                        { pagination, rows }
```

## Tests

Les tests se trouvent dans :
- `test/db/PaginatedOptimizedQueryTest.js` - Tests généraux

## Exemples

Les exemples se trouvent dans :
- `examples/PaginatedOptimizedQueryExample.js` - Exemples généraux

## Contribuer

Pour améliorer `PaginatedOptimizedQuery`, veuillez :

1. Ajouter des tests dans `test/db/SimplifiedSyntaxTest.js`
2. Documenter les changements dans ce fichier
3. Mettre à jour les exemples si nécessaire

## Références

- [Query.js](../../src/db/Query.js) - Classe parente
- [Sql.js](../../src/db/Sql.js) - Générateur SQL standard
- [Model.js](../../src/db/Model.js) - Intégration avec Model
