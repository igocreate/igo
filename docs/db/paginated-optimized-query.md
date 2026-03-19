
# PaginatedOptimizedQuery

## Overview

`PaginatedOptimizedQuery` implements the **COUNT/IDS/FULL pattern** to drastically improve performance of SQL queries with many joins on large tables.

## The Problem

With the traditional approach, queries with `LEFT JOIN` generate a huge cartesian product:

```javascript
// SLOW: ~5-10 seconds on 2M rows
const result = await Folder
  .join(['applicant', 'pme_folder', 'delegation'])
  .where({ 'folders.type': ['agp', 'avt'] })
  .where(['applicants.last_name LIKE $?', '%Dupont%'])
  .page(1, 50);
```

**Generated SQL:**
```sql
SELECT COUNT(0) FROM folders f
LEFT JOIN applicants a ON a.id = f.applicant_id
LEFT JOIN pme_folders p ON p.id = f.pme_folder_id
WHERE f.type IN ('agp', 'avt')
AND a.last_name LIKE '%Dupont%'
-- Time: 5-10 seconds
```

## The Optimized Approach: COUNT / IDs / FULL

With `PaginatedOptimizedQuery`, queries use the COUNT/IDS/FULL pattern with a simplified syntax:

```javascript
// FAST: ~50-200ms on 2M rows
const result = await Folder.paginatedOptimized()
  .where({
    type: ['agp', 'avt'],
    'applicant.last_name': 'Dupont%'
  })
  .join(['applicant', 'pme_folder', 'delegation'])
  .page(1, 50);
```

**Phase 1 — COUNT:**
```sql
SELECT COUNT(0) FROM folders f
WHERE f.type IN ('agp', 'avt')
AND EXISTS (
  SELECT 1 FROM applicants a
  WHERE a.id = f.applicant_id
  AND a.last_name LIKE 'Dupont%'
)
-- Time: 10-50ms
```

**Phase 2 — SELECT IDS:**
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
-- Time: 20-80ms
```

**Phase 3 — SELECT FULL:**
```sql
SELECT f.*, a.*, p.*, d.*
FROM folders f
LEFT JOIN applicants a ON a.id = f.applicant_id
LEFT JOIN pme_folders p ON p.id = f.pme_folder_id
LEFT JOIN delegations d ON d.id = f.delegation_id
WHERE f.id IN (101, 102, ..., 150)
ORDER BY f.created_at DESC
-- Time: 20-70ms (only 50 rows to join)
```

**Result: 50x to 100x faster on queries with many joins on large tables.**

## Setup

The module is built into @igojs/db. No extra installation needed.

```javascript
const query = MyModel.paginatedOptimized();
```

## Simplified Syntax

Filter on joined tables directly in `where()` using dot notation:

```javascript
Folder.paginatedOptimized()
  .where({
    // Main table
    status: 'SUBMITTED',
    type: ['agp', 'avt'],

    // Joined tables (1 level)
    'applicant.last_name': 'Dupont%',
    'applicant.email': '%@example.com',

    // Nested tables (multiple levels)
    'pme_folder.company.country.code': 'FR',
    'pme_folder.company.siret': '1234%'
  })
```

Nested paths are automatically detected and transformed into `EXISTS` subqueries.

## API

### .where(conditions)

Filters on the main table and joined tables with automatic detection.

#### Main table filters

```javascript
// Equality
query.where({ status: 'SUBMITTED' });

// IN (array)
query.where({ type: ['agp', 'avt'] });

// IS NULL
query.where({ deleted_at: null });
```

#### Joined table filters (1 level)

```javascript
query.where({
  status: 'SUBMITTED',
  'applicant.last_name': 'Dupont%',
  'applicant.email': '%@example.com'
});
```

**Generated SQL:**
```sql
WHERE folders.status = 'SUBMITTED'
AND EXISTS (
  SELECT 1 FROM applicants
  WHERE applicants.id = folders.applicant_id
  AND applicants.last_name LIKE 'Dupont%'
  AND applicants.email LIKE '%@example.com'
)
```

#### Nested table filters (multiple levels)

```javascript
query.where({
  type: 'agp',
  'pme_folder.company.country.code': 'FR',
  'pme_folder.company.siret': '1234%'
});
```

**Generated SQL:**
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

### Operators

#### Basic operators

```javascript
// Equality
{ status: 'ACTIVE' }
// → WHERE status = 'ACTIVE'

// IN (array)
{ status: ['ACTIVE', 'PENDING'] }
// → WHERE status IN ('ACTIVE', 'PENDING')

// IS NULL
{ email: null }
// → WHERE email IS NULL

// LIKE (auto-detected with %)
{ last_name: 'Dupont%' }
// → WHERE last_name LIKE 'Dupont%'
```

#### Advanced operators

Use an object with a `$` operator for advanced comparisons:

```javascript
// $like — explicit LIKE
{ 'applicant.last_name': { $like: 'Dup%' } }

// $between — date/number ranges
{ created_at: { $between: ['2024-01-01', '2024-12-31'] } }

// $gte — greater than or equal (>=)
{ created_at: { $gte: '2024-01-01' } }

// $lte — less than or equal (<=)
{ created_at: { $lte: '2024-12-31' } }

// $gt — greater than (>)
{ 'pme_folder.amount': { $gt: 1000 } }

// $lt — less than (<)
{ 'pme_folder.amount': { $lt: 5000 } }
```

#### Logical operators

##### $and

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

Multiple conditions in `where()` are combined with AND by default, so `$and` is optional in most cases.

##### $or

```javascript
query.where({
  $or: [
    { applicant_id: null },
    { pme_folder_id: null }
  ]
});
// → WHERE (applicant_id IS NULL OR pme_folder_id IS NULL)
```

Use an array (IN) to simulate OR on the same column:

```javascript
query.where({
  status: ['SUBMITTED', 'VALIDATED']
});
// → WHERE status IN ('SUBMITTED', 'VALIDATED')
```

### .join(associations)

Adds `LEFT JOIN` to retrieve associated data (FULL phase only).

```javascript
// Single join
query.join('applicant');

// Multiple joins
query.join(['applicant', 'pme_folder', 'delegation']);

// Nested join with dot notation
query.join('pme_folder.company.country');

// Mixed
query.join(['applicant', 'pme_folder.company.country']);
```

Dot notation is automatically transformed into nested object structure internally.

**Important:** Columns filtered via `where('association.column')` generate EXISTS (not JOIN). To retrieve associated data, add a matching `.join()`.

### .order(orderBy)

Sort on main table or joined table columns.

```javascript
// Main table
query.order('folders.created_at DESC');
query.order('folders.status ASC, folders.created_at DESC');

// Joined table
query.order('applicants.last_name ASC');

// Nested joined table
query.order('companies.name DESC');
```

When sorting on a joined table column, the system automatically:
1. Detects the required table (even if nested)
2. Adds a JOIN in the IDS phase only (not in COUNT)
3. Creates cascading JOINs for nested tables

### .page(page, nb)

Automatic pagination (uses COUNT + LIMIT/OFFSET).

```javascript
const result = await query.page(1, 50).execute();

result.pagination;
// {
//   page: 1, nb: 50, count: 1234, nb_pages: 25,
//   previous: null, next: 2, start: 1, end: 50, links: [...]
// }

result.rows;
// [Folder, Folder, ...]
```

### .limit(limit) / .offset(offset)

Manual pagination.

```javascript
query.limit(50).offset(100);
```

### .execute()

Executes the optimized query (3 phases).

```javascript
const result = await query.execute();
```

## Examples

### Simple pagination

```javascript
const result = await Folder.paginatedOptimized()
  .where({
    type: ['agp', 'avt'],
    'applicant.last_name': 'Dupont%'
  })
  .join('applicant')
  .order('folders.created_at DESC')
  .page(1, 50)
  .execute();
```

### Multiple filters on multiple tables

```javascript
const result = await Folder.paginatedOptimized()
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

### Advanced operators

```javascript
const result = await Folder.paginatedOptimized()
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

### Deep nested filters (3 levels)

```javascript
const result = await Folder.paginatedOptimized()
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

### Multi-field search with $and

```javascript
const token = 'test';

const result = await Folder.paginatedOptimized()
  .where({
    $and: [
      { created_at: { $between: ['2024-01-01', '2024-12-31'] } },
      { status: ['SUBMITTED', 'VALIDATED'] },
      { 'applicant.last_name': { $like: `${token}%` } },
      { 'pme_folder.company.country.code': 'FR' }
    ]
  })
  .join(['applicant', 'pme_folder.company.country'])
  .order('folders.created_at DESC')
  .page(1, 50)
  .execute();
```

## Advanced Features

### Automatic condition grouping

Conditions on the same table are automatically grouped into a single EXISTS:

```javascript
query.where({
  'applicant.last_name': 'Dupont',
  'applicant.first_name': 'Jean',
  'applicant.email': '%@example.com'
});
```

```sql
EXISTS (
  SELECT 1 FROM applicants
  WHERE applicants.id = folders.applicant_id
  AND applicants.last_name = 'Dupont'
  AND applicants.first_name = 'Jean'
  AND applicants.email LIKE '%@example.com'
)
-- One EXISTS instead of 3 — more efficient!
```

### Automatic LIKE detection

The `%` character automatically triggers the LIKE operator:

```javascript
{ 'applicant.last_name': 'Dup%' }
// → WHERE last_name LIKE 'Dup%'

// Or explicit with $like
{ 'applicant.last_name': { $like: 'Dup%' } }
```

### Sorting on joined columns

When sorting on a joined table column, the system creates the required JOINs automatically:

```javascript
Folder.paginatedOptimized()
  .where({ type: ['agp', 'avt'] })
  .order('applicants.last_name ASC')
  .join('applicant')
  .limit(50);
```

**Phase COUNT** — no JOIN:
```sql
SELECT COUNT(0) FROM folders WHERE type IN ('agp', 'avt')
```

**Phase IDS** — JOIN added for sorting:
```sql
SELECT folders.id FROM folders
LEFT JOIN applicants ON applicants.id = folders.applicant_id
WHERE folders.type IN ('agp', 'avt')
ORDER BY applicants.last_name ASC
LIMIT 50 OFFSET 0
```

### SQL functions in ORDER BY

`order()` supports SQL functions like COALESCE, IFNULL, CONCAT. Referenced tables are automatically joined:

```javascript
Folder.paginatedOptimized()
  .where({ type: 'agp' })
  .join(['beneficiary', 'applicant'])
  .order('COALESCE(`beneficiary`.`expires_at`, `applicant`.`expires_at`) DESC')
  .page(1, 50);
```

## Performance

| Scenario | Traditional | Optimized | Gain |
|----------|-------------|-----------|------|
| 100K rows, 3 joins | 500ms | 20ms | 25x |
| 1M rows, 5 joins | 3000ms | 50ms | 60x |
| 2M rows, 10 joins | 10000ms | 100ms | 100x |
| 5M rows, 10 joins | 30000ms+ | 200ms | 150x+ |

### When to use

**Use `paginatedOptimized()` when:**
- Main table > 100K rows
- More than 3 joins
- Paginated queries
- Filters on multiple joined tables

**Don't use `paginatedOptimized()` when:**
- Main table < 10K rows (unnecessary overhead)
- No joins
- Primary key lookup (`.find(id)`)

## Limitations

- Complex aggregations with `GROUP BY` on multiple tables are not supported
- Not compatible with `CachedQuery`

## Architecture

```
┌─────────────────────────────────────────────────────┐
│          PaginatedOptimizedQuery.execute()           │
└─────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
   ┌─────────┐      ┌──────────┐     ┌──────────┐
   │ Phase 1 │      │ Phase 2  │     │ Phase 3  │
   │  COUNT  │      │   IDS    │     │   FULL   │
   └─────────┘      └──────────┘     └──────────┘
        │                 │                 │
        ▼                 ▼                 ▼
  COUNT(0)          SELECT id          SELECT *
  FROM main         FROM main          FROM main
  WHERE ...         WHERE ...          WHERE id IN (...)
  AND EXISTS(...)   AND EXISTS(...)    LEFT JOIN ...
                    ORDER BY ...       ORDER BY ...
                    LIMIT ... OFFSET
        │                 │                 │
        └─────────────────┴─────────────────┘
                          │
                          ▼
                    { pagination, rows }
```
