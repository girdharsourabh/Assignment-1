const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || process.env.POSTGRES_USER || 'admin',
  password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'admin123',
  host: process.env.DB_HOST || 'db',
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME || process.env.POSTGRES_DB || 'orderdb',
  max: Number(process.env.DB_MAX_CONNECTIONS || 10),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
});

module.exports = pool;
