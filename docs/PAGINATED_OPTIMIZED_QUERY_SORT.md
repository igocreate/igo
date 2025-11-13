# Tri sur Tables Jointes avec PaginatedOptimizedQuery

## Vue d'ensemble

PaginatedOptimizedQuery détecte automatiquement les colonnes de tri qui proviennent de tables jointes et ajoute les INNER JOIN nécessaires dans la phase `SELECT IDS`.

Cette fonctionnalité garantit que :
- Le tri est effectué côté base de données (rapide)
- La pagination renvoie les bons résultats triés
- Les INNER JOIN sont ajoutés uniquement dans la phase IDS (pas dans COUNT)

## Fonctionnement Automatique

### Détection Automatique

PaginatedOptimizedQuery parse les clauses `ORDER BY` et détecte automatiquement si une colonne de tri provient d'une table jointe :

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
```

#### Phase SELECT IDS (avec INNER JOIN automatique)
```sql
SELECT `folders`.`id`
FROM `folders`
INNER JOIN `applicants` ON `applicants`.`id` = `folders`.`applicant_id`
WHERE `folders`.`type` IN ('agp', 'avt')
ORDER BY applicants.last_name ASC
LIMIT 50 OFFSET 0
```

#### Phase SELECT FULL (LEFT JOIN pour les données)
```sql
SELECT f.*, a.*
FROM `folders` f
LEFT JOIN `applicants` a ON a.id = f.applicant_id
WHERE f.id IN (101, 102, ..., 150)
ORDER BY applicants.last_name ASC
```

## Exemples

### Exemple 1 : Tri sur la Table Principale

Quand le tri est sur la table principale, aucun JOIN n'est ajouté :

```javascript
const query = Folder.paginatedOptimized()
  .where({ type: ['agp', 'avt'] })
  .order('folders.created_at DESC')  // ← Table principale
  .limit(50);
```

SQL généré (phase IDS) :
```sql
SELECT `folders`.`id`
FROM `folders`
WHERE `folders`.`type` IN ('agp', 'avt')
ORDER BY folders.created_at DESC
LIMIT 50 OFFSET 0
```

### Exemple 2 : Tri sur une Table Jointe

Quand le tri est sur une table jointe, INNER JOIN est automatiquement ajouté :

```javascript
const query = Folder.paginatedOptimized()
  .where({ type: ['agp', 'avt'] })
  .order('applicants.last_name ASC')  // ← Table jointe
  .join('applicant')
  .limit(50);
```

SQL généré (phase IDS) :
```sql
SELECT `folders`.`id`
FROM `folders`
INNER JOIN `applicants` ON `applicants`.`id` = `folders`.`applicant_id`
WHERE `folders`.`type` IN ('agp', 'avt')
ORDER BY applicants.last_name ASC
LIMIT 50 OFFSET 0
```

### Exemple 3 : Tri + Filtres sur Table Jointe

Combine INNER JOIN pour le tri et EXISTS pour les filtres :

```javascript
const query = Folder.paginatedOptimized()
  .where({ type: ['agp', 'avt'] })
  .filterJoin('applicant', { email: '%@example.com' })  // ← Filtre (EXISTS)
  .order('applicants.last_name ASC')                    // ← Tri (INNER JOIN)
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

> **Note** : Le filtre utilise EXISTS (pour la performance), tandis que le tri utilise INNER JOIN (nécessaire pour ORDER BY).

### Exemple 4 : Tri Multiple (Table Principale + Table Jointe)

```javascript
const query = Folder.paginatedOptimized()
  .where({ type: 'agp' })
  .order('applicants.last_name ASC')    // ← Tri primaire (table jointe)
  .order('folders.created_at DESC')     // ← Tri secondaire (table principale)
  .join('applicant')
  .limit(50);
```

SQL généré (phase IDS) :
```sql
SELECT `folders`.`id`
FROM `folders`
INNER JOIN `applicants` ON `applicants`.`id` = `folders`.`applicant_id`
WHERE `folders`.`type` = 'agp'
ORDER BY applicants.last_name ASC, folders.created_at DESC
LIMIT 50 OFFSET 0
```

## Avantages

### ✅ Performance

- **Tri côté base de données** : Utilise les index, beaucoup plus rapide que le tri en mémoire
- **Pagination correcte** : Les bons 50 résultats triés sont retournés
- **COUNT sans JOIN** : Le COUNT reste rapide (pas de JOIN inutile)

### ✅ Automatique

- Pas besoin de configuration manuelle
- Détecte automatiquement les colonnes de tri sur tables jointes
- Ajoute les INNER JOIN uniquement quand nécessaire

### ✅ Combinaison Intelligente

- **Filtres** → EXISTS (optimal pour filtrage)
- **Tri** → INNER JOIN (nécessaire pour ORDER BY)
- **Données** → LEFT JOIN (phase FULL uniquement)

## Comparaison Avant / Après

### Avant (Approche Naïve)

**Problème** : On ne peut pas trier sur une table jointe dans la phase IDS car on n'a pas fait de JOIN.

**Solution naïve** : Trier en mémoire après avoir récupéré toutes les données → **TRÈS LENT** sur de grandes tables.

### Après (INNER JOIN Automatique)

**Solution optimisée** : Détection automatique et ajout d'INNER JOIN dans la phase IDS.

**Résultat** :
- Tri effectué côté base de données (rapide)
- Pagination correcte (les bons 50 résultats triés)
- INNER JOIN uniquement dans IDS (pas dans COUNT)

## Note Importante : INNER JOIN vs LEFT JOIN

> **Pourquoi INNER JOIN et non LEFT JOIN pour le tri ?**

Quand on trie sur une colonne d'une table jointe (ex: `applicants.last_name`), on veut **uniquement** les folders qui **ont** un applicant.

- **INNER JOIN** : Exclut les folders sans applicant (correct pour le tri)
- **LEFT JOIN** : Inclurait les folders sans applicant, avec `last_name = NULL` en premier/dernier

Si vous voulez inclure les folders sans applicant dans les résultats, ne triez pas sur une colonne de la table jointe.

## Implémentation Technique

### Méthodes Clés (PaginatedOptimizedSql.js)

#### `_detectJoinTablesForSort()`

Parse les clauses ORDER BY pour identifier les colonnes provenant de tables jointes :

```javascript
_detectJoinTablesForSort() {
  const { query } = this;
  const joinTables = [];
  const mainTable = query.table;

  _.forEach(query.order, (orderClause) => {
    const match = orderClause.match(/[`]?(\w+)[`]?\.[\`]?(\w+)[\`]?\s*(ASC|DESC)?/i);

    if (match) {
      const tableName = match[1];

      if (tableName !== mainTable) {
        const association = this._findAssociationByTable(tableName);

        if (association && !_.find(joinTables, { tableName })) {
          joinTables.push({
            association,
            tableName,
            alias: association[1]
          });
        }
      }
    }
  });

  return joinTables;
}
```

#### `_findAssociationByTable(tableName)`

Trouve l'association correspondante dans le schema :

```javascript
_findAssociationByTable(tableName) {
  const { query } = this;

  if (!query.schema || !query.schema.associations) {
    return null;
  }

  const association = _.find(query.schema.associations, (assoc) => {
    const [, , AssociatedModel] = assoc;
    if (!AssociatedModel || !AssociatedModel.schema) {
      return false;
    }
    return AssociatedModel.schema.table === tableName;
  });

  return association || null;
}
```

#### `_addJoinsForSort(joinTablesForSort)`

Génère les clauses INNER JOIN pour les tables nécessaires au tri :

```javascript
_addJoinsForSort(joinTablesForSort) {
  if (joinTablesForSort.length === 0) {
    return '';
  }

  const { query, dialect } = this;
  const { esc } = dialect;
  const mainTable = query.table;

  let sql = '';

  _.forEach(joinTablesForSort, ({ association, tableName }) => {
    const [, , AssociatedModel, src_column, ref_column] = association;

    sql += `INNER JOIN ${esc}${tableName}${esc} `;
    sql += `ON ${esc}${tableName}${esc}.${esc}${ref_column}${esc} = ${esc}${mainTable}${esc}.${esc}${src_column}${esc} `;
  });

  return sql;
}
```

### Intégration (PaginatedOptimizedQuery.js)

Le schema est ajouté au query object pour que PaginatedOptimizedSql puisse y accéder :

```javascript
toSQL() {
  const { query } = this;
  const db = this.getDb();

  if (query.optimized && (query.verb === 'count' || query.verb === 'select_ids')) {
    // Ajouter le schema au query object
    query.schema = this.schema;

    const PaginatedOptimizedSql = require('./PaginatedOptimizedSql');
    const sql = new PaginatedOptimizedSql(query, db.driver.dialect);

    if (query.verb === 'count') {
      return sql.countSQL();
    } else if (query.verb === 'select_ids') {
      return sql.idsSQL();
    }
  }

  return super.toSQL();
}
```

## Voir Aussi

- [PaginatedOptimizedQuery Documentation](./PaginatedOptimizedQuery.md) - Vue d'ensemble du pattern COUNT/IDS/FULL
- [Nested Joins](./PAGINATED_OPTIMIZED_QUERY_NESTED.md) - Filtres imbriqués avec EXISTS
- [examples/SortOnJoinedTableExample.js](../examples/SortOnJoinedTableExample.js) - Exemples complets
