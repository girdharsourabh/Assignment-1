const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all orders
// BUG: N+1 query - fetches customer and product names in a loop
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, 
              c.name AS customer_name, 
              c.email AS customer_email,
              p.name AS product_name, 
              p.price AS product_price
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN products p ON o.product_id = p.id
       ORDER BY o.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
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
// BUG: Race condition - read inventory, then decrement separately. Two concurrent
// requests can both read inventory=1, both pass the check, and both decrement.

router.post('/', async (req, res) => {
  const client = await pool.connect();

  try {
    const { customer_id, product_id, quantity, shipping_address } = req.body;

    await client.query('BEGIN');

    // Lock product row
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

    const total_amount = product.price * quantity;

    const orderResult = await client.query(
      `INSERT INTO orders (customer_id, product_id, quantity, total_amount, shipping_address, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [customer_id, product_id, quantity, total_amount, shipping_address]
    );

    await client.query(
      'UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2',
      [quantity, product_id]
    );

    await client.query('COMMIT');

    res.json(orderResult.rows[0]);

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create order' });
  } finally {
    client.release();
  }
});

//============== Cancel Order API ==================
router.post('/:id/cancel', async (req, res) => {
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

    // Check status
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Only pending or confirmed orders can be cancelled'
      });
    }

    // Restore inventory
    await client.query(
      'UPDATE products SET inventory_count = inventory_count + $1 WHERE id = $2',
      [order.quantity, order.product_id]
    );

    // Update order status
    const updatedOrder = await client.query(
      "UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *",
      [req.params.id]
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

// Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ['pending', 'confirmed', 'shipped', 'delivered'];

    // Validate status value
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Get current order status
    const currentOrder = await pool.query(
      'SELECT status FROM orders WHERE id = $1',
      [req.params.id]
    );

    if (currentOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const currentStatus = currentOrder.rows[0].status;

    // Prevent invalid backward transitions
    const statusFlow = ['pending', 'confirmed', 'shipped', 'delivered'];

    if (statusFlow.indexOf(status) < statusFlow.indexOf(currentStatus)) {
      return res.status(400).json({ error: 'Invalid status transition' });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    res.json(result.rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

module.exports = router;
