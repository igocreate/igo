const moment = require('moment');

const config = require('../config');
const IgoDust = require('igo-dust');

//
module.exports.init = (app) => {
  app.engine('dust', IgoDust.engine);
  app.set('view engine', 'dust');
  app.set('views', config.projectRoot + '/views'); 

  // configure with express app
  IgoDust.configure(app);

  // init helpers
  initHelpers();
};

//
module.exports.middleware = (req, res, next) => {
  res.locals.t = (params) => req.t(params.key, params);

  // override render method to stream response
  if (config.igodust.stream) {
    res.render = (template, locals) => {
      const data = {...res.locals, ...locals};
      res.type('html');
      // TODO: handle ETAgs and status 304
      IgoDust.stream(res, template, data);
      res.end();
    };
  }

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
  const helpers = require(config.projectRoot + '/app/helpers');
  helpers.init(IgoDust);
};
