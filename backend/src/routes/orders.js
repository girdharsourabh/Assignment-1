const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyJWT = require('../middleware/verify-jwt');

// Get all orders
router.get('/', verifyJWT, async (req, res) => {
  try {
    const limitRaw = req.query.limit;
    const offsetRaw = req.query.offset;

    const limitParsed = Number.parseInt(String(limitRaw ?? '20'), 10);
    const offsetParsed = Number.parseInt(String(offsetRaw ?? '0'), 10);

    const limit = Number.isFinite(limitParsed) ? Math.min(Math.max(limitParsed, 1), 100) : 20;
    const offset = Number.isFinite(offsetParsed) ? Math.max(offsetParsed, 0) : 0;

    const result = await pool.query(
      `SELECT o.*, c.name AS customer_name, c.email AS customer_email,
              p.name AS product_name, p.price AS product_price
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN products p ON o.product_id = p.id
       ORDER BY o.created_at DESC, o.id DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    res.json(result.rows);
  } catch (_err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get single order
router.get('/:id', verifyJWT, async (req, res) => {
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
  } catch (_err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// Cancel order (only pending/confirmed)
router.post('/:id/cancel', verifyJWT, async (req, res) => {
  const orderId = Number.parseInt(String(req.params.id), 10);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return res.status(400).json({ error: 'Invalid order id' });
  }

  const client = await pool.connect();
  let txStarted = false;
  try {
    await client.query('BEGIN');
    txStarted = true;

    // Lock order to prevent concurrent status changes/cancels.
    const orderResult = await client.query(
      'SELECT id, product_id, quantity, status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];
    if (order.status === 'cancelled') {
      return res.status(200).json({ ...order, status: 'cancelled' });
    }

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      return res.status(400).json({ error: 'Order cannot be cancelled' });
    }

    // Restore inventory (lock product row too to serialize stock updates).
    await client.query('SELECT id FROM products WHERE id = $1 FOR UPDATE', [order.product_id]);
    await client.query(
      'UPDATE products SET inventory_count = inventory_count + $1 WHERE id = $2',
      [order.quantity, order.product_id]
    );

    const updatedOrder = await client.query(
      "UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *",
      [orderId]
    );

    await client.query('COMMIT');
    txStarted = false;
    return res.json(updatedOrder.rows[0]);
  } catch (err) {
    if (txStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (_err) {
        // ignore rollback failures
      }
    }
    return res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    client.release();
  }
});

// Create order
router.post('/', verifyJWT, async (req, res) => {
  const { customer_id, product_id, quantity, shipping_address } = req.body ?? {};

  const customerId = Number.parseInt(String(customer_id), 10);
  const productId = Number.parseInt(String(product_id), 10);
  const qty = Number.parseInt(String(quantity), 10);

  if (!Number.isInteger(customerId) || customerId <= 0) {
    return res.status(400).json({ error: 'Invalid customer_id' });
  }
  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: 'Invalid product_id' });
  }
  if (!Number.isInteger(qty) || qty <= 0) {
    return res.status(400).json({ error: 'Invalid quantity' });
  }

  const client = await pool.connect();
  let txStarted = false;
  try {
    await client.query('BEGIN');
    txStarted = true;

    // Lock product row to prevent race conditions with concurrent orders.
    const productResult = await client.query(
      'SELECT id, price, inventory_count FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productResult.rows[0];
    if (product.inventory_count < qty) {
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    const total_amount = Number(product.price) * qty;

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, product_id, quantity, total_amount, shipping_address, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [customerId, productId, qty, total_amount, shipping_address]
    );

    // Decrement inventory (still guarded; should always affect exactly 1 row).
    const updateResult = await client.query(
      'UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2 AND inventory_count >= $1',
      [qty, productId]
    );
    if (updateResult.rowCount !== 1) {
      return res.status(409).json({ error: 'Inventory update failed' });
    }

    await client.query('COMMIT');
    txStarted = false;
    res.json(orderResult.rows[0]);
  } catch (err) {
    if (txStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (_err) {
        // ignore rollback failures
      }
    }
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

// Update order status
router.patch('/:id/status', verifyJWT, async (req, res) => {
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
  } catch (_err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;
