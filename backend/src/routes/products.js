const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

// Get all products
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Update product inventory
router.patch('/:id/inventory', async (req, res) => {
  try {
    const { inventory_count } = req.body;
    const result = await pool.query(
      'UPDATE products SET inventory_count = $1 WHERE id = $2 RETURNING *',
      [inventory_count, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update inventory' });
  }
});

// Create product
router.post('/', async (req, res) => {
  try {
    const { name, description, price, inventory_count } = req.body;
    if (!name || price === undefined || inventory_count === undefined) {
      return res.status(400).json({ error: 'Name, price, and inventory_count are required' });
    }
    const result = await pool.query(
      'INSERT INTO products (name, description, price, inventory_count) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description, price, inventory_count]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create product' });
  }
});

module.exports = router;
