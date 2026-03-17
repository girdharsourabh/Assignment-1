# BUG_REPORT

## Issue 1: SQL Injection Vulnerability (Security)
- **What**: The `/api/customers/search` endpoint concatenates user input directly into the SQL query string.
- **Where**: `backend/src/routes/customers.js`, Line 19 (`const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";`)
- **Why**: This allows malicious users to inject arbitrary SQL commands (e.g., dropping tables, reading sensitive data like passwords), leading to a critical security breach.
- **How I would fix it**: Use parameterized queries instead of string concatenation. Change the query to `SELECT * FROM customers WHERE name ILIKE $1` and pass `['%' + name + '%']` as the parameter array.

## Issue 2: N+1 Query Problem (Performance)
- **What**: The `/api/orders` GET endpoint fetches all orders, then iterates through each order to individually query the database for the corresponding customer and product details.
- **Where**: `backend/src/routes/orders.js`, Lines 11-24 (inside the `for` loop)
- **Why**: If there are 100 orders, this endpoint will make 1 query for orders, and 200 additional queries for customers and products (total 201 queries). This causes severe latency and database load issues as the application scales.
- **How I would fix it**: Replace the sequential queries with a single SQL `JOIN`. Use `SELECT o.*, c.name as customer_name, c.email as customer_email, p.name as product_name, p.price as product_price FROM orders o JOIN customers c ON o.customer_id = c.id JOIN products p ON o.product_id = p.id ORDER BY o.created_at DESC` to fetch all data in 1 query.

## Issue 3: Missing Database Transaction (Data Integrity / Correctness)
- **What**: When creating an order (POST `/api/orders`), the application inserts the order into the `orders` table and then updates the `products` table to decrement inventory. These are two separate queries, not wrapped in a transaction.
- **Where**: `backend/src/routes/orders.js`, Lines 73-83
- **Why**: If the application crashes or the database connection drops after creating the order but before updating the inventory, the database is left in an inconsistent state: an order exists without inventory being deducted.
- **How I would fix it**: Acquire a client from the pool (`pool.connect()`) and execute `BEGIN` before the queries. If both succeed, execute `COMMIT`. If any error occurs, execute `ROLLBACK` in the `catch` block to ensure atomicity.

## Issue 4: Hardcoded Database Credentials (Security)
- **What**: The database connection string contains hardcoded credentials.
- **Where**: `backend/src/config/db.js`, Lines 5-9 (`user: 'admin'`, `password: 'admin123'`)
- **Why**: Exposing credentials in source code (often committed to version control) is a critical security risk. Anyone with read access to the repository can access the production database.
- **How I would fix it**: Use environment variables (e.g., `process.env.DB_USER`, `process.env.DB_PASSWORD`) and load them using a package like `dotenv`.

## Issue 5: Global Error Handler Masks Errors (Bad Practice / Bug)
- **What**: The global Express error handler always returns a `200 OK` status with `{ success: true }`, regardless of what error occurred.
- **Where**: `backend/src/index.js`, Lines 23-26
- **Why**: This hides backend failures from the frontend client. The frontend will think an operation succeeded when it actually threw an exception, leading to a broken user experience and making debugging nearly impossible.
- **How I would fix it**: Ensure the error handler logs the actual error (`console.error(err)`) and responds with an appropriate HTTP status code (e.g., `500 Internal Server Error`) and a descriptive JSON error message like `{ success: false, error: 'Internal Server Error' }`.
