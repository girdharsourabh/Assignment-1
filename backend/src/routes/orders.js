const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { createHttpError } = require('../utils/http');

const UPDATABLE_ORDER_STATUSES = new Set(['pending', 'confirmed', 'shipped', 'delivered']);
const CANCELABLE_ORDER_STATUSES = new Set(['pending', 'confirmed']);
const ORDER_DETAILS_QUERY = `
  SELECT
    o.id,
    o.customer_id,
    o.product_id,
    o.quantity,
    o.total_amount,
    o.status,
    o.shipping_address,
    o.created_at,
    o.updated_at,
    c.name AS customer_name,
    c.email AS customer_email,
    p.name AS product_name,
    p.price AS product_price,
    p.inventory_count
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  JOIN products p ON o.product_id = p.id
`;

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

async function withTransaction(work) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function getOrderDetails(client, orderId) {
  const result = await client.query(`${ORDER_DETAILS_QUERY} WHERE o.id = $1`, [orderId]);
  return result.rows[0] || null;
}

// Get all orders
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`${ORDER_DETAILS_QUERY} ORDER BY o.created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get single order
router.get('/:id', async (req, res, next) => {
  try {
    const orderId = parsePositiveInteger(req.params.id);
    if (!orderId) {
      return next(createHttpError(400, 'Invalid order id'));
    }

    const order = await getOrderDetails(pool, orderId);
    if (!order) {
      return next(createHttpError(404, 'Order not found'));
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// Create order
router.post('/', async (req, res, next) => {
  try {
    const customerId = parsePositiveInteger(req.body.customer_id);
    const productId = parsePositiveInteger(req.body.product_id);
    const quantity = parsePositiveInteger(req.body.quantity);
    const shippingAddress = normalizeText(req.body.shipping_address);

    if (!customerId || !productId || !quantity || !shippingAddress) {
      return next(createHttpError(400, 'Customer, product, quantity, and shipping address are required'));
    }

    const order = await withTransaction(async (client) => {
      const customerResult = await client.query('SELECT id FROM customers WHERE id = $1', [customerId]);
      if (customerResult.rows.length === 0) {
        throw createHttpError(404, 'Customer not found');
      }

      const productResult = await client.query(
        'SELECT id, price, inventory_count FROM products WHERE id = $1 FOR UPDATE',
        [productId]
      );
      if (productResult.rows.length === 0) {
        throw createHttpError(404, 'Product not found');
      }

      const product = productResult.rows[0];
      if (product.inventory_count < quantity) {
        throw createHttpError(400, 'Insufficient inventory');
      }

      const totalAmount = (Number(product.price) * quantity).toFixed(2);

      await client.query(
        'UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2',
        [quantity, productId]
      );

      const orderResult = await client.query(
        `INSERT INTO orders (customer_id, product_id, quantity, total_amount, shipping_address, status)
         VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
        [customerId, productId, quantity, totalAmount, shippingAddress]
      );

      return getOrderDetails(client, orderResult.rows[0].id);
    });

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
});

// Update order status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const orderId = parsePositiveInteger(req.params.id);
    const status = normalizeText(req.body.status).toLowerCase();

    if (!orderId) {
      return next(createHttpError(400, 'Invalid order id'));
    }

    if (!UPDATABLE_ORDER_STATUSES.has(status)) {
      return next(createHttpError(400, 'Invalid order status'));
    }

    const order = await withTransaction(async (client) => {
      const currentOrderResult = await client.query(
        'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
        [orderId]
      );

      if (currentOrderResult.rows.length === 0) {
        throw createHttpError(404, 'Order not found');
      }

      const currentOrder = currentOrderResult.rows[0];
      if (currentOrder.status === 'cancelled') {
        throw createHttpError(409, 'Cancelled orders cannot be updated');
      }

      await client.query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
        [status, orderId]
      );

      return getOrderDetails(client, orderId);
    });

    res.json(order);
  } catch (err) {
    next(err);
  }
});

// Cancel order and restore inventory
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const orderId = parsePositiveInteger(req.params.id);
    if (!orderId) {
      return next(createHttpError(400, 'Invalid order id'));
    }

    const order = await withTransaction(async (client) => {
      const orderResult = await client.query(
        'SELECT id, product_id, quantity, status FROM orders WHERE id = $1 FOR UPDATE',
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        throw createHttpError(404, 'Order not found');
      }

      const existingOrder = orderResult.rows[0];
      if (existingOrder.status === 'cancelled') {
        throw createHttpError(409, 'Order is already cancelled');
      }

      if (!CANCELABLE_ORDER_STATUSES.has(existingOrder.status)) {
        throw createHttpError(409, 'Only pending or confirmed orders can be cancelled');
      }

      const productResult = await client.query(
        'SELECT id FROM products WHERE id = $1 FOR UPDATE',
        [existingOrder.product_id]
      );

      if (productResult.rows.length === 0) {
        throw createHttpError(500, 'Related product not found');
      }

      await client.query(
        'UPDATE products SET inventory_count = inventory_count + $1 WHERE id = $2',
        [existingOrder.quantity, existingOrder.product_id]
      );

      await client.query(
        "UPDATE orders SET status = 'cancelled', updated_at = NOW() WHERE id = $1",
        [orderId]
      );

      return getOrderDetails(client, orderId);
    });

    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
