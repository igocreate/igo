const _         = require('lodash');
const dependencies = require('../dependencies');
const PaginatedOptimizedSql = require('../PaginatedOptimizedSql');
const QueryCache = require('../QueryCache');
const { cloneQuery, buildPagination } = require('../QueryUtils');

/**
 * PaginatedOptimized executor - exécute une Query paginée avec jointures via le pattern COUNT/IDS/FULL.
 *
 * Construit à partir d'une Query (composition, pas d'héritage) : il lit l'état de la query,
 * extrait les conditions sur tables jointes (dot-paths) en filtres EXISTS, puis exécute 3 phases :
 *
 * 1. COUNT  : compte les lignes sans LEFT JOIN, filtres sur tables jointes en sous-requêtes EXISTS
 * 2. IDS    : sélectionne les IDs de la table principale (filtres + tri + pagination)
 * 3. FULL   : récupère les données complètes avec LEFT JOIN, restreintes aux IDs trouvés
 *
 * Sélectionné automatiquement par Query.execute() quand la query est compatible (voir
 * Query._checkOptimizedCompatibility). Jamais instancié directement par l'appelant.
 */
module.exports = class PaginatedOptimized {

  constructor(source) {
    this.source     = source;
    this.modelClass = source.modelClass;
    this.schema     = source.schema;
    this.db         = source.getDb();
    this.dialect    = this.db.driver.dialect;

    // working copy: extraction mutates where/filterJoins, never the source query
    this.query              = cloneQuery(source.query);
    this.query.optimized    = true;
    this.query.filterJoins  = this.query.filterJoins ? this.query.filterJoins.slice() : [];
    this._extractFilterJoins();
  }

  // Retraite les where : extrait les dot-paths vers filterJoins (→ EXISTS), garde le reste
  _extractFilterJoins() {
    const originalWheres = this.query.where;
    this.query.where = [];
    _.forEach(originalWheres, (where) => {
      if (_.isArray(where) || _.isString(where)) {
        this.query.where.push(where); // raw SQL — garder tel quel
      } else if (_.isPlainObject(where)) {
        const { mainConditions, joinConditions } = this._extractJoinConditions(where);
        if (!_.isEmpty(mainConditions)) {
          this.query.where.push(mainConditions);
        }
        if (Object.keys(joinConditions).length > 0) {
          this._buildFilterJoinsFromPaths(joinConditions);
        }
      } else {
        this.query.where.push(where);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Génération SQL des phases (utilisée par count/selectIds, et par les tests)
  // ---------------------------------------------------------------------------

  countSQL() {
    const query = cloneQuery(this.query);
    query.verb  = 'count';
    query.limit = 1;
    delete query.page;
    delete query.nb;
    delete query.order; // pas de ORDER BY pour un COUNT
    query.schema = this.schema;
    return new PaginatedOptimizedSql(query, this.dialect).countSQL();
  }

  idsSQL() {
    const query = cloneQuery(this.query);

    const primaryKeys = this.schema.primary || ['id'];
    const { esc } = this.dialect;
    query.select = primaryKeys.map(key => `${esc}${this.schema.table}${esc}.${esc}${key}${esc}`).join(', ');
    query.schema = this.schema;
    return new PaginatedOptimizedSql(query, this.dialect).idsSQL();
  }

  // ---------------------------------------------------------------------------
  // Phases
  // ---------------------------------------------------------------------------

  // Ces phases court-circuitent Query : elles passent par QueryCache directement
  async _cached(sqlQuery, run) {
    if (!QueryCache.cacheable(this.schema, this.query)) {
      QueryCache.reportSkip(this.schema, this.query, sqlQuery.sql);
      return await run();
    }
    return await QueryCache.read(this.schema, this.query, sqlQuery, run);
  }

  // Phase 1 : COUNT optimisé avec EXISTS (sans LEFT JOIN)
  async count() {
    const sqlQuery = this.countSQL();
    return await this._cached(sqlQuery, async () => {
      const rows = await this.db.query(sqlQuery.sql, sqlQuery.params, this.query.options);
      return rows && rows[0] && Number(rows[0].count) || 0;
    });
  }

  // Phase 2 : SELECT IDS (filtres + tri + pagination)
  async selectIds() {
    const sqlQuery = this.idsSQL();
    return await this._cached(sqlQuery, async () => {
      const rows = await this.db.query(sqlQuery.sql, sqlQuery.params, this.query.options);

      const primaryKeys = this.schema.primary || ['id'];
      if (primaryKeys.length === 1) {
        return rows.map(row => row[primaryKeys[0]]);
      }
      return rows.map(row => _.pick(row, primaryKeys));
    });
  }

  // Phase 3 : SELECT FULL avec LEFT JOIN, restreint aux IDs trouvés
  async selectFull(ids) {
    if (!ids || ids.length === 0) {
      return [];
    }

    // même classe que la query source, pour qu'un modèle caché garde sa CachedQuery
    const fullQuery = new this.source.constructor(this.modelClass);
    fullQuery.query = cloneQuery(this.query);
    fullQuery.query.verb = 'select';

    // Les filterJoins ne servent qu'au COUNT/IDS
    fullQuery.query.filterJoins = [];

    // Remplacer les filtres par WHERE pk IN (...)
    const primaryKeys = this.schema.primary || ['id'];
    if (primaryKeys.length === 1) {
      fullQuery.query.where = [{ [primaryKeys[0]]: ids }];
    } else {
      fullQuery.query.where = ids.map(idObj => idObj); // clés composites
    }
    fullQuery.query.whereNot = [];

    // Pagination déjà appliquée en phase IDS
    delete fullQuery.query.limit;
    delete fullQuery.query.offset;
    delete fullQuery.query.page;
    delete fullQuery.query.nb;

    // Conserver l'ORDER BY (IN (...) ne garantit pas l'ordre) en transformant les chemins
    // d'associations en alias attendus par la Query standard
    if (fullQuery.query.order && fullQuery.query.order.length > 0) {
      const sqlGenerator = new PaginatedOptimizedSql({ schema: this.schema }, this.dialect);
      fullQuery.query.order = fullQuery.query.order.map(orderClause => {
        return sqlGenerator._transformOrderClauseForFullQuery(orderClause);
      });
    }

    const rows = await fullQuery.execute();

    // Les LEFT JOIN 1-N créent des doublons : garder la première occurrence de chaque ID
    return this._deduplicateRows(rows, ids.length);
  }

  _deduplicateRows(rows, expectedCount) {
    if (!rows || rows.length === 0 || rows.length === expectedCount) {
      return rows;
    }

    const primaryKeys = this.schema.primary || ['id'];
    const seenIds = new Set();
    const uniqueRows = [];

    for (const row of rows) {
      const key = primaryKeys.length === 1 ? row[primaryKeys[0]] : primaryKeys.map(k => row[k]).join('|');
      if (!seenIds.has(key)) {
        seenIds.add(key);
        uniqueRows.push(row);
      }
    }

    const duplicatesRemoved = rows.length - uniqueRows.length;
    if (duplicatesRemoved > 0) {
      dependencies.logger.info(`[PaginatedOptimized] ${duplicatesRemoved} duplicate(s) removed by LEFT JOIN 1-N deduplication`);
    }

    return uniqueRows;
  }

  // Orchestrateur : exécute les 3 phases
  async run() {
    const { query } = this;

    if (!query.page) {
      const ids  = await this.selectIds();
      const rows = await this.selectFull(ids);
      if (query.limit === 1) {
        return rows[0] || null;
      }
      return rows;
    }

    // COUNT et IDS en parallèle (page supposée valide ; sinon re-IDS avec page clampée)
    query.offset = (query.page - 1) * query.nb;
    query.limit  = query.nb;

    let [count, ids] = await Promise.all([this.count(), this.selectIds()]);

    const page = Math.min(query.page, Math.max(Math.ceil(count / query.nb), 1));
    if (page !== query.page) {
      query.page   = page;
      query.offset = (page - 1) * query.nb;
      ids = await this.selectIds();
    }

    const rows = await this.selectFull(ids);
    return { pagination: buildPagination(query, count), rows };
  }

  // ---------------------------------------------------------------------------
  // Extraction des conditions dot-path vers filterJoins (EXISTS)
  // ---------------------------------------------------------------------------

  // Sépare les conditions sur tables jointes (dot-path) des conditions sur la table principale
  _extractJoinConditions(expr) {
    const joinConditions = {};
    const mainConditions = {};

    if (!expr || _.isEmpty(expr)) {
      return { mainConditions, joinConditions };
    }

    _.forOwn(expr, (value, key) => {
      if (key === '$and' && _.isArray(value)) {
        const mainChildren = [];
        _.forEach(value, (child) => {
          const extracted = this._extractJoinConditions(child);
          if (!_.isEmpty(extracted.mainConditions)) {
            mainChildren.push(extracted.mainConditions);
          }
          _.assign(joinConditions, extracted.joinConditions);
        });
        if (mainChildren.length > 0) {
          mainConditions.$and = mainChildren;
        }
      } else if (key === '$or' && _.isArray(value)) {
        const mainBranches = [];
        const joinedBranches = [];

        _.forEach(value, (child) => {
          const hasJoinedKey = _.isObject(child) && !_.isArray(child) &&
            _.some(_.keys(child), k => this.source._isJoinedPath(k));
          if (hasJoinedKey) {
            joinedBranches.push(child);
          } else {
            mainBranches.push(child);
          }
        });

        if (joinedBranches.length > 0) {
          this.query.filterJoins.push({ type: 'or_group', conditions: joinedBranches });
        }
        if (mainBranches.length > 0) {
          mainConditions.$or = mainBranches;
        }
      } else if (this.source._isJoinedPath(key)) {
        const keyParts = key.split('.');
        const column = keyParts[keyParts.length - 1];
        const path = keyParts.slice(0, -1);
        joinConditions[key] = { value, path, column };
      } else {
        mainConditions[key] = value;
      }
    });

    return { mainConditions, joinConditions };
  }

  // Construit les filterJoins à partir des chemins détectés, regroupés par racine d'association
  _buildFilterJoinsFromPaths(joinConditions) {
    const groupedByRoot = {};

    _.forOwn(joinConditions, ({ value, path, column }, fullPath) => {
      const root = path[0];
      if (!groupedByRoot[root]) {
        groupedByRoot[root] = [];
      }
      groupedByRoot[root].push({ path: path.slice(1), column, value, fullPath });
    });

    _.forOwn(groupedByRoot, (conditions, root) => {
      const allAtRoot = _.every(conditions, c => c.path.length === 0);
      if (allAtRoot) {
        const simpleConditions = {};
        _.forEach(conditions, ({ column, value }) => {
          simpleConditions[column] = value;
        });
        this._addSimpleFilterJoin(root, simpleConditions);
      } else {
        const nestedConfig = this._buildNestedConfig(conditions);
        this._addNestedFilterJoin({ [root]: nestedConfig });
      }
    });
  }

  _addSimpleFilterJoin(associationName, conditions, operator = 'AND') {
    const association = this.source._findAssociation(associationName, this.schema);
    this.query.filterJoins.push({ association, conditions, operator, src_schema: this.schema });
  }

  _addNestedFilterJoin(nestedConfig) {
    const buildHierarchy = (config, currentSchema, parentPath = null) => {
      const results = [];
      _.each(config, (value, associationName) => {
        const association = this.source._findAssociation(associationName, currentSchema);
        const [, , AssociatedModel] = association;
        const node = {
          association,
          conditions: value.conditions || null,
          operator: value.operator || 'AND',
          src_schema: currentSchema,
          parent: parentPath,
          children: []
        };
        if (value.nested) {
          node.children = buildHierarchy(value.nested, AssociatedModel.schema, node);
        }
        results.push(node);
      });
      return results;
    };

    const hierarchy = buildHierarchy(nestedConfig, this.schema);
    this.query.filterJoins.push({ type: 'nested', hierarchy });
  }

  _buildNestedConfig(conditions) {
    const config = { conditions: {}, nested: {} };
    const currentLevelConditions = [];
    const nestedConditions = {};

    _.forEach(conditions, (cond) => {
      if (cond.path.length === 0) {
        currentLevelConditions.push(cond);
      } else {
        const nextLevel = cond.path[0];
        if (!nestedConditions[nextLevel]) {
          nestedConditions[nextLevel] = [];
        }
        nestedConditions[nextLevel].push({ path: cond.path.slice(1), column: cond.column, value: cond.value });
      }
    });

    _.forEach(currentLevelConditions, ({ column, value }) => {
      config.conditions[column] = value;
    });
    if (_.isEmpty(config.conditions)) {
      delete config.conditions;
    }

    _.forOwn(nestedConditions, (nestedConds, assocName) => {
      config.nested[assocName] = this._buildNestedConfig(nestedConds);
    });
    if (_.isEmpty(config.nested)) {
      delete config.nested;
    }

    return config;
  }
};
