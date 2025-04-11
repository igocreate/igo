
const _       = require('lodash');

const fs      = require('fs/promises');
const path    = require('path');

const config  = require('../config');
const logger  = require('../logger');
const plugins = require('../plugins');

//
module.exports.init = async function(db) {
  if (!config.auto_migrate) return;

  try {
    const connection = await db.getConnection();
    const { dialect } = db.driver;
    const lock = db.config.database + '.__db_migrations';
    const getLock = dialect.getLock(lock);
    const res = await db.driver.query(connection, getLock, []);

    if (!dialect.gotLock(res)) {
      // could not get lock, skip migration
      return db.driver.release(connection);
    }
    // got lock, migrate!
    await module.exports.migrate(db);

    const releaseLock = dialect.releaseLock(lock);
    setTimeout(async () => {
      await db.query(releaseLock);
      db.driver.release(connection);
    }, 10000);

  } catch (err) {
    console.error(err);
  }
};


//
module.exports.initmigrations = async function(db) {
  const sql = db.driver.dialect.createMigrationsTable;
  await db.query(sql);
};

//
module.exports.list = async function(db) {
  await module.exports.initmigrations(db);
  const sql = db.driver.dialect.listMigrations;
  return db.query(sql);
};

//
module.exports.migrate = async function(db, rootDir = '.') {

  if (db.config.noMigrations) {
    return;
  }

  const sqldir = `${rootDir}/${db.config.migrations_dir || 'sql'}`;
  let querybuf  = '';

  const executeLine = async (line) => {
    line = line.replace('\r', '').trim();
    if (line.match('^--')) return;
    if (line.match('\\;$')) {
      querybuf += line;
      if (config.mysql.debugsql) logger.info(querybuf);
      await db.query(querybuf);
      querybuf = '';
    } else if (line.length > 0) {
      querybuf += line;
      return;
    } else {
      return;
    }
  };

  const executeFile = async (file) => {
    if (!file.filename.match('[0-9]{8}.*\\.sql$')) {
      return;
    }
    try {
      const sql = db.driver.dialect.findMigration;
      const result = await db.query(sql, [file.filename]);
      if (result && result.length > 0) {
        return 'alreadyplayed';
      }
    } catch (err) {
      logger.error(err);
    }

    try {
      const data = await fs.readFile(file.path);
      const lines = data.toString().split('\n');
      if (config.mysql.debugsql) {
        logger.info('Executing ' + file.path + ': ' + lines.length + ' lines to process');
      }
      for (const line of lines) {
        await executeLine(line);
      }
      const sql = db.driver.dialect.insertMigration;
      const success = 'alreadyplayed' ? 0 : 1;
      logger.info((success ? '✅ ' : '❌ ') + file.filename);
      const err = 'alreadyplayed' ? String('alreadyplayed') : null;

      await db.query(sql, [file.filename, success, err, new Date()]);
    } catch (err) {
      logger.error('SQL error in file %s', file.path);
      logger.error(err);
    }
  }

  let files = [];
  const filenames = await fs.readdir(sqldir)
  _.forEach(filenames, (filename) => {
    files.push({ filename, path: path.join(sqldir, filename) });
  })

  for (const plugin of plugins.list) {
    const filenames = await fs.readdir(plugin.dirname + '/sql');
    _.forEach(filenames, (filename) => {
      files.push({ filename, path: path.join(plugin.dirname, '/sql', filename) });
    })
  }

  files = _.sortBy(files, 'filename');
  await module.exports.initmigrations(db);
  for (const file of files) {
    await executeFile(file);
  }
};