
const _         = require('lodash');
const { Pool }  = require('pg');


// create pool
module.exports.createPool = (dbconfig) => {
  return new Pool(dbconfig)
};

// get connection
module.exports.getConnection = (pool, callback) => {
  pool.connect((err, client, release) => {
    callback(err, { client, release });
  });
};

// query
module.exports.query = (connection, sql, params, callback) => {
  const { client } = connection;
  client.query(sql, params, callback);
};

// release
module.exports.release = (connection) => {
  connection.release();
};

// begin transaction
module.exports.beginTransaction = (connection, callback) => {
  const { client } = connection;
  client.query('BEGIN', callback);
};

// commit transaction
module.exports.commit = (connection, callback) => {
  const { client } = connection;
  client.query('COMMIT', callback);
};

// rollback transaction
module.exports.rollback = (connection, callback) => {
  const { client } = connection;
  client.query('ROLLBACK', callback);
};

// dialect
module.exports.dialect = {
  createDb: db => `CREATE DATABASE "${db}";`,
  dropDb:   db => `DROP DATABASE IF EXISTS "${db}";`,
  createMigrationsTable: `CREATE TABLE IF NOT EXISTS "__db_migrations"(
    "id" SERIAL,
    "file" VARCHAR(100),
    "success" SMALLINT,
    "err" VARCHAR(255),
    "creation" TIMESTAMP,
    PRIMARY KEY ("id")
   );`,
  listMigrations:   'SELECT * FROM "__db_migrations" ORDER BY "id" DESC',
  findMigration:    'SELECT "id" from  "__db_migrations" WHERE "file"=$1 AND "success"=1',
  insertMigration:  'INSERT INTO "__db_migrations" (file, success, err, creation) VALUES($1, $2, $3, $4)',
  esc: '"',
  param: i => `$${i}`,
  limit: (i, j) => `LIMIT $${j} OFFSET $${i} `,
  returning: 'RETURNING "id"',
  insertId: result => {
    return result && result[0] && result[0].id
  },
  getRows: result => result && result.rows,
  emptyInsert: 'DEFAULT VALUES ',
  in: '= ANY',
  getLock: lock => `SELECT pg_try_advisory_lock(123456789);`,
  gotLock: res => res && res[0] && res[0].pg_try_advisory_lock,
  releaseLock: lock => `SELECT pg_advisory_unlock_all();`,

};