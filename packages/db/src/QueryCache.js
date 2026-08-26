
const _            = require('lodash');

const dependencies = require('./dependencies');
const CacheStats   = require('./CacheStats');

const VERSIONS_NS = '_cached_versions';
// invalidated entries are overwritten on the next miss, and reclaimed by expiration otherwise
const DEFAULT_TTL = 3600;

// tables a result depends on: the main one, plus every joined one.
// nested joins are flattened into query.joins at build time, so every level is covered
const tables = (query) => {
  const joined = query.joins.map(join => join.association[2].schema.table);
  return _.uniq([query.table, ...joined]).sort();
};

// a joined model without its own cache never bumps its version, so its writes would go
// unnoticed: don't cache the query at all in that case
const cacheable = (schema, query) => {
  return !!schema.cache && query.joins.every(join => !!join.association[2].schema.cache);
};

// bump the table version: invalidates all cached reads on it with a single INCR
const bump = async (table) => {
  return await dependencies.cache.incr(VERSIONS_NS, table);
};

// read-through cache: the entry is stamped with the versions of the tables it was built
// from, and stops matching as soon as any of them moves
const read = async (schema, query, sqlQuery, run) => {
  const { cache } = dependencies;
  const namespace = `_cached.${query.table}`;
  const key       = JSON.stringify(sqlQuery);

  // the key does not depend on the versions, so both reads are independent
  // and get pipelined into a single round trip
  const [entry, versions] = await Promise.all([
    cache.get(namespace, key),
    cache.mget(VERSIONS_NS, tables(query)),
  ]);

  if (entry && _.isEqual(entry.versions, versions)) {
    CacheStats.incr(query.table, 'hits');
    return entry.rows;
  }

  // versions are the ones read *before* running: a concurrent write makes this entry
  // stale on the next read instead of being served until it expires
  const result = await run();
  if (result !== null && result !== undefined && !result.err) {
    await cache.put(namespace, key, { versions, rows: result }, schema.cache.ttl || DEFAULT_TTL);
  }

  CacheStats.incr(query.table, 'misses');
  return result;
};

module.exports = { VERSIONS_NS, DEFAULT_TTL, tables, cacheable, bump, read };
