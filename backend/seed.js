const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config();

if (!process.env.DATABASE_URL) {
  console.log('No DATABASE_URL found in .env file in backend. Please add it first!');
  process.exit(1);
}

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
};

const pool = new Pool(dbConfig);
const initSql = fs.readFileSync('../db/init.sql', 'utf8');

pool.query(initSql)
  .then(() => {
    console.log('Successfully seeded Neon database from init.sql!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error executing init.sql:', err);
    process.exit(1);
  });
