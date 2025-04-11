
const _           = require('lodash');
const fs          = require('fs/promises');

const config      = require('../src/config');
const dbs          = require('../src/db/dbs');
const migrations  = require('../src/db/migrations');
const plugins     = require('../src/plugins');

// db verbs
const verbs   = {

  // igo db migrate
  migrate: async function(args) {
    for (const database of config.databases) {
      const db = dbs[database];
      db.config.debugsql = false;
      if (config.databases.length > 1) {
        console.log(`database: ${db.config.database}`);
      }
      await migrations.migrate(db);
    }
  },

  // igo db migrations
  migrations: async function(args) {
    for (const database of config.databases) {
      const db = dbs[database];
      db.config.debugsql = false;
      if (config.databases.length > 1) {
        console.log(`database: ${db.config.database}`);
      }
      const migrationsList = await migrations.list(db);
      const migrations = _.reverse(migrationsList);

      migrations.forEach((migration) => {
        console.log([
          migration.id,
          (migration.success ? 'OK' : 'KO'),
          migration.file
        ].join('  '));
      });
    }
  },

  // igo db reset
  reset: async function(args) {
    if (config.databases.length > 1 && !args[2]) {
      console.log(`Please select database to reset : igo db reset [${config.databases.join('|')}]`);
      return;
    }

    if (args[2] && config.databases.indexOf(args[2]) < 0) {
      console.log('ERROR: Wrong database name');
      return;
    }

    const db = args[2] ? dbs[args[2]] : dbs.main;
    const database = db.config.database;

    console.log('WARNING: Database will be reset, data will be lost!');
    console.log('Confirm the database name (' + database + '):');
    const stdin = process.openStdin();
    stdin.addListener('data', async function(d) {
      d = d.toString().trim();
      if (d !== database) {
        return;
      }

      db.config.debugsql = false;
      db.config.database = null;
      await db.init();

      const { dialect }     = db.driver;
      const DROP_DATABASE   = dialect.dropDb(database);
      const CREATE_DATABASE = dialect.createDb(database);

      await db.query(DROP_DATABASE);
      await db.query(CREATE_DATABASE);
      db.config.database = database;
      await db.init();
      await migrations.migrate(db);
    });
  },

  reverse: async function(args) {
    const db = dbs.main;
    const tables = await db.query('show tables');
    for (const table of tables) {
      const tableName = _.values(table)[0];
      if (tableName === '__db_migrations') {
        continue;
      }
      const object = _.capitalize(tableName.substring(0, tableName.length - 1));
      const fields = await db.query(`explain ${tableName}`);
      const primary = _.chain(fields).filter({ Key: 'PRI' }).map('Field').join('\', \'');
      let lines = [
        '',
        'const { Model } = require(\'igo\');',
        '',
        'const schema = {',
        '  table: \'' + tableName + '\',',
        '  primary: [ \'' + primary + '\' ],',
        '  columns: ['
      ];
      fields.forEach((field) => {
        lines.push(`    '${field.Field}',`);
      });
      lines = lines.concat([
        '  ],',
        '  associations: () => [',
        '  ], ',
        '  scopes: {',
        '  }',
        '};',
        '', '',
        `class ${object} extends Model(schema) {`,
        '}',
        '', '',
        `module.exports = ${object};`
      ]);

      const file = `./app/models/${object}.js`;
      console.log('wrote ' + file);
      await fs.writeFile(file, lines.join('\n'));
    }
  }
};

// igo db
module.exports = function(argv) {
  
  const args = argv._;

  config.init();
  dbs.init();
  plugins.init();

  if (args.length > 1 && verbs[args[1]]) {
    verbs[args[1]](args)
    console.log('Done.');
    process.exit(0);
  } else {
    console.error('ERROR: Wrong options');
    console.error('Usage: igo db [migrate|migrations|reverse|reset]');
  }
};
