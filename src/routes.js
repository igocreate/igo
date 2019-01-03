
const routes = require(process.cwd() + '/app/routes');

//
module.exports.init = function(app) {
  routes.init(app);
};
