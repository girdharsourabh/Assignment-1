# Bug Report — Order Management System



## 1) SQL Injection in Customer Search (Critical Security)
- What: User input is concatenated directly into a SQL query string.
- Where: `backend/src/routes/customers.js` line 19 (`GET /api/customers/search`).
- Why it matters: Attackers can inject SQL through `name` and potentially read or modify unintended data.
- How to fix: Use a parameterized query (`ILIKE $1`) with bind value `%${name}%`.

## 2) Inventory Race Condition During Order Creation (Critical Correctness)
- What: Inventory check and inventory decrement happen in separate queries without a transaction.
- Where: `backend/src/routes/orders.js` lines 59-83 (`POST /api/orders`).
- Why it matters: Concurrent requests can both pass the inventory check and oversell stock.
- How to fix: Use a DB transaction and atomic conditional update (`inventory_count >= quantity`) before creating order.

## 3) N+1 Query Pattern in Order Listing (High Performance)
- What: Orders are loaded first, then customer/product details are fetched per order inside a loop.
- Where: `backend/src/routes/orders.js` lines 8-24 (`GET /api/orders`).
- Why it matters: DB round trips scale linearly with order count, degrading performance.
- How to fix: Replace per-order queries with one joined query (`orders` + `customers` + `products`).

## 4) Invalid Status Transitions Allowed (High Data Integrity)
- What: Any status value can be set directly without transition rules.
- Where: `backend/src/routes/orders.js` lines 92-98 (`PATCH /api/orders/:id/status`).
- Why it matters: Business flow can become invalid (for example, moving from `delivered` back to `pending`).
- How to fix: Define allowed state transitions and reject invalid updates with `400`.

## 5) Global Error Handler Returns 200 for Failures (High Reliability)
- What: Error middleware always returns `200` with a success payload.
- Where: `backend/src/index.js` lines 23-25.
- Why it matters: Clients cannot detect failures correctly; monitoring/retries become misleading.
- How to fix: Return proper non-2xx status codes (`err.status || 500`) with error payload.

## 6) Missing Backend Validation for Customer Creation (Medium Security/Correctness)
- What: Customer creation accepts unvalidated `name`, `email`, `phone`.
- Where: `backend/src/routes/customers.js` lines 41-47 (`POST /api/customers`).
- Why it matters: Invalid/empty data can enter DB, and errors surface late at database layer.
- How to fix: Validate required fields, email format, length limits; return `400` on bad input.

## 7) Frontend API Wrapper Ignores HTTP Status (Medium UX/Reliability)
- What: API functions parse JSON without checking `res.ok`.
- Where: `frontend/src/api/index.js` lines 3-53.
- Why it matters: Failed API responses are treated like success and can cause inconsistent UI behavior.
- How to fix: Centralize request handling, check `res.ok`, and return or throw normalized errors.

