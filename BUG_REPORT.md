# Bug Report — Order Management System

## Bug 1: SQL Injection Vulnerability (CRITICAL — Security)

**What:** The customer search endpoint builds a SQL query using string concatenation with unsanitized user input.

**Where:** `backend/src/routes/customers.js`, line 12–13

```js
const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";
const result = await pool.query(query);
```

**Why it matters:** An attacker can inject arbitrary SQL. For example, searching for `' OR '1'='1` would return all customers. A more destructive payload like `'; DROP TABLE customers; --` could destroy data. This is a textbook SQL injection (OWASP A03).

**Fix:** Use a parameterized query instead of string concatenation:

```js
const result = await pool.query(
  'SELECT * FROM customers WHERE name ILIKE $1',
  [`%${name}%`]
);
```

---

## Bug 2: N+1 Query Problem (CRITICAL — Performance)

**What:** The `GET /api/orders` endpoint fetches all orders and then fires two additional DB queries per order (one for customer, one for product) inside a loop.

**Where:** `backend/src/routes/orders.js`, lines 8–23

```js
for (const order of orders) {
  const customerResult = await pool.query('SELECT name, email FROM customers WHERE id = $1', [...]);
  const productResult = await pool.query('SELECT name, price FROM products WHERE id = $1', [...]);
  ...
}
```

**Why it matters:** With N orders, this fires 2N + 1 DB queries. At 100 orders, that's 201 queries for a single page load. This is a classic N+1 problem — it degrades performance severely as data grows and can overwhelm the DB under load.

**Fix:** Use a single JOIN query to fetch everything in one round trip:

```js
const result = await pool.query(`
  SELECT o.*,
    c.name as customer_name, c.email as customer_email,
    p.name as product_name, p.price as product_price
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  JOIN products p ON o.product_id = p.id
  ORDER BY o.created_at DESC
`);
```

---

## Bug 3: Race Condition / Missing Transaction in Order Creation (CRITICAL — Data Integrity)

**What:** The order creation endpoint checks inventory, then creates the order, then decrements inventory — as three separate, non-atomic DB operations with no transaction.

**Where:** `backend/src/routes/orders.js`, lines 48–75

```js
// Step 1: check inventory
const product = ...
if (product.inventory_count < quantity) { ... }

// Step 2: create order
const orderResult = await pool.query('INSERT INTO orders ...')

// Step 3: decrement inventory
await pool.query('UPDATE products SET inventory_count = inventory_count - $1 ...')
```

**Why it matters:** Two concurrent requests for the last item in stock can both pass the inventory check simultaneously, resulting in both orders being placed and inventory going negative. This is a classic TOCTOU (Time-of-Check-Time-of-Use) race condition.

**Fix:** Wrap all three steps in a database transaction, and use `FOR UPDATE` to lock the product row during the check:

```js
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const productResult = await client.query(
    'SELECT * FROM products WHERE id = $1 FOR UPDATE', [product_id]
  );
  // ... check inventory ...
  // ... insert order ...
  // ... update inventory ...
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

---

## Bug 4: Global Error Handler Returns HTTP 200 on Errors (Correctness)

**What:** The Express error-handling middleware always returns HTTP status 200 with `{ success: true }`, regardless of what error occurred. It also swallows the error message entirely.

**Where:** `backend/src/index.js`, lines 22–25

```js
app.use((err, req, res, next) => {
  console.log('Something happened');
  res.status(200).json({ success: true });
});
```

**Why it matters:** Clients (and monitoring tools) rely on HTTP status codes to detect failures. Returning 200 for errors breaks error handling in the frontend, makes debugging impossible, and hides real failures from any alerting/logging infrastructure.

**Fix:**

```js
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## Bug 5: Hardcoded Database Credentials (Security)

**What:** Database credentials are hardcoded directly in the source code.

**Where:** `backend/src/config/db.js`, lines 4–9

```js
const pool = new Pool({
  user: 'admin',
  password: 'admin123',
  host: 'db',
  ...
});
```

**Why it matters:** Credentials committed to source control are a serious security risk. Anyone with repo access (or if the repo is ever made public) can access the database. Secrets should never be in version control.

**Fix:** Read credentials from environment variables, and pass them via docker-compose:

```js
const pool = new Pool({
  user: process.env.DB_USER || 'admin',
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'orderdb',
});
```

---

## Bug 6: Missing React `useEffect` Dependency (Bug — Correctness)

**What:** The `useEffect` that updates `selectedProductData` only lists `products` as a dependency, but not `selectedProduct`. So when the user changes their product selection, the displayed product info does not update.

**Where:** `frontend/src/components/CreateOrder.js`, line 36

```js
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  }
}, [products]); // BUG: selectedProduct missing from deps array
```

**Why it matters:** The product detail preview shown below the dropdown (price, stock) will not reflect the user's actual selection after the initial load. This is a functional UI bug — users see stale or incorrect product information.

**Fix:**

```js
}, [products, selectedProduct]);
```

---

## Bug 7: Order Status Update Has No Validation (Correctness)

**What:** The `PATCH /api/orders/:id/status` endpoint accepts any string as the new status with no validation.

**Where:** `backend/src/routes/orders.js`, lines 80–91

**Why it matters:** The frontend only offers 4 valid statuses, but the API has no enforcement. Any client can set an order status to an arbitrary string like `"hacked"` or `"free"`, corrupting the data and breaking business logic downstream.

**Fix:** Validate the status value against the allowed set before updating:

```js
const VALID_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
if (!VALID_STATUSES.includes(status)) {
  return res.status(400).json({ error: 'Invalid status value' });
}
```

---

## Bug 8: Customer Search URL Not Encoded (Bug — Correctness)

**What:** The `searchCustomers` API call does not encode the search query before embedding it in the URL.

**Where:** `frontend/src/api/index.js`, line 28

```js
const res = await fetch(`${API_BASE}/customers/search?name=${name}`);
```

**Why it matters:** Names with special characters (spaces, `&`, `#`, etc.) will produce a malformed URL. For example, searching "John & Jane" will break the query string parsing. This is also a secondary XSS risk if the value is reflected unsanitized.

**Fix:**

```js
const res = await fetch(`${API_BASE}/customers/search?name=${encodeURIComponent(name)}`);
```
