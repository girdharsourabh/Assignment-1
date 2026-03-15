# Bug Report — Order Management System

## Issue #1 — SQL Injection in Customer Search (CRITICAL — Security)

**File:** `backend/src/routes/customers.js`, line 20  
**Function:** `GET /api/customers/search`

**What:**  
The search query is built by directly concatenating user input into the SQL string:
```js
const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";
```

**Why it matters:**  
An attacker can terminate the string and inject arbitrary SQL. For example:
```
GET /api/customers/search?name='; DROP TABLE customers; --
```
This could delete entire tables, exfiltrate data, or bypass access controls. SQL injection is consistently the #1 most critical web vulnerability (OWASP Top 10).

**Fix:**  
Use a parameterized query:
```js
const result = await pool.query(
  "SELECT * FROM customers WHERE name ILIKE $1",
  ['%' + name + '%']
);
```

---

## Issue #2 — Race Condition / Missing Transaction in Order Creation (CRITICAL — Correctness / Data Integrity)

**File:** `backend/src/routes/orders.js`, lines 62–86  
**Function:** `POST /api/orders`

**What:**  
Order creation involves three separate, non-atomic database operations:
1. `SELECT` inventory count
2. `INSERT` order
3. `UPDATE` inventory decrement

There is no transaction. Two concurrent requests can both read `inventory_count = 1`, both pass the check `inventory_count >= quantity`, both insert an order, and both decrement — leaving `inventory_count = -1`.

**Why it matters:**  
This is a classic Time-of-Check / Time-of-Use (TOCTOU) race condition. Under any concurrent load, inventory can go negative and orders can be fulfilled for stock that doesn't exist, causing fulfilment failures and financial loss.

**Fix:**  
Wrap the entire operation in a `BEGIN/COMMIT` transaction and use `SELECT ... FOR UPDATE` to lock the product row:
```js
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const productResult = await client.query(
    'SELECT * FROM products WHERE id = $1 FOR UPDATE', [product_id]
  );
  // ... check inventory, insert order, decrement ...
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

---

## Issue #3 — N+1 Query in GET /orders (Performance)

**File:** `backend/src/routes/orders.js`, lines 7–31  
**Function:** `GET /api/orders`

**What:**  
The route fetches all orders, then for each order fires **two additional DB queries** — one for the customer name and one for the product name:
```js
for (const order of orders) {
  const customerResult = await pool.query('SELECT name, email FROM customers WHERE id = $1', [...]);
  const productResult  = await pool.query('SELECT name, price FROM products WHERE id = $1', [...]);
}
```
With N orders, this results in `2N + 1` database round-trips.

**Why it matters:**  
With 100 orders, this is 201 queries. Each carries connection overhead and network latency. The single-order route (`GET /api/orders/:id`) already does this correctly with a JOIN — the list route should too.

**Fix:**  
Use a single `JOIN` query:
```js
const result = await pool.query(`
  SELECT o.*, c.name as customer_name, c.email as customer_email,
         p.name as product_name, p.price as product_price
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  JOIN products p ON o.product_id = p.id
  ORDER BY o.created_at DESC
`);
res.json(result.rows);
```

---

## Issue #4 — Global Error Handler Swallows Errors and Always Returns HTTP 200 (High — Reliability)

**File:** `backend/src/index.js`, lines 23–27  
**Function:** Express global error handler

**What:**  
The global error handler is:
```js
app.use((err, req, res, next) => {
  console.log('Something happened');
  res.status(200).json({ success: true });
});
```

**Why it matters:**  
Any unhandled error returns HTTP `200 OK` with `{ success: true }`. This means:
- Frontend clients cannot detect failures (no error status codes).
- Real errors are silently hidden from clients.
- Logs say nothing useful (`"Something happened"`).
- Developers debugging production issues get no signal.

**Fix:**  
```js
app.use((err, req, res, next) => {
  console.error('[Error]', err.message, err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});
```

---

## Issue #5 — Hardcoded Database Credentials in Source Code (High — Security)

**File:** `backend/src/config/db.js`, lines 4–10

**What:**  
Database credentials are hard-coded directly in source:
```js
const pool = new Pool({
  user: 'admin',
  password: 'admin123',
  ...
});
```

**Why it matters:**  
Credentials committed to source control are permanently in git history. Anyone with read access to the repository immediately has database credentials. In a real environment this would be a serious breach risk.

**Fix:**  
Use environment variables exclusively:
```js
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
});
```
Inject values via `docker-compose.yml` `environment:` keys and `.env` files (git-ignored).

---

## Issue #6 — No Order Status Transition Validation (Medium — Correctness)

**File:** `backend/src/routes/orders.js`, lines 95–110  
**Function:** `PATCH /api/orders/:id/status`

**What:**  
Any status value is accepted without validation:
```js
const { status } = req.body;
await pool.query('UPDATE orders SET status = $1 ...', [status, req.params.id]);
```
An order that is `delivered` or `shipped` can be moved back to `pending`.

**Why it matters:**  
This breaks business logic. A delivered order should never go back to pending. Arbitrary status strings can also pollute the database (e.g. `status = "foo"`).

**Fix:**  
Validate the incoming status against allowed values and enforce valid transitions:
```js
const VALID_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};
```

---

## Issue #7 — Missing `selectedProduct` in useEffect Dependency Array (Medium — Correctness)

**File:** `frontend/src/components/CreateOrder.js`, line 27  
**Function:** `CreateOrder` component

**What:**  
```js
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  }
}, [products]); // Missing: selectedProduct
```
The effect only re-runs when `products` changes, not when the user selects a different product. The product info panel shows stale data after changing selection.

**Why it matters:**  
Users see incorrect product details (price, stock) while filling the form. This can lead to placing an order with the wrong price expectation. React's `eslint-plugin-react-hooks` lint rule `exhaustive-deps` would catch this.

**Fix:**  
Add `selectedProduct` to the dependency array:
```js
}, [products, selectedProduct]);
```

---

## Issue #8 — Array Index Used as React Key in Sortable Lists (Low — Correctness)

**File:** `frontend/src/components/OrderList.js`, line 62  
**File:** `frontend/src/components/CustomerSearch.js`, line 92

**What:**  
```jsx
{sortedOrders.map((order, index) => (
  <tr key={index}>  {/* index changes when list is re-sorted */}
```

**Why it matters:**  
When the list is sorted, array indices change positions. React uses keys to identify which elements changed/moved. Using index as key causes React to re-render every row on each sort instead of just moving DOM nodes, and can cause input state (e.g. the status `<select>`) to become mismatched with the wrong row.

**Fix:**  
Use the stable unique identifier:
```jsx
{sortedOrders.map((order) => (
  <tr key={order.id}>
```
```jsx
{results.map((customer) => (
  <div className="customer-card" key={customer.id}>
```
