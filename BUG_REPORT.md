# Bug Report

## 1. Security Vulnerability: SQL Injection
- **What**: The `/api/customers/search` endpoint concatenates user input directly into the SQL query string.
- **Where**: `backend/src/routes/customers.js` (Line 19)
- **Why**: This allows a malicious user to execute arbitrary SQL commands (e.g., `'; DROP TABLE customers; --`), potentially destroying or leaking the entire database. This is a critical security risk.
- **How to fix**: Use parameterized queries instead of string concatenation. Change the query to: `await pool.query("SELECT * FROM customers WHERE name ILIKE $1", ['%' + name + '%']);`

## 2. Security / Bad Practice: Hardcoded Database Credentials
- **What**: Database credentials (username, password, db name) are hardcoded directly in the source code.
- **Where**: `backend/src/config/db.js` (Lines 4-10)
- **Why**: Anyone with read access to the source code can view the production database credentials. This violates the principle of keeping configuration in the environment.
- **How to fix**: Read the configuration from Environment Variables (e.g., `process.env.POSTGRES_USER` etc.) and fall back to defaults only for local development if really necessary, or entirely rely on `.env` files.

## 3. Performance Issue: N+1 Query Problem
- **What**: When fetching the list of all orders, the application performs an initial query to get all orders, and then inside a loop, it performs two additional queries (Customer and Product) per order.
- **Where**: `backend/src/routes/orders.js` (Lines 11-24 in the `GET /` route)
- **Why**: This means if there are `N` orders, the system will execute `1 + 2 * N` queries. As the order history grows, this endpoint will take progressively longer to respond, causing severe performance degradation and overloading the database.
- **How to fix**: Use a single SQL `JOIN` to retrieve the order, customer, and product information in one query.

## 4. Data Integrity: Missing Database Transaction in Order Creation
- **What**: Creating a new order involves two dependent database writes: creating the order and decrementing the product inventory. These operations are not wrapped in a database transaction.
- **Where**: `backend/src/routes/orders.js` (Lines 73-83 in the `POST /` route)
- **Why**: If the application crashes or faces a network error after the `INSERT` query but before the `UPDATE` query, the order will be created without reducing the inventory, leading to phantom stock anomalies.
- **How to fix**: Use `BEGIN`, `COMMIT`, and `ROLLBACK` to ensure both operations succeed together or fail together.

## 5. Correctness Bug: Masked Errors via Global Error Handler
- **What**: The Express global error handler returns an HTTP 200 status code with `{ success: true }` for every error that occurs in the application.
- **Where**: `backend/src/index.js` (Lines 23-26)
- **Why**: This breaks standard REST API semantics. Clients (like the frontend) will think operations succeeded even when they critically failed behind the scenes, causing confusing UI bugs and masking underlying system problems.
- **How to fix**: Return proper HTTP status codes (e.g., `500 Internal Server Error`) along with a structured `{ error: 'Something went wrong' }` payload.

## 6. Correctness Bug: React useEffect Missing Dependency
- **What**: In the `CreateOrder` component, a `useEffect` hook that updates the UI with the selected product's details is missing `selectedProduct` in its dependency array.
- **Where**: `frontend/src/components/CreateOrder.js` (Line 25)
- **Why**: When a user selects a different product from the dropdown, the `selectedProductData` state doesn't update. The user sees the details and price of the previously selected product (or nothing), confusing them during the purchase flow.
- **How to fix**: Add `selectedProduct` to the dependency array: `}, [products, selectedProduct]);`
