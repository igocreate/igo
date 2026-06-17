
// Shared helpers used by Query and its executors (executors/Standard, executors/PaginatedOptimized).

// cheap clone: copy the mutable containers, keep schemas/models/conditions by reference
// (cloning the schema graph deeply is expensive and breaks identity lookups)
const cloneQuery = (query) => {
  const clone = {
    ...query,
    where:    query.where.slice(),
    whereNot: query.whereNot.slice(),
    joins:    query.joins.slice(),
    order:    query.order.slice(),
    scopes:   query.scopes.slice(),
    unscopes: query.unscopes.slice(),
    includes: { ...query.includes },
    options:  { ...query.options },
  };
  if (query.filterJoins) {
    clone.filterJoins = query.filterJoins.slice();
  }
  return clone;
};

// build the pagination object from a count (query.page/offset must already be final)
const buildPagination = (query, count) => {
  const nb_pages = Math.ceil(count / query.nb);
  const page     = query.page;

  const links = [];
  const start = Math.max(1, page - 5);
  for (let i = 0; i < 10; i++) {
    const p = start + i;
    if (p <= nb_pages) {
      links.push({ page: p, current: page === p });
    }
  }
  return {
    page,
    nb:       query.nb,
    previous: page > 1 ? page - 1 : null,
    next:     page < nb_pages ? page + 1 : null,
    start:    query.offset + 1,
    end:      query.offset + Math.min(query.nb, count - query.offset),
    nb_pages,
    count,
    links,
  };
};

module.exports = { cloneQuery, buildPagination };
