const moment = require('moment');
const i18next = require('i18next');

const config = require('../config');
const IgoDust = require('igo-dust');

//
module.exports.init = (app) => {
  app.engine('dust', IgoDust.engine);
  app.set('view engine', 'dust');
  app.set('views', config.projectRoot + '/views'); 

  // configure
  IgoDust.configure(app);

  initHelpers();
};

//
module.exports.middleware = (req, res, next) => {
  res.locals.t = (params) => req.t(params.key, params);
  next();
};

//
module.exports.render = (template, data, callback) => {
  data.t = (params) => {
    params.lng = data.lang;
    return i18next.t(params.key, params);
  };
  IgoDust.engine(template, data, callback);
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
  const helpers = require(config.projectRoot + '/app/helpers');
  helpers.init(IgoDust);
};
