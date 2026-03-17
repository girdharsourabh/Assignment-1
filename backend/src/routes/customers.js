const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { z } = require("zod");

const customerSchema = z.object({
  name: z.string().min(2),
  email: z.email(),
  phone: z.string().min(6),
});

// Get all customers
router.get("/", async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT * FROM customers ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Search customers by name
router.get("/search", async (req, res, next) => {
  try {
    const { name } = req.query;

    const result = await pool.query(
      "SELECT * FROM customers WHERE name ILIKE $1",
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
    const result = await pool.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    next(err)
  }
});

// Create customer -
router.post("/", async (req, res, next) => {
  try {
    const parsed = customerSchema.parse(req.body);

    const result = await pool.query(
      "INSERT INTO customers (name,email,phone) VALUES ($1,$2,$3) RETURNING *",
      [parsed.name, parsed.email, parsed.phone]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;