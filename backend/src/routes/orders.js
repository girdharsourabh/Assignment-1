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
// BUG: Race condition - read inventory, then decrement separately. Two concurrent
// requests can both read inventory=1, both pass the check, and both decrement.
router.post('/', async (req, res) => {
  try {
    const { customer_id, product_id, quantity, shipping_address } = req.body;

    // Check inventory
    const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = productResult.rows[0];

    if (product.inventory_count < quantity) {
      return res.status(400).json({ error: 'Insufficient inventory' });
    }

    const total_amount = product.price * quantity;

    // Create order
    const orderResult = await pool.query(
      `INSERT INTO orders (customer_id, product_id, quantity, total_amount, shipping_address, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
      [customer_id, product_id, quantity, total_amount, shipping_address]
    );

    // Decrement inventory
    await pool.query(
      'UPDATE products SET inventory = inventory - $1 WHERE id = $2 AND inventory >= $1',
      [quantity, product_id]
    );

    res.json(orderResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create order' });
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


// order cancellation
router.post("/:id/cancel", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const orderId = req.params.id;

    await client.query("BEGIN");

    const orderResult = await client.query(
      "SELECT * FROM orders WHERE id = $1",
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orderResult.rows[0];

    if (!["pending", "confirmed"].includes(order.status)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Order cannot be cancelled at this stage"
      });
    }

    await client.query(
      "UPDATE orders SET status = 'cancelled' WHERE id = $1",
      [orderId]
    );

    await client.query(
      `UPDATE products
       SET inventory = inventory + $1
       WHERE id = $2`,
      [order.quantity, order.product_id]
    );

    await client.query("COMMIT");

    res.json({ message: "Order cancelled successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

module.exports = router;
