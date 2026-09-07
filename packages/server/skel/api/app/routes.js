// Define your routes here
// Check http://expressjs.com/en/guide/routing.html for documentation

//
module.exports.init = (app) => {

  // mounted under config.api.prefix -> /api/books
  app.api('/books', require('./api/books/books.routes'));

  app.get('/', (req, res) => {
    res.json({ name: '{project.name}', status: 'running' });
  });
};
