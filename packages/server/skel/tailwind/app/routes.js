// Define your Express routes here
// Check http://expressjs.com/fr/guide/routing.html for documentation

const component           = require('@igojs/component');
const WelcomeController   = require('./controllers/WelcomeController');

//
module.exports.init = (app) => {

  // @igojs/component routes
  app.use(component.middleware);
  app.get('/__component/templates', component.templates);
  app.get('/__component/component', component.component);

  app.get('/', WelcomeController.index);
};
