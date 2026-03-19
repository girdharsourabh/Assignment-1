# BUG REPORT

## 1) SQL injection in customer search

- What: The search query is built with string concatenation from user input.
- Where: backend/src/routes/customers.js (`GET /search`)
- Why it matters: Attackers can inject SQL through the `name` query parameter, which is a serious security risk.
- How to fix: Use parameterized query placeholders and pass the search term as a value.

## 2) N+1 query pattern for listing orders

- What: The orders list fetches orders first, then queries customer and product for each order inside a loop.
- Where: backend/src/routes/orders.js (`GET /`)
- Why it matters: Performance degrades quickly as order count grows, causing slow API responses and unnecessary DB load.
- How to fix: Replace looped queries with a single `JOIN` query.

## 3) Non-transactional order creation causes data inconsistency

- What: Order insert and inventory decrement are separate queries without transaction protection.
- Where: backend/src/routes/orders.js (`POST /`)
- Why it matters: If one query succeeds and another fails, order and inventory can become inconsistent.
- How to fix: Use a DB transaction (`BEGIN/COMMIT/ROLLBACK`) and lock product row during inventory check.

## 4) Incorrect global error handler returns success for failures

- What: Global error middleware always returns HTTP 200 with `{ success: true }` even when an error occurs.
- Where: backend/src/index.js
- Why it matters: Clients cannot detect failures correctly; debugging and monitoring become unreliable.
- How to fix: Return proper error status code and error message.

## 5) Missing backend validation for status updates

- What: Any status string can be written by `PATCH /orders/:id/status`.
- Where: backend/src/routes/orders.js
- Why it matters: Invalid statuses can break business logic and downstream UI assumptions.
- How to fix: Validate against an allowed status list.

## 6) Frontend uses array index as React key in orders table

- What: Orders rows use `index` as key.
- Where: frontend/src/components/OrderList.js
- Why it matters: Can cause incorrect row reuse when list order changes (sorting/filtering).
- How to fix: Use stable key like `order.id`.

## 7) Product preview state does not refresh correctly

- What: Effect for selected product data misses `selectedProduct` dependency.
- Where: frontend/src/components/CreateOrder.js
- Why it matters: Product detail preview can become stale and show wrong values.
- How to fix: Include `selectedProduct` in dependency array and clear state when unselected.

## 8) Docker setup is not production-ready

- What: Dockerfiles install dependencies with broad copy steps and no restart/health configuration in compose.
- Where: backend/Dockerfile, frontend/Dockerfile, docker-compose.yml
- Why it matters: Slower builds, less reliable startup order, weaker runtime resilience.
- How to fix: Cache dependency install layers, add service restart policy and DB healthcheck with dependency condition.

---

## Critical issues fixed

1. Security: SQL injection in customer search fixed with parameterized query.
2. Performance: N+1 orders fetch replaced by one join query.
3. Data integrity: Order creation made transactional with rollback and row locking.
