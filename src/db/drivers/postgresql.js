
const { Pool }  = require('pg');


// create pool
module.exports.createPool = (dbconfig) => {
  return new Pool(dbconfig);
};

// get connection
module.exports.getConnection =  async (pool) => {
  return await pool.connect();
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
  return await connection.query('BEGIN');
};

// commit transaction
module.exports.commit = async (connection) => {
  return await connection.query('COMMIT');
};

// rollback transaction
module.exports.rollback = async (connection) => {
  return await connection.query('ROLLBACK');
};

// dialect
module.exports.dialect = {
  createDb: db => `CREATE DATABASE "${db}";`,
  dropDb:   db => `DROP DATABASE IF EXISTS "${db}";`,
  createMigrationsTable: `CREATE TABLE IF NOT EXISTS "__db_migrations"(
    "id" SERIAL,
    "file" VARCHAR(100),
    "success" BOOLEAN,
    "err" VARCHAR(255),
    "creation" TIMESTAMP,
    PRIMARY KEY ("id")
   );`,
  listMigrations:   'SELECT * FROM "__db_migrations" ORDER BY "id" DESC',
  findMigration:    'SELECT "id" from  "__db_migrations" WHERE "file"=$1 AND "success"=TRUE',
  insertMigration:  'INSERT INTO "__db_migrations" (file, success, err, creation) VALUES($1, $2, $3, $4)',
  esc: '"',
  param: i => `$${i}`,
  limit: (i, j) => `LIMIT $${j} OFFSET $${i} `,
  returning: 'RETURNING "id"',
  insertId: result => {
    return result && result[0] && result[0].id;
  },
  getRows: result => result && result.rows,
  emptyInsert: 'DEFAULT VALUES ',
  in: '= ANY',
  notin: '!= ALL',
  getLock: () => 'SELECT pg_try_advisory_lock(123456789);',
  gotLock: res => res && res.rows && res.rows[0] && res.rows[0].pg_try_advisory_lock,
  releaseLock: () => 'SELECT pg_advisory_unlock_all();',

};