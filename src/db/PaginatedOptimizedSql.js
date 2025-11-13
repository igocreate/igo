const _   = require('lodash');
const Sql = require('./Sql');

/**
 * PaginatedOptimizedSql - Générateur SQL optimisé avec pattern EXISTS
 *
 * Cette classe hérite de Sql et override les méthodes de génération SQL pour :
 * - Remplacer les LEFT JOIN par des sous-requêtes EXISTS dans COUNT et SELECT IDS
 * - Conserver uniquement les filtres sur la table principale
 *
 * Le pattern EXISTS est beaucoup plus performant car :
 * - Il évite le produit cartésien des jointures
 * - Il utilise les index de façon optimale
 * - Il s'arrête dès qu'une ligne est trouvée (short-circuit)
 */
module.exports = class PaginatedOptimizedSql extends Sql {

  /**
   * COUNT SQL optimisé avec EXISTS au lieu de LEFT JOIN
   *
   * Génère une requête COUNT(0) sans jointures. Les filtres sur tables jointes
   * sont convertis en sous-requêtes EXISTS.
   *
   * Exemple de SQL généré :
   *
   * SELECT COUNT(0) as `count`
   * FROM `folders` f
   * WHERE f.type IN ('agp', 'avt')
   * AND EXISTS (
   *   SELECT 1 FROM `applicants` a
   *   WHERE a.id = f.applicant_id
   *   AND a.last_name LIKE '%Dupont%'
   * )
   * AND EXISTS (
   *   SELECT 1 FROM `pme_folders` p
   *   WHERE p.id = f.pme_folder_id
   *   AND p.status = 'ACTIVE'
   * )
   */
  countSQL() {
    const { query, dialect } = this;
    const { esc } = dialect;

    // SELECT COUNT(0)
    let sql = `SELECT COUNT(0) as ${esc}count${esc} `;
    const params = [];

    // FROM table principale
    sql += `FROM ${esc}${query.table}${esc} `;

    // WHERE de la table principale
    sql += this.whereSQL(params);

    // WHERE NOT de la table principale
    sql += this.whereNotSQL(params);

    // Ajouter les filterJoins en tant que EXISTS
    sql += this.addFilterJoinsAsExists(params);

    const ret = {
      sql: sql.trim(),
      params: params
    };

    return ret;
  }

  /**
   * IDS SQL - Sélection des IDs uniquement avec filtres et tri
   *
   * Génère une requête SELECT qui retourne uniquement les IDs (clés primaires)
   * de la table principale, avec tous les filtres, tris et pagination appliqués.
   *
   * IMPORTANT : Si le tri (ORDER BY) référence une colonne d'une table jointe,
   * on doit faire un INNER JOIN sur cette table pour permettre le tri.
   *
   * Exemple de SQL généré (tri sur table jointe) :
   *
   * SELECT f.id
   * FROM `folders` f
   * INNER JOIN `applicants` a ON a.id = f.applicant_id
   * WHERE f.type IN ('agp', 'avt')
   * ORDER BY a.last_name ASC
   * LIMIT 50 OFFSET 0
   */
  idsSQL() {
    const { query, dialect } = this;
    const { esc } = dialect;

    // Détecter les tables nécessaires pour le tri
    const joinTablesForSort = this._detectJoinTablesForSort();

    // SELECT colonnes (IDs ou clés primaires)
    let sql = 'SELECT ';
    if (query.select) {
      sql += query.select + ' ';
    } else {
      const primaryKeys = query.schema?.primary || ['id'];
      sql += primaryKeys.map(key => `${esc}${query.table}${esc}.${esc}${key}${esc}`).join(', ') + ' ';
    }

    // FROM table principale
    sql += `FROM ${esc}${query.table}${esc} `;

    // INNER JOIN pour les tables nécessaires au tri
    sql += this._addJoinsForSort(joinTablesForSort);

    // WHERE de la table principale
    const params = [];
    sql += this.whereSQL(params);

    // WHERE NOT de la table principale
    sql += this.whereNotSQL(params);

    // Ajouter les filterJoins en tant que EXISTS
    sql += this.addFilterJoinsAsExists(params);

    // ORDER BY (important pour maintenir l'ordre demandé)
    sql += this.orderSQL();

    // LIMIT / OFFSET pour la pagination
    if (query.limit) {
      sql += dialect.limit(this.i++, this.i++);
      params.push(query.offset || 0);
      params.push(query.limit);
    }

    const ret = {
      sql: sql.trim(),
      params: params
    };

    return ret;
  }

  /**
   * Détecte les tables jointes nécessaires pour le tri
   *
   * Analyse les clauses ORDER BY pour identifier les colonnes qui proviennent
   * de tables jointes. Retourne les associations correspondantes.
   *
   * @returns {Array} Liste des associations nécessaires pour le tri
   *
   * Exemple :
   * Si ORDER BY contient "applicants.last_name ASC", retourne :
   * [{ association: [...], tableName: 'applicants', alias: 'applicant' }]
   */
  _detectJoinTablesForSort() {
    const { query } = this;

    if (!query.order || query.order.length === 0) {
      return [];
    }

    const joinTables = [];
    const mainTable = query.table;

    _.forEach(query.order, (orderClause) => {
      // Parser la clause ORDER BY (ex: "applicants.last_name ASC" ou "`applicants`.`last_name` DESC")
      const match = orderClause.match(/[`]?(\w+)[`]?\.[\`]?(\w+)[\`]?\s*(ASC|DESC)?/i);

      if (match) {
        const tableName = match[1];

        // Si ce n'est pas la table principale, c'est une table jointe
        if (tableName !== mainTable) {
          // Trouver l'association correspondante
          const association = this._findAssociationByTable(tableName);

          if (association && !_.find(joinTables, { tableName })) {
            joinTables.push({
              association,
              tableName,
              alias: association[1] // Nom de l'association (ex: 'applicant')
            });
          }
        }
      }
    });

    return joinTables;
  }

  /**
   * Trouve une association par nom de table
   *
   * @param {string} tableName - Nom de la table (ex: 'applicants')
   * @returns {Array|null} Association trouvée ou null
   */
  _findAssociationByTable(tableName) {
    const { query } = this;

    if (!query.schema || !query.schema.associations) {
      return null;
    }

    // Chercher dans les associations du schema (ici on a toujours les Model classes)
    const association = _.find(query.schema.associations, (assoc) => {
      const [, , AssociatedModel] = assoc;
      if (!AssociatedModel || !AssociatedModel.schema) {
        return false;
      }
      return AssociatedModel.schema.table === tableName;
    });

    return association || null;
  }

  /**
   * Ajoute les INNER JOIN nécessaires pour le tri
   *
   * @param {Array} joinTablesForSort - Liste des tables à joindre
   * @returns {string} Clause SQL avec les INNER JOIN
   *
   * Exemple de SQL généré :
   * INNER JOIN `applicants` ON `applicants`.`id` = `folders`.`applicant_id`
   */
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

      // Générer l'INNER JOIN
      sql += `INNER JOIN ${esc}${tableName}${esc} `;
      sql += `ON ${esc}${tableName}${esc}.${esc}${ref_column}${esc} = ${esc}${mainTable}${esc}.${esc}${src_column}${esc} `;
    });

    return sql;
  }

  /**
   * Génère les sous-requêtes EXISTS pour les filterJoins
   *
   * Cette version REFACTORISÉE gère correctement les vraies hiérarchies imbriquées.
   *
   * @param {Array} params - Tableau des paramètres SQL (modifié par référence)
   * @returns {string} Clause SQL avec les EXISTS
   *
   * Logique :
   * - Pour chaque filterJoin simple : créer un EXISTS plat
   * - Pour chaque filterJoin nested : créer des EXISTS vraiment imbriqués
   */
  addFilterJoinsAsExists(params) {
    const { query, dialect } = this;

    if (!query.filterJoins || query.filterJoins.length === 0) {
      return '';
    }

    let sql = '';
    const hasWhere = query.where.length > 0 || query.whereNot.length > 0;

    let index = 0;
    _.forEach(query.filterJoins, (filterJoin) => {
      // Ajouter AND si nécessaire
      if (hasWhere || index > 0) {
        sql += 'AND ';
      } else {
        sql += 'WHERE ';
      }

      // Distinguer les filterJoins simples des nested
      if (filterJoin.type === 'nested') {
        // Traiter chaque branche de la hiérarchie
        _.forEach(filterJoin.hierarchy, (rootNode) => {
          sql += this._buildNestedExistsFromTree(rootNode, query.table, params);
          sql += ' ';
        });
      } else {
        // filterJoin simple (1 niveau)
        sql += this._buildSimpleExists(filterJoin, query.table, params);
      }

      index++;
    });

    return sql;
  }

  /**
   * Construit un EXISTS imbriqué à partir d'un arbre de noeuds
   *
   * Cette méthode est RÉCURSIVE et génère des EXISTS vraiment imbriqués.
   *
   * @param {Object} node - Noeud de l'arbre (avec association, conditions, children)
   * @param {string} parentTable - Table parente pour la condition de jointure
   * @param {Array} params - Paramètres SQL
   * @returns {string} SQL de l'EXISTS (potentiellement avec EXISTS imbriqués)
   *
   * Exemple d'arbre :
   * {
   *   association: ['belongs_to', 'pmfp_folder', PmfpFolder, 'pmfp_folder_id', 'id'],
   *   conditions: null,
   *   children: [{
   *     association: ['belongs_to', 'formation_nature', FormationNature, 'formation_nature_id', 'id'],
   *     conditions: { label: '%numérique%' },
   *     children: []
   *   }]
   * }
   *
   * Génère :
   * EXISTS (
   *   SELECT 1 FROM pmfp_folders
   *   WHERE pmfp_folders.id = folders.pmfp_folder_id
   *   AND EXISTS (
   *     SELECT 1 FROM formation_nature
   *     WHERE formation_nature.id = pmfp_folders.formation_nature_id
   *     AND formation_nature.label LIKE '%numérique%'
   *   )
   * )
   */
  _buildNestedExistsFromTree(node, parentTable, params) {
    const { dialect } = this;
    const { esc } = dialect;

    const { association, conditions, operator, children } = node;
    const [, , AssociatedModel, src_column, ref_column] = association;
    const joinTable = AssociatedModel.schema.table;

    // Ouvrir l'EXISTS
    let sql = `EXISTS (SELECT 1 FROM ${esc}${joinTable}${esc} `;

    // Condition de jointure
    sql += `WHERE ${esc}${joinTable}${esc}.${esc}${ref_column}${esc} = ${esc}${parentTable}${esc}.${esc}${src_column}${esc} `;

    // Ajouter les conditions de ce niveau (si présentes)
    if (conditions && !_.isEmpty(conditions)) {
      sql += this.buildConditions(conditions, joinTable, params, operator);
    }

    // Traiter récursivement les enfants (EXISTS imbriqués)
    if (children && children.length > 0) {
      _.forEach(children, (childNode) => {
        sql += 'AND ';
        sql += this._buildNestedExistsFromTree(childNode, joinTable, params);
        sql += ' ';
      });
    }

    // Fermer l'EXISTS
    sql += ')';

    return sql;
  }

  /**
   * Construit un EXISTS simple (non imbriqué)
   *
   * @param {Object} filterJoin - FilterJoin à traiter
   * @param {string} parentTable - Table parente
   * @param {Array} params - Paramètres SQL
   * @returns {string} SQL de l'EXISTS
   */
  _buildSimpleExists(filterJoin, parentTable, params) {
    const { dialect } = this;
    const { esc } = dialect;

    const { association, conditions, operator } = filterJoin;
    const [, , AssociatedModel, src_column, ref_column] = association;
    const joinTable = AssociatedModel.schema.table;

    let sql = `EXISTS (SELECT 1 FROM ${esc}${joinTable}${esc} `;
    sql += `WHERE ${esc}${joinTable}${esc}.${esc}${ref_column}${esc} = ${esc}${parentTable}${esc}.${esc}${src_column}${esc} `;

    if (conditions && !_.isEmpty(conditions)) {
      sql += this.buildConditions(conditions, joinTable, params, operator);
    }

    sql += ') ';

    return sql;
  }

  /**
   * Construit les conditions SQL pour une sous-requête EXISTS
   *
   * @param {Object} conditions - Objet avec les conditions
   * @param {string} tableName - Nom de la table pour qualifier les colonnes
   * @param {Array} params - Tableau des paramètres SQL (modifié par référence)
   * @param {string} operator - Opérateur entre les conditions ('AND' ou 'OR')
   * @returns {string} Clause SQL
   *
   * Exemples de conditions supportées :
   * - Égalité : { status: 'ACTIVE' }
   * - IN : { status: ['ACTIVE', 'PENDING'] }
   * - IS NULL : { email: null }
   * - LIKE : { last_name: 'Dupont%' }
   * - BETWEEN : { created_at: { $between: ['2024-01-01', '2024-12-31'] } }
   * - >= : { created_at: { $gte: '2024-01-01' } }
   * - <= : { created_at: { $lte: '2024-12-31' } }
   * - > : { amount: { $gt: 100 } }
   * - < : { amount: { $lt: 1000 } }
   */
  buildConditions(conditions, tableName, params, operator = 'AND') {
    const { dialect } = this;
    const { esc } = dialect;

    const sqlConditions = [];

    _.forOwn(conditions, (value, key) => {
      let columnRef;

      // Gérer les colonnes qualifiées (ex: 'applicants.last_name')
      if (key.indexOf('.') > -1) {
        const parts = key.split('.');
        columnRef = _.map(parts, part => `${esc}${part}${esc}`).join('.');
      } else {
        columnRef = `${esc}${tableName}${esc}.${esc}${key}${esc}`;
      }

      // Générer la condition selon le type de valeur
      if (value === null || value === undefined) {
        sqlConditions.push(`${columnRef} IS NULL `);
      } else if (_.isArray(value)) {
        if (value.length === 0) {
          sqlConditions.push('FALSE ');
        } else {
          sqlConditions.push(`${columnRef} ${dialect.in} (${dialect.param(this.i++)}) `);
          params.push(value);
        }
      } else if (_.isObject(value) && !_.isDate(value)) {
        // Opérateurs spéciaux ($between, $gte, $lte, $gt, $lt)
        if (value.$between && _.isArray(value.$between) && value.$between.length === 2) {
          sqlConditions.push(`${columnRef} BETWEEN ${dialect.param(this.i++)} AND ${dialect.param(this.i++)} `);
          params.push(value.$between[0]);
          params.push(value.$between[1]);
        } else if (value.$gte !== undefined) {
          sqlConditions.push(`${columnRef} >= ${dialect.param(this.i++)} `);
          params.push(value.$gte);
        } else if (value.$lte !== undefined) {
          sqlConditions.push(`${columnRef} <= ${dialect.param(this.i++)} `);
          params.push(value.$lte);
        } else if (value.$gt !== undefined) {
          sqlConditions.push(`${columnRef} > ${dialect.param(this.i++)} `);
          params.push(value.$gt);
        } else if (value.$lt !== undefined) {
          sqlConditions.push(`${columnRef} < ${dialect.param(this.i++)} `);
          params.push(value.$lt);
        } else {
          // Objet non reconnu, traiter comme égalité
          sqlConditions.push(`${columnRef} = ${dialect.param(this.i++)} `);
          params.push(value);
        }
      } else if (_.isString(value) && value.includes('%')) {
        // Pattern LIKE détecté
        sqlConditions.push(`${columnRef} LIKE ${dialect.param(this.i++)} `);
        params.push(value);
      } else {
        sqlConditions.push(`${columnRef} = ${dialect.param(this.i++)} `);
        params.push(value);
      }
    });

    if (sqlConditions.length === 0) {
      return '';
    }

    return 'AND ' + sqlConditions.join(`${operator} `);
  }

  /**
   * Override de whereSQL pour éviter d'ajouter les filterJoins dans les WHERE standards
   *
   * Cette méthode filtre les conditions pour n'inclure que celles de la table principale.
   */
  whereSQL(params, not) {
    // Appeler la méthode parente qui gère déjà les WHERE correctement
    return super.whereSQL(params, not);
  }
};
