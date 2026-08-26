
const _            = require('lodash');

const dependencies = require('./dependencies');
const CacheStats   = require('./CacheStats');

const VERSIONS_NS = '_cached_versions';

const DEFAULT_TTL = 3600;

const RE_SUBQUERY = /\bselect\b/i;

const WARNED      = new Set();

// tables a result depends on: the main one, plus every joined one.
// nested joins are flattened into query.joins at build time, so every level is covered
const tables = (query) => {
  const joined = query.joins.map(join => join.association[2].schema.table);
  return _.uniq([query.table, ...joined]).sort();
};

// the raw SQL the caller provides: tables() cannot see what these read
const rawFragments = (query) => {
  const wheres = [...query.where, ...query.whereNot].map(w => _.isArray(w) ? w[0] : w);
  return [...wheres, ...query.order, query.select].filter(_.isString);
};

// what keeps this query out of the cache, or null
const uncacheable = (query) => {
  // a joined model without its own cache never bumps its version: its writes would go unnoticed
  const uncached = query.joins.find(join => !join.association[2].schema.cache);
  if (uncached) {
    return `join on uncached model '${uncached.association[2].schema.table}'`;
  }
  // a subquery reads a table no version stamps, so nothing would ever invalidate the entry
  if (rawFragments(query).some(sql => RE_SUBQUERY.test(sql))) {
    return 'raw subquery';
  }
  return null;
};

const cacheable = (schema, query) => !!schema.cache && !uncacheable(query);

// a cached model bypasses the cache
const reportSkip = (schema, query, sql) => {
  if (!schema.cache) {
    return;
  }
  CacheStats.incr(query.table, 'skipped');

  const { config, logger } = dependencies;
  if (!config.cache_warnings) {
    return;
  }
  const key = `${query.table}:${sql}`;
  if (WARNED.has(key)) {
    return;
  }
  WARNED.add(key);
  logger.warn(`[QueryCache] '${query.table}' is cached but this query is not (${uncacheable(query)}): ${sql}`);
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

module.exports = { VERSIONS_NS, DEFAULT_TTL, tables, rawFragments, uncacheable, cacheable, reportSkip, bump, read };
