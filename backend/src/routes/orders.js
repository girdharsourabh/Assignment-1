const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all orders
  // Fixed: N+1 query - fetch all order, customer and product details in one query
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.*,
        c.name as customer_name,
        c.email as customer_email,
        p.name as product_name,
        p.price as product_price
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN products p ON o.product_id = p.id
      ORDER BY o.created_at DESC
    `);

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
// Fixed: use transaction so inventory check, order creation and inventory update happen safely
router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const { customer_id, product_id, quantity, shipping_address } = req.body;
    const parsedQuantity = Number(quantity);
    const trimmedAddress = shipping_address ? shipping_address.trim() : '';

    if (!customer_id || !product_id || quantity === undefined || quantity === null || !shipping_address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be greater than 0' });
    }

    if (!trimmedAddress) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    await client.query('BEGIN');

    const customerResult = await client.query(
      'SELECT id FROM customers WHERE id = $1',
      [customer_id]
    );

    if (customerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Customer not found' });
    }

    const productResult = await client.query(
      'SELECT * FROM products WHERE id = $1 FOR UPDATE',
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

    const total_amount = product.price * parsedQuantity;

    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, product_id, quantity, total_amount, shipping_address, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [customer_id, product_id, parsedQuantity, total_amount, trimmedAddress]
    );

    await client.query(
      'UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2',
      [parsedQuantity, product_id]
    );

    await client.query('COMMIT');

    res.status(201).json(orderResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (status === 'cancelled') {
      return res.status(400).json({ error: 'Use cancel endpoint to cancel an order' });
    }

    const currentOrder = await pool.query(
      'SELECT id, status FROM orders WHERE id = $1',
      [req.params.id]
    );

    if (currentOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentStatus = currentOrder.rows[0].status;

    const allowedTransitions = {
      pending: ['confirmed'],
      confirmed: ['shipped'],
      shipped: ['delivered'],
      delivered: [],
      cancelled: [],
    };

    if (!allowedTransitions[currentStatus].includes(status)) {
      return res.status(400).json({
        error: `Cannot change status from ${currentStatus} to ${status}`,
      });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

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

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Only pending or confirmed orders can be cancelled',
      });
    }

    await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['cancelled', req.params.id]
    );

    await client.query(
      'UPDATE products SET inventory_count = inventory_count + $1 WHERE id = $2',
      [order.quantity, order.product_id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Order cancelled successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    client.release();
  }
});

module.exports = router;
