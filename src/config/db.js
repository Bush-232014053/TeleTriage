const { Pool } = require('pg');
require('dotenv').config();

function buildPoolConfig() {
  const url = process.env.DATABASE_URL;
  const placeholder = /your_.*_here|changeme|replace_me/i;
  if (url && !placeholder.test(url)) {
    return {
      connectionString: url,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    };
  }

  return {
    host: process.env.DB_HOST || process.env.PGHOST || 'localhost',
    port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
    user: process.env.DB_USER || process.env.PGUSER || 'postgres',
    password: process.env.DB_PASSWORD || process.env.PGPASSWORD || 'postgres',
    database: process.env.DB_NAME || process.env.PGDATABASE || 'teletriage',
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
