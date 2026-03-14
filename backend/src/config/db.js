const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'admin',
  password: 'admin123',
  host: 'db',
  port: 5432,
  database: 'orderdb',
});

module.exports = pool;
