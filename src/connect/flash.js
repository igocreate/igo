

module.exports = function(req, res, next) {

  res.locals.flash  = req.session.flash || {};
  if (req.method === 'GET') {
    req.session.flash = {};
  }
  req.flash = function(key, value) {
    req.session.flash[key] = value;
  };
  next();
};
