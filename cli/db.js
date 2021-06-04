
const _           = require('lodash');
const async       = require('async');

const fs          = require('fs');

const config      = require('../src/config');
const dbs          = require('../src/db/dbs');
const migrations  = require('../src/db/migrations');
const plugins     = require('../src/plugins');

// db verbs
const verbs   = {

  // igo db migrate
  migrate: function(args, callback) {
    const db = dbs.main;
    db.config.debugsql = false;
    migrations.migrate(db, callback);
  },

  // igo db migrations
  migrations: function(args, callback) {
    const db = dbs.main;
    db.config.debugsql = false;
    migrations.list(db, (err, migrations) => {
      migrations = _.reverse(migrations);
      _.each(migrations, (migration) => {
        console.log([
          migration.id,
          (migration.success ? 'OK' : 'KO'),
          migration.file
        ].join('  '));
      });
      callback(err);
    });
  },

  // igo db reset
  reset: function(args, callback) {
    const db = dbs.main;
    const database  = db.config.database;
    
    console.log('WARNING: Database will be reset, data will be lost!');
    console.log('Confirm the database name (' + database + '):');
    const stdin = process.openStdin();
    stdin.addListener('data', function(d) {
      d = d.toString().trim();
      if (d !== database) {
        return callback('Cancelled.');
      }

      db.config.debugsql = false;
      db.config.database = null;
      db.init();

      const { dialect }     = db.driver;
      const DROP_DATABASE   = dialect.dropDb(database);
      const CREATE_DATABASE = dialect.createDb(database);

      db.query(DROP_DATABASE, () => {
        db.query(CREATE_DATABASE, () => {
          db.config.database = database;
          db.init();
          migrations.migrate(db, callback);
        });
      });
    });
  },

  reverse: function(args, callback) {
    const db = dbs.main;
    db.query('show tables', function(err, tables) {
      async.eachSeries(tables, function(table, callback) {
        table = _.values(table)[0];
        if (table === '__db_migrations') {
          return callback();
        }
        const object = _.capitalize(table.substring(0, table.length - 1));
        db.query(`explain ${table}`, (err, fields) => {
          const primary = _.chain(fields).filter({ Key: 'PRI' }).map('Field').join('\', \'');
          let lines = [
            '',
            'const { Model } = require(\'igo\');',
            '',
            'const schema = {',
            '  table: \'' + table + '\',',
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
            `}`, '', '',
            `module.exports = ${object};`
          ]);

          const file = `./app/models/${object}.js`;
          console.log('wrote ' + file);
          fs.writeFile(file, lines.join('\n'), callback);
        });
      }, callback);
    });
  }

};

// igo db
module.exports = function(argv) {
  
  const args = argv._;

  config.init();
  dbs.init();
  plugins.init();

  if (args.length > 1 && verbs[args[1]]) {
    verbs[args[1]](args, function(err) {
      console.log(err || 'Done.');
      process.exit(0);
    });
  } else {
    console.error('ERROR: Wrong options');
    console.error('Usage: igo db [migrate|migrations|reverse|reset]')
  }

};
