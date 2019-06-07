
const routes = require(process.cwd() + '/app/routes');

//
module.exports.init = function(app) {
  routes.init(app);

  // 404
  app.all('*', (req, res) => {
    res.status(404).render('errors/404');
  });
};
