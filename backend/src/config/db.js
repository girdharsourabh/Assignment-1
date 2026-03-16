const { Pool } = require('pg');

// FIX: Read credentials from environment variables instead of hardcoding them.
// Values come from the .env file loaded by docker-compose (env_file: .env).
// For local development outside Docker, copy .env.example to .env and fill in values.
const pool = new Pool({
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host:     process.env.POSTGRES_HOST || 'db',
  port:     parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB,
});

module.exports = pool;
