

const _           = require('lodash');

const Db          = require('./Db');
const config      = require('../config');
const migrations  = require('./migrations');


// init databases connections
module.exports.init = () => {
  
  _.each(config.databases, (database) => {
    const db = new Db(database);
    db.init();
    module.exports[database] = db;
  });
  // main is first database
  module.exports.main = module.exports[config.databases[0]];
  migrations.init(module.exports.main);

};