
# Optimized Pagination

When you paginate a query that joins related tables, the standard approach (`COUNT(*) ... LEFT JOIN ...` then `SELECT * ... LEFT JOIN ... LIMIT N OFFSET M`) becomes painful on large tables — every joined row multiplies the rows the database has to count and re-count.

`@igojs/db` ships a **COUNT/IDS/FULL pattern** that splits the work into three smaller queries:

1. **COUNT** with `EXISTS` subqueries — no `LEFT JOIN` at all
2. **SELECT IDs** only — filters, order and `LIMIT/OFFSET` applied on the primary table
3. **SELECT full data** with `LEFT JOIN`, restricted to the IDs found in step 2

The joins only run on the rows that actually appear on the current page, so the work is bounded by your page size, not by the total table size.

## Automatic activation

The optimization kicks in automatically when both `.page()` and `.join()` are part of the same query:

```js
const result = await Folder
  .where({ type: ['agp', 'avt'], status: 'SUBMITTED' })
  .join(['applicant', 'pme_folder'])
  .order('folders.created_at DESC')
  .page(1, 50)
  .list();
// → EXISTS for COUNT, deferred joins for SELECT
```

Without joins, the standard 2-query approach (`COUNT` + `SELECT`) is used — it's already efficient for unjoined paginated queries.

## Explicit opt-in

You can also opt in explicitly via `Model.paginatedOptimized()`. Useful when you want the pattern even without joins, or to make the intent obvious at the call site:

```js
const result = await Folder.paginatedOptimized()
  .where({ type: ['agp', 'avt'], status: 'SUBMITTED' })
  .join(['applicant', 'pme_folder'])
  .order('folders.created_at DESC')
  .page(1, 50)
  .execute();
```

## When it pays off

Order-of-magnitude gains on tables with many joined rows:

| Scenario | Standard | Optimized | Gain |
|----------|----------|-----------|------|
| 100K rows, 3 joins | 500ms | 20ms | 25× |
| 1M rows, 5 joins | 3s | 50ms | 60× |
| 2M rows, 10 joins | 10s | 100ms | 100× |

The optimization matters most when:

- The table is large (100K+ rows)
- Multiple `has_many` joins multiply the row count
- You filter or sort on columns from joined tables

For small or unjoined paginated queries, the standard 2-query approach is fine — and `paginatedOptimized()` won't make it faster.
