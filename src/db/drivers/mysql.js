
const _       = require('lodash');
const mysql   = require('mysql2/promise');
const OPTIONS = [
  'host', 'port', 'user', 'password', 'database',
  'charset', 'debug', 'connectionLimit'
];


// create pool
module.exports.createPool = (dbconfig) => {
  return mysql.createPool(_.pick(dbconfig, OPTIONS));
};

// get connection
module.exports.getConnection = async (pool) => {
  return await pool.getConnection();
};

// query
module.exports.query = async (connection, sql, params) => {
  return await connection.query(sql, params);
};

// release
module.exports.release = (connection) => {
  connection.release();
};

// begin transaction
module.exports.beginTransaction = async (connection) => {
  return await connection.beginTransaction();
};

// commit transaction
module.exports.commit = async (connection) => {
  return await connection.commit();
};

// rollback transaction
module.exports.rollback = async (connection) => {
  return await connection.rollback();
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
  findMigration:  'SELECT `id` from  `__db_migrations` WHERE `file`=? AND `success`=1',
  insertMigration: 'INSERT INTO `__db_migrations` (file, success, err, creation) VALUES(?, ?, ?, ?)',
  esc: '`',
  param: () => '?',
  limit: () => 'LIMIT ?, ? ',
  returning: '',
  insertId: result => result && result.insertId,
  getRows: result => result[0],
  emptyInsert: null,
  in: 'IN',
  notin: 'NOT IN',
  getLock: lock => `SELECT GET_LOCK('${lock}', 0) AS 'lock'`,
  gotLock: res => res && res[0] && res[0].lock > 0,
  releaseLock: lock => `SELECT RELEASE_LOCK('${lock}')`,

  
};