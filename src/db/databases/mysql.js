
const mysql   = require('mysql');


const config  = require('../../config');



// create pool
module.exports.createPool = () => {
  return mysql.createPool(config.mysql);
};

// get connection
module.exports.getConnection = (pool, callback) => {
  pool.getConnection(callback);
};

// query
module.exports.query = (connection, sql, params, callback) => {
  connection.query(sql, params, callback);
};

// release
module.exports.release = (connection) => {
  connection.release();
};

// begin transaction
module.exports.beginTransaction = (connection, callback) => {
  connection.beginTransaction(callback);
};

// commit transaction
module.exports.commit = (connection, callback) => {
  connection.commit(callback);
};

// rollback transaction
module.exports.rollback = (connection, callback) => {
  connection.rollback(callback);
};

// dialect
module.exports.dialect = {
  createDb: db => `CREATE DATABASE \`${db}\`;`,
  dropDb:   db => `DROP DATABASE IF EXISTS \`${db}\`;`,
  createMigrationsTable: `CREATE TABLE IF NOT EXISTS \`__db_migrations\`(
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`file\` VARCHAR(100),
    \`success\` TINYINT(1),
    \`err\` VARCHAR(255),
    \`creation\` DATETIME,
    PRIMARY KEY (\`id\`)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8;`,
  listMigrations: 'SELECT * FROM `__db_migrations` ORDER BY `id` DESC',
  findMigration:  'SELECT id from  `__db_migrations` WHERE `file`=? AND `success`=1',
  insertMigration: 'INSERT INTO \`__db_migrations\` (file, success, err, creation) VALUES(?, ?, ?, ?)',
  esc: '`',
  param: i => '?',
  limit: (i, j) => 'LIMIT ?, ? ',
  returning: '',
  insertId: result => result && result.insertId,
  getRows: result => result,
  emptyInsert: null,
  in: 'IN',

  
};