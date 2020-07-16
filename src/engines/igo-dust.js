
const IgoDust     = require('igo-dust');

const moment      = require('moment');

//
module.exports.init = (app) => {
  
  app.engine('dust', IgoDust.engine);
  app.set('view engine', 'dust');
  app.set('views', './views');
  
  initHelpers();
}

//
module.exports.middleware = (req, res, next) => {
  res.locals.t = (params) => req.t(params.key, params);
  next();
};


const initHelpers = () => {

  // date formatting
  IgoDust.helpers.dateformat = (params, locals) => {
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
  };


  // load custom helpers
  const helpers = require(process.cwd() + '/app/helpers');
  helpers.init(IgoDust);
}
