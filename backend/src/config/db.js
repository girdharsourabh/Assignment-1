const { Pool } = require('pg');

// Database configuration
const dbConfig = process.env.DATABASE_URL 
  ? {
      connectionString: process.env.DATABASE_URL,
      // For some cloud providers like Neon/Supabase, you may need these specific SSL configs:
      ssl: { 
          rejectUnauthorized: false, 
      },
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  : {
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || 'admin123',
      host: process.env.DB_HOST || 'db',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'orderdb',
    };

const pool = new Pool(dbConfig);

// Handle pool errors so they don't crash the serverless function silently
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
