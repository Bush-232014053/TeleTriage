const { Pool } = require('pg');
require('dotenv').config();

function buildPoolConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'teletriage',
  };
}

const pool = new Pool(buildPoolConfig());

pool
  .connect()
  .then((client) => {
    console.log('PostgreSQL database connected successfully!');
    client.release();
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
  });

module.exports = pool;
