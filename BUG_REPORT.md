# Bug Report

## Issue 1: SQL Injection in Customer Search

**What:** The customer search endpoint builds a SQL query using raw string concatenation with user input.

**Where:** `backend/src/routes/customers.js`, line 19
```js
const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";
```

**Why:** An attacker can inject arbitrary SQL through the `name` query parameter. For example, passing `'; DROP TABLE customers; --` would destroy the customers table. This is a critical security vulnerability that can lead to data theft, data loss, or full database compromise.

**How to fix:** Use parameterized queries with `$1` placeholders instead of string concatenation.

---

## Issue 2: N+1 Query in Order Listing

**What:** The `GET /api/orders` endpoint fetches all orders first, then runs two separate queries (one for customer, one for product) for every single order inside a loop.

**Where:** `backend/src/routes/orders.js`, lines 8–24

**Why:** For N orders this results in 1 + 2N database queries. With 100 orders that's 201 queries instead of 1. This causes serious latency and unnecessary database load as order count grows.

**How to fix:** Use a single query with `JOIN` to fetch orders along with customer and product details, exactly like the `GET /:id` endpoint already does.

---

## Issue 3: No Transaction in Order Creation (Race Condition)

**What:** Order creation performs three separate operations — check inventory, insert order, decrement inventory — without wrapping them in a database transaction.

**Where:** `backend/src/routes/orders.js`, lines 59–83

**Why:** Two concurrent requests for the same product can both pass the inventory check before either decrements the count, leading to overselling. The inventory count can also go negative. If the server crashes after inserting the order but before decrementing inventory, the data becomes inconsistent.

**How to fix:** Wrap the entire operation in a `BEGIN`/`COMMIT` transaction and use `SELECT ... FOR UPDATE` to lock the product row during the check.

---

## Issue 4: Global Error Handler Returns 200 OK on Errors

**What:** The Express global error handler catches all unhandled errors and responds with HTTP 200 and `{ success: true }`.

**Where:** `backend/src/index.js`, lines 23–26
```js
app.use((err, req, res, next) => {
  console.log('Something happened');
  res.status(200).json({ success: true });
});
```

**Why:** Clients never know something went wrong. Errors get silently swallowed, making debugging nearly impossible and hiding real failures from both users and monitoring systems.

**How to fix:** Return a 500 status code with an appropriate error message, and use `console.error` to log the actual error object.

---

## Issue 5: Missing Dependency in useEffect (Frontend)

**What:** The `useEffect` that updates `selectedProductData` when a product is selected is missing `selectedProduct` from the dependency array.

**Where:** `frontend/src/components/CreateOrder.js`, line 25
```js
}, [products]); // Missing: selectedProduct
```

**Why:** When the user changes the selected product, the effect does not re-run. The product info preview below the dropdown stays stale and shows the previously selected product's details until the `products` array changes, which effectively never happens.

**How to fix:** Add `selectedProduct` to the dependency array so the effect runs whenever the selection changes.

---

## Issue 6: Hardcoded Database Credentials

**What:** The database connection configuration has the username, password, host, and database name hardcoded directly in the source code.

**Where:** `backend/src/config/db.js`, lines 4–10
```js
const pool = new Pool({
  user: 'admin',
  password: 'admin123',
  host: 'db',
  port: 5432,
  database: 'orderdb',
});
```

**Why:** Credentials in source code get committed to version control and are visible to anyone with repo access. Changing credentials requires a code change and redeployment. This makes it harder to manage different environments (dev, staging, production).

**How to fix:** Read credentials from environment variables (e.g., `process.env.DB_USER`) and set them via `docker-compose.yml` environment configuration.

---

## Issue 7: No API Response Error Checking in Frontend

**What:** Every API function in the frontend calls `res.json()` without first checking whether the HTTP response was successful via `res.ok`.

**Where:** `frontend/src/api/index.js`, all functions (e.g., lines 4–6)
```js
export async function fetchOrders() {
  const res = await fetch(`${API_BASE}/orders`);
  return res.json();
}
```

**Why:** If the backend returns a 500 or 404 error, the frontend silently tries to parse and use the error response body as if it were valid data. This can cause the UI to show broken state (e.g., empty order list with no error message) or crash entirely if the response body shape doesn't match expectations.

**How to fix:** Check `res.ok` after every `fetch` call and throw an error when the response indicates failure, so the calling code can handle it and display a user-friendly message.
