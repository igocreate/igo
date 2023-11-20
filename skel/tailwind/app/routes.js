// Define your Express routes here
// Check http://expressjs.com/fr/guide/routing.html for documentation

const WelcomeController   = require('./controllers/WelcomeController');

//
module.exports.init = (app) => {
  app.get('/', WelcomeController.index);
};
