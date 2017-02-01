

module.exports = function(req, res, next) {

  req.session.flash = req.session.flash || {};
  res.locals.flash  = req.session.flash;
  if (req.method === 'GET') {
    // clear flash scope
    req.session.flash = {};
  }
  req.flash = function(key, value) {
    if (value === undefined) {
      return res.locals.flash[key];
    }
    req.session.flash[key] = value;
  };
  next();
};
