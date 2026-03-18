const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { createHttpError } = require('../utils/http');

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseNonNegativeInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

// Get all products
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get single product
router.get('/:id', async (req, res, next) => {
  try {
    const productId = parsePositiveInteger(req.params.id);
    if (!productId) {
      return next(createHttpError(400, 'Invalid product id'));
    }

    const result = await pool.query('SELECT * FROM products WHERE id = $1', [productId]);
    if (result.rows.length === 0) {
      return next(createHttpError(404, 'Product not found'));
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Update product inventory
router.patch('/:id/inventory', async (req, res, next) => {
  try {
    const productId = parsePositiveInteger(req.params.id);
    const inventoryCount = parseNonNegativeInteger(req.body.inventory_count);

    if (!productId) {
      return next(createHttpError(400, 'Invalid product id'));
    }

    if (inventoryCount === null) {
      return next(createHttpError(400, 'Inventory count must be a non-negative integer'));
    }

    const result = await pool.query(
      'UPDATE products SET inventory_count = $1 WHERE id = $2 RETURNING *',
      [inventoryCount, productId]
    );
    if (result.rows.length === 0) {
      return next(createHttpError(404, 'Product not found'));
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
