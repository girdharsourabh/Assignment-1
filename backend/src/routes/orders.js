const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { z } = require("zod");

const orderSchema = z.object({
  customer_id: z.number(),
  product_id: z.number(),
  quantity: z.number().min(1),
  shipping_address: z.string().min(5),
});

// Get all orders
router.get("/", async (req, res, next) => {
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
    next(err);
  }
});

// Get single order
router.get('/:id', async (req, res, next) => {
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
    next(err)
  }
});

// Create order
router.post("/", async (req, res, next) => {
  const client = await pool.connect();

  try {
    const data = orderSchema.parse(req.body);

    await client.query("BEGIN");

    const productResult = await client.query(
      "SELECT * FROM products WHERE id=$1",
      [data.product_id]
    );

    const product = productResult.rows[0];

    if (!product) {
      throw new Error("Product not found");
    }

    if (product.inventory_count < data.quantity) {
      throw new Error("Insufficient inventory");
    }

    const total = product.price * data.quantity;

    const orderResult = await client.query(
      `INSERT INTO orders
      (customer_id,product_id,quantity,total_amount,shipping_address,status)
      VALUES ($1,$2,$3,$4,$5,'pending')
      RETURNING *`,
      [
        data.customer_id,
        data.product_id,
        data.quantity,
        total,
        data.shipping_address,
      ]
    );

    await client.query(
      "UPDATE products SET inventory_count = inventory_count - $1 WHERE id=$2",
      [data.quantity, data.product_id]
    );

    await client.query("COMMIT");

    res.json(orderResult.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    next(err);
  } finally {
    client.release();
  }
});

// Update order status
router.patch('/:id/status', async (req, res, next) => {
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
    next(err)
  }
});

module.exports = router;
