
const cons        = require('consolidate');
const dust        = require('dustjs-linkedin');

const moment      = require('moment');

//
module.exports.init = (app) => {
  
  app.engine('dust', cons.dust);
  app.set('view engine', 'dust');
  app.set('views', './views');

  initHelpers();
}

//
module.exports.middleware = (req, res, next) => {
  res.locals.t = (chunk, context, bodies, params) => {
    const key         = dust.helpers.tap(params.key, chunk, context);
    const translation = req.t(key, params);
    return chunk.write(translation);
  };
  next();
};

//
const initHelpers = () => {

  // date formatting
  dust.helpers.dateformat = function(chunk, context, bodies, params) {

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
  };


  // load custom helpers
  const helpers = require(process.cwd() + '/app/helpers');
  helpers.init(dust);
}
