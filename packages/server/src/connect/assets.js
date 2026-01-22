const fs      = require('fs');
const path    = require('path');
const config  = require('../config');
const logger  = require('../logger');

let scriptsCache = null;
let stylesCache = null;

const buildAssets = () => {
  const scripts = {};
  const styles = {};

  if (config.env === 'production') {
    // Production: read manifest.json
    try {
      const manifest  = require(path.join(config.projectRoot, 'dist/manifest.json'));

      for (const [key, entry] of Object.entries(manifest)) {
        if (entry.isEntry) {
          const entryName = entry.name;
          scripts[entryName] = `<script type="module" src="/${entry.file}"></script>`;

          if (entry.css?.length) {
            styles[entryName] = entry.css
              .map(css => `<link rel="stylesheet" href="/${css}">`)
              .join('\n');
          }
        }
      }
    } catch (err) {
      logger.error('manifest.json not found. Run "npm run build" for production.');
    }
  } else if (config.env === 'dev') {
    // Development: read vite.config.js
    const viteConf = require(path.join(config.projectRoot, 'vite.config.js'));

    const viteClientScript = '<script type="module" src="/@vite/client"></script>';
    const input = viteConf?.build?.rollupOptions?.input;

    for (const [entryName, entryPath] of Object.entries(input)) {
      // Check JS entry exists
      if (!fs.existsSync(path.join(config.projectRoot, entryPath))) {
        logger.warn(`Vite entry not found: ${entryPath}`);
      }
      scripts[entryName] = viteClientScript + `<script type="module" src="/${entryPath}"></script>`;

      // Convention: js/index.js → scss/index.scss
      const stylePath = entryPath.replace(/^js\//, 'scss/').replace(/\.js$/, '.scss');
      if (fs.existsSync(path.join(config.projectRoot, stylePath))) {
        styles[entryName] = `<link rel="stylesheet" href="/${stylePath}">`;
      } else {
        logger.warn(`Vite style not found: ${stylePath} (convention: js/*.js → scss/*.scss)`);
      }
    }
  }

  scriptsCache = scripts;
  stylesCache = styles;

};

// Middleware to inject Vite assets into res.locals
module.exports = (req, res, next) => {
  // In production, build once and cache forever
  // In dev, build on each request (for hot reload)
  if (config.env !== 'production' || !scriptsCache) {
    buildAssets();
  }

  res.locals.viteScripts = scriptsCache;
  res.locals.viteStyles  = stylesCache;

  next();
};
