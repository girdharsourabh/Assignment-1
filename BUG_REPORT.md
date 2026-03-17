# Bug Report — Order Management System

This report is written so a new engineer can quickly understand what’s wrong, why it’s important, and how to fix/verify it.

## Scope

- **Backend**: Node.js / Express in `backend/src`
- **Frontend**: React in `frontend/src`
- **Database**: PostgreSQL schema/seed in `db/init.sql`
- **Infra**: Docker in `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`

## Quick start (for reproducing issues)

1. Run: `docker compose up --build`
2. Backend health: `GET http://localhost:3001/api/health`
3. Frontend: `http://localhost:3000`

## Summary of issues

| ID | Severity | Area | Title | Location |
|---:|:--|:--|:--|:--|
| 1 | Critical | Backend | SQL injection in customer search | `backend/src/routes/customers.js` lines 16–25 |
| 2 | High | Backend | N+1 DB queries when listing orders | `backend/src/routes/orders.js` lines 6–30 |
| 3 | Critical | Backend/DB | Order creation not transactional (inventory can desync) | `backend/src/routes/orders.js` lines 54–90 |
| 4 | High | Backend | Error handler returns 200 OK even on failures | `backend/src/index.js` lines 23–26 |
| 5 | Medium | Backend/Infra | Hard-coded DB credentials in source | `backend/src/config/db.js` lines 4–10 |
| 6 | Low | Frontend | Product preview doesn’t update when selection changes | `frontend/src/components/CreateOrder.js` lines 20–26 |
| 7 | Medium | Frontend | API wrapper ignores HTTP failures and doesn’t URL-encode | `frontend/src/api/index.js` lines 1–53 |
| 8 | Low | Frontend | React list uses unstable keys (`index`) | `frontend/src/components/OrderList.js` lines 59–61 |
| 9 | Medium | Backend | Order status update accepts any string (no validation) | `backend/src/routes/orders.js` lines 93–107 |
| 10 | Medium | Infra | Docker setup is dev-oriented (root user, no healthchecks, non-reproducible installs) | `docker-compose.yml` lines 3–30; Dockerfiles |

---

## 1) SQL Injection in customer search

- **Severity**: Critical (Security)
- **What is happening**: The endpoint builds SQL by concatenating untrusted user input.
- **Where**: `backend/src/routes/customers.js` lines 16–25
  - `const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";`
- **Why it matters**:
  - An attacker can inject SQL to read/modify data.
  - Even “normal” names containing `'` can break the query.
- **How to reproduce**:
  - Call: `GET /api/customers/search?name=%27%20OR%201%3D1%20--`
  - Expected secure behavior: treat it as a literal search string, not SQL.
- **Fix**:
  - Use a parameterized query, e.g. `WHERE name ILIKE $1` with `[%${name}%]`.
  - Add basic validation: `name` required, trimmed, reasonable max length.
- **How to verify the fix**:
  - The injection string returns only matching names (likely none), and the API does not error.

---

## 2) N+1 query pattern when listing orders

- **Severity**: High (Performance)
- **What is happening**: `GET /api/orders` fetches orders, then runs 2 extra queries per order (customer + product).
- **Where**: `backend/src/routes/orders.js` lines 6–30
- **Why it matters**:
  - DB round trips scale as $2N + 1$.
  - With enough orders this becomes slow and can overload the database.
- **Fix**:
  - Replace with a single JOIN query (like the existing single-order endpoint already does).
- **How to verify the fix**:
  - `GET /api/orders` should execute one SQL query (observed via logs/pg stats) and stay fast as orders grow.

---

## 3) Order creation is not transactional (inventory correctness)

- **Severity**: Critical (Data integrity / Correctness)
- **What is happening**:
  - The code inserts an order, then decrements inventory in a second query without a transaction.
  - The inventory “check” and the decrement are not atomic.
- **Where**: `backend/src/routes/orders.js` lines 54–90
- **Why it matters**:
  - If the inventory update fails after the insert, the order exists but inventory is not reduced.
  - Under concurrent requests, you can oversell (inventory can go negative) because two requests can pass the `inventory_count < quantity` check before either decrements.
- **Fix** (either is acceptable):
  - Use a DB transaction (`BEGIN`/`COMMIT`/`ROLLBACK`) and lock the product row (`SELECT ... FOR UPDATE`), then insert + update inside the same transaction.
  - Or perform an atomic conditional decrement: `UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2 AND inventory_count >= $1 RETURNING ...` and only create the order if the update succeeds.
- **How to verify the fix**:
  - Force an error mid-request and confirm no partial state remains.
  - Run concurrent order creations and confirm inventory never becomes negative.

---

## 4) Global Express error handler returns HTTP 200 even on errors

- **Severity**: High (Correctness / Observability)
- **What is happening**: The global error handler returns `200` and `{ success: true }` for any error.
- **Where**: `backend/src/index.js` lines 23–26
- **Why it matters**:
  - Clients interpret failures as successes.
  - Real errors get masked; debugging and monitoring become much harder.
- **Fix**:
  - Return a non-2xx status (usually 500) and a consistent error payload.
  - Log the real error (message/stack) at least in development.
- **How to verify the fix**:
  - Trigger a backend error and confirm the HTTP status is 4xx/5xx (not 200).

---

## 5) Hard-coded database credentials in source code

- **Severity**: Medium (Security / Deployment)
- **What is happening**: DB username/password/host are hard-coded.
- **Where**: `backend/src/config/db.js` lines 4–10
- **Why it matters**:
  - Secrets in source are unsafe.
  - Hard to run in different environments (CI/staging/prod).
- **Fix**:
  - Read connection details from environment variables (`PGHOST`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGPORT`).
  - Keep local dev defaults in `docker-compose.yml`.
- **How to verify the fix**:
  - App connects successfully when env vars are provided; fails clearly when they are missing.

---

## 6) Create Order product preview doesn’t update

- **Severity**: Low (UI correctness)
- **What is happening**: The selected product preview is derived from `selectedProduct`, but the effect does not re-run when `selectedProduct` changes.
- **Where**: `frontend/src/components/CreateOrder.js` lines 20–26
  - `useEffect(..., [products]); // Missing: selectedProduct`
- **Why it matters**: Users see stale product/price/stock info.
- **Fix**:
  - Include `selectedProduct` in the dependency array.
- **How to verify the fix**:
  - Switch products in the dropdown; the “Selected:” box updates immediately.

---

## 7) Frontend API wrapper ignores HTTP errors + doesn’t encode query

- **Severity**: Medium (Correctness)
- **What is happening**:
  - API calls do `return res.json()` without checking `res.ok`.
  - Search uses raw user input in the query string.
- **Where**: `frontend/src/api/index.js` lines 1–53 (notably 36–39)
- **Why it matters**:
  - 4xx/5xx responses can be treated as “successful” payloads.
  - Names with spaces/special characters can break customer search.
- **Fix**:
  - Centralize fetch into a helper that checks `res.ok`.
  - Use `encodeURIComponent(name)`.
- **How to verify the fix**:
  - Simulate a 500 from the backend and confirm UI shows a useful error.
  - Search for a name with spaces/special characters and confirm it works.

---

## 8) React list keys use array index

- **Severity**: Low (UI correctness)
- **What is happening**: Order rows render with `key={index}`.
- **Where**: `frontend/src/components/OrderList.js` lines 59–61
- **Why it matters**: Sorting/updating can cause React to reuse the wrong DOM rows.
- **Fix**:
  - Use a stable key: `key={order.id}`.
- **How to verify the fix**:
  - Sort by different columns; no row “jumps” or incorrect state carry-over.

---

## 9) No validation for order status updates

- **Severity**: Medium (Correctness)
- **What is happening**: `PATCH /api/orders/:id/status` accepts any status string.
- **Where**: `backend/src/routes/orders.js` lines 93–107
- **Why it matters**: Invalid values can be stored (e.g. `"DONE"`, `"hacked"`). This also makes it hard to enforce cancellation rules later.
- **Fix**:
  - Validate `status` against an allowed list.
  - Optionally enforce allowed transitions.
- **How to verify the fix**:
  - Sending an invalid status returns 400 and does not update the order.

---

## 10) Docker setup is dev-oriented (not production-ready)

- **Severity**: Medium (Security / Reliability / Reproducibility)
- **What is happening**:
  - Dockerfiles run as root and copy the entire context.
  - Uses `npm install` (less reproducible than `npm ci`).
  - `docker-compose.yml` publishes the DB port on the host by default.
  - No healthchecks; backend may start before DB is ready.
- **Where**:
  - `backend/Dockerfile` lines 1–11
  - `frontend/Dockerfile` lines 1–11
  - `docker-compose.yml` lines 3–30
- **Why it matters**:
  - Larger attack surface and less predictable deployments.
  - Flaky startups (race between backend and DB readiness).
- **Fix**:
  - Use `npm ci`, add `.dockerignore`, use a non-root user.
  - Add healthchecks and (optionally) avoid publishing the DB port unless needed.
- **How to verify the fix**:
  - Containers start reliably from a clean build.
  - Health checks report `healthy` when services are ready.
