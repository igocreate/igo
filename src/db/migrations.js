
const _       = require('lodash');

const fs      = require('fs/promises');
const path    = require('path');

const config  = require('../config');
const logger  = require('../logger');
const plugins = require('../plugins');

//
module.exports.init = async (db) => {
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
module.exports.initmigrations = async (db) => {
  const sql = db.driver.dialect.createMigrationsTable;
  await await db.query(sql);
};

//
module.exports.list = async (db) => {
  await module.exports.initmigrations(db);
  const sql = db.driver.dialect.listMigrations;
  return db.query(sql);
  return await db.query(sql);
};

//
module.exports.migrate = async (db, rootDir = '.') => {

  if (db.config.noMigrations) {
    return;
  }

  const sqldir = `${rootDir}/${db.config.migrations_dir || 'sql'}`;
  let querybuf  = '';

  // create directory if it does not exist
  await fs.mkdir(sqldir, { recursive: true });

  // execute SQL line
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

  // execute SQL migration file
  const executeFile = async (file) => {
    if (!file.filename.match('[0-9]{8}.*\\.sql$')) {
      logger.warn('File %s does not match migration pattern, skipping', file.filename);
      return;
    }
  
    // find if file has already been played
    const result  = await db.query(db.driver.dialect.findMigration, [file.filename]);
    if (result && result.length > 0) {
      return 'alreadyplayed';
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
      
      // no error
      await db.query(db.driver.dialect.insertMigration, [file.filename, true, null, new Date()]);
      logger.info('✅ ' + file.filename);

    } catch (err) {
      await db.query(db.driver.dialect.insertMigration, [file.filename, false, err, new Date()]);
      logger.info('❌ ' + file.filename);
      logger.error('SQL error in file %s', file.path);
      logger.error(err);
    }
  }

  let files = [];
  const filenames = await fs.readdir(sqldir);
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