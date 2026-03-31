
const _ = require('lodash');

/**
 * Compile une condition unitaire (colonne + valeur) en SQL
 *
 * Supporte : null (IS NULL), array (IN), $like, $between, $gte, $lte, $gt, $lt,
 * et égalité par défaut.
 *
 * @param {string} columnRef - Référence qualifiée de la colonne (ex: `table`.`col`)
 * @param {any} value - Valeur ou objet opérateur
 * @param {object} dialect - Dialect SQL { esc, param, in, notin }
 * @param {number} i - Index courant du paramètre
 * @returns {{ sql: string, params: Array, i: number }}
 */
const compileCondition = (columnRef, value, dialect, i) => {
  if (value === null || value === undefined) {
    return { sql: `${columnRef} IS NULL`, params: [], i };
  }

  if (_.isArray(value)) {
    if (value.length === 0) {
      return { sql: 'FALSE', params: [], i };
    }
    return { sql: `${columnRef} ${dialect.in} (${dialect.param(i++)})`, params: [value], i };
  }

  if (_.isObject(value) && !_.isDate(value)) {
    const operators = {
      $like:    (v) => ({ sql: `${columnRef} LIKE ${dialect.param(i++)}`, params: [v] }),
      $between: (v) => { const p1 = dialect.param(i++); const p2 = dialect.param(i++); return { sql: `${columnRef} BETWEEN ${p1} AND ${p2}`, params: v }; },
      $gte:     (v) => ({ sql: `${columnRef} >= ${dialect.param(i++)}`, params: [v] }),
      $lte:     (v) => ({ sql: `${columnRef} <= ${dialect.param(i++)}`, params: [v] }),
      $gt:      (v) => ({ sql: `${columnRef} > ${dialect.param(i++)}`, params: [v] }),
      $lt:      (v) => ({ sql: `${columnRef} < ${dialect.param(i++)}`, params: [v] }),
    };

    const parts = [];
    const allParams = [];
    _.forOwn(value, (v, k) => {
      if (operators[k]) {
        const result = operators[k](v);
        parts.push(result.sql);
        allParams.push(...result.params);
      }
    });

    if (parts.length === 1) {
      return { sql: parts[0], params: allParams, i };
    }
    if (parts.length > 1) {
      return { sql: `(${parts.join(' AND ')})`, params: allParams, i };
    }
  }

  return { sql: `${columnRef} = ${dialect.param(i++)}`, params: [value], i };
};

/**
 * Compile une condition unitaire en mode NOT
 *
 * @param {string} columnRef - Référence qualifiée de la colonne
 * @param {any} value - Valeur
 * @param {object} dialect - Dialect SQL
 * @param {number} i - Index courant du paramètre
 * @returns {{ sql: string, params: Array, i: number }}
 */
const compileNotCondition = (columnRef, value, dialect, i) => {
  if (value === null || value === undefined) {
    return { sql: `${columnRef} IS NOT NULL`, params: [], i };
  }

  if (_.isArray(value)) {
    if (value.length === 0) {
      return { sql: 'TRUE', params: [], i };
    }
    return { sql: `${columnRef} ${dialect.notin} (${dialect.param(i++)})`, params: [value], i };
  }

  // Opérateurs inversés
  if (_.isObject(value) && !_.isDate(value)) {
    const operators = {
      $like:    (v) => ({ sql: `${columnRef} NOT LIKE ${dialect.param(i++)}`, params: [v] }),
      $between: (v) => { const p1 = dialect.param(i++); const p2 = dialect.param(i++); return { sql: `${columnRef} NOT BETWEEN ${p1} AND ${p2}`, params: v }; },
      $gte:     (v) => ({ sql: `${columnRef} < ${dialect.param(i++)}`, params: [v] }),
      $lte:     (v) => ({ sql: `${columnRef} > ${dialect.param(i++)}`, params: [v] }),
      $gt:      (v) => ({ sql: `${columnRef} <= ${dialect.param(i++)}`, params: [v] }),
      $lt:      (v) => ({ sql: `${columnRef} >= ${dialect.param(i++)}`, params: [v] }),
    };

    const parts = [];
    const allParams = [];
    _.forOwn(value, (v, k) => {
      if (operators[k]) {
        const result = operators[k](v);
        parts.push(result.sql);
        allParams.push(...result.params);
      }
    });

    if (parts.length === 1) {
      return { sql: parts[0], params: allParams, i };
    }
    if (parts.length > 1) {
      return { sql: `(${parts.join(' AND ')})`, params: allParams, i };
    }
  }

  return { sql: `${columnRef} != ${dialect.param(i++)}`, params: [value], i };
};

module.exports = { compileCondition, compileNotCondition };
