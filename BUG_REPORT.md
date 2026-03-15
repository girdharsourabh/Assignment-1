# Bug Report

## 1. Security Vulnerability: SQL Injection in Customer Search
- **What**: The search feature constructs SQL queries using raw user input without parameterized queries.
- **Where**: `backend/src/routes/customers.js`, `router.get('/search')` at `const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";`
- **Why**: Malicious users can inject arbitrary SQL commands, potentially reading, modifying, or deleting sensitive data, which is a major security risk.
- **How**: Use parameterized queries: `pool.query('SELECT * FROM customers WHERE name ILIKE $1', ['%' + name + '%'])`.

## 2. Performance Issue: N+1 Query Problem in Orders List
- **What**: The route fetches all orders, then executes two separate database queries for each order to retrieve customer and product details within a loop.
- **Where**: `backend/src/routes/orders.js`, `router.get('/')` inside the `for (const order of orders)` loop.
- **Why**: As the number of orders grows, this will result in hundreds or thousands of unnecessary sequential database queries, severely degrading response time and overloading the database.
- **How**: Rewrite the query to use SQL `JOIN`s to fetch all required data in a single query.

## 3. Data Integrity Issue: Missing Transaction on Order Creation
- **What**: Creating an order and updating the product inventory are performed as two separate database queries without being wrapped in a transaction.
- **Where**: `backend/src/routes/orders.js`, `router.post('/')`.
- **Why**: If the application crashes or throws an error after inserting the order but before updating the inventory (or if the inventory update fails), the database will be in an inconsistent state (an order exists but inventory wasn't deducted).
- **How**: Wrap both the `INSERT` into `orders` and `UPDATE` on `products` in a PostgreSQL transaction (`BEGIN`, `COMMIT`, and `ROLLBACK` on error).

## 4. Security Vulnerability: Hardcoded Database Credentials
- **What**: Database passwords and connection details are hardcoded directly into the application source code.
- **Where**: `backend/src/config/db.js`
- **Why**: Anyone with access to the source code can view the database credentials, posing a severe security risk. This violates basic security principles.
- **How**: Read credentials from environment variables (e.g., `process.env.DB_PASSWORD`).

## 5. Bad Practice / Correctness: Global Error Handler Swallowing Errors
- **What**: The global Express error handler always returns a `200 OK` status with `{ success: true }`, regardless of the actual error.
- **Where**: `backend/src/index.js`, inside `app.use((err, req, res, next) => { ... })`.
- **Why**: It masks real application errors, making frontend debugging and error handling impossible because a failed request will look successful.
- **How**: Log the error and return an appropriate status code (like 500) and descriptive standard error format.
