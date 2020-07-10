
const dust        = require('dustjs-linkedin');
const IgoDust     = require('igo-dust');

const moment      = require('moment');

const config      = require('../config');

const assetsPath  = process.cwd() + '/public/webpack-assets.json';
let   assets      = null;



//
const customHelpers = {
  dust: {

    dateformat: function(chunk, context, bodies, params) {

      if (!params.date) {
        return chunk;
      }
    
      // do not format strings
      if (typeof params.date === 'string') {
        chunk.write(params.date);
        return chunk;
      }
    
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
    }
  },

  igoDust: {
    dateformat: function(params, locals) {
      if (!params.date) {
        return null;
      }

      // do not format strings
      if (typeof params.date === 'string') {
        return params.date;
      }
    
      const m = moment(params.date);
    
      m.locale(params.lang || locals.lang);
    
      if (m && m.isValid()) {
        if (params.format === 'calendar') {
          return m.calendar();
        } else {
          return m.format(params.format || 'YYYY-MM-DD HH:mm:ss');
        }
      }
      return null;
    }
  }
};
const ENGINE = config.engine === 'igo-dust' ? IgoDust : dust;
const CUSTOM = config.engine === 'igo-dust' ? customHelpers.igoDust : customHelpers.dust;


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

  if (config.engine === 'igo-dust') {
    res.locals.t = (params) => req.t(params.key, params);
  } else {
    res.locals.t = function(chunk, context, bodies, params) {
      const key         = dust.helpers.tap(params.key, chunk, context);
      const translation = req.t(key, params);
      return chunk.write(translation);
    };
  }

  next();
};

// date formatting
ENGINE.helpers.dateformat = CUSTOM.dateformat;

// load custom helpers
const helpers = require(process.cwd() + '/app/helpers');
helpers.init(ENGINE);
