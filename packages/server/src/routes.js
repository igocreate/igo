const config = require('./config');

const routes = require(config.projectRoot + '/app/routes');

//
module.exports.init = function(app) {
  routes.init(app);

  // 404 - catch all unmatched routes (more efficient than regex)
  app.use((req, res) => {
    res.status(404).render('errors/404');
  });
};
