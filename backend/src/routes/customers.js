const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { createHttpError } = require('../utils/http');

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePositiveInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

// Get all customers
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM customers ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Search customers by name
router.get('/search', async (req, res, next) => {
  try {
    const name = normalizeText(req.query.name);

    if (!name) {
      return res.json([]);
    }

    const result = await pool.query(
      'SELECT * FROM customers WHERE name ILIKE $1 ORDER BY created_at DESC',
      [`%${name}%`]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get single customer
router.get('/:id', async (req, res, next) => {
  try {
    const customerId = parsePositiveInteger(req.params.id);
    if (!customerId) {
      return next(createHttpError(400, 'Invalid customer id'));
    }

    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [customerId]);
    if (result.rows.length === 0) {
      return next(createHttpError(404, 'Customer not found'));
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// Create customer
router.post('/', async (req, res, next) => {
  try {
    const name = normalizeText(req.body.name);
    const email = normalizeText(req.body.email).toLowerCase();
    const phone = normalizeText(req.body.phone);

    if (!name || !email) {
      return next(createHttpError(400, 'Name and email are required'));
    }

    const result = await pool.query(
      'INSERT INTO customers (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
      [name, email, phone]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return next(createHttpError(409, 'A customer with this email already exists'));
    }

    next(err);
  }
});

module.exports = router;
