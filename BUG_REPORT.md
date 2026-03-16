# Bug Report — Order Management System

## Issue 1 — SQL Injection via String Concatenation

**Category:** 🔴 Security Vulnerability  
**File:** `backend/src/routes/customers.js` — `GET /search` handler (line 19)

### Problem
The customer search query is built by directly concatenating the user-supplied `name` query parameter into a raw SQL string:

```js
const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";
const result = await pool.query(query);
```

An attacker can inject arbitrary SQL by passing a crafted `name` value such as:
```
' OR '1'='1
' UNION SELECT username, password FROM pg_shadow--
```

### Why It Matters
This is a critical security vulnerability. It can expose the entire database, allow authentication bypass, and enable data destruction.

### Recommended Fix
Use a parameterized query:
```js
const result = await pool.query(
  "SELECT * FROM customers WHERE name ILIKE $1",
  [`%${name}%`]
);
```

---

## Issue 2 — Hardcoded Database Credentials

**Category:** 🔴 Security Vulnerability  
**File:** `backend/src/config/db.js` (lines 4–10)

### Problem
The PostgreSQL credentials are hardcoded directly in source code:
```js
const pool = new Pool({
  user: 'admin',
  password: 'admin123',
  ...
});
```
These credentials also appear in `docker-compose.yml` as plain-text environment variables, making them visible to anyone with repository access.

### Why It Matters
Committing secrets to source control is a top security risk (OWASP A07). The credentials are permanently stored in git history even after removal.

### Recommended Fix
Read credentials from environment variables:
```js
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
});
```
Pass them via `docker-compose.yml` env vars and use a `.env` file (gitignored) locally.

---

## Issue 3 — N+1 Query Problem in GET /api/orders

**Category:** 🟠 Performance Problem  
**File:** `backend/src/routes/orders.js` — `GET /` handler (lines 8–24)

### Problem
The endpoint first fetches all orders, then executes **two additional database queries per order** inside a `for` loop to retrieve customer and product details:

```js
for (const order of orders) {
  const customerResult = await pool.query('SELECT name, email FROM customers WHERE id = $1', [order.customer_id]);
  const productResult  = await pool.query('SELECT name, price FROM products WHERE id = $1',  [order.product_id]);
  ...
}
```
With 100 orders, this is 201 sequential database round-trips.

### Why It Matters
This will cause severe slowdowns as the order volume grows. The `GET /api/orders/:id` route already demonstrates the correct approach with a single JOIN.

### Recommended Fix
Replace the loop with a single JOIN query:
```sql
SELECT o.*,
       c.name AS customer_name, c.email AS customer_email,
       p.name AS product_name, p.price AS product_price
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN products p  ON o.product_id  = p.id
ORDER BY o.created_at DESC;
```

---

## Issue 4 — Race Condition / Missing Transaction in Order Creation

**Category:** 🔴 Data Integrity  
**File:** `backend/src/routes/orders.js` — `POST /` handler (lines 59–83)

### Problem
The "check inventory → create order → decrement inventory" flow is executed as three separate, non-atomic queries with no database transaction:

```js
// Step 1: check inventory
const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
// (another request could read the same inventory here)

// Step 2: create order
await pool.query('INSERT INTO orders ...');

// Step 3: decrement
await pool.query('UPDATE products SET inventory_count = inventory_count - $1 ...');
```

Two concurrent order requests for the last item in stock can both pass the inventory check, creating two orders and pushing `inventory_count` to `-1`.

### Why It Matters
This is a classic TOCTOU (Time-of-Check/Time-of-Use) race condition that leads to overselling and negative inventory.

### Recommended Fix
Wrap all three steps in a `BEGIN` / `COMMIT` transaction and use `SELECT ... FOR UPDATE` to lock the product row during the check.

---

## Issue 5 — Broken Global Error Handler (Always Returns HTTP 200)

**Category:** 🔴 Bad Coding Practice / Missing Error Handling  
**File:** `backend/src/index.js` (lines 23–26)

### Problem
The Express global error handler is fundamentally broken:

```js
app.use((err, req, res, next) => {
  console.log('Something happened');
  res.status(200).json({ success: true });
});
```

- It returns HTTP **200** for all unhandled errors, masking failures from the frontend.
- The error object `err` is never logged, making debugging impossible.
- The client receives `{ success: true }` even when a fatal server error has occurred.

### Why It Matters
Bugs in production will be completely invisible. Clients that rely on HTTP status codes will silently handle errors as successes.

### Recommended Fix
```js
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## Issue 6 — No Input Validation on Any Route

**Category:** 🟠 Missing Validation  
**Files:** `backend/src/routes/orders.js`, `customers.js`, `products.js`

### Problem
No route validates its inputs before processing them:

- `POST /api/orders` — `customer_id`, `product_id`, `quantity` are used without checking whether they are integers, positive, or even present.
- `POST /api/customers` — `name`, `email`, `phone` are inserted directly; invalid email formats and empty names are accepted.
- `PATCH /api/orders/:id/status` — any string (e.g., `"hacked"`) is accepted as a valid `status`.
- `PATCH /api/products/:id/inventory` — `inventory_count` can be set to `-999` with no objection.

### Why It Matters
Malformed data corrupts the database and produces confusing errors. Missing `customer_id` will trigger a non-descriptive constraint violation from Postgres rather than a clear 400 response.

### Recommended Fix
Use a validation library like `zod` or `express-validator` to validate each request body before executing any database logic.

---

## Issue 7 — Frontend API Layer Ignores HTTP Error Responses

**Category:** 🟠 Missing Error Handling  
**File:** `frontend/src/api/index.js` (all functions)

### Problem
Every API function calls `res.json()` without first checking `res.ok`:

```js
export async function fetchOrders() {
  const res = await fetch(`${API_BASE}/orders`);
  return res.json();   // No check for res.ok
}
```

If the backend returns HTTP 500, 404, or 401, the function still attempts to parse the body as JSON. There is also no `try/catch` — a network failure will throw an unhandled promise rejection.

### Why It Matters
The UI will crash or silently render incorrect data on server errors. Network failures produce uncaught exceptions in the browser console.

### Recommended Fix
```js
export async function fetchOrders() {
  const res = await fetch(`${API_BASE}/orders`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
```
Wrap call sites in `try/catch` and display error states to the user.

---

## Issue 8 — React `useEffect` Missing Dependency (`selectedProduct`)

**Category:** 🟡 Bad Coding Practice / Bug  
**File:** `frontend/src/components/CreateOrder.js` (lines 20–25)

### Problem
The effect that syncs `selectedProductData` from the product dropdown is missing `selectedProduct` in its dependency array:

```js
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  }
}, [products]); // ← BUG: selectedProduct is missing here
```

This means `selectedProductData` will **not update** when the user changes the product selection — it only re-runs if the `products` array itself changes (i.e., on initial load).

### Why It Matters
The product summary panel (price × quantity preview) will either not appear or display stale data from the previously selected product.

### Recommended Fix
```js
}, [products, selectedProduct]);
```

---

## Summary Table

| # | Issue | Category | Severity |
|---|-------|----------|----------|
| 1 | SQL Injection in customer search | Security | 🔴 Critical |
| 2 | Hardcoded DB credentials | Security | 🔴 Critical |
| 3 | N+1 queries in GET /api/orders | Performance | 🔴 High |
| 4 | Race condition in order creation (no transaction) | Data Integrity | 🔴 High |
| 5 | Broken global error handler (always 200 OK) | Error Handling | 🔴 High |
| 6 | No input validation on any route | Validation | 🟠 Medium |
| 7 | Frontend ignores HTTP error responses | Error Handling | 🟠 Medium |
| 8 | React useEffect missing dependency | Bad Practice | 🟡 Medium |
