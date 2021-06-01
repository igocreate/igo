
const _           = require('lodash');
const async       = require('async');

const fs          = require('fs');

const config      = require('../src/config');
const db          = require('../src/db/db');
const plugins     = require('../src/plugins');

// db verbs
const verbs   = {

  // igo db migrate
  migrate: function(args, callback) {
    config[config.database].debugsql = false;
    db.migrate(callback);
  },

  // igo db migrations
  migrations: function(args, callback) {
    config[config.database].debugsql = false;
    db.migrations(function(err, migrations) {
      migrations = _.reverse(migrations);
      _.each(migrations, function(migration) {
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
    const stdin     = process.openStdin();
    const database  = config[config.database].database;

    console.log('WARNING: Database will be reset, data will be lost!');
    console.log('Confirm the database name (' + config[config.database].database + '):');
    stdin.addListener('data', function(d) {
      d = d.toString().trim();
      if (d !== database) {
        return callback('Cancelled.');
      }

      config[config.database].debugsql = false;
      config[config.database].database = null;
      db.init();

      const { dialect } = db.database;
      const DROP_DATABASE   = dialect.dropDb(database);
      const CREATE_DATABASE = dialect.createDb(database);

      db.query(DROP_DATABASE, function() {
        db.query(CREATE_DATABASE, function() {
          config[config.database].database = database;
          db.init();
          db.migrate(function() {
            callback();
          });
        });
      });
    });
  },

  reverse: function(args, callback) {
    db.query('show tables', function(err, tables) {
      async.eachSeries(tables, function(table, callback) {
        table = _.values(table)[0];
        if (table === '__db_migrations') {
          return callback();
        }
        const object = _.capitalize(table.substring(0, table.length - 1));
        db.query(`explain ${table}`, function(err, fields) {
          const primary = _.chain(fields).filter({ Key: 'PRI' }).map('Field').join('\', \'');
          let lines = [
            '',
            'const Model   = require(\'igo\').Model;',
            '',
            'const schema = {',
            '  table: \'' + table + '\',',
            '  primary: [ \'' + primary + '\' ],',
            '  columns: ['
          ];
          fields.forEach(function(field) {
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
  var args = argv._;
  config.init();
  db.init();
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
