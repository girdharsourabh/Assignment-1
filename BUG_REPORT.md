# Bug Report

## 1. SQL Injection Vulnerability in Customer Search
- **What**: The search feature for customers is vulnerable to SQL injection because user input is concatenated directly into the SQL query string.
- **Where**: `backend/src/routes/customers.js` (lines 18-20, `router.get('/search')`)
- **Why**: An attacker could manipulate the `name` query parameter to execute arbitrary SQL commands, potentially exposing sensitive data, modifying the database, or dropping tables. This is a critical security vulnerability.
- **How to fix**: Use parameterized queries (prepared statements) provided by the `pg` library instead of string concatenation.
  ```javascript
  const query = "SELECT * FROM customers WHERE name ILIKE $1";
  const result = await pool.query(query, [`%${name}%`]);
  ```

## 2. N+1 Query Performance Issue in Order Listing
- **What**: When fetching all orders, the application first queries all orders, and then inside a loop, executes two additional queries (for customer and product details) per order.
- **Where**: `backend/src/routes/orders.js` (lines 13-24, `router.get('/')`)
- **Why**: If there are 1,000 orders, this endpoint will execute 2,001 separate database queries. This translates to severe performance degradation, high latency, and excessive load on the database.
- **How to fix**: Use a SQL `JOIN` to fetch the orders along with the customer and product details in a single query.
  ```sql
  SELECT o.*, c.name as customer_name, c.email as customer_email, 
         p.name as product_name, p.price as product_price
  FROM orders o
  JOIN customers c ON o.customer_id = c.id
  JOIN products p ON o.product_id = p.id
  ORDER BY o.created_at DESC
  ```

## 3. Data Integrity / Race Condition in Order Creation
- **What**: Creating an order involves checking inventory, inserting the order, and updating the inventory in three separate database operations without a transaction. 
- **Where**: `backend/src/routes/orders.js` (lines 58-84, `router.post('/')`)
- **Why**: Concurrent requests can cause a race condition. Two users might simultaneously pass the inventory check for the last item, leading to negative inventory and fulfilling orders for items that don't exist. Furthermore, if the inventory update fails after the order is created, the system state will be inconsistent.
- **How to fix**: Wrap the operations in a database transaction (`BEGIN`, `COMMIT`, `ROLLBACK`) and use locking or a combined check-and-update statement (e.g., `UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2 AND inventory_count >= $1 RETURNING *`) to ensure atomicity and consistency.

## 4. Global Error Handler Hides Actual Errors
- **What**: The global error-handling middleware catches any unhandled errors, logs a vague message, and always responds with an HTTP 200 OK and `{ success: true }`.
- **Where**: `backend/src/index.js` (lines 23-26, `app.use((err, req, res, next) ...)`)
- **Why**: This masks actual errors from the client. The frontend will think requests succeeded even when they failed, leading to broken UI states and extremely difficult debugging.
- **How to fix**: Log the actual `err.stack` for debugging and return an appropriate HTTP error status (like 500) with a meaningful error response.
  ```javascript
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  });
  ```

## 5. Hardcoded Database Credentials
- **What**: The database connection configuration uses hardcoded credentials (`admin` / `admin123`) instead of environment variables.
- **Where**: `backend/src/config/db.js` (lines 4-10)
- **Why**: Committing hardcoded credentials to version control is a major security risk. Anyone with access to the codebase can access the database. It also makes configuring the app for different environments (development, staging, production) difficult.
- **How to fix**: Use environment variables (`process.env.DB_USER`, `process.env.DB_PASSWORD`, etc.) to configure the database pool. Provide a `.env.example` file to show required variables.
