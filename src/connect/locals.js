const fs = require('fs');
const path = require('path');
const config = require('../config');
const logger = require('../logger');

let manifest;

const getManifest = () => {
  if (manifest) return manifest;
  if (config.env !== 'production') return null;

  const manifestPath = path.join(config.projectRoot, 'dist', 'manifest.json');
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    return manifest;
  } catch (err) {
    logger.error('manifest.json not found. Run "vite build" for production.');
    return null;
  }
};

const localsMiddleware = (req, res, next) => {
  // Set environment and language
  res.locals.env = config.env;
  res.locals.lang = req.language;

  // Handle assets for Vite
  if (config.env === 'production') {
    const manifest = getManifest();
    const entry = manifest ? manifest['src/js/main.js'] : null;
    
    res.locals.assets = {
      main: {
        js: entry ? `/${entry.file}` : '',
        css: (entry && entry.css) ? `/${entry.css[0]}` : ''
      }
    };
  } else { // Development
    res.locals.assets = {
      main: {
        js: '/src/js/main.js',
        css: null // CSS is injected by JS in dev
      }
    };
    res.locals.viteClient = '<script type="module" src="/@vite/client"></script>';
  }

  next();
};

module.exports = localsMiddleware;