const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all orders
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*,
              COALESCE(c.name, 'Unknown') AS customer_name,
              COALESCE(c.email, '') AS customer_email,
              COALESCE(p.name, 'Unknown') AS product_name,
              COALESCE(p.price, 0) AS product_price
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN products p ON o.product_id = p.id
       ORDER BY o.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
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
router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const { customer_id, product_id, quantity, shipping_address } = req.body;
    const parsedQuantity = Number(quantity);

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    await client.query('BEGIN');

    // Check inventory
    const productResult = await client.query(
      'SELECT id, price, inventory_count FROM products WHERE id = $1 FOR UPDATE',
      [product_id]
    );
    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productResult.rows[0];

    if (product.inventory_count < parsedQuantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    const total_amount = Number(product.price) * parsedQuantity;

    await client.query(
      'UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2',
      [parsedQuantity, product_id]
    );

    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, product_id, quantity, total_amount, shipping_address, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [customer_id, product_id, parsedQuantity, total_amount, shipping_address]
    );

    await client.query('COMMIT');

    res.json(orderResult.rows[0]);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // Ignore rollback errors and return the original failure.
    }

    res.status(500).json({ error: 'Failed to create order' });
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
router.patch('/:id/cancel', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (!['pending', 'confirmed'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Only pending or confirmed orders can be cancelled' });
    }

    const productResult = await client.query(
      'SELECT id FROM products WHERE id = $1 FOR UPDATE',
      [order.product_id]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    await client.query(
      'UPDATE products SET inventory_count = inventory_count + $1 WHERE id = $2',
      [order.quantity, order.product_id]
    );

    const cancelledOrderResult = await client.query(
      `UPDATE orders
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [order.id]
    );

    await client.query('COMMIT');

    res.json(cancelledOrderResult.rows[0]);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      // Ignore rollback errors and return the original failure.
    }

    res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    client.release();
  }
});

module.exports = router;
