# Bug Report

## Bug 1: SQL Injection in Customer Search (Critical — Security)

**What:** The customer search endpoint builds SQL queries using string concatenation with raw user input, allowing SQL injection attacks.

**Where:** `backend/src/routes/customers.js`, line 19
```js
const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";
```

**Why:** An attacker can execute arbitrary SQL — read, modify, or delete any data in the database. This is the most critical security vulnerability in the codebase (OWASP Top 1).

**How to fix:** Use parameterized queries:
```js
const result = await pool.query(
  "SELECT * FROM customers WHERE name ILIKE $1",
  [`%${name}%`]
);
```

---

## Bug 2: N+1 Query Problem in Orders List (High — Performance)

**What:** The GET `/api/orders` endpoint fetches all orders, then runs 2 additional queries per order (one for customer, one for product) in a sequential loop.

**Where:** `backend/src/routes/orders.js`, lines 8–24

**Why:** For N orders, this executes 1 + 2N database queries instead of 1. With 100 orders, that's 201 queries. This causes severe latency and unnecessary database load as data grows.

**How to fix:** Use a single SQL query with JOINs (the same pattern already used in the `GET /:id` endpoint):
```sql
SELECT o.*, c.name AS customer_name, c.email AS customer_email,
       p.name AS product_name, p.price AS product_price
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN products p ON o.product_id = p.id
ORDER BY o.created_at DESC
```

---

## Bug 3: Race Condition — Order Creation Without Transaction (High — Data Integrity)

**What:** Creating an order involves two separate operations — inserting the order and decrementing inventory — that are not wrapped in a database transaction.

**Where:** `backend/src/routes/orders.js`, lines 54–88 (POST `/`)

**Why:** If the inventory update fails after the order is created, the system has an order that was never paid for in stock. Concurrent requests can also read stale inventory counts and oversell products (e.g., two users each see 1 item left and both place orders).

**How to fix:** Wrap the inventory check, order insert, and inventory update in a `BEGIN`/`COMMIT` transaction using `pool.connect()` and `client.query()`, with `ROLLBACK` on error. Use `SELECT ... FOR UPDATE` on the product row to prevent concurrent overselling.

---

## Bug 4: Global Error Handler Returns 200 OK on Errors (Medium — Correctness)

**What:** The Express global error handler responds with HTTP 200 and `{ success: true }` for all unhandled errors.

**Where:** `backend/src/index.js`, lines 23–26
```js
app.use((err, req, res, next) => {
  console.log('Something happened');
  res.status(200).json({ success: true });
});
```

**Why:** Clients receive a "success" response for server errors, making debugging impossible and masking real failures. Errors are silently swallowed.

**How to fix:** Return a 500 status with an error message and log the actual error:
```js
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## Bug 5: useEffect Missing Dependency in CreateOrder (Medium — Correctness)

**What:** The `useEffect` that updates `selectedProductData` only lists `[products]` in its dependency array but reads `selectedProduct` — so changing the product dropdown does not update the preview.

**Where:** `frontend/src/components/CreateOrder.js`, lines 20–25
```js
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  }
}, [products]); // Missing: selectedProduct
```

**Why:** The product info preview (name, price calculation, available stock) only updates when the product list is re-fetched, not when the user selects a different product. Users see stale or no preview data.

**How to fix:** Add `selectedProduct` to the dependency array: `[products, selectedProduct]`.

---

## Bug 6: Order Status Can Be Changed to Any Value (Medium — Data Integrity)

**What:** The PATCH `/:id/status` endpoint accepts any string as a status value with no validation.

**Where:** `backend/src/routes/orders.js`, lines 92–106

**Why:** Orders can be set to invalid statuses (e.g., `"foo"`), and status transitions are not enforced — a `delivered` order can be moved back to `pending`. This breaks business logic and data integrity.

**How to fix:** Validate that the status is one of the allowed values (`pending`, `confirmed`, `shipped`, `delivered`, `cancelled`) and optionally enforce valid transitions.

---

## Bug 7: Frontend API Client Never Checks HTTP Status (Medium — Reliability)

**What:** All API functions in the frontend call `res.json()` without checking `res.ok` first.

**Where:** `frontend/src/api/index.js`, all functions

**Why:** When the server returns a 4xx or 5xx response, `fetch` does not throw — it resolves normally. The code parses whatever body it gets and treats it as success data. This means error states are silently ignored in the UI.

**How to fix:** Check `res.ok` before parsing and throw on failure:
```js
if (!res.ok) {
  const error = await res.json();
  throw new Error(error.error || 'Request failed');
}
```

---

## Bug 8: React List Key Uses Array Index Instead of Stable ID (Low — Correctness)

**What:** The order list table uses `index` as the React key instead of `order.id`.

**Where:** `frontend/src/components/OrderList.js`, line 60
```jsx
<tr key={index}>
```

**Why:** When orders are sorted or the list changes, React cannot correctly track which row is which, potentially causing rendering bugs and broken state in interactive elements (like the status dropdown).

**How to fix:** Use `order.id` as the key: `<tr key={order.id}>`.

---

## Bug 9: Customer Search Fires on Every Keystroke (Low — Performance)

**What:** The customer search sends an API request on every `onChange` event with no debounce.

**Where:** `frontend/src/components/CustomerSearch.js`, line 56

**Why:** Typing "Aarav" sends 5 API requests in rapid succession. Combined with the SQL injection vulnerability, this amplifies attack surface and wastes server resources.

**How to fix:** Add a debounce (e.g., 300ms) before firing the search API call using `setTimeout`/`clearTimeout` or a utility like `lodash.debounce`.

---

## Bug 10: Hardcoded Database Credentials (Low — Security / DevOps)

**What:** Database credentials are hardcoded in the backend source code.

**Where:** `backend/src/config/db.js`, lines 4–9

**Why:** Credentials in source code get committed to version control. In production, this makes it impossible to rotate credentials without a code change and redeploy. It also leaks secrets if the repo is public.

**How to fix:** Read credentials from environment variables, and pass them via `docker-compose.yml` environment section:
```js
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'db',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'orderdb',
});
```
