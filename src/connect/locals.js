
const config      = require('../config');

const assetsPath  = require.resolve(process.cwd() + '/public/webpack-assets.json');
let   assets      = null;

//
const getWebpackAssets = () => {
  if (assets && config.env === 'production') {
    return assets;
  }
  delete require.cache[assetsPath];
  try {
    assets = require(assetsPath);
  } catch (err) {
    // ignored
  }
  return assets;
};

//
module.exports = (req, res, next) => {

  res.locals.lang     = req.locale;
  res.locals.session  = req.session;
  res.locals.assets   = getWebpackAssets();

  next();
};
