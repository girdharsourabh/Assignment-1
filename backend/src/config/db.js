const { Pool } = require('pg');

// Database configuration
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false, // Required for many managed databases like Render
        },
      }
    : {
        user: process.env.DB_USER || 'admin',
        password: process.env.DB_PASSWORD || 'admin123',
        host: process.env.DB_HOST || 'db',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'orderdb',
    }
);

module.exports = pool;
