# Bug Report

## Issue 1) Global error handler always returns 200 OK (Medium - Reliability)

- What: Express error middleware in `backend/src/index.js` sends status `200` and `{ success: true }` for all errors.

- Where: `backend/src/index.js`, error middleware block around line ~23-27.

- Impact: high (reliability) - hides errors and breaks API expectations.

- Fix: return proper error status and error message.
  ```js
  app.use((err, req, res, next) => {
    console.error(err);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal Server Error' });
  });
  ```

---

## Issue 2) SQL injection in customer search (Critical - Security)

- What: `router.get('/search')` in `backend/src/routes/customers.js` concatenates `name` into SQL query.

- Where: `backend/src/routes/customers.js`, function `router.get('/search', ...)` around line 20.

- Impact: critical (security) - arbitrary SQL execution possible.

- Fix: using a parameterized query.
  ```js
    const result = await pool.query(
      'SELECT * FROM customers WHERE name ILIKE $1',
      [`%${name}%`]
    );
  ```

---

## Issue 3) Order creation race condition / inventory is not transactional (High - Correctness/Data Integrity)

- What: `router.post('/')` in `backend/src/routes/orders.js` reads inventory, inserts order, then updates inventory separately.

Two different users accessing an order simultaneously, inserting and updating count can add wrong data.

- Where: `backend/src/routes/orders.js`, function `router.post('/', ...)` around lines 62-87.

- Impact: high (correctness/data integrity) - overselling stock under concurrency.

- Fix: wrap the entire operation in a single transaction and lock the row.
  ```js
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: products } = await client.query(
      'SELECT inventory_count, price FROM products WHERE id = $1 FOR UPDATE',
      [product_id]
    );
    // validate then update and insert order, then COMMIT
    await pool.query(
      'UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2',
      [quantity, product_id]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  ```

---

## Issue 4) N+1 SQL query pattern in order list API (Medium - High - Performance)

- What: `GET /orders` in `backend/src/routes/orders.js` queries orders, then loops and queries customers/products per order.

- Where: `backend/src/routes/orders.js`, function `router.get('/', ...)` around lines ~9-25.

- Impact: medium-high (performance) - too many DB round-trips at scale. It'll take linear time to query the database, and increase the load on database or might crash if the number of request get too high.

- Fix: use a single join query as used in `GET ('/:id)` for single order between line 36-43.

  ```js
  const result = await pool.query(`
    SELECT o.*, c.name AS customer_name, c.email AS customer_email,
           p.name AS product_name, p.price AS product_price
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN products p ON o.product_id = p.id
    ORDER BY o.created_at DESC
  `);
  ```

---

## Issue 5) Hard-coded weak DB credentials (High - Security)

- What: `db` service in `docker-compose.yml` and values for connecting db to backend, uses hard-coded credentials `admin/admin123`.

- Where: `docker-compose.yml`, lines ~5-12,
         `backend/src/config/db.js`.

- Impact: high (security) - secrets in source control. It'll expose the database url which increases the security risks.

- Fix: use `.env` and no defaults:
  ```yaml
  environment:
    POSTGRES_USER: ${POSTGRES_USER}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_DB: ${POSTGRES_DB}
  ```

```js
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST || 'db',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_NAME,
});
```

---

## Issue 6) Frontend stale state / missing loading/error handling (Medium - Usability)

- What: `CreateOrder` has `useEffect` dep misuse; `OrderList`/`CustomerSearch` lack loading/error state.

- Where: `frontend/src/components/CreateOrder.js` line 27.

- Impact: medium (usability) - stale UI, no feedback, even when the user change the product it won't show in the UI.

- Fix:
  - Add missing dep: `useEffect(() => {...}, [products, selectedProduct]);`
  - Add loading and error state fields and display messages when fetch fails.

---

## Issue 7) Missing order status transition validation (Medium - Correctness)

- What: `/orders/:id/status` updates status arbitrarily with no rule.

- Where: `backend/src/routes/orders.js`, function `router.patch('/:id/status', ...)` around lines ~70-85.

- Impact: medium (correctness) - impossible business states.

- Fix:
  ```js
  const allowed = ['pending','confirmed','shipped','delivered'];
  if (!allowed.includes(status)) return res.status(400).json({error:'Invalid status'});
  ```

---

## Issue 8) Array Index Used as `key` in List (Low — Bug)

-What: Array index is used a key in sortable list
```jsx
{sortedOrders.map((order, index) => (
    <tr key={index}>
    ...
    )
}
```

-Where: In `frontend/src/components/OrderList.js` at line 62

-Impact: low (bug) - When the list is sorted, React uses the key to distinguish and reconcile DOM nodes. Now, using array indexes as key might change with in order of values and the key will be same, causing incorrect rendering, which can cause - stale input values and wrong elements status on `select` statement.

-Fix: Use the stable unique identifier: `<tr key={order.id}>`

---

## Issue 9) No Debounce on Customer Search (Low — Performance)

-What: `handleSearch` no debouncing on firing keys in input.

-File: In `frontend/src/components/CustomerSearch.js`at lines 15–23, function `handleSearch`.

-Impact: low (performance) - typing anything fires requests for each letter. At scale for large number of users, this causes unnecessary load on server and can trigger rate limiting, also might cause race condition with stale responses.

-Fix: Debounce the API call by some value 200ms - 400ms, or use an `AbortController` to cancel in-flight requests when a new one starts.

---
