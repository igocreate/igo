const _ = require('lodash');
const { buildPagination } = require('../QueryUtils');

/**
 * Standard executor - exécution standard d'une Query (un seul SELECT, pagination LIMIT/OFFSET).
 *
 * Construit à partir d'une Query (composition) : il opère directement sur l'état de la query
 * (scopes et ordres par défaut déjà appliqués par Query.execute) et :
 * - lance COUNT et SELECT en parallèle en mode paginé (re-SELECT si la page est hors limites)
 * - parse les types, hydrate les instances de modèle et leurs joins
 * - charge les associations (includes) niveau par niveau
 *
 * Stratégie d'exécution par défaut, utilisée par Query.execute() hors du cas paginé-avec-joins
 * (voir executors/PaginatedOptimized).
 */
module.exports = class Standard {

  constructor(source) {
    this.source  = source;
    this.query   = source.query;
    this.schema  = source.schema;
    this.dialect = source.getDb().driver.dialect;
  }

  async run() {
    const { source, query, schema, dialect } = this;

    let pagination = null;
    let rows;

    if (query.page) {
      // COUNT et SELECT en parallèle, page supposée valide ; sinon re-SELECT avec page clampée
      query.offset = (query.page - 1) * query.nb;
      query.limit  = query.nb;
      let count;
      [count, rows] = await Promise.all([source.count(), source.runQuery()]);
      const page = Math.min(query.page, Math.max(Math.ceil(count / query.nb), 1));
      if (page !== query.page) {
        query.page   = page;
        query.offset = (page - 1) * query.nb;
        rows = await source.runQuery();
      }
      pagination = buildPagination(query, count);
    } else {
      rows = await source.runQuery();
    }

    if (rows === null) {
      return null;
    }

    if (query.verb === 'insert') {
      const insertId = dialect.insertId(rows);
      return { insertId };
    } else if (query.verb !== 'select') {
      return rows;
    }

    if (query.distinct || query.group) {
      return rows;
    } else if (query.limit === 1 && (!rows || rows.length === 0)) {
      return null;
    }

    // parse types (table principale + joins)
    rows = _.each(rows, row => {
      schema.parseTypes(row);
      _.forEach(query.joins, (join) => {
        const [_assoc_type, name, Obj] = join.association;
        Obj.schema.parseTypes(row, `${name}__`);
      });
    });

    // hydrate les instances de modèle et leurs joins
    rows = _.map(rows, row => {
      const instance = source.newInstance(row);

      if (query.joins.length === 0) {
        return instance;
      }

      const createdInstances = new Map();
      createdInstances.set(schema, instance);

      _.forEach(query.joins, (join) => {
        const { src_schema, association } = join;
        const [_assoc_type, name, Obj] = association;
        const table_alias = name;

        const params = {};
        Obj.schema.columns.forEach(col => {
          const alias = `${table_alias}__${col.attr}`;
          params[col.attr] = row[alias];
          delete instance[alias];
        });

        const joinInstance = source.newInstance(params, Obj);
        const parentInstance = createdInstances.get(src_schema);

        if (parentInstance) {
          parentInstance[name] = joinInstance || null;
          if (joinInstance) {
            createdInstances.set(Obj.schema, joinInstance);
          }
        }
      });

      return instance;
    });

    // Load associations level by level: same-depth includes are independent and run in
    // parallel; dotted includes read attributes set by their parent include
    const includesByDepth = _.groupBy(_.keys(query.includes), key => key.split('.').length);
    for (const depth of _.keys(includesByDepth).sort((a, b) => a - b)) {
      await Promise.all(includesByDepth[depth].map(include => source.loadAssociation(include, rows)));
    }

    if (pagination) {
      return { pagination, rows };
    }
    if (query.limit === 1) {
      return rows[0];
    }
    return rows;
  }
};
