# Bug Report

## Issue 1 — SQL Injection in Customer Search

**Location:** `backend/src/routes/customers.js` — `/search` route

**What it is:**
The customer search endpoint built the SQL query by directly concatenating the user-supplied `name` query parameter:

```js
const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";
```

**Impact — Security (Critical):**
An attacker can pass a crafted value like `' OR '1'='1` to dump the entire table, or use UNION injection to read any table in the database.

**Fix applied:**

```js
const result = await pool.query("SELECT * FROM customers WHERE name ILIKE $1", [
  `%${name}%`,
]);
```

---

## Issue 2 — Database Credentials Hardcoded in Source

**Location:** `backend/src/config/db.js`

**What it is:**
Username, password, host and database name were hardcoded directly in source:

```js
const pool = new Pool({ user: 'admin', password: 'admin123', host: 'db', ... });
```

**Impact — Security (Critical):**
Anyone with repository access can see the production password. Rotating credentials requires a code change and redeploy.

**Fix applied:**
All values now read from environment variables with safe fallbacks:

```js
const pool = new Pool({
  user: process.env.DB_USER || "admin",
  password: process.env.DB_PASSWORD || "admin123",
  host: process.env.DB_HOST || "db",
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "orderdb",
});
```

---

## Issue 3 — Race Condition on Order Creation (No Transaction)

**Location:** `backend/src/routes/orders.js` — `POST /` handler

**What it is:**
Inventory check, order insert, and inventory decrement were three separate queries with no database transaction:

```js
// Step 1 — check (no lock)
const productResult = await pool.query("SELECT * FROM products WHERE id = $1", [
  product_id,
]);
// Step 2 — insert (separate round trip)
const orderResult = await pool.query("INSERT INTO orders ...");
// Step 3 — decrement (separate round trip)
await pool.query(
  "UPDATE products SET inventory_count = inventory_count - $1 ...",
);
```

**Impact — Data Integrity (Critical):**
Two concurrent requests for the last item in stock both pass the check, both insert orders, and both decrement inventory — leaving `inventory_count` at -1.

**Fix applied:**
All three operations wrapped in `BEGIN / COMMIT` with `SELECT ... FOR UPDATE` to lock the product row:

```js
const client = await pool.connect();
await client.query("BEGIN");
const product = await client.query(
  "SELECT * FROM products WHERE id = $1 FOR UPDATE",
  [product_id],
);
// check, insert, decrement
await client.query("COMMIT");
```

---

## Issue 4 — N+1 Query Problem on Orders List

**Location:** `backend/src/routes/orders.js` — `GET /` handler

**What it is:**
The original code fetched all orders then fired 2 extra queries per order in a loop:

```js
for (const order of orders) {
  const customerResult = await pool.query(
    "SELECT ... FROM customers WHERE id = $1",
    [order.customer_id],
  );
  const productResult = await pool.query(
    "SELECT ... FROM products WHERE id = $1",
    [order.product_id],
  );
}
```

**Impact — Performance:**
With N orders this fires `1 + 2N` database round trips. 100 orders = 201 queries where 1 suffices.

**Fix applied:**
Single JOIN query replaces the entire loop:

```js
const result = await pool.query(`
  SELECT o.*, c.name AS customer_name, c.email AS customer_email,
         p.name AS product_name, p.price AS product_price
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  JOIN products  p ON o.product_id  = p.id
  ORDER BY o.created_at DESC
`);
```

---

## Issue 5 — Global Error Handler Returns 200 OK for All Errors

**Location:** `backend/src/index.js` — error middleware

**What it is:**
The Express error handler always returned HTTP 200 with `{ success: true }` regardless of the error:

```js
app.use((err, req, res, next) => {
  console.log("Something happened");
  res.status(200).json({ success: true });
});
```

**Impact — Reliability (Critical):**
Every unhandled exception is silently swallowed and returned to the client as a success. Errors become invisible.

**Fix applied:**

```js
app.use((err, req, res, next) => {
  console.error("[unhandled error]", err);
  res.status(500).json({ error: "An unexpected error occurred" });
});
```

---

## Issue 6 — Missing Dependency in useEffect (Product Preview Broken)

**Location:** `frontend/src/components/CreateOrder.js`

**What it is:**
The `useEffect` that sets `selectedProductData` had `[products]` as its dependency array but was missing `selectedProduct`:

```js
useEffect(() => {
  const product = products.find((p) => p.id === parseInt(selectedProduct));
  setSelectedProductData(product);
}, [products]); // BUG: selectedProduct missing
```

**Impact — Correctness:**
Changing the product dropdown did not update the preview panel. Displayed price and stock remained stale.

**Fix applied:**

```js
}, [selectedProduct, products]);
```

---

## Issue 7 — Array Index Used as React Key

**Location:** `frontend/src/components/OrderList.js` and `frontend/src/components/CustomerSearch.js`

**What it is:**
Both components used the array iteration index as the React `key` prop:

```jsx
{sortedOrders.map((order, index) => <tr key={index}>)}
{results.map((customer, idx) => <div key={idx}>)}
```

**Impact — Correctness:**
When the list is sorted or re-fetched, React matches component state (the status `<select>` value) to the wrong row. The wrong status appears for the wrong order after sorting.

**Fix applied:**

```jsx
{sortedOrders.map((order) => <tr key={order.id}>)}
{results.map((customer) => <div key={customer.id}>)}
```

---

## Issue 8 — No Input Validation on Backend Endpoints

**Location:** `backend/src/routes/orders.js` — `POST /` and `PATCH /:id/status`

**What it is:**
`POST /api/orders` accepted any value for `quantity` (zero, negative, non-integer). `PATCH /:id/status` accepted any arbitrary string as a status.

**Impact — Correctness / Reliability:**
`quantity: -5` would create an order with negative quantity and _increase_ inventory (since `count - (-5) = count + 5`). Any string could be written to the status column.

**How to fix:**

```js
// In POST /
if (!Number.isInteger(quantity) || quantity < 1) {
  return res.status(400).json({ error: "Quantity must be a positive integer" });
}
// In PATCH /:id/status
const VALID = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
if (!VALID.includes(status)) {
  return res
    .status(400)
    .json({ error: `status must be one of: ${VALID.join(", ")}` });
}
```

---

## Issue 9 — Dockerfiles Not Production-Ready

**Location:** `backend/Dockerfile`, `frontend/Dockerfile`

**What it is:**
Both Dockerfiles copied the entire source tree before `npm install`, used large non-alpine base images, and the frontend ran the CRA dev server in production:

```dockerfile
FROM node:18        # 1GB image
COPY . .            # cache bust on every code change
RUN npm install
CMD ["npm", "start"] # dev server — not for production
```

**Impact — Performance / Security / Reliability:**
Every code change re-downloads all npm packages. The frontend dev server is significantly slower than a compiled static build served by nginx.

**Fix applied:**
See `DEPLOYMENT.md` for full details and updated Dockerfiles.
