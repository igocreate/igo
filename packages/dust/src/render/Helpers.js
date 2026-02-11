
//
const truthTest = (test) => {
  return (params, locals) => {
    const key = params.key !== undefined ? params.key : locals._select_key;
    const result = test(key, params.value);
    if (result && locals._select_state) {
      locals._select_state.resolved = true;
    }
    return result;
  };
};

//
module.exports = {
  eq:   truthTest((left, right) => left === right ),
  ne:   truthTest((left, right) => left !== right ),
  lt:   truthTest((left, right) => Number(left) <   Number(right)),
  lte:  truthTest((left, right) => Number(left) <=  Number(right)),
  gt:   truthTest((left, right) => Number(left) >   Number(right)),
  gte:  truthTest((left, right) => Number(left) >=  Number(right)),

  first:  (params, locals) => locals.$idx === 0,
  last:   (params, locals) => locals.$length && locals.$length - 1 === locals.$idx,
  sep:    (params, locals) => locals.$length && locals.$length - 1 !== locals.$idx,

  select: async (params, locals, body) => {
    if (!body) { return ''; }
    const state = { resolved: false };
    return await body({ _select_key: params.key, _select_state: state });
  },

  none: (params, locals) => {
    return locals._select_state && !locals._select_state.resolved;
  },

  any: (params, locals) => {
    return locals._select_state && locals._select_state.resolved;
  },
};

