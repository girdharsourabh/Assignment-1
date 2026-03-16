const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const validateOrder = require("../middlewares/validateOrder");

// Get all orders
router.get('/', async (req, res, next) => {
  try {
    
    const result = await pool.query(`
      SELECT 
        o.id,
        o.quantity,
        o.total_amount,
        o.status,
        o.created_at,
        c.name AS customer_name,
        c.email AS customer_email,
        p.name AS product_name,
        p.price AS product_price
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN products p ON o.product_id = p.id
      ORDER BY o.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get single order
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, c.name as customer_name, c.email as customer_email, 
              p.name as product_name, p.price as product_price
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN products p ON o.product_id = p.id
       WHERE o.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create order
router.post('/', validateOrder, async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const { customer_id, product_id, quantity, shipping_address } = req.body;

    const productResult = await client.query(
      "SELECT price, inventory_count FROM products WHERE id = $1 FOR UPDATE",
      [product_id]
    );
    if (productResult.rows.length === 0) {
      throw new Error("Product not found");
    }

    const product = productResult.rows[0];
    if (product.inventory_count < quantity) {
      throw new Error("Insufficient inventory");
    }

    const total_amount = product.price * quantity;
    const orderResult = await client.query(
      `INSERT INTO orders 
      (customer_id, product_id, quantity, total_amount, shipping_address, status)
      VALUES ($1,$2,$3,$4,$5,'pending')
      RETURNING *`,
      [customer_id, product_id, quantity, total_amount, shipping_address]
    );

    await client.query(
      "UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2",
      [quantity, product_id]
    );
    await client.query("COMMIT");

    res.status(201).json(orderResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Cancel order
router.post('/:orderId/cancel', async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderId = parseInt(req.params.orderId, 10);
    if (!orderId) {
      return res.status(400).json({ error: "Invalid order id" });
    }

    
    const orderResult = await client.query(
      "SELECT * FROM orders WHERE id = $1 FOR UPDATE",
      [orderId]
    );
    
    if (orderResult.rows.length === 0) {
      throw new Error("Order not found");
    }

    const order = orderResult.rows[0];
    if (order.status === "shipped" || order.status === "delivered") {
      return res.status(400).json({
        error: "Order cannot be cancelled once shipped"
      });
    }
    if (order.status === "cancelled") {
      return res.status(400).json({
        error: "Order already cancelled"
      });
    }

    await client.query(
      `UPDATE products
       SET inventory_count = inventory_count + $1
       WHERE id = $2`,
      [order.quantity, order.product_id]
    );

    const result = await client.query(
      `UPDATE orders
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [orderId]
    );

    await client.query("COMMIT");

    res.json(result.rows[0]);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Cancel order error:", err);
    next(err);
  } finally {
    client.release();
  }
});

router.get("/init-db", async (req, res, next) => {
  try {
    await pool.query("BEGIN");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NOT NULL,
        inventory_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
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
    `);

    await pool.query(`
      INSERT INTO customers (name, email, phone) VALUES
        ('Aarav Sharma', 'aarav@example.com', '9876543210'),
        ('Priya Patel', 'priya@example.com', '9876543211'),
        ('Rohan Gupta', 'rohan@example.com', '9876543212'),
        ('Sneha Reddy', 'sneha@example.com', '9876543213'),
        ('Vikram Singh', 'vikram@example.com', '9876543214')
        ON CONFLICT (email) DO NOTHING;
      `
    );

    await pool.query(`
      INSERT INTO products (name, description, price, inventory_count) VALUES
        ('Wireless Earbuds', 'Bluetooth 5.0 earbuds with noise cancellation', 2499.00, 50),
        ('USB-C Hub', '7-in-1 USB-C hub with HDMI, USB 3.0, SD card', 1899.00, 30),
        ('Mechanical Keyboard', 'RGB mechanical keyboard with Cherry MX switches', 4599.00, 20),
        ('Laptop Stand', 'Adjustable aluminum laptop stand', 1299.00, 40),
        ('Webcam HD', '1080p HD webcam with built-in microphone', 3499.00, 15)
        ON CONFLICT DO NOTHING;
        `
      );

    await pool.query(`
      INSERT INTO orders (customer_id, product_id, quantity, total_amount, status, shipping_address) VALUES
        (1, 1, 2, 4998.00, 'delivered', '42 MG Road, Bangalore'),
        (2, 3, 1, 4599.00, 'shipped', '15 Park Street, Kolkata'),
        (3, 2, 3, 5697.00, 'pending', '88 Connaught Place, Delhi'),
        (1, 5, 1, 3499.00, 'pending', '42 MG Road, Bangalore'),
        (4, 4, 2, 2598.00, 'confirmed', '23 Jubilee Hills, Hyderabad'),
        (5, 1, 1, 2499.00, 'shipped', '7 Marine Drive, Mumbai'),
        (2, 2, 1, 1899.00, 'delivered', '15 Park Street, Kolkata'),
        (3, 3, 1, 4599.00, 'confirmed', '88 Connaught Place, Delhi');
    `
    );

    await pool.query("COMMIT");

    res.json({ success: true, message: "Database initialized" });

  } catch (err) {
    await pool.query("ROLLBACK");
    next(err);
  }
});

module.exports = router;