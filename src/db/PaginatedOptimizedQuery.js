const _         = require('lodash');
const Query     = require('./Query');
const logger    = require('../logger');

/**
 * PaginatedOptimizedQuery - Implémentation du pattern COUNT/IDS/FULL pour optimiser les requêtes avec jointures
 *
 * Ce module remplace la logique traditionnelle des LEFT JOIN par un pattern en 3 phases :
 *
 * 1. COUNT avec EXISTS : Compte les lignes sans faire de jointures, utilise EXISTS pour les filtres sur tables jointes
 * 2. SELECT IDS : Sélectionne uniquement les IDs de la table principale avec filtres, tris et pagination
 * 3. SELECT FULL : Récupère les données complètes avec LEFT JOIN uniquement pour les IDs trouvés
 *
 * Ce pattern améliore drastiquement les performances sur les grosses tables avec de nombreuses jointures.
 *
 * Exemple d'utilisation :
 *
 * const query = Folder.paginatedOptimized()
 *   .where({ type: ['agp', 'avt'] })
 *   .filterJoin('applicant', { last_name: 'Dupont%' })  // sera transformé en EXISTS
 *   .join('pme_folder')                                  // sera un LEFT JOIN dans la phase FULL
 *   .order('folders.created_at DESC')
 *   .page(1, 50);
 *
 * const result = await query.execute(); // { pagination: {...}, rows: [...] }
 */
module.exports = class PaginatedOptimizedQuery extends Query {

  constructor(modelClass, verb = 'select') {
    super(modelClass, verb);

    // Nouvelle propriété pour distinguer les joins de filtrage (→ EXISTS) des joins de données (→ LEFT JOIN)
    this.query.filterJoins = [];

    // Flag pour activer le mode optimisé
    this.query.optimized = true;
  }

  /**
   * Override de join() pour supporter la notation pointée
   *
   * Permet d'utiliser la notation pointée pour les joins imbriqués :
   * - .join('applicant') → join simple
   * - .join('pme_folder.company.country') → join imbriqué
   * - .join(['applicant', 'pme_folder.company']) → plusieurs joins
   *
   * @param {string|array|object} associations - Associations à joindre
   * @returns {PaginatedOptimizedQuery} this (pour chaînage)
   */
  join(associations) {
    // Si c'est un objet, utiliser la syntaxe standard (Query parent)
    if (_.isObject(associations) && !_.isArray(associations)) {
      return super.join(associations);
    }

    // Si c'est une string ou un tableau, détecter la notation pointée
    const assocs = _.isArray(associations) ? associations : [associations];
    const transformed = [];

    _.forEach(assocs, (assoc) => {
      if (_.isString(assoc) && assoc.includes('.')) {
        // Notation pointée détectée : transformer en structure imbriquée
        transformed.push(this._transformDottedJoinPath(assoc));
      } else {
        // Pas de notation pointée : garder tel quel
        transformed.push(assoc);
      }
    });

    // Si on a transformé des chemins, reconstruire la structure
    if (transformed.length > 0) {
      return super.join(this._mergeJoinStructures(transformed));
    }

    return super.join(associations);
  }

  /**
   * Transforme un chemin pointé en structure imbriquée
   *
   * @param {string} path - Chemin pointé (ex: 'pme_folder.company.country')
   * @returns {object} Structure imbriquée
   *
   * Exemple :
   * 'pme_folder.company.country' → { pme_folder: { company: ['country'] } }
   */
  _transformDottedJoinPath(path) {
    const parts = path.split('.');

    // Si un seul niveau, retourner tel quel
    if (parts.length === 1) {
      return parts[0];
    }

    // Construire la structure imbriquée de droite à gauche
    let result = [parts[parts.length - 1]];

    for (let i = parts.length - 2; i >= 0; i--) {
      result = { [parts[i]]: result };
    }

    return result;
  }

  /**
   * Fusionne plusieurs structures de join
   *
   * @param {array} structures - Tableau de structures de join
   * @returns {array|object} Structure fusionnée
   */
  _mergeJoinStructures(structures) {
    // Séparer les strings simples des objets
    const simples = [];
    const nested = {};

    _.forEach(structures, (struct) => {
      if (_.isString(struct)) {
        simples.push(struct);
      } else if (_.isObject(struct)) {
        // Fusionner les objets imbriqués
        _.merge(nested, struct);
      }
    });

    // Si on a des objets imbriqués et des simples
    if (!_.isEmpty(nested) && simples.length > 0) {
      return [...simples, nested];
    }

    // Si seulement des simples
    if (simples.length > 0 && _.isEmpty(nested)) {
      return simples;
    }

    // Si seulement des imbriqués
    if (_.isEmpty(simples) && !_.isEmpty(nested)) {
      return nested;
    }

    return structures;
  }

  /**
   * Override de where() pour détecter automatiquement les conditions sur tables jointes
   *
   * Cette méthode analyse les conditions pour détecter les chemins imbriqués (ex: 'applicant.last_name')
   * et les convertit automatiquement en filterJoins optimisés avec EXISTS.
   *
   * Syntaxe supportée :
   * - Table principale : { status: 'ACTIVE' }
   * - Table jointe (1 niveau) : { 'applicant.last_name': 'Dupont' }
   * - Tables imbriquées : { 'pme_folder.company.country.code': 'FR' }
   *
   * Opérateurs supportés :
   * - Égalité : { 'applicant.email': 'test@test.com' }
   * - LIKE : { 'applicant.last_name': { $like: 'Dup%' } }
   * - IN : { 'applicant.status': ['ACTIVE', 'PENDING'] }
   * - BETWEEN : { created_at: { $between: ['2024-01-01', '2024-12-31'] } }
   * - Comparaisons : { amount: { $gte: 100 } }
   *
   * Opérateurs logiques :
   * - $and : { $and: [{ status: 'ACTIVE' }, { 'applicant.last_name': 'Dupont' }] }
   * - $or : { $or: [{ status: 'ACTIVE' }, { status: 'PENDING' }] }
   *
   * @param {object|string} where - Conditions de filtrage
   * @param {any} params - Paramètres (pour compatibilité avec Query parent)
   * @returns {PaginatedOptimizedQuery} this (pour chaînage)
   */
  where(where, params) {
    // Appeler le parent pour gérer les cas simples (string avec params)
    if (params !== undefined) {
      return super.where(where, params);
    }

    // Analyser et transformer les conditions
    const { mainConditions, joinConditions } = this._parseWhereConditions(where);

    // Ajouter les conditions sur la table principale
    // mainConditions est maintenant un tableau de conditions
    if (mainConditions && mainConditions.length > 0) {
      _.forEach(mainConditions, (cond) => {
        // Vérifier si c'est un objet avec des valeurs SQL transformées
        if (_.isObject(cond) && !_.isArray(cond)) {
          const normalizedCond = {};
          _.forOwn(cond, (value, key) => {
            // Si la valeur est un tableau [sql, params] avec $? dans le SQL
            if (_.isArray(value) && value.length === 2 && _.isString(value[0]) && value[0].includes('$?')) {
              super.where(value[0], value[1]);
            } else {
              normalizedCond[key] = value;
            }
          });

          // Ajouter les conditions normales si présentes
          if (!_.isEmpty(normalizedCond)) {
            super.where(normalizedCond);
          }
        } else {
          super.where(cond);
        }
      });
    }

    // Générer automatiquement les filterJoins pour les conditions sur tables jointes
    if (joinConditions && Object.keys(joinConditions).length > 0) {
      this._buildFilterJoinsFromPaths(joinConditions);
    }

    return this;
  }

  /**
   * _addSimpleFilterJoin - Ajoute un filtre sur une table jointe (méthode interne)
   *
   * Cette méthode est utilisée en interne par where() pour ajouter des filtres EXISTS.
   * Les utilisateurs ne doivent pas l'appeler directement.
   *
   * @private
   * @param {string} associationName - Nom de l'association (ex: 'applicant', 'pme_folder')
   * @param {object} conditions - Conditions de filtrage
   * @param {string} operator - Opérateur SQL ('AND' ou 'OR')
   */
  _addSimpleFilterJoin(associationName, conditions, operator = 'AND') {
    const association = this._findAssociation(associationName, this.schema);

    this.query.filterJoins.push({
      association,
      conditions,
      operator,
      src_schema: this.schema
    });
  }

  /**
   * _addNestedFilterJoin - Ajoute des filtres imbriqués (méthode interne)
   *
   * Cette méthode est utilisée en interne par where() pour ajouter des filtres EXISTS imbriqués.
   * Les utilisateurs ne doivent pas l'appeler directement.
   *
   * @private
   * @param {object} nestedConfig - Configuration des filtres imbriqués
   */
  _addNestedFilterJoin(nestedConfig) {
    // Construire la hiérarchie complète d'associations
    const buildHierarchy = (config, currentSchema, parentPath = null) => {
      const results = [];

      _.each(config, (value, associationName) => {
        const association = this._findAssociation(associationName, currentSchema);
        const [, , AssociatedModel] = association;

        // Créer un noeud de hiérarchie
        const node = {
          association,
          conditions: value.conditions || null,
          operator: value.operator || 'AND',
          src_schema: currentSchema,
          parent: parentPath,
          children: []
        };

        // Traiter récursivement les enfants
        if (value.nested) {
          node.children = buildHierarchy(value.nested, AssociatedModel.schema, node);
        }

        results.push(node);
      });

      return results;
    };

    // Construire l'arbre complet
    const hierarchy = buildHierarchy(nestedConfig, this.schema);

    // Stocker dans filterJoins avec une structure hiérarchique
    this.query.filterJoins.push({
      type: 'nested',
      hierarchy: hierarchy
    });
  }

  /**
   * Phase 1 : COUNT optimisé avec EXISTS
   *
   * Génère une requête COUNT(0) sans LEFT JOIN. Les filtres sur tables jointes
   * sont convertis en sous-requêtes EXISTS.
   *
   * @returns {Promise<number>} Le nombre total de lignes correspondant aux filtres
   */
  async count() {
    const countQuery = new PaginatedOptimizedQuery(this.modelClass);
    countQuery.query = _.cloneDeep(this.query);
    countQuery.query.verb = 'count';
    countQuery.query.limit = 1;
    delete countQuery.query.page;
    delete countQuery.query.nb;
    delete countQuery.query.order; // Pas besoin de ORDER BY pour un COUNT

    const rows = await countQuery.runQuery();
    const count = rows && rows[0] && Number(rows[0].count) || 0;
    return count;
  }

  /**
   * Phase 2 : SELECT IDS avec filtres et pagination
   *
   * Sélectionne uniquement les IDs de la table principale en appliquant :
   * - Tous les filtres (WHERE + EXISTS pour les filterJoins)
   * - Les tris (ORDER BY)
   * - La pagination (LIMIT/OFFSET)
   *
   * @returns {Promise<Array<number>>} Liste des IDs trouvés
   */
  async selectIds() {
    const idsQuery = new PaginatedOptimizedQuery(this.modelClass);
    idsQuery.query = _.cloneDeep(this.query);
    idsQuery.query.verb = 'select_ids';

    // Ne sélectionner que l'ID (ou clés primaires)
    const primaryKeys = this.schema.primary || ['id'];
    idsQuery.query.select = primaryKeys.map(key => `\`${this.schema.table}\`.\`${key}\``).join(', ');

    const rows = await idsQuery.runQuery();

    // Retourner un tableau d'IDs (ou objets de clés composites)
    if (primaryKeys.length === 1) {
      return rows.map(row => row[primaryKeys[0]]);
    }
    return rows.map(row => _.pick(row, primaryKeys));
  }

  /**
   * Phase 3 : SELECT FULL avec LEFT JOIN sur les IDs trouvés
   *
   * Récupère les données complètes avec les LEFT JOIN uniquement pour les IDs
   * retournés par la phase 2. Cela limite drastiquement le nombre de lignes à joindre.
   *
   * @param {Array<number|object>} ids - Liste des IDs à récupérer
   * @returns {Promise<Array<Object>>} Données complètes avec associations
   */
  async selectFull(ids) {
    if (!ids || ids.length === 0) {
      return [];
    }

    const fullQuery = new Query(this.modelClass); // Utiliser Query standard pour le SELECT final
    fullQuery.query = _.cloneDeep(this.query);
    fullQuery.query.verb = 'select';

    // Conserver uniquement les "vrais" joins (pas les filterJoins)
    // Les filterJoins ne sont utilisés que pour COUNT et IDS
    fullQuery.query.filterJoins = [];

    // Remplacer les filtres par WHERE id IN (...)
    const primaryKeys = this.schema.primary || ['id'];
    if (primaryKeys.length === 1) {
      fullQuery.query.where = [{ [primaryKeys[0]]: ids }];
    } else {
      // Clés composites : générer des conditions OR
      const compositeConditions = ids.map(idObj => idObj);
      fullQuery.query.where = compositeConditions;
    }

    fullQuery.query.whereNot = [];

    // Supprimer la pagination (déjà appliquée dans selectIds)
    delete fullQuery.query.limit;
    delete fullQuery.query.offset;
    delete fullQuery.query.page;
    delete fullQuery.query.nb;

    // Conserver l'ORDER BY pour maintenir l'ordre
    // (Important car IN (...) ne garantit pas l'ordre)

    const rows = await fullQuery.execute();
    return rows;
  }

  /**
   * Orchestrateur principal : exécute les 3 phases
   *
   * Cette méthode est appelée automatiquement par execute() quand le mode optimisé est activé.
   *
   * @returns {Promise<Object|Array>} Résultat de la requête (avec ou sans pagination)
   */
  async executeOptimized() {
    const { query } = this;

    // Si pas de pagination demandée, on peut simplifier
    if (!query.page) {
      // Phase 1 : COUNT (optionnel si pas de pagination)
      // On peut le sauter pour gagner du temps

      // Phase 2 : SELECT IDS
      const ids = await this.selectIds();

      // Phase 3 : SELECT FULL
      const rows = await this.selectFull(ids);

      if (query.limit === 1) {
        return rows[0] || null;
      }

      return rows;
    }

    // Avec pagination : les 3 phases complètes

    // Phase 1 : COUNT
    const count = await this.count();

    // Calculer la pagination
    const nb_pages = Math.ceil(count / query.nb);
    query.page = Math.min(query.page, nb_pages);
    query.page = Math.max(query.page, 1);
    query.offset = (query.page - 1) * query.nb;
    query.limit = query.nb;

    // Phase 2 : SELECT IDS
    const ids = await this.selectIds();

    // Phase 3 : SELECT FULL
    const rows = await this.selectFull(ids);

    // Construire l'objet pagination
    const page = query.page;
    const links = [];
    const start = Math.max(1, page - 5);
    for (let i = 0; i < 10; i++) {
      const p = start + i;
      if (p <= nb_pages) {
        links.push({ page: p, current: page === p });
      }
    }

    const pagination = {
      page: query.page,
      nb: query.nb,
      previous: page > 1 ? page - 1 : null,
      next: page < nb_pages ? page + 1 : null,
      start: query.offset + 1,
      end: query.offset + Math.min(query.nb, count - query.offset),
      nb_pages,
      count,
      links,
    };

    return { pagination, rows };
  }

  /**
   * Override de execute() pour utiliser executeOptimized() en mode optimisé
   */
  async execute() {
    if (this.query.optimized && this.query.verb === 'select') {
      return await this.executeOptimized();
    }

    // Fallback vers l'implémentation standard pour les autres verbes (update, delete, etc.)
    return await super.execute();
  }

  /**
   * Parse les conditions where pour séparer :
   * - Les conditions sur la table principale
   * - Les conditions sur les tables jointes (chemins avec points)
   *
   * @param {object} conditions - Objet de conditions
   * @returns {object} { mainConditions, joinConditions }
   *
   * Exemple :
   * Input: {
   *   $and: [
   *     { status: 'ACTIVE' },
   *     { 'applicant.last_name': 'Dupont' },
   *     { 'pme_folder.company.country.code': 'FR' }
   *   ]
   * }
   *
   * Output: {
   *   mainConditions: [{ status: 'ACTIVE' }],  // Tableau de conditions
   *   joinConditions: {
   *     'applicant.last_name': { value: 'Dupont', path: ['applicant'], column: 'last_name' },
   *     'pme_folder.company.country.code': { value: 'FR', path: ['pme_folder', 'company', 'country'], column: 'code' }
   *   }
   * }
   */
  _parseWhereConditions(conditions) {
    const mainConditions = [];
    const joinConditions = {};

    // Gérer les opérateurs logiques $and et $or
    if (conditions.$and) {
      // $and : aplatir les conditions sur la table principale
      _.forEach(conditions.$and, (cond) => {
        const parsed = this._parseConditionObject(cond);
        if (parsed.main && !_.isEmpty(parsed.main)) {
          mainConditions.push(parsed.main);
        }
        Object.assign(joinConditions, parsed.join);
      });
    } else if (conditions.$or) {
      // $or : gérer les conditions imbriquées
      // Note: Si toutes les conditions du $or sont sur la table principale,
      // on peut les regrouper. Sinon, on doit les traiter séparément.
      const orMainConditions = [];
      _.forEach(conditions.$or, (cond) => {
        const parsed = this._parseConditionObject(cond);
        if (parsed.main && !_.isEmpty(parsed.main)) {
          orMainConditions.push(parsed.main);
        }
        Object.assign(joinConditions, parsed.join);
      });

      // Si on a des conditions sur la table principale dans le $or
      if (orMainConditions.length > 0) {
        mainConditions.push(orMainConditions);
      }
    } else {
      // Cas simple : objet de conditions
      const parsed = this._parseConditionObject(conditions);
      if (parsed.main && !_.isEmpty(parsed.main)) {
        mainConditions.push(parsed.main);
      }
      Object.assign(joinConditions, parsed.join);
    }

    return { mainConditions, joinConditions };
  }

  /**
   * Parse un objet de conditions pour séparer les colonnes principales et jointes
   *
   * @param {object} conditionObj - Objet de conditions { column: value, ... }
   * @returns {object} { main: {...}, join: {...} }
   */
  _parseConditionObject(conditionObj) {
    const main = {};
    const join = {};

    _.forOwn(conditionObj, (value, key) => {
      // Détecter si la clé contient un point (chemin vers table jointe)
      if (key.includes('.')) {
        // Extraire le chemin et la colonne finale
        const parts = key.split('.');
        const column = parts[parts.length - 1];
        const path = parts.slice(0, -1); // ['applicant'] ou ['pme_folder', 'company', 'country']

        join[key] = {
          value,
          path,
          column
        };
      } else {
        // Condition sur la table principale
        // Transformer les opérateurs spéciaux en SQL avant de les ajouter
        main[key] = this._transformOperator(key, value);
      }
    });

    return { main, join };
  }

  /**
   * Transforme les opérateurs spéciaux en SQL
   *
   * @param {string} column - Nom de la colonne
   * @param {any} value - Valeur (peut contenir des opérateurs)
   * @returns {any} Valeur transformée ou SQL string avec params
   */
  _transformOperator(column, value) {
    // Si la valeur n'est pas un objet, la retourner telle quelle
    if (!_.isObject(value) || _.isArray(value) || _.isDate(value)) {
      return value;
    }

    // Transformer les opérateurs spéciaux en SQL
    if (value.$between && _.isArray(value.$between) && value.$between.length === 2) {
      return [`\`${this.schema.table}\`.\`${column}\` BETWEEN $? AND $?`, value.$between];
    } else if (value.$gte !== undefined) {
      return [`\`${this.schema.table}\`.\`${column}\` >= $?`, value.$gte];
    } else if (value.$lte !== undefined) {
      return [`\`${this.schema.table}\`.\`${column}\` <= $?`, value.$lte];
    } else if (value.$gt !== undefined) {
      return [`\`${this.schema.table}\`.\`${column}\` > $?`, value.$gt];
    } else if (value.$lt !== undefined) {
      return [`\`${this.schema.table}\`.\`${column}\` < $?`, value.$lt];
    } else if (value.$like !== undefined) {
      return [`\`${this.schema.table}\`.\`${column}\` LIKE $?`, value.$like];
    }

    // Sinon, retourner la valeur telle quelle
    return value;
  }

  /**
   * Construit automatiquement les filterJoins à partir des chemins détectés
   *
   * Cette méthode regroupe les conditions par chemin d'association et génère
   * les filterJoinNested appropriés.
   *
   * @param {object} joinConditions - Conditions sur les tables jointes
   *
   * Exemple :
   * Input: {
   *   'applicant.last_name': { value: 'Dupont', path: ['applicant'], column: 'last_name' },
   *   'applicant.email': { value: 'test@test.com', path: ['applicant'], column: 'email' },
   *   'pme_folder.company.country.code': { value: 'FR', path: ['pme_folder', 'company', 'country'], column: 'code' }
   * }
   *
   * Output: Appelle filterJoinNested() avec :
   * {
   *   applicant: {
   *     conditions: { last_name: 'Dupont', email: 'test@test.com' }
   *   },
   *   pme_folder: {
   *     nested: {
   *       company: {
   *         nested: {
   *           country: {
   *             conditions: { code: 'FR' }
   *           }
   *         }
   *       }
   *     }
   *   }
   * }
   */
  _buildFilterJoinsFromPaths(joinConditions) {
    // Regrouper les conditions par racine d'association
    const groupedByRoot = {};

    _.forOwn(joinConditions, ({ value, path, column }, fullPath) => {
      const root = path[0];

      if (!groupedByRoot[root]) {
        groupedByRoot[root] = [];
      }

      groupedByRoot[root].push({
        path: path.slice(1), // Enlever la racine
        column,
        value,
        fullPath
      });
    });

    // Construire les filterJoinNested pour chaque racine
    _.forOwn(groupedByRoot, (conditions, root) => {
      // Si toutes les conditions sont au niveau racine (path vide), utiliser filterJoin simple
      const allAtRoot = _.every(conditions, c => c.path.length === 0);

      if (allAtRoot) {
        // Filtre simple (1 niveau)
        const simpleConditions = {};
        _.forEach(conditions, ({ column, value }) => {
          simpleConditions[column] = value;
        });

        this._addSimpleFilterJoin(root, simpleConditions);
      } else {
        // Filtre imbriqué (plusieurs niveaux)
        const nestedConfig = this._buildNestedConfig(conditions);
        this._addNestedFilterJoin({ [root]: nestedConfig });
      }
    });
  }

  /**
   * Construit la configuration imbriquée pour filterJoinNested
   *
   * @param {Array} conditions - Liste des conditions à imbriquer
   * @returns {object} Configuration imbriquée
   *
   * Exemple :
   * Input: [
   *   { path: ['company', 'country'], column: 'code', value: 'FR' },
   *   { path: ['company'], column: 'siret', value: '123%' }
   * ]
   *
   * Output: {
   *   nested: {
   *     company: {
   *       conditions: { siret: '123%' },
   *       nested: {
   *         country: {
   *           conditions: { code: 'FR' }
   *         }
   *       }
   *     }
   *   }
   * }
   */
  _buildNestedConfig(conditions) {
    const config = {
      conditions: {},
      nested: {}
    };

    // Séparer les conditions : celles au niveau actuel vs celles à imbriquer
    const currentLevelConditions = [];
    const nestedConditions = {};

    _.forEach(conditions, (cond) => {
      if (cond.path.length === 0) {
        // Condition au niveau actuel
        currentLevelConditions.push(cond);
      } else {
        // Condition à imbriquer
        const nextLevel = cond.path[0];
        if (!nestedConditions[nextLevel]) {
          nestedConditions[nextLevel] = [];
        }
        nestedConditions[nextLevel].push({
          path: cond.path.slice(1),
          column: cond.column,
          value: cond.value
        });
      }
    });

    // Ajouter les conditions au niveau actuel
    _.forEach(currentLevelConditions, ({ column, value }) => {
      config.conditions[column] = value;
    });

    // Si pas de conditions au niveau actuel, supprimer la clé
    if (_.isEmpty(config.conditions)) {
      delete config.conditions;
    }

    // Construire récursivement les niveaux imbriqués
    _.forOwn(nestedConditions, (nestedConds, assocName) => {
      config.nested[assocName] = this._buildNestedConfig(nestedConds);
    });

    // Si pas de nested, supprimer la clé
    if (_.isEmpty(config.nested)) {
      delete config.nested;
    }

    return config;
  }

  /**
   * Génère le SQL pour la requête optimisée
   *
   * Cette méthode override toSQL() pour générer le SQL approprié selon le verb.
   */
  toSQL() {
    const { query } = this;
    const db = this.getDb();

    // Utiliser PaginatedOptimizedSql pour les requêtes optimisées
    if (query.optimized && (query.verb === 'count' || query.verb === 'select_ids')) {
      // Ajouter le schema au query object pour que PaginatedOptimizedSql puisse y accéder
      query.schema = this.schema;

      const PaginatedOptimizedSql = require('./PaginatedOptimizedSql');
      const sql = new PaginatedOptimizedSql(query, db.driver.dialect);

      if (query.verb === 'count') {
        return sql.countSQL();
      } else if (query.verb === 'select_ids') {
        return sql.idsSQL();
      }
    }

    // Sinon, utiliser Sql standard
    return super.toSQL();
  }
};
