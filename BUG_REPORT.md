# Bug Report - Order Management System

This document outlines critical issues found in the Order Management System codebase, including security vulnerabilities, performance problems, and architectural issues.

## Issue 1: SQL Injection Vulnerability (Critical)

**What**: The customer search endpoint is vulnerable to SQL injection attacks through unsafe string concatenation.

**Where**: `backend/src/routes/customers.js:19`

```javascript
const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";
```

**Why it matters**: This is a critical security vulnerability that allows attackers to execute arbitrary SQL commands, potentially leading to data theft, modification, or complete database compromise.

**How to fix**: Use parameterized queries with proper escaping:

```javascript
const query = "SELECT * FROM customers WHERE name ILIKE $1";
const result = await pool.query(query, [`%${name}%`]);
```

## Issue 2: N+1 Query Performance Problem (High Impact)

**What**: The orders endpoint executes individual database queries for each order in a loop, causing severe performance issues.

**Where**: `backend/src/routes/orders.js:12-24`

```javascript
for (const order of orders) {
  const customerResult = await pool.query('SELECT name, email FROM customers WHERE id = $1', [order.customer_id]);
  const productResult = await pool.query('SELECT name, price FROM products WHERE id = $1', [order.product_id]);
  // ...
}
```

**Why it matters**: This creates N+1 queries where N is the number of orders. With 100 orders, it executes 201 database queries instead of 1, causing exponential performance degradation.

**How to fix**: Use JOIN queries to fetch all data in a single database call:

```javascript
const result = await pool.query(`
  SELECT o.*, c.name as customer_name, c.email as customer_email, 
         p.name as product_name, p.price as product_price
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  JOIN products p ON o.product_id = p.id
  ORDER BY o.created_at DESC
`);
```

## Issue 3: Inadequate Error Handling (Medium Impact)

**What**: The global error handler returns incorrect HTTP status codes and provides insufficient error information.

**Where**: `backend/src/index.js:23-26`

```javascript
app.use((err, req, res, next) => {
  console.log('Something happened');
  res.status(200).json({ success: true });
});
```

**Why it matters**: 
- Returns 200 status for all errors, breaking client error handling
- Logs generic message instead of actual error details
- Returns success response even when errors occur
- Makes debugging and monitoring impossible

**How to fix**: Implement proper error handling:

```javascript
app.use((err, req, res, next) => {
  console.error('Error:', err.message, err.stack);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});
```

## Issue 4: Missing Database Transactions (High Impact)

**What**: Order creation doesn't use transactions, risking data inconsistency between orders and inventory.

**Where**: `backend/src/routes/orders.js:72-83`

**Why it matters**: If the inventory update fails after order creation, the system will have an order for products that weren't actually reserved, leading to overselling and data integrity issues.

**How to fix**: Wrap order creation and inventory update in a transaction:

```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // Create order
  // Update inventory
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

## Issue 5: React Hook Dependency Bug (Medium Impact)

**What**: Missing dependency in useEffect hook causes stale data and incorrect product selection behavior.

**Where**: `frontend/src/components/CreateOrder.js:20-25`

```javascript
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  }
}, [products]); // Missing: selectedProduct
```

**Why it matters**: The effect doesn't re-run when `selectedProduct` changes, causing the selected product data to not update correctly, leading to incorrect pricing and inventory display.

**How to fix**: Add missing dependency:

```javascript
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  }
}, [products, selectedProduct]); // Add selectedProduct to dependencies
```

## Issue 6: Hardcoded Database Credentials (Security Risk)

**What**: Database credentials are hardcoded in configuration files.

**Where**: `backend/src/config/db.js:4-9`

**Why it matters**: Exposes sensitive credentials in version control, making them accessible to anyone with repository access. This violates security best practices.

**How to fix**: Use environment variables:

```javascript
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'orderdb',
});
```

## Issue 7: Missing Input Validation (Multiple Security Issues)

**What**: API endpoints lack proper input validation, allowing invalid data to be processed.

**Where**: Multiple endpoints across all route files

**Why it matters**: Can lead to database errors, application crashes, and potential security vulnerabilities. Allows negative quantities, invalid emails, etc.

**How to fix**: Add validation middleware using a library like `joi` or `express-validator`.

## Priority Summary

**Critical (Fix Immediately)**:
1. SQL Injection vulnerability
2. Missing database transactions

**High Priority**:
3. N+1 query performance issue
4. Input validation

**Medium Priority**:
5. Error handling improvements
6. React hook dependency bug
7. Environment variable configuration

These issues should be addressed in order of priority to ensure system security, performance, and reliability.
