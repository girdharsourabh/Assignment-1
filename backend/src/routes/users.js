const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const bcrypt = require('bcrypt');
const { generateToken, options } = require('../auth/helper');
const verifyJWT = require('../middleware/verify-jwt');

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if(!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if(result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if(!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken(user.id);

    res.cookie('token', token, options);
    res.json({ message: 'Login successful' });
  } catch (err) {
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
});

router.get('/me', verifyJWT, async (req, res) => { 
  try {
    const userResult = await pool.query(
      'SELECT id, username, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(userResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user', details: err.message });
  }
});

router.post('/logout', async (req, res) => {
  try {
    res.clearCookie('token', options);
    res.json({ message: 'Logout successful' });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed', details: err.message });
  }
});

module.exports = router;