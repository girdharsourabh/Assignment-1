const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: 'parthsharma',
  password: '',
  host: 'localhost',
  port: 5432,
  database: 'orderdb',
});

module.exports = pool;
