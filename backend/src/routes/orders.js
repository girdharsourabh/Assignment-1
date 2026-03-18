const express = require('express');
const router = express.Router();
const pool = require('../config/db');

function parsePositiveInt(value) {
  const num = Number(value);
  return Number.isInteger(num) && num > 0 ? num : null;
}

// Get all orders
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.*,
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
    console.error('Failed to fetch orders:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order
router.get('/:id', async (req, res) => {
  const orderId = parsePositiveInt(req.params.id);

  if (!orderId) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  try {
    const result = await pool.query(
      `SELECT o.*, c.name as customer_name, c.email as customer_email, 
              p.name as product_name, p.price as product_price
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN products p ON o.product_id = p.id
       WHERE o.id = $1`,
      [orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to fetch order:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Create order
router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const errors = {};

    const customer_id = parsePositiveInt(req.body.customer_id);
    const product_id = parsePositiveInt(req.body.product_id);
    const quantity = parsePositiveInt(req.body.quantity);
    const shipping_address =
      typeof req.body.shipping_address === 'string'
        ? req.body.shipping_address.trim()
        : '';

    if (!customer_id) {
      errors.customer_id = 'Customer is required';
    }

    if (!product_id) {
      errors.product_id = 'Product is required';
    }

    if (!quantity) {
      errors.quantity = 'Quantity must be a positive integer';
    }

    if (!shipping_address) {
      errors.shipping_address = 'Shipping address is required';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        fields: errors,
      });
    }

    await client.query('BEGIN');

    // Check inventory
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

    if (product.inventory_count < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    const total_amount = Number(product.price) * quantity;

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, product_id, quantity, total_amount, shipping_address, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [customer_id, product_id, quantity, total_amount, shipping_address]
    );

    // Decrement inventory
    await client.query(
      'UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2',
      [quantity, product_id]
    );

    await client.query('COMMIT');

    res.status(201).json(orderResult.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to create order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  const orderId = parsePositiveInt(req.params.id);

  if (!orderId) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  try {
    const existingOrder = await pool.query(
      'SELECT id, status FROM orders WHERE id = $1',
      [orderId]
    );

    if (existingOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (existingOrder.rows[0].status === 'cancelled') {
      return res.status(400).json({
        error: 'Cancelled orders cannot be modified',
      });
    }

    const { status } = req.body;

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, orderId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Failed to update order status:', err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// Cancel order
router.patch('/:id/cancel', async (req, res) => {
  const orderId = parsePositiveInt(req.params.id);

  if (!orderId) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      `
      SELECT *
      FROM orders
      WHERE id = $1
      FOR UPDATE
      `,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order is already cancelled' });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Only pending or confirmed orders can be cancelled`,
      });
    }

    const productResult = await client.query(
      `
      SELECT id, inventory_count
      FROM products
      WHERE id = $1
      FOR UPDATE
      `,
      [order.product_id]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Associated product not found' });
    }

    await client.query(
      `
      UPDATE orders
      SET status = 'cancelled', updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [orderId]
    );

    await client.query(
      `
      UPDATE products
      SET inventory_count = inventory_count + $1
      WHERE id = $2
      `,
      [order.quantity, order.product_id]
    );

    await client.query('COMMIT');

    return res.json({
      message: 'Order cancelled successfully',
      order_id: orderId,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to cancel order:', err);
    return res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    client.release();
  }
});

module.exports = router;