
const _       = require('lodash');

const fs      = require('fs/promises');
const path    = require('path');

const dependencies = require('./dependencies');

//
module.exports.init = async (db) => {
  const { config } = dependencies;
  if (!config.auto_migrate) return;

  const { connection } = await db.getConnection();
  const { dialect }    = db.driver;
  const lock           = db.config.database + '.__db_migrations';
  let   gotLock        = false;

  try {
    const res = await db.driver.query(connection, dialect.getLock(lock), []);
    gotLock   = dialect.gotLock(res);
    if (gotLock) {
      await module.exports.migrate(db);
    }
  } catch (err) {
    console.error(err);
  } finally {
    if (!gotLock) {
      // could not get lock (another instance is migrating), skip migration
      db.driver.release(connection);
    } else {
      // hold the lock for 10s so other instances booting concurrently skip their migration
      setTimeout(async () => {
        try {
          await db.driver.query(connection, dialect.releaseLock(lock));
        } catch (err) {
          console.error(err);
        }
        db.driver.release(connection);
      }, 10000);
    }
  }
};


//
module.exports.initmigrations = async (db) => {
  const sql = db.driver.dialect.createMigrationsTable;
  await db.query(sql);
};

//
module.exports.list = async (db) => {
  await module.exports.initmigrations(db);
  const sql = db.driver.dialect.listMigrations;
  return await db.query(sql);
};

//
module.exports.migrate = async (db, rootDir = '.') => {
  const { config, logger } = dependencies;

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
      if (config.mysql && config.mysql.debugsql) logger.info(querybuf);
      await db.query(querybuf);
      querybuf = '';
    } else if (line.length > 0) {
      querybuf += line + ' ';
      return;
    } else {
      return;
    }
  };

  // execute SQL migration file
  const executeFile = async (file) => {
    // Skip hidden files silently (like .gitkeep)
    if (file.filename.startsWith('.')) {
      return;
    }

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
      if (config.mysql && config.mysql.debugsql) {
        logger.info('Executing ' + file.path + ': ' + lines.length + ' lines to process');
      }
      for (const line of lines) {
        await executeLine(line);
      }

      // no error
      await db.query(db.driver.dialect.insertMigration, [file.filename, true, null, new Date()]);
      logger.info('✅ ' + file.filename);

    } catch (err) {
      await db.query(db.driver.dialect.insertMigration, [file.filename, false, String(err), new Date()]);
      logger.info('❌ ' + file.filename);
      logger.error('SQL error in file %s', file.path);
      throw err;
    }
  };

  let files = [];
  const filenames = await fs.readdir(sqldir);
  _.forEach(filenames, (filename) => {
    files.push({ filename, path: path.join(sqldir, filename) });
  });

  files = _.sortBy(files, 'filename');
  await module.exports.initmigrations(db);
  try {
    for (const file of files) {
      await executeFile(file);
    }
  } catch (err) {
    logger.error(err);
  }
};
