
const config      = require('../config');

const assetsPath  = process.cwd() + '/public/webpack-assets.json';
let   assets      = null;

//
const getWebpackAssets = () => {
  if (assets && config.env === 'production') {
    return assets;
  }

  try {
    const resolved = require.resolve(assetsPath);
    delete require.cache[resolved];
    assets = require(resolved);
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
