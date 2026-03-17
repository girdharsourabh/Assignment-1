const { Pool } = require('pg');
require('dotenv').config();  // ✅ .env file load karo

console.log('Database Config:', {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'orderdb',
  user: process.env.DB_USER || 'admin'
});

const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  host: process.env.DB_HOST || 'localhost',  // ✅ 'db' ki jagah 'localhost'
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'orderdb',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Trying to connect with:', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'orderdb',
      user: process.env.DB_USER || 'admin'
    });
  } else {
    console.log('✅ Database connected successfully');
    done();
  }
});

module.exports = pool;