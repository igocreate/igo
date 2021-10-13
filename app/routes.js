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
  
};
