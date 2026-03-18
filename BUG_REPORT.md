# BUG REPORT — Order Management System

This report lists issues found across backend, frontend, and infrastructure, along with impact and recommended fixes.

## Issue 1 — SQL Injection in customer search (Security)

- **What**: Customer search builds SQL via string concatenation from user input.
- **Where**: `backend/src/routes/customers.js` in `GET /search` (originally around README seed code; see lines ~16–24).
- **Why it matters**: A malicious `name` parameter can modify the query (e.g., extract or alter data). This is a critical vulnerability.
- **How to fix**: Use parameterized queries with `ILIKE $1` and pass `%${name}%` as a bound parameter; validate `name` exists.
- **Status**: **Fixed** (parameterized query + missing-parameter validation).

## Issue 2 — Broken global error handler returns HTTP 200 (Correctness / Security)

- **What**: Express error middleware logs a generic message and always responds `200` with `{ success: true }` even on failures.
- **Where**: `backend/src/index.js` error middleware (lines ~23–26 in the original file).
- **Why it matters**:
  - Clients can’t detect failures (they receive “success” on errors).
  - Can mask real issues and lead to data corruption and unsafe retry patterns.
- **How to fix**: Log the actual error and return `500` with a safe error message; honor `res.headersSent`.
- **Status**: **Fixed** (returns `500 { error: 'Internal server error' }`).

## Issue 3 — N+1 query pattern when listing orders (Performance)

- **What**: `GET /orders` fetches all orders, then executes 2 extra queries per order to fetch customer and product details.
- **Where**: `backend/src/routes/orders.js` in `GET /` (originally the loop building `enrichedOrders`).
- **Why it matters**: Turns one request into \(1 + 2N\) database calls, which becomes slow quickly as order count grows.
- **How to fix**: Replace with a single JOIN query (like the existing `GET /orders/:id` approach).
- **Status**: **Fixed** (single JOIN query).

## Issue 4 — Order creation is not transactional (Data integrity / Correctness)

- **What**: Order is inserted, then inventory is decremented in a separate query without a transaction or row lock.
- **Where**: `backend/src/routes/orders.js` in `POST /`.
- **Why it matters**:
  - If the inventory update fails after insert, the order exists but inventory is not decremented.
  - Concurrent requests can oversell inventory without row locks.
- **How to fix**: Use a DB transaction with `BEGIN/COMMIT/ROLLBACK` and lock the product row with `FOR UPDATE` before checking inventory.
- **Status**: **Fixed** (transaction + `FOR UPDATE`).

## Issue 5 — Order status updates accept any string (Correctness)

- **What**: `PATCH /orders/:id/status` updates `status` with no validation.
- **Where**: `backend/src/routes/orders.js` in `PATCH /:id/status`.
- **Why it matters**: Any invalid status (typos, unexpected strings) can enter the database, breaking UI logic and business rules.
- **How to fix**: Validate `status` against an allowed set (e.g., `pending|confirmed|shipped|delivered|cancelled`).
- **Status**: **Fixed** (allowed status set).

## Issue 6 — Frontend product preview doesn’t update when changing selected product (Bug)

- **What**: `selectedProductData` is derived from `selectedProduct`, but the effect only reruns when `products` changes.
- **Where**: `frontend/src/components/CreateOrder.js` `useEffect` for `selectedProductData` (original comment “Missing: selectedProduct”).
- **Why it matters**: UI displays stale/incorrect price/stock calculation when user changes product.
- **How to fix**: Add `selectedProduct` to the dependency array; clear preview when selection is cleared.
- **Status**: **Fixed**.

## Issue 7 — Customer search query parameter not URL-encoded (Bug / Robustness)

- **What**: Frontend sends `?name=${name}` directly.
- **Where**: `frontend/src/api/index.js` in `searchCustomers`.
- **Why it matters**: Names containing `&`, `?`, `#`, spaces, etc. break requests or change semantics.
- **How to fix**: Use `encodeURIComponent(name)`.
- **Status**: **Fixed**.

## Issue 8 — Hardcoded DB credentials in code + compose defaults (Security / Ops)

- **What**: DB user/password/db name are hardcoded in `backend/src/config/db.js` and `docker-compose.yml`.
- **Where**: `backend/src/config/db.js`, `docker-compose.yml`.
- **Why it matters**: Promotes credential reuse, complicates environment changes, and increases risk of accidental leakage.
- **How to fix**: Read DB connection values from environment variables; provide safe local defaults; document in deployment notes.
- **Status**: **Fixed** (backend uses env vars; compose supports env overrides).

