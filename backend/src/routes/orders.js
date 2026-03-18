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
       JOIN customers c ON o.customer_id = c.id
       JOIN products p ON o.product_id = p.id
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
  const customer_id = Number(req.body?.customer_id);
  const product_id = Number(req.body?.product_id);
  const quantity = Number(req.body?.quantity);
  const shipping_address = typeof req.body?.shipping_address === 'string' ? req.body.shipping_address.trim() : '';

  try {
    if (!Number.isInteger(customer_id) || customer_id <= 0) {
      return res.status(400).json({ error: 'Invalid customer_id' });
    }
    if (!Number.isInteger(product_id) || product_id <= 0) {
      return res.status(400).json({ error: 'Invalid product_id' });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }
    if (!shipping_address) {
      return res.status(400).json({ error: 'shipping_address is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Lock product row to avoid overselling
      const productResult = await client.query(
        'SELECT id, price, inventory_count FROM products WHERE id = $1 FOR UPDATE',
        [product_id]
      );
      if (productResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Product not found' });
      }

      const product = productResult.rows[0];

      if (Number(product.inventory_count) < quantity) {
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
      res.json(orderResult.rows[0]);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = new Set(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']);
    if (typeof status !== 'string' || !allowed.has(status)) {
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

// Cancel order (pending/confirmed only) and restore inventory
router.patch('/:id/cancel', async (req, res) => {
  const orderId = Number(req.params.id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query(
      'SELECT id, product_id, quantity, status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (!['pending', 'confirmed'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Order cannot be cancelled from status "${order.status}"` });
    }

    await client.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      ['cancelled', orderId]
    );
    await client.query(
      'UPDATE products SET inventory_count = inventory_count + $1 WHERE id = $2',
      [order.quantity, order.product_id]
    );

    await client.query('COMMIT');

    const enriched = await pool.query(
      `SELECT o.*, c.name as customer_name, c.email as customer_email,
              p.name as product_name, p.price as product_price
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN products p ON o.product_id = p.id
       WHERE o.id = $1`,
      [orderId]
    );
    res.json(enriched.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    client.release();
  }
});

module.exports = router;
