
const _CACHE = {};

const AsyncFunction = Object.getPrototypeOf(async function() { }).constructor;

const getTemplate = (file) => {
  // loadTemplate(file);
  return _CACHE[file];
};

const loadTemplate = async (file) => {
  if (!_CACHE[file]) {
    const response  = await fetch(`/__signal/templates?file=${file}`);
    const json      = await response.json();
    // console.dir(json);
    const fn        = new AsyncFunction('l', 'u', 'c', 's', json.source);
    _CACHE[file]    = fn;
  }
  return _CACHE[file];
};

module.exports = {
  getTemplate,
  loadTemplate,
  _CACHE
};