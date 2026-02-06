
import lodash from 'lodash';
const { isFunction, isDate, isArray, map, isPlainObject, isObject } = lodash;

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
const serialize = (data, seen = new WeakMap()) => {
  if (data === null || data === undefined) {
    return null;
  }
  // Skip functions
  if (isFunction(data)) {
    return undefined;
  }
  // Keep Date objects as-is (devalue handles them natively)
  if (isDate(data)) {
    return data;
  }
  if (isArray(data)) {
    return map(data, item => serialize(item, seen));
  }
  // Model instances with serialize method
  if (isFunction(data?.serialize)) {
    // Check if already serialized (deduplication)
    if (seen.has(data)) {
      return seen.get(data);
    }
    // Create placeholder to handle circular refs
    const serialized = {};
    seen.set(data, serialized);
    // Serialize and merge into placeholder
    const result = data.serialize();
    Object.assign(serialized, serialize(result, seen));
    return serialized;
  }
  // Form instances with getValues method (Igo Form)
  if (isFunction(data?.getValues) && data.constructor?.schema?.attributes) {
    return serialize(data.getValues(), seen);
  }
  // Plain objects only - recursively serialize values
  if (isPlainObject(data)) {
    // Check if already processed (for circular plain objects)
    if (seen.has(data)) {
      return seen.get(data);
    }
    const serialized = {};
    seen.set(data, serialized);
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serialize(value, seen);
    }
    return serialized;
  }
  // Primitives (string, number, boolean)
  if (!isObject(data)) {
    return data;
  }
  // Skip non-POJO class instances that we don't know how to serialize
  return undefined;
};

export default { serialize };
