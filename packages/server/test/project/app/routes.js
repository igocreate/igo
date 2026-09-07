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
    const largeData = { items: Array(200).fill({ id: 1, name: 'test item with some text' }) };
    req.flash('data', largeData);
    res.json({
      ok: true,
      usedCacheflash: req.session._igo_cacheflash.length > 0,
      sessionFlash: req.session.flash
    });
  });

  app.post('/cacheflash', (req, res) => {
    const largeData = { items: Array(300).fill({ id: 1, name: 'test item' }) };
    req.cacheflash('bigdata', largeData);
    res.json({
      ok: true,
      cacheflashCount: req.session._igo_cacheflash.length,
      sessionFlash: req.session.flash
    });
  });

  app.post('/flash/cyclic', async (req, res) => {
    const cyclic = { id: 1 };
    cyclic.self = cyclic;
    await req.flash('data', cyclic);
    res.json({
      ok: true,
      cacheflashCount: req.session._igo_cacheflash.length,
      sessionFlash: req.session.flash
    });
  });

  // the cycle cannot be sent back as JSON: report what survived instead
  app.get('/flash/read/cyclic', (req, res) => {
    const data = res.locals.flash.data;
    res.json({
      loaded: !!data,
      id: data && data.id,
      cycle: !!data && data.self === data
    });
  });

  app.get('/flash/read', (req, res) => {
    res.json({ flash: res.locals.flash });
  });

  app.api('/books', require('./api/books/books.routes'));

};
