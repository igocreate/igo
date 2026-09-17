const config  = require('./config');
const api     = require('./api');
const problem = require('./api/problem');
const { isApiRequest } = require('./api/request');

const routes = require(config.projectRoot + '/app/routes');

//
module.exports.init = function(app) {
  // order matters: init() adds app.api(), which the project calls in its own
  // routes, and wire() applies the schemas of the handlers it just declared.
  api.init(app);

  routes.init(app);

  api.wire();

  // 404
  app.all(/.*/, (req, res) => {
    if (isApiRequest(req)) {
      return problem.send(res, 404);
    }
    res.status(404).render('errors/404');
  });
};
