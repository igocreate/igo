
const Counter = require('../../js/components/Counter');

//
module.exports.index = (req, res) => {

  res.locals.signal_props = { count: 42 };


  // SSR components
  res.locals.signal_components = [ Counter ];

  res.render('welcome/index');
};
