# Bug Report — Order Management System

## Issue 1 — SQL Injection via String Concatenation

**Category:** 🔴 Security Vulnerability  
**File:** `backend/src/routes/customers.js` — `GET /search` handler (line 19)

### Problem
The customer search endpoint builds its SQL query by directly concatenating the user-supplied `name` parameter into the query string:

```js
const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";
const result = await pool.query(query);
```

This means any value the user types gets embedded verbatim into the SQL. An attacker could pass something like:
```
' OR '1'='1
' UNION SELECT username, password FROM pg_shadow--
```
and the database would happily execute it.

### Why It Matters
SQL injection is one of the most well-known and well-exploited vulnerabilities in web applications. In the worst case, it can expose every record in the database, bypass access controls entirely, or allow an attacker to drop tables. This needs to be fixed before anything else.

### Recommended Fix
Switch to a parameterized query — the `pg` driver already supports this natively:
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
The Postgres username and password are hardcoded directly in the source file:
```js
const pool = new Pool({
  user: 'admin',
  password: 'admin123',
  ...
});
```
The same credentials also appear in `docker-compose.yml`. Anyone with read access to the repository can see them, and since git history is permanent, removing the values later doesn't actually fix the exposure.

### Why It Matters
Hardcoding credentials in source code is listed under OWASP A07 (Identification and Authentication Failures) and is a standard finding in any security audit. If this repository is ever made public, or if a developer's machine is compromised, the database is immediately at risk.

### Recommended Fix
Pull credentials from environment variables instead:
```js
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
});
```
Pass the values via `docker-compose.yml` env vars and use a `.env` file (gitignored) for local development.

---

## Issue 3 — N+1 Query Problem in GET /api/orders

**Category:** 🟠 Performance Problem  
**File:** `backend/src/routes/orders.js` — `GET /` handler (lines 8–24)

### Problem
The list-all-orders endpoint fetches every order in one query, then loops through the results and fires two more queries per order to get the customer name and product name:

```js
for (const order of orders) {
  const customerResult = await pool.query('SELECT name, email FROM customers WHERE id = $1', [order.customer_id]);
  const productResult  = await pool.query('SELECT name, price FROM products WHERE id = $1',  [order.product_id]);
  ...
}
```

With 100 orders, that's 201 round-trips to the database. With 1,000 orders it's 2,001. This is a textbook N+1 problem and it scales linearly with data volume.

### Why It Matters
This will degrade noticeably in any real-world usage. The irony is that the `GET /api/orders/:id` route in the same file already uses a JOIN to fetch everything in one query — the same pattern just wasn't applied here.

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
Creating an order involves three steps: check inventory, insert the order, decrement stock. These happen as three completely separate database queries with nothing tying them together:

```js
// Step 1: check inventory
const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
// (another request could read the same inventory here)

// Step 2: create order
await pool.query('INSERT INTO orders ...');

// Step 3: decrement
await pool.query('UPDATE products SET inventory_count = inventory_count - $1 ...');
```

If two requests arrive at nearly the same time for the last item in stock, both will pass the inventory check before either one has decremented the count. You end up with two orders created and an `inventory_count` of `-1`.

### Why It Matters
This is a classic TOCTOU (Time-of-Check/Time-of-Use) race condition. In an e-commerce context, overselling is a real business problem — orders get created for stock that doesn't exist, which creates customer support issues and fulfillment failures.

### Recommended Fix
Wrap all three steps in a `BEGIN` / `COMMIT` transaction and use `SELECT ... FOR UPDATE` to lock the product row during the check. This serializes concurrent requests for the same item and prevents the race.

---

## Issue 5 — Broken Global Error Handler (Always Returns HTTP 200)

**Category:** 🔴 Bad Coding Practice / Missing Error Handling  
**File:** `backend/src/index.js` (lines 23–26)

### Problem
Express supports a four-argument error handler that catches unhandled errors from any route. This project has one registered, but it's actively harmful:

```js
app.use((err, req, res, next) => {
  console.log('Something happened');
  res.status(200).json({ success: true });
});
```

It swallows the error entirely, logs a useless message, and responds with HTTP 200 and `{ success: true }`. Any unhandled exception in the application will appear to the client as a successful response.

### Why It Matters
This turns what should be visible failures into silent ones. Bugs surface as mysterious UI behavior rather than clear HTTP errors. The `err` object is never logged, so there's nothing to trace when something goes wrong in production.

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
None of the API routes validate their request inputs before passing them to the database:

- `POST /api/orders` — `customer_id`, `product_id`, `quantity` are used as-is without checking they're positive integers or even present.
- `POST /api/customers` — `name`, `email`, and `phone` are inserted directly. Empty names and malformed email addresses are accepted.
- `PATCH /api/orders/:id/status` — any string value is accepted as a valid `status`, including `"hacked"` or `"banana"`.
- `PATCH /api/products/:id/inventory` — `inventory_count` can be set to `-999` without complaint.

### Why It Matters
Without validation, the database becomes the only layer that enforces any sort of correctness — and Postgres error messages aren't designed to be user-facing. A missing `customer_id` produces a cryptic constraint violation instead of a clear `400 Bad Request`. Invalid status values get persisted silently.

### Recommended Fix
Add validation before any database logic using a library like `zod` or `express-validator`. This keeps the API contract explicit and error messages meaningful.

---

## Issue 7 — Frontend API Layer Ignores HTTP Error Responses

**Category:** 🟠 Missing Error Handling  
**File:** `frontend/src/api/index.js` (all functions)

### Problem
Every function in the API layer calls `res.json()` immediately after `fetch()`, without checking whether the request actually succeeded:

```js
export async function fetchOrders() {
  const res = await fetch(`${API_BASE}/orders`);
  return res.json();   // No check for res.ok
}
```

If the backend returns a 500 or 404, the function treats it the same as a 200 and tries to parse the error body as data. There's also no `try/catch` anywhere, so a network failure throws an unhandled promise rejection.

### Why It Matters
From a user perspective, errors either crash the UI silently or render incorrect data with no indication that something went wrong. From a developer perspective, failures are hard to diagnose because there's no consistent error propagation.

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
The effect responsible for updating the product summary panel when the user picks a product has an incomplete dependency array:

```js
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  }
}, [products]); // ← BUG: selectedProduct is missing here
```

Because `selectedProduct` isn't listed as a dependency, React won't re-run this effect when the user changes the dropdown. It only fires when the `products` array changes, which happens once on load. After that, switching products in the UI does nothing.

### Why It Matters
The price-times-quantity preview shown in the form will either not appear at all or keep showing the first product the user ever selected, regardless of what's currently chosen. It's a confusing user experience and also a subtle React rules violation that React's linter would ordinarily flag.

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
