const fs      = require('fs');
const path    = require('path');
const config  = require('../config');
const logger  = require('../logger');

let scriptsCache = null;
let stylesCache = null;

const buildAssets = () => {
  const scripts = [];
  const styles = [];

  if (config.env === 'production') {
    // Production: read manifest.json
    try {
      const manifest  = require(path.join(config.projectRoot, 'dist/manifest.json'));

      for (const [key, entry] of Object.entries(manifest)) {
        if (entry.isEntry) {
          scripts.push(`<script type="module" src="/${entry.file}"></script>`);
          if (entry.css?.[0]) {
            styles.push(`<link rel="stylesheet" href="/${entry.css[0]}">`);
          }
        }
      }
    } catch (err) {
      logger.error('manifest.json not found. Run "npm run build" for production.');
    }
  } else if (config.env === 'dev') {
    // Development: read vite.config.js
    const viteConf = require(path.join(config.projectRoot, 'vite.config.js'));

    scripts.push('<script type="module" src="/@vite/client"></script>');
    const input = viteConf?.build?.rollupOptions?.input;
    for (const entryPath of Object.values(input)) {
      scripts.push(`<script type="module" src="/${entryPath}"></script>`);
    }
  }

  scriptsCache  = scripts.join('\n');
  stylesCache   = styles.join('\n');
};

// Middleware to inject Vite assets into res.locals
module.exports = (req, res, next) => {
  // In production, build once and cache forever
  // In dev, build on each request (for hot reload)
  if (config.env !== 'production' || !scriptsCache) {
    buildAssets();
  }

  res.locals.viteScripts  = scriptsCache;
  res.locals.viteStyles   = stylesCache;

  next();
};
