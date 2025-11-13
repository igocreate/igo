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
   * filterJoin - Ajoute un filtre sur une table jointe qui sera transformé en EXISTS
   *
   * Cette méthode permet de filtrer sur une table jointe sans faire de LEFT JOIN dans le COUNT et IDS.
   * Les conditions sont converties en sous-requêtes EXISTS pour de meilleures performances.
   *
   * @param {string} associationName - Nom de l'association (ex: 'applicant', 'pme_folder')
   * @param {object} conditions - Conditions de filtrage (ex: { last_name: 'Dupont%', status: 'ACTIVE' })
   * @param {string} operator - Opérateur SQL pour conditions multiples ('AND' ou 'OR'), défaut: 'AND'
   * @returns {PaginatedOptimizedQuery} this (pour chaînage)
   *
   * Exemple :
   *   query.filterJoin('applicant', { last_name: 'Dupont%' })
   *   → WHERE EXISTS (SELECT 1 FROM applicants a WHERE a.id = f.applicant_id AND a.last_name LIKE 'Dupont%')
   */
  filterJoin(associationName, conditions, operator = 'AND') {
    const association = this._findAssociation(associationName, this.schema);

    this.query.filterJoins.push({
      association,
      conditions,
      operator,
      src_schema: this.schema
    });

    return this;
  }

  /**
   * filterJoinNested - Ajoute des filtres imbriqués sur plusieurs niveaux de jointures
   *
   * Permet de filtrer sur des associations imbriquées (ex: folder → pmfp_folder → formation_nature)
   *
   * Cette version REFACTORISÉE stocke TOUTE la hiérarchie, même les niveaux sans conditions,
   * pour permettre la génération de vrais EXISTS imbriqués.
   *
   * @param {object} nestedConfig - Configuration des filtres imbriqués
   * @returns {PaginatedOptimizedQuery} this (pour chaînage)
   *
   * Exemple :
   *   query.filterJoinNested({
   *     pmfp_folder: {
   *       nested: {
   *         formation_nature: {
   *           conditions: { label: '%numérique%' }
   *         }
   *       }
   *     }
   *   })
   *
   * Ceci génère :
   * EXISTS (
   *   SELECT 1 FROM pmfp_folders WHERE pmfp_folders.id = folders.pmfp_folder_id
   *   AND EXISTS (
   *     SELECT 1 FROM formation_nature WHERE formation_nature.id = pmfp_folders.formation_nature_id
   *     AND formation_nature.label LIKE '%numérique%'
   *   )
   * )
   */
  filterJoinNested(nestedConfig) {
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

    return this;
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
