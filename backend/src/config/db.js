const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  host: process.env.DB_HOST || 'db',
  port: Number.parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'orderdb',
  max: Number.parseInt(process.env.DB_POOL_MAX || '10', 10),
  idleTimeoutMillis: Number.parseInt(process.env.DB_IDLE_TIMEOUT_MS || '30000', 10),
  connectionTimeoutMillis: Number.parseInt(process.env.DB_CONN_TIMEOUT_MS || '5000', 10),
});

module.exports = pool;
