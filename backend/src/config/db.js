const { Pool } = require('pg');

// Database configuration
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: {
          rejectUnauthorized: false,
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

const initDb = async () => {
  try {
    // Check if tables exist by querying for the 'customers' table
    const res = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'customers'
      );
    `);
    
    if (!res.rows[0].exists) {
      console.log('Database tables not found. Initializing schema...');
      // Minimal schema creation for core functionality
      await pool.query(`
        CREATE TABLE IF NOT EXISTS customers (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(150) UNIQUE NOT NULL,
            phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            price DECIMAL(10, 2) NOT NULL,
            inventory_count INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER REFERENCES customers(id),
            product_id INTEGER REFERENCES products(id),
            quantity INTEGER NOT NULL,
            total_amount DECIMAL(10, 2) NOT NULL,
            status VARCHAR(20) DEFAULT 'pending',
            shipping_address TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );

        -- Seed minimal products if table is empty
        INSERT INTO products (name, description, price, inventory_count)
        SELECT 'Standard Product', 'Auto-generated product', 100.00, 100
        WHERE NOT EXISTS (SELECT 1 FROM products);
      `);
      console.log('Database initialized successfully.');
    }
  } catch (err) {
    console.error('Error initializing database:', err);
  }
};

module.exports = { pool, initDb };
