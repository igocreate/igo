
const fs          = require('fs');
const path        = require('path');
const repl        = require('node:repl');

const config      = require('../src/config');
const cache       = require('../src/cache');
const logger      = require('../src/logger');
const utils       = require('../src/utils');
const errorhandler = require('../src/connect/errorhandler');
const db          = require('@igojs/db');

const green = (s) => `\x1b[32m${s}\x1b[0m`;
const dim   = (s) => `\x1b[2m${s}\x1b[0m`;

// Recursively find all .js files in a directory
const findJsFiles = (dir) => {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findJsFiles(fullPath));
    } else if (entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
};

// Discover models from app/models/
const discoverModels = () => {
  const modelsDir = path.resolve('app/models');
  const files = findJsFiles(modelsDir);
  const models = {};
  for (const file of files) {
    try {
      const exported = require(file);
      if (typeof exported === 'function' && exported.schema) {
        models[exported.name] = exported;
      }
    } catch (err) {
      // Skip models that fail to load
    }
  }
  return models;
};

// igo console
module.exports = async () => {

  config.init();

  // Initialize @igojs/db with injected dependencies
  db.init({
    config,
    cache,
    logger,
    utils,
    errorhandler,
  });

  await db.dbs.init();

  if (config.redis) {
    await cache.init();
  }

  // Discover models
  const models = discoverModels();
  const modelNames = Object.keys(models);

  // Welcome message
  console.log(green('igo console'));
  console.log(dim('Available: config, cache, db, dbs, Model, logger'));
  if (modelNames.length > 0) {
    console.log(dim('Models: ' + modelNames.join(', ')));
  }
  console.log('');

  // Start REPL
  const r = repl.start({ prompt: 'igo> ' });

  // Expose objects in REPL context
  r.context.config = config;
  r.context.cache  = cache;
  r.context.db     = db;
  r.context.dbs    = db.dbs;
  r.context.Model  = db.Model;
  r.context.logger = logger;

  // Expose discovered models
  for (const [name, model] of Object.entries(models)) {
    r.context[name] = model;
  }

  r.on('exit', () => {
    process.exit(0);
  });
};
