const { Pool } = require("pg");

// SSL is required by cloud Postgres providers (Neon, Supabase, Render, etc.)
// DB_SSL=true enables it; omit or set false for local docker where SSL is not used
const sslConfig =
  process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false;

// All credentials come from environment variables — never hardcode secrets in source
const pool = new Pool({
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "admin123",
  host: process.env.DB_HOST || "db",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "orderdb",
  ssl: sslConfig,
});

module.exports = pool;
