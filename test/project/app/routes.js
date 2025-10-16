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

  // Flash tests
  app.post('/flash/small', (req, res) => {
    req.flash('message', 'Small message');
    req.flash('data', { id: 1, name: 'test' });
    res.json({ ok: true, session: req.session.flash });
  });

  app.post('/flash/large', (req, res) => {
    // Create object > 1KB to trigger auto-switch to cacheflash
    const largeData = { items: Array(200).fill({ id: 1, name: 'test item with some text' }) };
    req.flash('data', largeData);
    res.json({
      ok: true,
      usedCacheflash: req.session._igo_cacheflash.length > 0,
      sessionSize: JSON.stringify(req.session.flash).length
    });
  });

  app.post('/cacheflash', (req, res) => {
    const largeData = { items: Array(300).fill({ id: 1, name: 'test item' }) };
    req.cacheflash('bigdata', largeData);
    res.json({
      ok: true,
      cacheflashCount: req.session._igo_cacheflash.length
    });
  });

  app.get('/flash/read', (req, res) => {
    res.json({ flash: res.locals.flash });
  });

};
