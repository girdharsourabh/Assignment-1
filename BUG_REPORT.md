# BUG_REPORT

This report lists the 7 most critical issues found in the current codebase, prioritized by impact on security, correctness, reliability, and performance. The list includes a balanced mix of 4 backend issues and 3 frontend issues, while still ordering them by overall severity.

## 1. SQL Injection in Customer Search

- What: The customer search endpoint builds SQL by concatenating untrusted user input into the query string.
- Where: [backend/src/routes/customers.js](backend/src/routes/customers.js), `router.get('/search')`, especially lines 18-20.
- Why it matters: This is the most serious security issue in the application. A malicious user can inject SQL through the `name` query parameter and alter query behavior or potentially access or damage data.
- How to fix it: Replace string concatenation with a parameterized query, for example `SELECT * FROM customers WHERE name ILIKE $1` using `[%${name}%]` as the bound value.

## 2. Orders Route Contains Combined Performance and Correctness Problems

- What: The orders route has two critical problems in the same module. `GET /orders` uses an N+1 query pattern, and `POST /orders` creates orders without a transaction or row lock.
- Where: [backend/src/routes/orders.js](backend/src/routes/orders.js), `router.get('/')` and `router.post('/')`.
- Why it matters: The list endpoint scales poorly because it runs extra queries per order, while the create endpoint can corrupt inventory/order state and oversell stock under concurrent requests.
- How to fix it: Replace the list loop with one joined query, and wrap order creation in a transaction with `SELECT ... FOR UPDATE` on the product row.

## 3. Global Error Handler Returns Success for Server Failures

- What: The Express error-handling middleware returns HTTP 200 with `{ success: true }` even when an error occurs.
- Where: [backend/src/index.js](backend/src/index.js), lines 23-26.
- Why it matters: Clients, tests, and monitoring cannot reliably detect failures. This hides real backend errors and makes debugging much harder.
- How to fix it: Return an appropriate non-2xx status code such as 500, include a failure payload, and log the actual error details.

## 4. Order Status Updates Are Unvalidated

- What: The status update endpoint accepts any status value and does not enforce valid business transitions.
- Where: [backend/src/routes/orders.js](backend/src/routes/orders.js), `router.patch('/:id/status')`, especially lines 85-96.
- Why it matters: Invalid states can be written to the database, which breaks business rules and directly affects the required cancellation feature.
- How to fix it: Validate incoming statuses against an allowlist and enforce transition rules on the server before updating the record.

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
2. Backend performance and correctness fix: optimize order listing and make order creation transactional
3. Backend business-rules fix: validate order status updates
4. Frontend reliability fix: centralized API error handling
5. Frontend correctness fix: stale selected product preview
