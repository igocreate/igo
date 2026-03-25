
const _ = require('lodash');

/**
 * Compile une condition unitaire (colonne + valeur) en SQL
 *
 * Supporte : null (IS NULL), array (IN), $like, $between, $gte, $lte, $gt, $lt,
 * string avec % (LIKE implicite), et égalité par défaut.
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
    if (value.$like !== undefined) {
      return { sql: `${columnRef} LIKE ${dialect.param(i++)}`, params: [value.$like], i };
    }
    if (value.$between && _.isArray(value.$between) && value.$between.length === 2) {
      const p1 = dialect.param(i++);
      const p2 = dialect.param(i++);
      return { sql: `${columnRef} BETWEEN ${p1} AND ${p2}`, params: value.$between, i };
    }
    if (value.$gte !== undefined) {
      return { sql: `${columnRef} >= ${dialect.param(i++)}`, params: [value.$gte], i };
    }
    if (value.$lte !== undefined) {
      return { sql: `${columnRef} <= ${dialect.param(i++)}`, params: [value.$lte], i };
    }
    if (value.$gt !== undefined) {
      return { sql: `${columnRef} > ${dialect.param(i++)}`, params: [value.$gt], i };
    }
    if (value.$lt !== undefined) {
      return { sql: `${columnRef} < ${dialect.param(i++)}`, params: [value.$lt], i };
    }
  }

  if (_.isString(value) && value.includes('%')) {
    return { sql: `${columnRef} LIKE ${dialect.param(i++)}`, params: [value], i };
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
    if (value.$like !== undefined) {
      return { sql: `${columnRef} NOT LIKE ${dialect.param(i++)}`, params: [value.$like], i };
    }
    if (value.$between && _.isArray(value.$between) && value.$between.length === 2) {
      const p1 = dialect.param(i++);
      const p2 = dialect.param(i++);
      return { sql: `${columnRef} NOT BETWEEN ${p1} AND ${p2}`, params: value.$between, i };
    }
    if (value.$gte !== undefined) {
      return { sql: `${columnRef} < ${dialect.param(i++)}`, params: [value.$gte], i };
    }
    if (value.$lte !== undefined) {
      return { sql: `${columnRef} > ${dialect.param(i++)}`, params: [value.$lte], i };
    }
    if (value.$gt !== undefined) {
      return { sql: `${columnRef} <= ${dialect.param(i++)}`, params: [value.$gt], i };
    }
    if (value.$lt !== undefined) {
      return { sql: `${columnRef} >= ${dialect.param(i++)}`, params: [value.$lt], i };
    }
  }

  // String avec % → NOT LIKE implicite
  if (_.isString(value) && value.includes('%')) {
    return { sql: `${columnRef} NOT LIKE ${dialect.param(i++)}`, params: [value], i };
  }

  return { sql: `${columnRef} != ${dialect.param(i++)}`, params: [value], i };
};

module.exports = { compileCondition, compileNotCondition };
