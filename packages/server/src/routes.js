const config  = require('./config');
const api     = require('./api');
const problem = require('./api/problem');

const routes = require(config.projectRoot + '/app/routes');

//
module.exports.init = function(app) {
  api.init(app);

  routes.init(app);

  api.wire();

  // 404
  app.all(/.*/, (req, res) => {
    if (problem.isApiRequest(req)) {
      return problem.send(res, 404);
    }
    res.status(404).render('errors/404');
  });
};
