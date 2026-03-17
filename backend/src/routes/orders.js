const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all orders
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, c.name as customer_name, c.email as customer_email,
              p.name as product_name, p.price as product_price
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

    const parsedCustomerId = Number(customer_id);
    const parsedProductId = Number(product_id);
    const parsedQuantity = Number(quantity);
    const trimmedAddress = typeof shipping_address === 'string' ? shipping_address.trim() : '';

    if (!Number.isInteger(parsedCustomerId) || parsedCustomerId <= 0) {
      return res.status(400).json({ error: 'customer_id must be a positive integer' });
    }
    if (!Number.isInteger(parsedProductId) || parsedProductId <= 0) {
      return res.status(400).json({ error: 'product_id must be a positive integer' });
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ error: 'quantity must be a positive integer' });
    }
    if (!trimmedAddress) {
      return res.status(400).json({ error: 'shipping_address is required' });
    }

    await client.query('BEGIN');

    const customerResult = await client.query('SELECT id FROM customers WHERE id = $1', [parsedCustomerId]);
    if (customerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Customer not found' });
    }

    const productResult = await client.query(
      'SELECT id, price, inventory_count FROM products WHERE id = $1 FOR UPDATE',
      [parsedProductId]
    );
    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productResult.rows[0];
    if (Number(product.inventory_count) < parsedQuantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    const total_amount = Number(product.price) * parsedQuantity;

    await client.query(
      'UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2',
      [parsedQuantity, parsedProductId]
    );

    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, product_id, quantity, total_amount, shipping_address, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [parsedCustomerId, parsedProductId, parsedQuantity, total_amount, trimmedAddress]
    );

    await client.query('COMMIT');
    res.status(201).json(orderResult.rows[0]);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // ignore rollback errors
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

    const allowedStatuses = new Set(['pending', 'confirmed', 'shipped', 'delivered']);
    if (typeof status !== 'string' || !allowedStatuses.has(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

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

// Cancel an order
router.post('/:id/cancel', async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      'SELECT id, status, product_id, quantity FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    const cancellableStatuses = new Set(['pending', 'confirmed']);
    if (!cancellableStatuses.has(order.status)) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: `Order cannot be cancelled from status "${order.status}"` });
    }

    const restoreResult = await client.query(
      'UPDATE products SET inventory_count = inventory_count + $1 WHERE id = $2',
      [Number(order.quantity), Number(order.product_id)]
    );
    if (restoreResult.rowCount === 0) {
      throw new Error('Failed to restore inventory (product missing)');
    }

    const updateResult = await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      ['cancelled', orderId]
    );

    await client.query('COMMIT');
    res.json(updateResult.rows[0]);
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // ignore rollback errors
    }
    res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    client.release();
  }
});

module.exports = router;
