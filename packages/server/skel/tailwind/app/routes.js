// Define your Express routes here
// Check http://expressjs.com/fr/guide/routing.html for documentation

const { signal }          = require('igo');
const WelcomeController   = require('./controllers/WelcomeController');

//
module.exports.init = (app) => {

  // @igo/signal routes
  app.use(signal.middleware);
  app.get('/__signal/templates', signal.templates);

  app.get('/', WelcomeController.index);
};
