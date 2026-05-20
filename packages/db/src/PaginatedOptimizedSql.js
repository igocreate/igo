const _   = require('lodash');
const Sql = require('./Sql');
const { compileCondition, compileExtraWhere } = require('./OperatorCompiler');

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
   * on utilise LEFT JOIN (pas INNER JOIN) pour préserver toutes les lignes,
   * même celles sans correspondance (NULL).
   *
   * Exemple de SQL généré (tri sur table jointe) :
   *
   * SELECT f.id
   * FROM `folders` f
   * LEFT JOIN `applicants` a ON a.id = f.applicant_id
   * WHERE f.type IN ('agp', 'avt')
   * ORDER BY a.last_name ASC  -- Les folders sans applicant auront NULL
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

    // LEFT JOIN pour les tables nécessaires au tri (préserve toutes les lignes)
    sql += this._addJoinsForSort(joinTablesForSort);

    // WHERE de la table principale
    const params = [];

    // Ajouter les params des jointures de tri (extraWhere)
    if (this._sortJoinParams && this._sortJoinParams.length > 0) {
      params.push(...this._sortJoinParams);
    }

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
   * de tables jointes (directes ou imbriquées). Retourne les associations en cascade.
   *
   * Gère également les colonnes sans préfixe de table (ex: "studies_year") en cherchant
   * automatiquement dans les associations belongs_to si la colonne n'existe pas dans
   * la table principale.
   *
   * @returns {Array} Liste hiérarchique des associations nécessaires pour le tri
   *
   * Exemples :
   * - ORDER BY "applicants.last_name ASC" → [{path: [...], pathKey: 'applicant'}]
   * - ORDER BY "pmfp_folder.formationNature.name" → [{path: [...], pathKey: 'pmfp_folder.formationNature'}]
   * - ORDER BY "studies_year ASC" → [{path: [...], pathKey: 'studies'}] (si studies_year existe dans une table de block)
   */
  _detectJoinTablesForSort() {
    const { query } = this;

    if (!query.order || query.order.length === 0) {
      return [];
    }

    const joinPaths = [];
    const mainTable = query.table;

    _.forEach(query.order, (orderClause) => {
      // Check if this is a SQL function (contains function keywords)
      const hasSqlFunction = /\b(COALESCE|IFNULL|CONCAT|CONCAT_WS|UPPER|LOWER|SUBSTRING|TRIM)\s*\(/i.test(orderClause);

      if (hasSqlFunction) {
        // For SQL functions, extract all table references
        const tableNames = this._extractTableReferencesFromOrderClause(orderClause);

        _.forEach(tableNames, (tableName) => {
          // Skip main table
          if (tableName === mainTable) {
            return;
          }

          // Try to find association path for this table
          let path = this._findPathToTable(tableName, query.schema);

          // If not found by table name, try by association name
          if (!path) {
            path = this._buildAssociationPath([tableName], query.schema);
          }

          if (path && path.length > 0) {
            const pathKey = path.map(p => p.association[1]).join('.');

            // Avoid duplicates
            if (!_.find(joinPaths, jp => jp.pathKey === pathKey)) {
              joinPaths.push({
                pathKey,
                path,
                tablePath: [tableName],
                columnName: null // Not needed for function-based ORDER BY
              });
            }
          }
        });

        // Also extract simple column names (without table prefix) in SQL functions
        // and check if they belong to block tables
        const simpleColumns = this._extractSimpleColumnsFromOrderClause(orderClause);

        _.forEach(simpleColumns, (columnName) => {
          // Check if column exists in main table
          const existsInMainTable = query.schema && query.schema.colsByName && query.schema.colsByName[columnName];

          if (!existsInMainTable) {
            // Column not in main table - search in associations (blocks)
            const assocPath = this._findAssociationByColumn(columnName, query.schema);

            if (assocPath && assocPath.length > 0) {
              const pathKey = assocPath.map(p => p.association[1]).join('.');

              // Avoid duplicates
              if (!_.find(joinPaths, jp => jp.pathKey === pathKey)) {
                joinPaths.push({
                  pathKey,
                  path: assocPath,
                  tablePath: [assocPath[assocPath.length - 1].tableName],
                  columnName
                });
              }
            }
          }
        });
      } else {
        // For non-function ORDER BY, parse as nested path
        const cleanedClause = orderClause.replace(/`/g, '').trim();
        const parts = cleanedClause.split(/\s+/)[0].split('.'); // Take only before ASC/DESC

        if (parts.length < 2) {
          // No dot - could be a column on main table OR a column from a joined/block table
          const columnName = parts[0];

          // Check if column exists in main table
          const existsInMainTable = query.schema && query.schema.colsByName && query.schema.colsByName[columnName];

          if (!existsInMainTable) {
            // Search in associations (blocks)
            let assocPath = this._findAssociationByColumn(columnName, query.schema);

            // Search in explicitly declared joins
            if (!assocPath && query.joins && query.joins.length > 0) {
              assocPath = this._findColumnInJoins(columnName, query.joins);
            }

            if (assocPath && assocPath.length > 0) {
              const pathKey = assocPath.map(p => p.association[1]).join('.');

              // Avoid duplicates
              if (!_.find(joinPaths, jp => jp.pathKey === pathKey)) {
                joinPaths.push({
                  pathKey,
                  path: assocPath,
                  tablePath: [assocPath[assocPath.length - 1].tableName],
                  columnName
                });
              }
            }
          }

          // If column exists in main table or wasn't found in associations/joins, no join needed
          return;
        }

        // Last element is the column, rest is the path
        const columnName = parts[parts.length - 1];
        const tablePath = parts.slice(0, -1);

        // Skip if first element is main table
        if (tablePath[0] === mainTable) {
          return;
        }

        // Try to build full association path
        let path = this._buildAssociationPath(tablePath, query.schema);

        // If not found by association names, try finding by table name (single level only)
        if (!path && tablePath.length === 1) {
          const targetTable = tablePath[0];
          path = this._findPathToTable(targetTable, query.schema);
        }

        if (path && path.length > 0) {
          const pathKey = path.map(p => p.association[1]).join('.');

          // Avoid duplicates
          if (!_.find(joinPaths, jp => jp.pathKey === pathKey)) {
            joinPaths.push({
              pathKey,
              path,
              tablePath,
              columnName
            });
          }
        }
      }
    });

    return joinPaths;
  }

  /**
   * Extract simple column names (without table prefix) from an ORDER BY clause
   * Handles SQL functions like COALESCE, IFNULL, CONCAT, etc.
   *
   * Examples:
   * - "COALESCE(`studies_year`, 'N/A')" → ["studies_year"]
   * - "CONCAT(`first_name`, ' ', `last_name`)" → ["first_name", "last_name"]
   * - "IFNULL(bac_year, 0)" → ["bac_year"]
   *
   * @param {string} orderClause - The ORDER BY clause to parse
   * @returns {Array<string>} - Array of unique column names (without table prefix)
   */
  _extractSimpleColumnsFromOrderClause(orderClause) {
    const columnNames = new Set();

    // Pattern pour capturer les identifiants entre backticks qui n'ont pas de point avant
    // Ex: `studies_year` mais pas `table`.`column`
    const backtickPattern = /(?<!\.)(`(\w+)`)/g;
    let match;
    while ((match = backtickPattern.exec(orderClause)) !== null) {
      const columnName = match[2];
      // Vérifier qu'il n'y a pas de point juste avant (sinon c'est une référence table.colonne)
      const beforeMatch = orderClause.substring(0, match.index);
      if (!beforeMatch.endsWith('.')) {
        columnNames.add(columnName);
      }
    }

    // Pattern pour capturer les identifiants sans backticks qui n'ont pas de point
    // et qui ne sont pas des mots-clés SQL
    const sqlKeywords = new Set([
      'SELECT', 'FROM', 'WHERE', 'ORDER', 'BY', 'ASC', 'DESC',
      'COALESCE', 'IFNULL', 'CONCAT', 'CONCAT_WS', 'SUBSTRING',
      'UPPER', 'LOWER', 'TRIM', 'LENGTH', 'DATE', 'NOW', 'NULL', 'AND', 'OR'
    ]);

    // Pattern pour les identifiants sans backticks (lettres, chiffres, underscores)
    // qui ne sont pas suivis d'une parenthèse (pas une fonction)
    const identifierPattern = /\b([a-zA-Z_]\w+)\b(?!\s*\()/g;
    while ((match = identifierPattern.exec(orderClause)) !== null) {
      const identifier = match[1];
      // Ignorer les mots-clés SQL et les valeurs spéciales
      if (!sqlKeywords.has(identifier.toUpperCase()) && identifier !== 'N' && identifier !== 'A') {
        // Vérifier qu'il n'y a pas de point juste avant
        const beforeMatch = orderClause.substring(0, match.index);
        if (!beforeMatch.trimEnd().endsWith('.')) {
          columnNames.add(identifier);
        }
      }
    }

    return Array.from(columnNames);
  }

  /**
   * Extract all table references from an ORDER BY clause
   * Handles SQL functions like COALESCE, IFNULL, CONCAT, etc.
   *
   * Examples:
   * - "table.column DESC" → ["table"]
   * - "`table1`.`col1`, `table2`.`col2`" → ["table1", "table2"]
   * - "COALESCE(`t1`.`col`, `t2`.`col`)" → ["t1", "t2"]
   *
   * @param {string} orderClause - The ORDER BY clause to parse
   * @returns {Array<string>} - Array of unique table names
   */
  _extractTableReferencesFromOrderClause(orderClause) {
    const tableNames = new Set();

    // Pattern 1: Extract backticked table references: `table`.`column`
    const backtickPattern = /`(\w+)`\.`\w+`/g;
    let match;
    while ((match = backtickPattern.exec(orderClause)) !== null) {
      tableNames.add(match[1]);
    }

    // Pattern 2: Extract non-backticked references: table.column
    // But exclude SQL keywords and functions
    const sqlKeywords = new Set([
      'SELECT', 'FROM', 'WHERE', 'ORDER', 'BY', 'ASC', 'DESC',
      'COALESCE', 'IFNULL', 'CONCAT', 'CONCAT_WS', 'SUBSTRING',
      'UPPER', 'LOWER', 'TRIM', 'LENGTH', 'DATE', 'NOW'
    ]);

    const dotPattern = /\b(\w+)\.(\w+)\b/g;
    while ((match = dotPattern.exec(orderClause)) !== null) {
      const tableName = match[1];
      if (!sqlKeywords.has(tableName.toUpperCase())) {
        tableNames.add(tableName);
      }
    }

    return Array.from(tableNames);
  }

  /**
   * Récupère les associations d'un schema (gère le cas où associations est une fonction)
   *
   * @param {Object} schema - Schema
   * @returns {Array|null} Tableau d'associations ou null
   */
  _getSchemaAssociations(schema) {
    if (!schema || !schema.associations) {
      return null;
    }

    // Si associations est une fonction, l'appeler pour obtenir le tableau
    // (Normalement cela devrait déjà être fait par Schema, mais on gère le cas par sécurité)
    if (_.isFunction(schema.associations)) {
      return schema.associations();
    }

    return schema.associations;
  }

  /**
   * Construit un chemin d'associations à partir d'un tableau de noms (association ou table)
   *
   * @param {Array} names - Tableau de noms d'associations ou de tables (ex: ["pmfp_folder", "formationNature"] ou ["applicants"])
   * @param {Object} currentSchema - Schema de départ
   * @returns {Array|null} Chemin d'associations ou null si introuvable
   *
   * Exemple :
   * _buildAssociationPath(["pmfp_folder", "formationNature"], FolderSchema)
   * → [
   *     {association: [...], tableName: 'pmfp_folders'},
   *     {association: [...], tableName: 'formation_natures'}
   *   ]
   */
  _buildAssociationPath(names, currentSchema) {
    const associations = this._getSchemaAssociations(currentSchema);
    if (!associations || names.length === 0) {
      return null;
    }

    const path = [];
    let schema = currentSchema;

    for (const name of names) {
      const schemaAssociations = this._getSchemaAssociations(schema);
      if (!schemaAssociations) {
        return null;
      }

      // Chercher l'association par nom OU par nom de table dans le schema courant
      const association = _.find(schemaAssociations, (assoc) => {
        const [, assocName, AssociatedModel] = assoc;

        // Matcher sur le nom de l'association
        if (assocName === name) {
          return true;
        }

        // Matcher sur le nom de la table (ex: "applicants" pour l'association "applicant")
        if (AssociatedModel && AssociatedModel.schema) {
          return AssociatedModel.schema.table === name;
        }

        return false;
      });

      if (!association) {
        // Association introuvable
        return null;
      }

      const [, , AssociatedModel] = association;
      if (!AssociatedModel || !AssociatedModel.schema) {
        return null;
      }

      const tableName = AssociatedModel.schema.table;
      path.push({
        association,
        tableName
      });

      // Passer au schema suivant pour la prochaine itération
      schema = AssociatedModel.schema;
    }

    return path;
  }

  /**
   * Trouve une association par nom de table
   *
   * @param {string} tableName - Nom de la table (ex: 'applicants')
   * @returns {Array|null} Association trouvée ou null
   */
  _findAssociationByTable(tableName) {
    const { query } = this;
    const associations = this._getSchemaAssociations(query.schema);

    if (!associations) {
      return null;
    }

    // Chercher dans les associations du schema (ici on a toujours les Model classes)
    const association = _.find(associations, (assoc) => {
      const [, , AssociatedModel] = assoc;
      if (!AssociatedModel || !AssociatedModel.schema) {
        return false;
      }
      return AssociatedModel.schema.table === tableName;
    });

    return association || null;
  }

  /**
   * Trouve une association qui contient une colonne donnée
   *
   * Cette méthode cherche dans les associations belongs_to directes du schema
   * pour trouver laquelle contient la colonne spécifiée.
   *
   * Utilisé pour gérer les colonnes de "blocks" dans les ORDER BY.
   *
   * @param {string} columnName - Nom de la colonne à chercher (ex: 'studies_year')
   * @param {Object} currentSchema - Schema actuel
   * @returns {Array|null} Chemin vers l'association contenant la colonne, ou null
   *
   * Exemple :
   * _findAssociationByColumn('studies_year', PMEFolderSchema)
   * → [{association: ['belongs_to', 'studies', StudiesBlock, 'block_studies_id', 'id'], tableName: 'block_studies'}]
   */
  _findAssociationByColumn(columnName, currentSchema) {
    const associations = this._getSchemaAssociations(currentSchema);
    if (!associations) {
      return null;
    }

    // Chercher dans les associations directes (belongs_to uniquement pour les blocks)
    for (const assoc of associations) {
      const [assocType, _assocName, AssociatedModel, _src_column, _ref_column] = assoc;

      // On cherche uniquement dans les belongs_to
      if (assocType !== 'belongs_to' || !AssociatedModel || !AssociatedModel.schema) {
        continue;
      }

      const assocSchema = AssociatedModel.schema;
      const assocTableName = assocSchema.table;

      // Vérifier si la colonne existe dans ce schema
      if (assocSchema.colsByName && assocSchema.colsByName[columnName]) {
        // Colonne trouvée ! Retourner le chemin
        return [{
          association: assoc,
          tableName: assocTableName
        }];
      }
    }

    return null;
  }

  /**
   * Cherche une colonne dans les tables explicitement jointes (query.joins)
   *
   * @param {string} columnName - Nom de la colonne à chercher
   * @param {Array} joins - Liste des joins déclarés sur la query
   * @returns {Array|null} Chemin vers l'association contenant la colonne, ou null
   */
  _findColumnInJoins(columnName, joins) {
    for (const join of joins) {
      const { association } = join;
      const [, , AssociatedModel] = association;

      if (!AssociatedModel || !AssociatedModel.schema) {
        continue;
      }

      const assocSchema = AssociatedModel.schema;
      if (assocSchema.colsByName && assocSchema.colsByName[columnName]) {
        return [{
          association,
          tableName: assocSchema.table
        }];
      }
    }
    return null;
  }

  /**
   * Trouve le chemin complet vers une table ou association (gère les associations imbriquées)
   *
   * Cherche récursivement dans les associations pour trouver le chemin
   * complet depuis la table principale jusqu'à la cible.
   *
   * @param {string} target - Nom de la table OU nom de l'association cible (ex: 'companies' ou 'formationNature')
   * @param {Object} currentSchema - Schema actuel
   * @param {Array} currentPath - Chemin actuel (pour la récursion)
   * @param {Set} visitedTables - Tables déjà visitées (pour éviter les cycles)
   * @returns {Array|null} Chemin vers la table/association ou null
   *
   * Exemples :
   * _findPathToTable('companies', FolderSchema)
   * → [{association: [...], tableName: 'pme_folders'}, {association: [...], tableName: 'companies'}]
   *
   * _findPathToTable('formationNature', FolderSchema)
   * → [{association: [...], tableName: 'pmfp_folders'}, {association: [...], tableName: 'formation_natures'}]
   */
  _findPathToTable(target, currentSchema, currentPath = [], visitedTables = new Set()) {
    const associations = this._getSchemaAssociations(currentSchema);
    if (!associations) {
      return null;
    }

    // Ajouter la table courante aux tables visitées
    const currentTable = currentSchema.table;
    if (currentTable && visitedTables.has(currentTable)) {
      // Cycle détecté, arrêter la recherche dans cette branche
      return null;
    }

    // Créer un nouveau Set avec la table courante ajoutée
    const newVisitedTables = new Set(visitedTables);
    if (currentTable) {
      newVisitedTables.add(currentTable);
    }

    // Chercher dans les associations directes
    for (const assoc of associations) {
      const [, assocName, AssociatedModel, _src_column, _ref_column] = assoc;

      if (!AssociatedModel || !AssociatedModel.schema) {
        continue;
      }

      const assocTableName = AssociatedModel.schema.table;

      // Éviter les cycles : ne pas revisiter une table déjà dans le chemin
      if (newVisitedTables.has(assocTableName)) {
        continue;
      }

      // Matcher sur le nom de la table OU le nom de l'association
      const isMatch = (assocTableName === target) || (assocName === target);

      if (isMatch) {
        return [...currentPath, {
          association: assoc,
          tableName: assocTableName
        }];
      }

      // Sinon, chercher récursivement dans les associations de ce modèle
      const nestedPath = this._findPathToTable(
        target,
        AssociatedModel.schema,
        [...currentPath, {
          association: assoc,
          tableName: assocTableName
        }],
        newVisitedTables
      );

      if (nestedPath) {
        return nestedPath;
      }
    }

    return null;
  }

  /**
   * Ajoute les LEFT JOIN nécessaires pour le tri (gère les chemins imbriqués)
   *
   * LEFT JOIN est utilisé (pas INNER JOIN) pour préserver toutes les lignes de la table
   * principale, même celles sans correspondance (qui auront NULL pour la colonne de tri).
   *
   * @param {Array} joinPathsForSort - Liste des chemins vers les tables à joindre
   * @returns {string} Clause SQL avec les LEFT JOIN en cascade
   *
   * Exemples de SQL généré :
   * - Simple : LEFT JOIN `applicants` ON `applicants`.`id` = `folders`.`applicant_id`
   * - Imbriqué : LEFT JOIN `pmfp_folders` ON ... LEFT JOIN `formation_natures` ON ...
   */
  _addJoinsForSort(joinPathsForSort) {
    if (joinPathsForSort.length === 0) {
      return '';
    }

    const { query, dialect } = this;
    const { esc } = dialect;
    const mainTable = query.table;
    const params = [];

    let sql = '';
    const processedTables = new Set(); // Pour éviter les doublons

    _.forEach(joinPathsForSort, ({ path }) => {
      // Parcourir le chemin et créer les LEFT JOIN en cascade
      let prevTable = mainTable;

      _.forEach(path, ({ association, tableName: currentTableName }) => {
        // Éviter les doublons si plusieurs ORDER BY utilisent le même chemin
        if (processedTables.has(currentTableName)) {
          prevTable = currentTableName;
          return;
        }

        const [, , , src_column, ref_column, extraWhere] = association;

        // Générer le LEFT JOIN (pour préserver toutes les lignes, même celles avec NULL)
        let joinSql = `LEFT JOIN ${esc}${currentTableName}${esc} `;
        joinSql += `ON ${esc}${currentTableName}${esc}.${esc}${ref_column}${esc} = ${esc}${prevTable}${esc}.${esc}${src_column}${esc}`;

        // Ajouter les conditions extraWhere si présentes
        if (extraWhere) {
          const compiled = compileExtraWhere(extraWhere, currentTableName, dialect, this.i);
          this.i = compiled.i;
          params.push(...compiled.params);
          compiled.parts.forEach(p => joinSql += ` AND ${p}`);
        }

        sql += joinSql + ' ';

        processedTables.add(currentTableName);
        prevTable = currentTableName;
      });
    });

    // Retourner à la fois le SQL et les params pour qu'ils soient ajoutés
    this._sortJoinParams = params;
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
    const { query, dialect: _dialect } = this;

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

      // Distinguer les différents types de filterJoins
      if (filterJoin.type === 'nested') {
        // Traiter chaque branche de la hiérarchie
        _.forEach(filterJoin.hierarchy, (rootNode) => {
          sql += this._buildNestedExistsFromTree(rootNode, query.table, params);
          sql += ' ';
        });
      } else if (filterJoin.type === 'or_group') {
        // Groupe de conditions avec OR
        sql += this._buildOrGroupExists(filterJoin.conditions, query.table, params);
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
    const [, , AssociatedModel, src_column, ref_column, extraWhere] = association;
    const joinTable = AssociatedModel.schema.table;

    // Ouvrir l'EXISTS
    let sql = `EXISTS (SELECT 1 FROM ${esc}${joinTable}${esc} `;

    // Condition de jointure
    sql += `WHERE ${esc}${joinTable}${esc}.${esc}${ref_column}${esc} = ${esc}${parentTable}${esc}.${esc}${src_column}${esc} `;

    // Ajouter les conditions extraWhere si présentes
    if (extraWhere) {
      const compiled = compileExtraWhere(extraWhere, joinTable, dialect, this.i);
      this.i = compiled.i;
      params.push(...compiled.params);
      compiled.parts.forEach(p => sql += `AND ${p} `);
    }

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
    const [, , AssociatedModel, src_column, ref_column, extraWhere] = association;
    const joinTable = AssociatedModel.schema.table;

    let sql = `EXISTS (SELECT 1 FROM ${esc}${joinTable}${esc} `;
    sql += `WHERE ${esc}${joinTable}${esc}.${esc}${ref_column}${esc} = ${esc}${parentTable}${esc}.${esc}${src_column}${esc} `;

    // Ajouter les conditions extraWhere si présentes
    if (extraWhere) {
      const compiled = compileExtraWhere(extraWhere, joinTable, dialect, this.i);
      this.i = compiled.i;
      params.push(...compiled.params);
      compiled.parts.forEach(p => sql += `AND ${p} `);
    }

    if (conditions && !_.isEmpty(conditions)) {
      sql += this.buildConditions(conditions, joinTable, params, operator);
    }

    sql += ') ';

    return sql;
  }

  /**
   * Construit un groupe de EXISTS avec OR
   *
   * @param {Array} conditions - Array de conditions du $or
   * @param {string} parentTable - Table parente
   * @param {Array} params - Paramètres SQL
   * @returns {string} SQL avec EXISTS joints par OR
   *
   * Les conditions sont regroupées par chemin d'association :
   * toutes les conditions sur une même relation sont combinées avec OR
   * à l'intérieur d'un unique EXISTS (au lieu d'un EXISTS par condition).
   *
   * Exemple :
   * Input: [
   *   { 'applicant.last_name': { $like: 'Dupont%' } },
   *   { 'applicant.first_name': { $like: 'Jean%' } },
   *   { 'beneficiary.email': 'test@test.com' }
   * ]
   * Output: (
   *   EXISTS (SELECT 1 FROM applicants WHERE applicants.id = folders.applicant_id
   *           AND (applicants.last_name LIKE ? OR applicants.first_name LIKE ?))
   *   OR EXISTS (SELECT 1 FROM beneficiaries WHERE beneficiaries.id = folders.beneficiary_id
   *              AND beneficiaries.email = ?)
   * )
   */
  _buildOrGroupExists(conditions, parentTable, params) {
    const { query, dialect } = this;
    const { esc } = dialect;

    // Regrouper les conditions par chemin d'association, en préservant l'ordre d'apparition
    const groupsByPath = new Map();

    _.forEach(conditions, (cond) => {
      _.forOwn(cond, (value, key) => {
        const parts = key.split('.');
        const column = parts[parts.length - 1];
        const path = parts.slice(0, -1);
        const pathKey = path.join('.');

        if (!groupsByPath.has(pathKey)) {
          groupsByPath.set(pathKey, { path, items: [] });
        }
        groupsByPath.get(pathKey).items.push({ column, value });
      });
    });

    const existsClauses = [];

    groupsByPath.forEach(({ path, items }) => {
      const association = this._findAssociationByPath(path, query.schema);
      if (!association) {
        return;
      }
      const [, , AssociatedModel, src_column, ref_column, extraWhere] = association;
      const joinTable = AssociatedModel.schema.table;

      let existsSQL = `EXISTS (SELECT 1 FROM ${esc}${joinTable}${esc} `;
      existsSQL += `WHERE ${esc}${joinTable}${esc}.${esc}${ref_column}${esc} = ${esc}${parentTable}${esc}.${esc}${src_column}${esc} `;

      // Ajouter les conditions extraWhere si présentes
      if (extraWhere) {
        const compiledExtra = compileExtraWhere(extraWhere, joinTable, dialect, this.i);
        this.i = compiledExtra.i;
        params.push(...compiledExtra.params);
        compiledExtra.parts.forEach(p => existsSQL += `AND ${p} `);
      }

      // Combiner toutes les conditions de cette relation avec OR à l'intérieur du EXISTS
      const innerClauses = [];
      _.forEach(items, ({ column, value }) => {
        const columnRef = `${esc}${joinTable}${esc}.${esc}${column}${esc}`;
        const compiled = compileCondition(columnRef, value, dialect, this.i);
        this.i = compiled.i;
        innerClauses.push(compiled.sql);
        params.push(...compiled.params);
      });

      if (innerClauses.length === 1) {
        existsSQL += `AND ${innerClauses[0]})`;
      } else {
        existsSQL += `AND (${innerClauses.join(' OR ')}))`;
      }
      existsClauses.push(existsSQL);
    });

    if (existsClauses.length === 0) {
      return '';
    }

    if (existsClauses.length === 1) {
      return `${existsClauses[0]} `;
    }

    return `(${existsClauses.join(' OR ')}) `;
  }

  /**
   * Trouve une association en suivant un chemin
   *
   * @param {Array} path - Chemin d'associations (ex: ['applicant'] ou ['pme_folder', 'company'])
   * @param {Object} currentSchema - Schema actuel
   * @returns {Array|null} Association trouvée
   */
  _findAssociationByPath(path, currentSchema) {
    if (path.length === 0) {
      return null;
    }

    const associations = this._getSchemaAssociations(currentSchema);
    if (!associations) {
      return null;
    }

    // Chercher la première association
    const firstAssocName = path[0];
    const association = _.find(associations, (assoc) => {
      return assoc[1] === firstAssocName;
    });

    if (!association) {
      return null;
    }

    // Si le chemin est plus long, continuer récursivement
    if (path.length === 1) {
      return association;
    }

    // Pour les chemins imbriqués, on retourne juste la dernière association
    // (pour simplifier, on suppose qu'on ne gère que les chemins simples pour l'instant)
    return association;
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
   * - LIKE : { last_name: { $like: 'Dupont%' } }
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
      if (key.indexOf('.') > -1) {
        const parts = key.split('.');
        columnRef = _.map(parts, part => `${esc}${part}${esc}`).join('.');
      } else {
        columnRef = `${esc}${tableName}${esc}.${esc}${key}${esc}`;
      }

      const compiled = compileCondition(columnRef, value, dialect, this.i);
      this.i = compiled.i;
      sqlConditions.push(compiled.sql + ' ');
      params.push(...compiled.params);
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

  /**
   * Override de orderSQL pour transformer les noms d'associations en noms de tables SQL
   *
   * IMPORTANT : Cette transformation N'EST NÉCESSAIRE QUE pour les phases COUNT et IDS
   * car elles utilisent des INNER JOIN sans alias. La phase FULL (selectSQL) utilise
   * des LEFT JOIN avec des alias qui correspondent aux noms d'associations, donc pas
   * de transformation nécessaire.
   *
   * Par exemple :
   * - Phase IDS : "formationNature.name" → "formation_natures.name" (transformation nécessaire)
   * - Phase FULL : "formationNature.name" → reste "formationNature.name" (alias du LEFT JOIN)
   */
  orderSQL() {
    const { query } = this;

    if (!query.order || !query.order.length) {
      return '';
    }

    // Déterminer si on est dans une phase qui nécessite la transformation
    // COUNT et IDS utilisent des INNER JOIN avec noms de tables réels
    // SELECT (full) utilise des LEFT JOIN avec alias = noms d'associations
    const needsTransformation = (query.verb === 'count' || query.verb === 'select_ids');

    if (!needsTransformation) {
      // Phase FULL : appeler la méthode parente (pas de transformation)
      return super.orderSQL();
    }

    // Phases COUNT/IDS : transformer les noms d'associations en noms de tables
    const transformedOrder = query.order.map((orderClause) => {
      return this._transformOrderClause(orderClause);
    });

    return 'ORDER BY ' + transformedOrder.join(', ') + ' ';
  }

  /**
   * Transforme une clause ORDER BY pour la phase FULL (utilise les noms d'associations comme alias)
   *
   * @param {string} orderClause - Clause ORDER BY (ex: "pme_folder.studies.studies_year DESC" ou "studies_year")
   * @returns {string} Clause transformée avec alias (ex: "studies.studies_year DESC")
   */
  _transformOrderClauseForFullQuery(orderClause) {
    return this._transformPathsInExpression(
      orderClause.replace(/`/g, '').trim(),
      (path) => this._transformPathForFullQuery(path)
    );
  }

  /**
   * Transforme une clause ORDER BY en remplaçant les noms d'associations par les noms de tables
   *
   * Gère tout type d'expression SQL (CASE, fonctions, arithmétique, clauses composées)
   * en faisant un find-and-replace au niveau des tokens plutôt qu'en parsant la structure.
   *
   * @param {string} orderClause - Clause ORDER BY (ex: "formationNature.name DESC" ou "COALESCE(beneficiary.name, applicant.name)")
   * @returns {string} Clause transformée (ex: "formation_natures.name DESC" ou "COALESCE(beneficiaries.name, applicants.name)")
   */
  _transformOrderClause(orderClause) {
    return this._transformPathsInExpression(
      orderClause.replace(/`/g, '').trim(),
      (path) => this._transformSinglePath(path)
    );
  }

  /**
   * Remplace tous les tokens identifiants (paths et colonnes isolées) dans une expression SQL
   * via le transformer fourni. Les mots-clés SQL, noms de fonctions, littéraux et opérateurs
   * sont laissés intacts.
   *
   * @param {string} expression - Expression SQL (ORDER BY complet, CASE, fonction, etc.)
   * @param {(path: string) => string} transformPath - Transformer appelé sur chaque path/identifiant
   * @returns {string} Expression transformée
   */
  _transformPathsInExpression(expression, transformPath) {
    // Mots-clés SQL à ne pas traiter comme des identifiants de colonne
    const sqlKeywords = new Set([
      'SELECT', 'FROM', 'WHERE', 'ORDER', 'BY', 'ASC', 'DESC',
      'COALESCE', 'IFNULL', 'CONCAT', 'CONCAT_WS', 'SUBSTRING',
      'UPPER', 'LOWER', 'TRIM', 'LENGTH', 'DATE', 'NOW', 'NULL', 'AND', 'OR',
      'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
      'IF', 'NULLIF', 'GREATEST', 'LEAST', 'CAST', 'CONVERT',
      'AS', 'IS', 'IN', 'LIKE', 'BETWEEN', 'NOT', 'DISTINCT',
      'TRUE', 'FALSE'
    ]);

    // Groupe 1 : paths avec points (table.col, a.b.c)
    // Groupe 2 : colonnes entre backticks (`col`)
    // Groupe 3 : identifiants simples non suivis de '.' ou '(' (donc ni path ni appel de fonction)
    const combinedPattern = /(\b[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)+\b)|(`[a-zA-Z_][a-zA-Z0-9_]*`)(?!\s*\.)|(\b[a-zA-Z_][a-zA-Z0-9_]*\b)(?!\s*[.(])/g;

    return expression.replace(combinedPattern, (match, plainPath, backtickColumn, plainIdentifier) => {
      if (plainPath) {
        return transformPath(plainPath);
      }

      if (backtickColumn) {
        const columnName = backtickColumn.slice(1, -1);
        const transformed = transformPath(columnName);
        if (transformed === columnName) {
          return match;
        }
        return transformed.split('.').map((s) => `\`${s}\``).join('.');
      }

      if (plainIdentifier) {
        if (sqlKeywords.has(plainIdentifier.toUpperCase())) {
          return match;
        }
        return transformPath(plainIdentifier);
      }

      return match;
    });
  }

  /**
   * Transforme un chemin d'association pour la phase FULL (utilise les noms d'associations comme alias)
   *
   * @param {string} path - Chemin (ex: "pme_folder.studies.studies_year" ou "studies_year")
   * @returns {string} Chemin transformé avec alias (ex: "studies.studies_year")
   */
  _transformPathForFullQuery(path) {
    const { query } = this;

    // Split le chemin par point
    const parts = path.split('.');

    if (parts.length < 2) {
      // Pas de point - peut être une colonne simple ou une colonne de block
      const columnName = parts[0];

      // Vérifier si la colonne existe dans la table principale
      const existsInMainTable = query.schema && query.schema.colsByName && query.schema.colsByName[columnName];

      if (!existsInMainTable) {
        // Chercher dans les associations (blocks)
        const assocPath = this._findAssociationByColumn(columnName, query.schema);

        if (assocPath && assocPath.length > 0) {
          // Colonne trouvée dans une table de block - utiliser le nom de l'association comme alias
          const assocName = assocPath[0].association[1]; // Nom de l'association
          return `${assocName}.${columnName}`;
        }
      }

      // Colonne dans la table principale ou non trouvée - retourner tel quel
      return path;
    }

    // Le dernier élément est la colonne
    const columnName = parts[parts.length - 1];
    const associationPath = parts.slice(0, -1);

    // Si le premier élément est déjà la table principale, pas de transformation
    if (associationPath[0] === query.table) {
      return path;
    }

    // Pour les chemins imbriqués, utiliser le dernier nom d'association comme alias
    // Ex: "pme_folder.studies.studies_year" -> "studies.studies_year"
    const lastAssocName = associationPath[associationPath.length - 1];
    return `${lastAssocName}.${columnName}`;
  }

  /**
   * Transforme un seul chemin association.colonne en table.colonne
   *
   * Gère également les colonnes sans préfixe (ex: "studies_year") en cherchant
   * dans les associations si elles proviennent d'une table de block.
   *
   * @param {string} path - Chemin (ex: "beneficiary_snapshot.identity_expires_at", "pme_folder.company.name", ou "studies_year")
   * @returns {string} Chemin transformé (ex: "beneficiaries_snapshots.identity_expires_at", "companies.name", ou "block_studies.studies_year")
   */
  _transformSinglePath(path) {
    const { query } = this;

    // Split le chemin par point
    const parts = path.split('.');

    if (parts.length < 2) {
      // Pas de point - peut être une colonne simple ou une colonne de block
      const columnName = parts[0];

      // Vérifier si la colonne existe dans la table principale
      const existsInMainTable = query.schema && query.schema.colsByName && query.schema.colsByName[columnName];

      if (!existsInMainTable) {
        // Chercher dans les associations (blocks)
        const assocPath = this._findAssociationByColumn(columnName, query.schema);

        if (assocPath && assocPath.length > 0) {
          // Colonne trouvée dans une table de block - ajouter le préfixe
          const tableName = assocPath[0].tableName;
          return `${tableName}.${columnName}`;
        }
      }

      // Colonne dans la table principale ou non trouvée - retourner tel quel
      return path;
    }

    // Le dernier élément est la colonne
    const columnName = parts[parts.length - 1];
    const associationPath = parts.slice(0, -1);

    // Si le premier élément est déjà la table principale, pas de transformation
    if (associationPath[0] === query.table) {
      return path;
    }

    // Construire le chemin d'associations pour obtenir les vrais noms de tables
    let associationChain = this._buildAssociationPath(associationPath, query.schema);

    // Si on n'a pas trouvé, essayer avec _findPathToTable (au cas où c'est déjà un nom de table)
    if (!associationChain && associationPath.length === 1) {
      associationChain = this._findPathToTable(associationPath[0], query.schema);
    }

    if (associationChain && associationChain.length > 0) {
      // Utiliser le nom de la dernière table du chemin
      const lastTable = associationChain[associationChain.length - 1].tableName;
      return `${lastTable}.${columnName}`;
    }

    // Si on ne trouve pas de transformation, retourner tel quel
    return path;
  }
};
