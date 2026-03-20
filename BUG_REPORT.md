# Bug Report

## Issue #1: SQL Injection in Customer Search

**Location**: `backend/src/routes/customers.js:14-19`

**What**: Customer search uses string concatenation in SQL query, allowing SQL injection attacks.

**Why It Matters**: Attackers can execute arbitrary SQL commands to extract, modify, or delete sensitive data.

**Fix**:
```javascript
// Before
const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";

// After
const result = await pool.query(
  'SELECT * FROM customers WHERE name ILIKE $1',
  ['%' + name + '%']
);
```

---

## Issue #2: Incorrect HTTP Status Codes in Error Handler

**Location**: `backend/src/index.js:22-26`

**What**: Global error handler returns HTTP 200 status for all errors, marking failures as successful.

**Why It Matters**: Frontend cannot distinguish success from failure, breaking all error handling logic.

**Fix**:
```javascript
// Before
app.use((err, req, res, next) => {
  console.log('Something happened');
  res.status(200).json({ success: true });
});

// After
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: err.message || 'Internal server error',
    success: false 
  });
});
```

---

## Issue #3: N+1 Query Problem

**Location**: `backend/src/routes/orders.js:7-28`

**What**: GET `/api/orders` fetches all orders, then runs separate queries for each order's customer and product (N+1 queries).

**Why It Matters**: 100 orders = 201 queries instead of 1, causing severe performance degradation at scale.

**Fix**:
```javascript
// Before: Loop fetching customer and product per order
for (const order of orders) {
  const customerResult = await pool.query(...);
  const productResult = await pool.query(...);
}

// After: Single JOIN query
const result = await pool.query(
  `SELECT o.*, c.name as customer_name, c.email as customer_email, 
          p.name as product_name, p.price as product_price
   FROM orders o
   JOIN customers c ON o.customer_id = c.id
   JOIN products p ON o.product_id = p.id
   ORDER BY o.created_at DESC`
);
```

---

## Issue #4: Hardcoded Database Credentials

**Location**: `backend/src/config/db.js:4-10`

**What**: Database credentials hardcoded in source code.

**Why It Matters**: Credentials exposed in git history permanently; security risk and prevents environment-specific configuration.

**Fix**:
```javascript
// Before
const pool = new Pool({
  user: 'admin',
  password: 'admin123',
  host: 'db',
  port: 5432,
  database: 'orderdb',
});

// After
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD || 'admin123',
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'orderdb',
});
```

---

## Issue #5: Race Condition in Order Creation

**Location**: `backend/src/routes/orders.js:44-79`

**What**: Inventory check and decrement are separate operations without transaction wrapping. Concurrent requests can oversell inventory.

**Why It Matters**: Data integrity violation; orders can be created with negative inventory.

**Fix**:
```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  const result = await client.query(
    'SELECT inventory_count FROM products WHERE id = $1 FOR UPDATE',
    [product_id]
  );
  
  if (result.rows[0].inventory_count < quantity) {
    throw new Error('Insufficient inventory');
  }
  
  await client.query('INSERT INTO orders...');
  await client.query('UPDATE products SET inventory_count = ...');
  
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

---

## Issue #6: Missing useEffect Dependency

**Location**: `frontend/src/components/CreateOrder.js:32-39`

**What**: useEffect missing `selectedProduct` in dependency array; product preview shows stale data.

**Why It Matters**: User sees incorrect product information when changing selection, causing wrong order placement.

**Fix**:
```javascript
// Before
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  }
}, [products]);

// After
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  }
}, [products, selectedProduct]);
```
