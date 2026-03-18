# Bug Report — Order Management System

## Issue 1: SQL Injection in Customer Search (Critical — Security)
**File:** `backend/src/routes/customers.js`, line 19
**What it is:** The search query builds SQL by concatenating user input directly into the query string.
**Why it matters:** An attacker can manipulate or destroy the database through the search input.
**Fix:** Use parameterised query with $1 instead of string concatenation.

## Issue 2: N+1 Query Problem in GET /orders (Performance)
**File:** `backend/src/routes/orders.js`, lines 6–25
**What it is:** Fetches all orders then fires 2 extra queries per order inside a loop.
**Why it matters:** 100 orders = 201 database queries. Causes severe slowdown under load.
**Fix:** Replace loop with a single JOIN query.

## Issue 3: Non-Atomic Order Creation (Data Integrity)
**File:** `backend/src/routes/orders.js`, lines 47–73
**What it is:** Order creation does 3 separate DB steps with no transaction.
**Why it matters:** Race conditions can cause overselling. Server crash mid-way leaves corrupt data.
**Fix:** Wrap all steps in BEGIN/COMMIT transaction with SELECT FOR UPDATE.

## Issue 4: Broken Global Error Handler (Reliability)
**File:** `backend/src/index.js`, lines 22–25
**What it is:** Error handler returns HTTP 200 with { success: true } for every error.
**Why it matters:** Errors are silently hidden from clients and monitoring systems.
**Fix:** Return HTTP 500 with actual error message.

## Issue 5: Missing React Hook Dependency (Bug)
**File:** `frontend/src/components/CreateOrder.js`, line 34
**What it is:** useEffect missing selectedProduct in dependency array.
**Why it matters:** Product price/stock preview never updates when user changes product selection.
**Fix:** Add selectedProduct to the dependency array.

## Issue 6: Array Index Used as React Key (Bug)
**File:** `frontend/src/components/OrderList.js`, line 50
**What it is:** Table rows use array index as key instead of order.id.
**Why it matters:** Causes rendering glitches when list is sorted or items are removed.
**Fix:** Use order.id as the key.

## Issue 7: Database Credentials Hard-Coded (Security)
**File:** `backend/src/config/db.js`, `docker-compose.yml`
**What it is:** Username and password hard-coded directly in source files.
**Why it matters:** Anyone with repo access can see credentials. Rotating passwords requires code change.
**Fix:** Read credentials from environment variables.

## Issue 8: No Input Validation on Order Creation (Security/Correctness)
**File:** `backend/src/routes/orders.js`, POST /
**What it is:** No validation on quantity, customer_id, product_id, or shipping_address.
**Why it matters:** Negative quantity would increase inventory count instead of decreasing it.
**Fix:** Validate all inputs before processing.