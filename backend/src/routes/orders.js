const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all orders
router.get('/', async (req, res) => {
  try {
    // Single query with JOINs instead of N+1 queries
    const result = await pool.query(`
      SELECT 
        o.id,
        o.customer_id,
        o.product_id,
        o.quantity,
        o.total_amount,
        o.shipping_address,
        o.status,
        o.created_at,
        o.updated_at,
        c.name as customer_name,
        c.email as customer_email,
        p.name as product_name,
        p.price as product_price
      FROM orders o
      INNER JOIN customers c ON o.customer_id = c.id
      INNER JOIN products p ON o.product_id = p.id
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

    // Input validation
    if (!customer_id || !product_id || !quantity || !shipping_address) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      return res.status(400).json({ error: 'Quantity must be a positive integer' });
    }

    // Start transaction
    await client.query('BEGIN');

    // Check if customer exists
    const customerCheck = await client.query(
      'SELECT id FROM customers WHERE id = $1',
      [customer_id]
    );
    
    if (customerCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check inventory with row lock
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

    // Create order
    const orderResult = await client.query(
      `INSERT INTO orders 
        (customer_id, product_id, quantity, total_amount, shipping_address, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW()) 
       RETURNING *`,
      [customer_id, product_id, quantity, total_amount, shipping_address]
    );

    // Decrement inventory (FIXED - removed updated_at)
    await client.query(
      'UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2',
      [quantity, product_id]
    );

    // Commit transaction
    await client.query('COMMIT');
    
    // Fetch complete order with details
    const completeOrder = await pool.query(
      `SELECT 
        o.*, 
        c.name as customer_name, 
        c.email as customer_email,
        p.name as product_name, 
        p.price as product_price
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN products p ON o.product_id = p.id
       WHERE o.id = $1`,
      [orderResult.rows[0].id]
    );

    res.status(201).json(completeOrder.rows[0]);
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

// Cancel order (only if pending or confirmed)
router.post('/:id/cancel', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    // Validate ID
    if (isNaN(parseInt(id))) {
      return res.status(400).json({ error: 'Invalid order ID' });
    }

    await client.query('BEGIN');

    // Get order with product details and lock
    const orderResult = await client.query(
      `SELECT o.*, p.inventory_count, p.id as product_id 
       FROM orders o
       JOIN products p ON o.product_id = p.id
       WHERE o.id = $1 FOR UPDATE`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Check if order can be cancelled
    const cancellableStatuses = ['pending', 'confirmed'];
    if (!cancellableStatuses.includes(order.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Order cannot be cancelled because it is ${order.status}`,
        allowedStatuses: cancellableStatuses
      });
    }

    // Update order status to cancelled
    const updateResult = await client.query(
      `UPDATE orders 
       SET status = 'cancelled', updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [id]
    );

    // Restore inventory
    await client.query(
      'UPDATE products SET inventory_count = inventory_count + $1 WHERE id = $2',
      [order.quantity, order.product_id]
    );

    await client.query('COMMIT');
    
    // Fetch updated order with details
    const completeOrder = await pool.query(
      `SELECT 
        o.*, 
        c.name as customer_name, 
        c.email as customer_email,
        p.name as product_name, 
        p.price as product_price
       FROM orders o
       JOIN customers c ON o.customer_id = c.id
       JOIN products p ON o.product_id = p.id
       WHERE o.id = $1`,
      [id]
    );

    res.json({ 
      message: 'Order cancelled successfully',
      order: completeOrder.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to cancel order:', err);
    res.status(500).json({ error: 'Failed to cancel order' });
  } finally {
    client.release();
  }
});

module.exports = router;
