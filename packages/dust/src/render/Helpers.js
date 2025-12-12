
//
const truthTest = (tag, test) => {
  return (params, locals) => test(params.key, params.value); 
};

//
module.exports = {
  eq:   truthTest('eq',   (left, right) => left === right ),
  ne:   truthTest('ne',   (left, right) => left !== right ),
  lt:   truthTest('lt',   (left, right) => Number(left) <   Number(right)),
  lte:  truthTest('lte',  (left, right) => Number(left) <=  Number(right)),
  gt:   truthTest('gt',   (left, right) => Number(left) >   Number(right)),
  gte:  truthTest('gte',  (left, right) => Number(left) >=  Number(right)),

  first:  (params, locals) => locals.$idx === 0,
  last:   (params, locals) => locals.$length && locals.$length - 1 === locals.$idx,
  sep:    (params, locals) => locals.$length && locals.$length - 1 !== locals.$idx,
  
  select: () => console.log('Error : @select not supported !'),
};

