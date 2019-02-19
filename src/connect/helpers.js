
const dust        = require('dustjs-linkedin');
const moment      = require('moment');

const config      = require('../config');

const assetsPath  = process.cwd() + '/public/webpack-assets.json';
let   assets      = null;

//
const getWebpackAssets = function() {
  if (assets && config.env === 'production') {
    return assets;
  }
  delete require.cache[assetsPath];
  try {
    assets = require(assetsPath);
  } catch (err) {
    // ignored
  }
  return assets;
};

//
module.exports = function(req, res, next) {

  res.locals.lang     = req.locale;
  res.locals.session  = req.session;
  res.locals.assets   = getWebpackAssets();

  //
  res.locals.t = function(chunk, context, bodies, params) {
    const key         = dust.helpers.tap(params.key, chunk, context);
    const translation = req.t(key, params);
    return chunk.write(translation);
  };

  next();
};

// date formatting
dust.helpers.dateformat = function(chunk, context, bodies, params) {

  if (!params.date) return chunk;

  const m = moment(params.date);

  m.locale(dust.helpers.tap(params.lang, chunk, context) || context.get('lang'));

  if (m && m.isValid()) {
    if (params.format === 'calendar') {
      chunk.write(m.calendar());
    } else {
      chunk.write(m.format(params.format || 'YYYY-MM-DD HH:mm:ss'));
    }
  }
  return chunk;
};


// load custom helpers
const helpers = require(process.cwd() + '/app/helpers');
helpers.init(dust);
