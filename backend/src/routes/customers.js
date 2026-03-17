const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const verifyJWT = require('../middleware/verify-jwt');

// Get all customers
router.get('/', verifyJWT, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Search customers by name
router.get('/search', verifyJWT, async (req, res) => {
  try {
    const { name } = req.query;
    const search = String(name || '').trim();
    if (!search) {
      return res.json([]);
    }
    const result = await pool.query(
      'SELECT * FROM customers WHERE name ILIKE $1 ORDER BY created_at DESC',
      [`%${search}%`]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: 'Search failed', details: err.message });
  }
});

// Get single customer
router.get('/:id', verifyJWT, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// Create customer -
router.post('/', verifyJWT, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const result = await pool.query(
      'INSERT INTO customers (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
      [name, email, phone]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

module.exports = router;
