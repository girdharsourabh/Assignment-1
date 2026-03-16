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

module.exports = router;