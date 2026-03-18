const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'orderdb',
  ssl: process.env.DB_HOST ? { rejectUnauthorized: false } : false,
});

module.exports = pool;