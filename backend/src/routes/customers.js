const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get all customers
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Search customers by name
router.get('/search', async (req, res) => {
  try {
    const { name } = req.query;
    const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get single customer
router.get('/:id', async (req, res) => {
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


const validateAndSanitize = (value, isEmail = false) => {
  // 1. Trim and check if it's empty
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length === 0) return null;

  // 2. If it's an email, check the regex
  if (isEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed) ? trimmed : 'INVALID_FORMAT';
  }

  return trimmed;
};
// Create customer -
router.post('/', async (req, res) => {
  try {
    const name = validateAndSanitize(req.body.name);
    const email = validateAndSanitize(req.body.email, true);
    const phone = validateAndSanitize(req.body.phone);

    if (email === 'INVALID_FORMAT') {
      return res.status(400).json({ error: 'Invalid email format' });
    }
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
