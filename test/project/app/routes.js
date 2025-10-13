/* eslint-disable no-undef */



//
module.exports.init = function(app) {

  app.get('/', (req, res) => {
    return res.send('Hello Igo');
  });

  //
  app.get('/error', (req, res) => {
    missingfunction();
    res.send('ok');
  });

  //
  app.get('/asyncerror', (req, res) => {
    process.nextTick(() => {
      missingfunction();
      res.send('ok');
    });
  });

  // 
  app.get('/template', (req, res) => {
    res.render('template');
  });

  //
  app.get('/missingtemplate', (req, res) => {
    res.render('missingtemplate');
  });

  // Test promise rejection
  app.get('/promise-rejection', (req, res) => {
    // Create an unhandled promise rejection
    Promise.reject(new Error('Test unhandled rejection'));
    // Don't wait for the promise, send response
    res.send('ok');
  });

  // Test echo for JSON parsing
  app.post('/echo', (req, res) => {
    res.json(req.body);
  });

};
