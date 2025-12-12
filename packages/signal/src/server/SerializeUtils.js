
const _ = require('lodash');

/**
 * Serialize data for client-side hydration
 *
 * This function prepares data for devalue by converting Model instances
 * to plain objects using their serialize() method.
 *
 * IMPORTANT: For deduplication to work, pass the same object references
 * multiple times. Do NOT create separate serialize() calls before passing
 * to this function - let it handle the serialization.
 *
 * @param {any} data - Data to serialize
 * @param {WeakMap} [seen] - Internal map for tracking already-serialized objects
 * @returns {any} - Serialized data ready for devalue
 */
module.exports.serialize = (data, seen = new WeakMap()) => {
  if (data === null || data === undefined) {
    return null;
  }
  // Skip functions
  if (_.isFunction(data)) {
    return undefined;
  }
  // Keep Date objects as-is (devalue handles them natively)
  if (_.isDate(data)) {
    return data;
  }
  if (_.isArray(data)) {
    return _.map(data, item => module.exports.serialize(item, seen));
  }
  // Model instances with serialize method
  if (_.isFunction(data?.serialize)) {
    // Check if already serialized (deduplication)
    if (seen.has(data)) {
      return seen.get(data);
    }
    // Create placeholder to handle circular refs
    const serialized = {};
    seen.set(data, serialized);
    // Serialize and merge into placeholder
    const result = data.serialize();
    Object.assign(serialized, module.exports.serialize(result, seen));
    return serialized;
  }
  // Form instances with getValues method (Igo Form)
  if (_.isFunction(data?.getValues) && data.constructor?.schema?.attributes) {
    return module.exports.serialize(data.getValues(), seen);
  }
  // Plain objects only - recursively serialize values
  if (_.isPlainObject(data)) {
    // Check if already processed (for circular plain objects)
    if (seen.has(data)) {
      return seen.get(data);
    }
    const serialized = {};
    seen.set(data, serialized);
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = module.exports.serialize(value, seen);
    }
    return serialized;
  }
  // Primitives (string, number, boolean)
  if (!_.isObject(data)) {
    return data;
  }
  // Skip non-POJO class instances that we don't know how to serialize
  return undefined;
};
