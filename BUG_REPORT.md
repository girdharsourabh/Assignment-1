# Bug Report — Order Management Application

Reviewed files: `backend/src/index.js`, `backend/src/config/db.js`, `backend/src/routes/orders.js`, `backend/src/routes/customers.js`, `backend/src/routes/products.js`, `frontend/src/api/index.js`, `frontend/src/components/OrderList.js`, `frontend/src/components/CreateOrder.js`, `frontend/src/components/CustomerSearch.js`, `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`.

---

## Issue 1 — SQL Injection in Customer Search

**File:** `backend/src/routes/customers.js`, line 20

**What it is:**
The customer search endpoint builds its SQL query by directly concatenating the user-supplied `name` query parameter into the query string:

```js
const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";
const result = await pool.query(query);
```

**Why it matters (Impact — Security):**
This is a textbook SQL injection vulnerability. Any user can send a crafted `name` value to read, modify, or destroy arbitrary data in the database. For example:

```
GET /api/customers/search?name='; DROP TABLE orders; --
GET /api/customers/search?name=' OR '1'='1
```

The first payload drops the entire `orders` table. The second bypasses the filter and returns all rows. Because the backend connects as a DB admin with no row-level restrictions, the attacker has full access to every table.

**How to fix:**
Use a parameterized query. The `pg` library already supports this natively — pass the value as a bound parameter, never as part of the query string:

```js
const result = await pool.query(
  'SELECT * FROM customers WHERE name ILIKE $1',
  [`%${name}%`]
);
```

---

## Issue 2 — Hardcoded Database Credentials in Source Code

**File:** `backend/src/config/db.js`, lines 5–9

**What it is:**
The database username and password are written in plain text directly in the source code:

```js
const pool = new Pool({
  user: 'admin',
  password: 'admin123',  // hardcoded secret
  host: 'db',
  port: 5432,
  database: 'orderdb',
});
```

The same credentials are also duplicated in `docker-compose.yml` lines 7–8.

**Why it matters (Impact — Security):**
Credentials committed to source control are exposed to everyone who can read the repo — including anyone with access to git history after a "fix" that removes them. If the repo is ever made public, or if CI/CD logs are visible, these credentials leak permanently. It also means credentials cannot be rotated without modifying and redeploying code.

**How to fix:**
Read credentials from environment variables using `process.env`:

```js
const pool = new Pool({
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host:     process.env.DB_HOST     || 'db',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
});
```

Provide the values through a `.env` file (gitignored) and pass them into Docker containers via `docker-compose.yml`'s `env_file` or `environment` directives. Add `.env` to `.gitignore`. Commit a `.env.example` with placeholder values so developers know what to set.

---

## Issue 3 — Global Error Handler Swallows All Errors and Always Returns HTTP 200

**File:** `backend/src/index.js`, lines 23–27

**What it is:**
Express supports a 4-argument error-handling middleware `(err, req, res, next)`. The app registers one, but it always returns HTTP 200 with `{ success: true }`, regardless of what the error is:

```js
app.use((err, req, res, next) => {
  console.log('Something happened');   // no error details logged
  res.status(200).json({ success: true }); // always 200!
});
```

**Why it matters (Impact — Reliability / Correctness):**
- Any unhandled exception in any route handler will silently produce a `200 OK` response with `{"success":true}` — the client has no way to detect that the request actually failed.
- Frontend code that checks `if (result.error)` will pass through without branching to the error path.
- Actual error details are never logged, making debugging impossible in production.
- Monitoring / alerting tools that rely on HTTP status codes won't fire alerts on 500-level errors because they never happen.

**How to fix:**
Replace the handler with one that logs correctly and uses the right HTTP status code:

```js
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});
```

---

## Issue 4 — N+1 Query Problem in GET /api/orders

**File:** `backend/src/routes/orders.js`, lines 7–31

**What it is:**
The list-orders endpoint first fetches all orders in one query, then fires **two additional queries per order** (one for the customer, one for the product) inside a `for` loop:

```js
const ordersResult = await pool.query('SELECT * FROM orders ...');
for (const order of orders) {
  const customerResult = await pool.query('SELECT ... FROM customers WHERE id = $1', [...]);
  const productResult  = await pool.query('SELECT ... FROM products  WHERE id = $1', [...]);
  enrichedOrders.push({ ...order, ... });
}
```

For N orders this results in **2N + 1 database round-trips**.

**Why it matters (Impact — Performance):**
For a database with 100 orders, this fires 201 queries per page load. Each query involves a network round-trip to PostgreSQL, query parsing, and I/O. The response time scales linearly with the number of orders, not logarithmically. The app will become noticeably slow as order volume grows, and under concurrent load it will saturate the DB connection pool quickly.

Ironically, the single-order endpoint (`GET /:id`) directly below this code already uses a JOIN and does it correctly — the list endpoint just didn't follow the same pattern.

**How to fix:**
Replace the loop with a single JOIN query, exactly mirroring the `GET /:id` implementation:

```js
const result = await pool.query(`
  SELECT o.*,
         c.name  AS customer_name,  c.email AS customer_email,
         p.name  AS product_name,   p.price AS product_price
  FROM   orders    o
  JOIN   customers c ON o.customer_id = c.id
  JOIN   products  p ON o.product_id  = p.id
  ORDER BY o.created_at DESC
`);
res.json(result.rows);
```

This reduces every list-orders call from 2N+1 queries to exactly 1 query, regardless of how many orders exist.

---

## Issue 5 — Race Condition and Missing Transaction in Order Creation

**File:** `backend/src/routes/orders.js`, lines 55–91

**What it is:**
The `POST /api/orders` handler checks inventory and decrements it in two completely separate, non-atomic queries with no transaction:

```js
// Step 1 — check inventory (a separate SELECT)
const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [product_id]);
if (product.inventory_count < quantity) { return 400; }

// Step 2 — insert the order
const orderResult = await pool.query('INSERT INTO orders ...');

// Step 3 — decrement inventory (a separate UPDATE)
await pool.query('UPDATE products SET inventory_count = inventory_count - $1 ...');
```

These are three independent queries with no `BEGIN/COMMIT` wrapping them.

**Why it matters (Impact — Correctness / Data Integrity):**
Two concurrent requests for the last item in stock can both read `inventory_count = 1` in Step 1, both pass the `< quantity` check, and both proceed to create an order and decrement inventory — leaving `inventory_count = -1`. This is a classic TOCTOU (Time-Of-Check-Time-Of-Use) race condition. The result is overselling: orders are confirmed for stock that does not exist.

Additionally, if the server crashes between the `INSERT` and the `UPDATE`, an order is created but inventory is never decremented, leaving the data permanently inconsistent.

**How to fix:**
Wrap all three steps in a single database transaction. Use `SELECT ... FOR UPDATE` to acquire a pessimistic row lock on the product record so concurrent requests serialize on inventory checks:

```js
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // Lock the product row for the duration of this transaction
  const productResult = await client.query(
    'SELECT * FROM products WHERE id = $1 FOR UPDATE', [product_id]
  );
  // ... check inventory ...
  const orderResult = await client.query('INSERT INTO orders ...');
  // Atomic decrement with an additional safety check
  const updateResult = await client.query(
    `UPDATE products SET inventory_count = inventory_count - $1
     WHERE id = $2 AND inventory_count >= $1 RETURNING *`,
    [quantity, product_id]
  );
  if (updateResult.rows.length === 0) {
    await client.query('ROLLBACK');
    return res.status(400).json({ error: 'Insufficient inventory' });
  }
  await client.query('COMMIT');
  res.status(201).json(orderResult.rows[0]);
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
}
```

---

## Issue 6 — No Validation on Order Status Transitions

**File:** `backend/src/routes/orders.js`, lines 95–110

**What it is:**
The `PATCH /api/orders/:id/status` endpoint accepts any status value and sets it unconditionally, with no validation of what the current status is:

```js
const { status } = req.body;
// No check on allowed transitions
const result = await pool.query(
  'UPDATE orders SET status = $1 ... WHERE id = $2 RETURNING *',
  [status, req.params.id]
);
```

**Why it matters (Impact — Correctness / Data Integrity):**
Real business logic requires a one-way state machine: `pending → confirmed → shipped → delivered`. With no transition checks:
- A `delivered` order can be set back to `pending` (reverting a completed sale).
- A `shipped` order can jump directly to `pending` without going through cancellation.
- A client can set any arbitrary string (e.g. `"hacked"`) as a status.
- Status changes that should trigger other actions (e.g. restoring inventory on cancel) are bypassed.

**How to fix:**
Define the valid transitions as a map and validate against it before updating:

```js
const VALID_TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['shipped',   'cancelled'],
  shipped:   ['delivered'],
  delivered: [],
  cancelled: [],
};

const order = (await pool.query('SELECT status FROM orders WHERE id = $1', [id])).rows[0];
const allowed = VALID_TRANSITIONS[order.status] || [];
if (!allowed.includes(status)) {
  return res.status(400).json({
    error: `Cannot transition from "${order.status}" to "${status}"`
  });
}
```

Also validate that `status` is one of the known enum values to reject arbitrary strings.

---

## Issue 7 — Missing Dependency in useEffect Causes Stale Product Info

**File:** `frontend/src/components/CreateOrder.js`, line 27

**What it is:**
A `useEffect` hook is meant to update the displayed product details whenever the user picks a different product. However, `selectedProduct` is missing from its dependency array:

```js
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  }
}, [products]); // BUG: selectedProduct is used but not listed here
```

**Why it matters (Impact — Correctness / UX):**
The effect only re-runs when the `products` array changes (i.e., on initial load). If the user picks Product A, then changes to Product B, the product details panel continues showing Product A's name, price, and stock count. The user sees incorrect information and cannot accurately verify their order before submitting. This is a [React exhaustive-deps lint rule](https://reactjs.org/docs/hooks-rules.html) violation.

**How to fix:**
Add `selectedProduct` to the dependency array:

```js
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  } else {
    setSelectedProductData(null);
  }
}, [products, selectedProduct]); // both deps listed
```

---

## Issue 8 — Customer Search Fires an API Call on Every Keystroke (No Debounce)

**File:** `frontend/src/components/CustomerSearch.js`, lines 13–23

**What it is:**
The `handleSearch` function is called directly on every `onChange` event of the search input. Each character typed immediately fires a fetch request to the backend:

```js
const handleSearch = async (value) => {
  setQuery(value);
  if (value.length > 0) {
    const data = await searchCustomers(value); // API call on every keystroke
    setResults(data);
  }
};
```

There is also no loading state, no error handling, and no check for stale responses (a slow earlier request can resolve after a faster later one and overwrite the correct results).

**Why it matters (Impact — Performance / UX / Reliability):**
- For a 10-character search like "Aarav Shar", **10 separate API requests** are sent to the backend, each of which hits the database.
- Under poor network conditions this hammers a backend that has no rate limiting.
- If one request fails silently (which happens here — no error handling), results just disappear with no user feedback.
- Race conditions between in-flight requests can display stale/wrong results.

**How to fix:**
Debounce the search input with a 300–400ms delay using a `useEffect` + `setTimeout` pattern (no extra library needed):

```js
const [query, setQuery] = useState('');

useEffect(() => {
  if (!query) { setResults([]); return; }
  const timer = setTimeout(async () => {
    try {
      const data = await searchCustomers(query);
      setResults(data);
    } catch {
      setResults([]);
      // optionally show error message
    }
  }, 350);
  return () => clearTimeout(timer); // cancel on next keystroke
}, [query]);
```

---

## Issue 9 — Array Index Used as React Key on a Sortable List

**Files:** `frontend/src/components/OrderList.js`, line 62 & `frontend/src/components/CustomerSearch.js`, line 93

**What it is:**
Both components use the array index as the React `key` prop when rendering lists:

```jsx
{sortedOrders.map((order, index) => (
  <tr key={index}>   {/* BUG: index as key */}
```

```jsx
{results.map((customer, idx) => (
  <div className="customer-card" key={idx}>   {/* BUG: index as key */}
```

**Why it matters (Impact — Correctness / UX):**
React uses `key` to decide which DOM elements to reuse and which to destroy when the list changes. Using the index means that when the order list is re-sorted (the `handleSort` function reorders `sortedOrders`), React thinks row 0 is still row 0 and re-uses its DOM node — but the data for that row has changed. This causes:
- Stale state trapped inside controlled components (e.g., the status `<select>` not reflecting the right value after sorting)
- Visual glitches or flickers as rows appear to swap content incorrectly
- Input focus being lost unexpectedly

**How to fix:**
Use the stable, unique `id` from the data as the key:

```jsx
{sortedOrders.map((order) => (
  <tr key={order.id}>
```

```jsx
{results.map((customer) => (
  <div className="customer-card" key={customer.id}>
```

---

## Issue 10 — Dockerfiles Copy Source Before Installing Dependencies (Broken Layer Cache)

**Files:** `backend/Dockerfile`, line 5 & `frontend/Dockerfile`, line 5

**What it is:**
Both Dockerfiles copy the entire working directory before running `npm install`:

```dockerfile
COPY . .          # copies ALL files including source code
RUN npm install   # runs after any file change
```

**Why it matters (Impact — Performance / Developer Experience):**
Docker builds images layer by layer and caches each layer. When a `COPY` layer changes (because any file changed), all subsequent layers are invalidated and re-run. By placing `COPY . .` before `npm install`, **every code change — even a one-line edit — triggers a full `npm install`**, downloading and reinstalling all dependencies from scratch. This makes builds slow (typically 60–120 seconds extra per build) and wastes bandwidth.

Additionally, both Dockerfiles use the heavy `node:18` base image (~1 GB) for everything including the frontend's final runtime, even though the built React app is just static files.

**How to fix:**
Copy only `package.json` / `package-lock.json` first, run `npm ci`, then copy source. This way the install layer is cached and only re-runs when dependencies actually change:

```dockerfile
# Backend
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
EXPOSE 3001
CMD ["node", "src/index.js"]
```

```dockerfile
# Frontend — multi-stage build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY public ./public
COPY src    ./src
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
```

The multi-stage frontend build also replaces the development CRA server with nginx, which is appropriate for serving static assets in production.
