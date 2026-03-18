const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Allowed statuses
const VALID_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];


// ✅ Get all orders (FIXED: no N+1, using JOIN)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.*, 
             c.name AS customer_name, c.email AS customer_email,
             p.name AS product_name, p.price AS product_price
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      JOIN products p ON o.product_id = p.id
      ORDER BY o.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});


// ✅ Get single order
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, 
              c.name as customer_name, c.email as customer_email, 
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
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});


// ✅ Create order (FIXED: validation + transaction)
router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const { customer_id, product_id, quantity, shipping_address } = req.body;

    // 🔒 Input validation
   // 🔒 Improved Input validation
if (
  !customer_id ||
  !product_id ||
  !quantity ||
  quantity <= 0 ||
  !shipping_address ||
  typeof shipping_address !== 'string' ||
  shipping_address.trim().length < 5
) {
  return res.status(400).json({ error: 'Invalid input data' });
}

    await client.query('BEGIN');

    // Check product
    const productResult = await client.query(
      'SELECT * FROM products WHERE id = $1',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productResult.rows[0];

    // Check inventory
    if (product.inventory_count < quantity) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    const total_amount = product.price * quantity;

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders 
       (customer_id, product_id, quantity, total_amount, shipping_address, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') 
       RETURNING *`,
      [customer_id, product_id, quantity, total_amount, shipping_address]
    );

    // Decrement inventory
    await client.query(
      'UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2',
      [quantity, product_id]
    );

    await client.query('COMMIT');

    res.json(orderResult.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});


// ✅ Update order status (FIXED: validation)
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    // 🔒 Validate status
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
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
    console.error(err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});


// ✅ Cancel order (NEW FEATURE - Task 3)
router.put('/:id/cancel', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const orderId = req.params.id;

    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // 🔒 Only allow cancellation for valid statuses
    if (!['pending', 'confirmed'].includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Only pending or confirmed orders can be cancelled',
      });
    }

    // Restore inventory
    await client.query(
      'UPDATE products SET inventory_count = inventory_count + $1 WHERE id = $2',
      [order.quantity, order.product_id]
    );

    // Update order status
    const updatedOrder = await client.query(
      `UPDATE orders 
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [orderId]
    );

    await client.query('COMMIT');

    res.json(updatedOrder.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    client.release();
  }
});


module.exports = router;