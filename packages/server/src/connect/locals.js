const config = require('../config');

// Middleware to set common locals for views
module.exports = (req, res, next) => {
  res.locals.env = config.env;
  res.locals.lang = req.language;
  next();
};
