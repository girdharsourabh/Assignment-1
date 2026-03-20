# BUG_REPORT

This report lists the 6 most critical issues found in the original codebase, prioritized by impact on security, correctness, reliability, and performance. It also notes the current status of each issue on this branch so the document stays aligned with the implemented fixes.

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
- Status: Fixed in commit `c448683`. The commit message says `fix: validate order status`, but the code change actually fixes the global error handler in [backend/src/index.js](backend/src/index.js).

## 4. Order Status Updates Are Unvalidated

- What: The status update endpoint accepts any status value and does not enforce valid business transitions.
- Where: [backend/src/routes/orders.js](backend/src/routes/orders.js), `router.patch('/:id/status')`, especially lines 85-96.
- Why it matters: Invalid states can be written to the database, which breaks business rules and directly affects the required cancellation feature.
- How to fix it: Validate incoming statuses against an allowlist and enforce transition rules on the server before updating the record.


## Fixes Made (Critical)

Based on the assignment requirements and the scope chosen for this submission, the four implemented priority fixes were:

1. Backend security fix: SQL injection in customer search
2. Backend performance and correctness fix: optimize order listing and make order creation transactional
3. Backend reliability fix: global error-handler correction
4. Frontend reliability fix: centralized API error handling
