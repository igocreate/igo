const _       = require('lodash');
const config  = require('../config');

const assetsPath  = process.cwd() + '/webpack-assets.json';
let   assets      = null;

const DEV_SERVER  = 'http://localhost:9000';
//
const getWebpackAssets = () => {
  if (assets && config.env === 'production') {
    return assets;
  }

  try {
    const resolved = require.resolve(assetsPath);
    delete require.cache[resolved];
    assets = require(resolved);

    if (config.env === 'dev') {
      _.each(assets, (entry) => {
        _.each(entry, (url, key) => {
          if (_.isString(url)) {
            entry[key] = DEV_SERVER + url;
          }
        });
      });
    }

  } catch (err) {
    // ignored
  }
  return assets;
};

// Middleware to inject webpack assets into res.locals
module.exports = (req, res, next) => {
  res.locals.assets = getWebpackAssets();
  next();
};
