# Bug Report

## 1. Security Vulnerability: SQL Injection in Customer Search
* **Location:** `backend/src/routes/customers.js` -> `router.get('/search')` (Line 18)
* **What:** The search endpoint constructs the SQL query using string concatenation (`"SELECT * FROM customers WHERE name ILIKE '%" + name + "%'"`).
* **Why:** This allows a malicious user to inject arbitrary SQL commands. An attacker could bypass the intended query, access sensitive data, or drop tables.
* **Fix:** Use parameterized queries provided by the `pg` library. (e.g., `WHERE name ILIKE $1` and pass `['%' + name + '%']` as the parameter array).

## 2. Performance Issue: N+1 Query Problem in Order Fetching

* **Location:** `backend/src/routes/orders.js` -> `router.get('/')` (Line 10-23)
* **What:** The endpoint fetches all orders, then iterates through them in a `for...of` loop, making two separate database calls (to `customers` and `products`) for *every single order*. 
* **Why:** If there are 1000 orders, this results in 1 + 1000 + 1000 = 2001 database queries. This will severely degrade database performance and increase API latency.
* **Fix:** Refactor the initial query to use SQL `JOIN`s to fetch the customer and product details in a single database round-trip.

## 3. Data Integrity: Race Condition in Order Creation
* **Location:** `backend/src/routes/orders.js` -> `router.post('/')` (Line 52-78)
* **What:** The inventory is checked, the order is created, and the inventory is decremented in three separate, independent operations without a database transaction.
* **Why:** If two concurrent requests try to buy the last item simultaneously, both will pass the inventory check, resulting in negative inventory and data inconsistency. 
* **Fix:** Wrap the `SELECT`, `INSERT`, and `UPDATE` statements inside a SQL transaction (`BEGIN` and `COMMIT`). The initial `SELECT` should also ideally use `FOR UPDATE` to lock the row.

## 4. Error Handling: Masked 500 Errors
* **Location:** `backend/src/index.js` -> Global Error Handler (Line 24-27)
* **What:** The global `app.use((err, req, res, next) => ...)` middleware catches errors but returns a `200 OK` status with `{ success: true }`.
* **Why:** This masks actual server failures. The frontend will think the operation succeeded when it actually crashed, leading to broken UX and making debugging impossible.
* **Fix:** Change the response to `res.status(500).json({ error: 'Internal server error' })` and properly log the actual `err.message`.

## 5. Frontend Bug: Missing Dependency in React Hook
* **Location:** `frontend/src/components/CreateOrder.js` -> `useEffect` (Line 16-21)
* **What:** The `useEffect` hook that updates `selectedProductData` only includes `products` in its dependency array. It is missing `selectedProduct`.
* **Why:** When a user selects a new product from the dropdown, the UI will not immediately update to show the selected product's details and price calculation, as the effect won't re-trigger.
* **Fix:** Add `selectedProduct` to the dependency array: `}, [products, selectedProduct]);`.
