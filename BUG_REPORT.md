# Bug Report

## Summary

| # | Issue | Severity | Category | Location |
|---|-------|----------|----------|----------|
| 1 | SQL Injection in customer search | **Critical** | Security | `backend/src/routes/customers.js`, line 19 |
| 2 | Error handler returns 200 / success | **Critical** | Correctness | `backend/src/index.js`, lines 23–26 |
| 3 | N+1 queries on order listing | **High** | Performance | `backend/src/routes/orders.js`, lines 6–30 |
| 4 | Race condition on inventory check | **High** | Data Integrity | `backend/src/routes/orders.js`, lines 54–88 |
| 5 | Stale `useEffect` dependency | **Medium** | Correctness | `frontend/src/components/CreateOrder.js`, lines 20–25 |
| 6 | No HTTP error handling in frontend API | **Medium** | Reliability | `frontend/src/api/index.js`, all functions |
| 7 | Hardcoded database credentials | **Medium** | Security | `backend/src/config/db.js`, lines 4–10 and `docker-compose.yml`, lines 7–8 |

---

## Issue 1: SQL Injection in Customer Search

| Field | Details |
|-------|---------|
| **What** | The customer search endpoint builds its SQL query by directly concatenating user input (`name`) into the query string instead of using parameterized queries. |
| **Where** | `backend/src/routes/customers.js`, line 19 — `GET /search` handler |
| **Why it matters** | **(Security — Critical)** An attacker can supply a crafted `name` query parameter (e.g., `'; DROP TABLE customers; --`) to execute arbitrary SQL. This can lead to full data exfiltration, deletion, or privilege escalation. Every other query in the codebase correctly uses `$1`-style parameterized queries, making this a clear oversight. |
| **Fix** | Use a parameterized query: pass `$1` as the placeholder and `[%${name}%]` as the parameter array to `pool.query()`. |

---

## Issue 2: Global Error Handler Returns `200 OK` on Errors

| Field | Details |
|-------|---------|
| **What** | The Express global error-handling middleware logs a vague message (`"Something happened"`) and responds with HTTP `200` and `{ success: true }`, hiding every unhandled server error. |
| **Where** | `backend/src/index.js`, lines 23–26 |
| **Why it matters** | **(Correctness / Reliability — Critical)** Clients never know when a request failed — they always receive a "success" response. This makes debugging impossible and causes silent data-integrity issues. The vague log message provides no stack trace. |
| **Fix** | Change the status to `500`, return `{ error: 'Internal server error' }`, and use `console.error` with `err.stack`. |

---

## Issue 3: N+1 Query Problem in Order Listing

| Field | Details |
|-------|---------|
| **What** | The `GET /orders` endpoint fetches all orders, then fires two additional DB queries *per order* (one for customer, one for product) inside a `for` loop. |
| **Where** | `backend/src/routes/orders.js`, lines 6–30 — `GET /` handler |
| **Why it matters** | **(Performance — High)** With N orders this executes `1 + 2N` queries. For 100 orders that's 201 DB round-trips. The `GET /orders/:id` endpoint (line 33) already uses a `JOIN`, proving the correct pattern is known. |
| **Fix** | Replace the loop with a single `JOIN` query across orders, customers, and products — identical to the approach already used in `GET /orders/:id`. |

---

## Issue 4: Race Condition in Order Creation (Inventory Not Atomic)

| Field | Details |
|-------|---------|
| **What** | Order creation checks inventory in one query, then decrements it in a separate query. These are not wrapped in a database transaction. |
| **Where** | `backend/src/routes/orders.js`, lines 54–88 — `POST /` handler |
| **Why it matters** | **(Data Integrity — High)** Two concurrent requests can both pass the inventory check, both create orders, and drive inventory negative. If the decrement `UPDATE` fails after the order `INSERT` succeeds, the system is left inconsistent. |
| **Fix** | Wrap the sequence in a `BEGIN` / `COMMIT` transaction using `pool.connect()` and use `SELECT ... FOR UPDATE` to lock the product row during the check. `ROLLBACK` on any error. |

---

## Issue 5: Stale React State Due to Missing `useEffect` Dependency

| Field | Details |
|-------|---------|
| **What** | A `useEffect` hook computes `selectedProductData` whenever `products` changes, but reads `selectedProduct` without listing it in the dependency array. |
| **Where** | `frontend/src/components/CreateOrder.js`, lines 20–25 |
| **Why it matters** | **(Correctness — Medium)** When the user picks a different product, the effect doesn't re-run. The price/stock preview stays stuck on the first selection. The inline comment `// Missing: selectedProduct` confirms this was known but not fixed. |
| **Fix** | Add `selectedProduct` to the dependency array: `[products, selectedProduct]`. |

---

## Issue 6: Frontend API Layer Never Checks for HTTP Errors

| Field | Details |
|-------|---------|
| **What** | Every function in the frontend API module calls `fetch()` and immediately calls `res.json()` without checking `res.ok` or the HTTP status code. |
| **Where** | `frontend/src/api/index.js` — all functions (lines 3–53) |
| **Why it matters** | **(Reliability — Medium)** `fetch` does not throw on 4xx/5xx — it resolves normally. The frontend silently treats error responses as valid data. Combined with Issue 2, the UI has no way to surface real failures. Network errors throw unhandled promise rejections. |
| **Fix** | Add a shared wrapper that checks `res.ok` before calling `res.json()`, and throws an `Error` with the server's error message on failure. |

---

## Issue 7: Hardcoded Database Credentials

| Field | Details |
|-------|---------|
| **What** | DB username and password are hardcoded in `db.js` and `docker-compose.yml` instead of being read from environment variables. |
| **Where** | `backend/src/config/db.js`, lines 4–10; `docker-compose.yml`, lines 7–8 |
| **Why it matters** | **(Security — Medium)** Credentials committed to source control are easily leaked. The backend ignores any env vars docker-compose could pass, so overriding at deploy time is impossible. |
| **Fix** | Read `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` from `process.env` in `db.js`. Supply values via the `environment` block in `docker-compose.yml` using a `.env` file that is git-ignored. |
