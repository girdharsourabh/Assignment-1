
// require('dotenv').config();
// const { Pool } = require('pg');

// // Database configuration

// const pool = new Pool({
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   host: process.env.DB_HOST,
//   port: process.env.DB_PORT,
//   database: process.env.DB_NAME,
// });

// // Test DB connection and log result
// pool.connect()
//   .then(client => {
//     console.log('Database connected successfully');
//     client.release();
//   })
//   .catch(err => {
//     console.error('Database connection error:', err.message);
//   });

// module.exports = pool;


require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test DB connection
pool.connect()
  .then(client => {
    console.log('Database connected successfully');
    client.release();
  })
  .catch(err => {
    console.error('Database connection error:', err.message);
  });

module.exports = pool;