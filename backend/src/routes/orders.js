const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all orders
// BUG: N+1 query - fetches customer and product names in a loop
router.get('/', async (req, res) => {
  try {
    const ordersResult = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
    const orders = ordersResult.rows;

    // Fetch customer and product details for each order individually
    const enrichedOrders = [];
    for (const order of orders) {
      const customerResult = await pool.query('SELECT name, email FROM customers WHERE id = $1', [order.customer_id]);
      const productResult = await pool.query('SELECT name, price FROM products WHERE id = $1', [order.product_id]);

      enrichedOrders.push({
        ...order,
        customer_name: customerResult.rows[0]?.name || 'Unknown',
        customer_email: customerResult.rows[0]?.email || '',
        product_name: productResult.rows[0]?.name || 'Unknown',
        product_price: productResult.rows[0]?.price || 0,
      });
    }

    res.json(enrichedOrders);
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
    // BUG: No validation on status transitions - can go from 'delivered' back to 'pending'
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

module.exports = router;
