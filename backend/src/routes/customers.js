const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const { z } = require("zod");

// Validation schema
const customerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
  phone: z
    .string()
    .regex(/^\+?[\d\s-]{10,}$/)
    .optional(),
});

// Get all customers
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM customers ORDER BY created_at DESC",
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

// Search customers by name
router.get("/search", async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.json([]);

    // SAFE: Using parameterized query
    const result = await pool.query(
      "SELECT * FROM customers WHERE name ILIKE $1",
      [`%${name}%`],
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Search failed" });
  }
});

// Get single customer
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM customers WHERE id = $1", [
      req.params.id,
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customer" });
  }
});

// Create customer
router.post("/", async (req, res) => {
  try {
    // Validate input
    const validatedData = customerSchema.parse(req.body);
    const { name, email, phone } = validatedData;

    const result = await pool.query(
      "INSERT INTO customers (name, email, phone) VALUES ($1, $2, $3) RETURNING *",
      [name, email, phone],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Validation failed", details: err.errors });
    }
    res.status(500).json({ error: "Failed to create customer" });
  }
});

module.exports = router;
