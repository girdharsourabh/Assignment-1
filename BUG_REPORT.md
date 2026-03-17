# Bug Report — Order Management System

## Issue 1: SQL Injection Vulnerability in Customer Search
- **What:** User input is directly interpolated into SQL query without sanitization.
- **Where:** backend/src/routes/customers.js (lines 18-20)
- **Why:** Allows attackers to inject malicious SQL, risking data theft or corruption.
- **How:** Use parameterized queries (e.g., $1, [name]) instead of string interpolation.

## Issue 2: Inefficient Order Enrichment (N+1 Query Problem)
- **What:** Fetches customer and product details for each order in a loop, causing many DB queries.
- **Where:** backend/src/routes/orders.js (lines 10-25)
- **Why:** Poor performance, especially with many orders; increases DB load.
- **How:** Use SQL JOINs to fetch all data in a single query.

## Issue 3: Race Condition in Order Creation (Inventory Overselling)
- **What:** Inventory check and decrement are not atomic, allowing concurrent orders to oversell stock.
- **Where:** backend/src/routes/orders.js (lines 52-87)
- **Why:** Two simultaneous orders can both pass the inventory check before either decrements, causing negative inventory.
- **How:** Use database transactions with `SELECT ... FOR UPDATE` to lock the product row during the operation.

## Issue 4: Incorrect Error Handling Middleware
- **What:** Error handler always returns HTTP 200 and success:true, even for errors.
- **Where:** backend/src/index.js (lines 23-26)
- **Why:** Misleads clients, hides failures, breaks API contract.
- **How:** Return appropriate error status and message (e.g., 500, error details).

## Issue 5: Sensitive Data Exposure in Dockerfiles
- **What:** Dockerfiles copy all files, including .env or sensitive files, into images.
- **Where:** frontend/Dockerfile, backend/Dockerfile (lines 5-7)
- **Why:** Risks leaking secrets in built images.
- **How:** Use .dockerignore to exclude sensitive files from build context.

---

## Additional Issues Found
- Hardcoded Database Credentials in backend/src/config/db.js (lines 4-8) and docker-compose.yml (lines 6-8)
- No input validation for order creation (backend/src/routes/orders.js, lines 52-87)
- No HTTPS enforcement or CORS configuration (backend/src/index.js)
- No rate limiting or authentication on API endpoints
- No error handling for failed fetches in frontend/api/index.js

---

## Summary
These issues impact security, performance, and reliability. Fixing them is critical for a safe, robust application.