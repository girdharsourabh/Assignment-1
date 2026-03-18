# BUG_REPORT

This report lists the 7 most critical issues found in the current codebase, prioritized by impact on security, correctness, reliability, and performance. The list includes a balanced mix of 4 backend issues and 3 frontend issues, while still ordering them by overall severity.

## 1. SQL Injection in Customer Search

- What: The customer search endpoint builds SQL by concatenating untrusted user input into the query string.
- Where: [backend/src/routes/customers.js](backend/src/routes/customers.js), `router.get('/search')`, especially lines 18-20.
- Why it matters: This is the most serious security issue in the application. A malicious user can inject SQL through the `name` query parameter and alter query behavior or potentially access or damage data.
- How to fix it: Replace string concatenation with a parameterized query, for example `SELECT * FROM customers WHERE name ILIKE $1` using `[%${name}%]` as the bound value.

## 2. Order Creation Is Not Transactional

- What: Creating an order and decrementing inventory are executed as separate database operations without a transaction.
- Where: [backend/src/routes/orders.js](backend/src/routes/orders.js), `router.post('/')`, especially lines 58-83.
- Why it matters: If the order insert succeeds but the inventory update fails, or vice versa, the database becomes inconsistent. This creates data integrity issues that are hard to detect and repair later.
- How to fix it: Wrap the inventory lookup, inventory update, and order creation in a single database transaction using `BEGIN`, `COMMIT`, and `ROLLBACK`.

## 3. Inventory Race Condition Can Oversell Products

- What: Inventory is checked first and reduced later, but the product row is never locked during order creation.
- Where: [backend/src/routes/orders.js](backend/src/routes/orders.js), `router.post('/')`, especially lines 58-83.
- Why it matters: Two concurrent requests can both pass the inventory check before either update runs, causing the system to oversell stock.
- How to fix it: Lock the product row while creating the order, for example by selecting it `FOR UPDATE` inside a transaction before validating and decrementing inventory.

## 4. N+1 Query Pattern in Order Listing

- What: The order list endpoint fetches all orders first, then runs two more queries per order to fetch customer and product data.
- Where: [backend/src/routes/orders.js](backend/src/routes/orders.js), `router.get('/')`, especially lines 8-24.
- Why it matters: This creates `1 + 2n` queries for `n` orders, which scales poorly and will noticeably slow down the API as data grows.
- How to fix it: Replace the loop with one SQL query that joins `orders`, `customers`, and `products` and returns all required fields in a single round trip.

## 5. Frontend API Layer Does Not Handle HTTP Errors Properly

- What: All frontend API helpers call `fetch(...)` and immediately return `res.json()` without checking `res.ok`.
- Where: [frontend/src/api/index.js](frontend/src/api/index.js), throughout the module, especially lines 3-52.
- Why it matters: The UI cannot reliably distinguish success from failure. Server-side validation or 4xx/5xx responses can be silently treated as normal data, leading to broken user flows and poor error handling.
- How to fix it: Add a shared request helper that checks `res.ok`, parses error payloads safely, and throws or returns a normalized error object for the UI to handle consistently.

## 6. Create Order Product Preview Can Become Stale

- What: The effect that updates `selectedProductData` depends only on `products`, even though it also uses `selectedProduct`.
- Where: [frontend/src/components/CreateOrder.js](frontend/src/components/CreateOrder.js), lines 19-25.
- Why it matters: When the user changes the selected product, the preview block may not update correctly, causing the displayed product details, pricing preview, and inventory info to become stale or misleading.
- How to fix it: Add `selectedProduct` to the dependency array and clear `selectedProductData` when no product is selected.

## 7. Order List Uses Array Index as React Key

- What: The order table renders rows using `key={index}` instead of a stable identifier such as `order.id`.
- Where: [frontend/src/components/OrderList.js](frontend/src/components/OrderList.js), line 60.
- Why it matters: Because the table is sortable and data can refresh after status changes, index-based keys can cause React to reuse the wrong row instances, creating subtle UI inconsistencies.
- How to fix it: Use `key={order.id}` so each rendered row remains stable across sorting, updates, and re-fetches.

## Fixes Made (Critical)

Based on the assignment requirements, the best issues to prioritize for implementation are:

1. Backend security fix: SQL injection in customer search
2. Backend performance fix: N+1 query pattern in order listing
3. Backend correctness fix: non-transactional order creation with inventory race condition
4. Frontend reliability fix: centralized API error handling
5. Frontend correctness fix: stale selected product preview
