const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.PGUSER || 'admin',
  password: process.env.PGPASSWORD || 'admin123',
  host: process.env.PGHOST || 'db',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'orderdb',
});

module.exports = pool;
