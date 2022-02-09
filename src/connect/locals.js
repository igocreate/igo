
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

  res.locals.session  = req.session;
  res.locals.assets   = getWebpackAssets();

  // verify locale whitelist
  if (config.i18n.whitelist.indexOf(req.locale) > -1) {
    res.locals.lang = req.locale;
    return next();
  }

  // fix locale (not in whitelist)
  let lang = req.locale.substring(0, 2);
  if (config.i18n.whitelist.indexOf(lang) < 0) {
    lang = config.i18n.fallbackLng[0];
  }
  req.i18n.changeLanguage(lang);
  req.locale      = lang;
  req.language    = lang;
  res.locals.lang = lang;

  next();
};
