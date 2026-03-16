# BUG REPORT

## Overview

I reviewed the backend, frontend, and database setup of the order management system. The main issues I found affect security, performance, correctness, and reliability.

Below are the key issues, why they matter, and how they should be fixed.

---

## 1. SQL Injection in customer search

**What**  
The customer search query is built using user input directly inside the SQL string.

**Where**  
`backend/src/routes/customers.js`  
Route: `GET /api/customers/search`

**Why it matters**  
This is a critical security issue. Since the query is created using raw input, a user can manipulate the SQL and make the endpoint behave in unintended ways.

**How to fix it**  
Use a parameterized query instead of string concatenation.

**Suggested fix**
```js
const result = await pool.query(
  'SELECT * FROM customers WHERE name ILIKE $1',
  [`%${name}%`]
);
```

---

## 2. N+1 query problem in orders list

**What**  
The orders list endpoint first fetches all orders, then runs extra queries inside a loop to fetch customer and product details for each order.

**Where**  
`backend/src/routes/orders.js`  
Route: `GET /api/orders`

**Why it matters**  
This causes unnecessary database calls. As the number of orders grows, response time becomes slower because the number of queries grows linearly.

**How to fix it**  
Fetch order, customer, and product data in a single query using `JOIN`s.

**Suggested fix**
```sql
SELECT 
  o.*,
  c.name as customer_name,
  c.email as customer_email,
  p.name as product_name,
  p.price as product_price
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN products p ON o.product_id = p.id
ORDER BY o.created_at DESC
```

---

## 3. Order creation race condition

**What**  
The order creation flow checks inventory first, creates the order, and then updates product inventory in separate queries without a transaction.

**Where**  
`backend/src/routes/orders.js`  
Route: `POST /api/orders`

**Why it matters**  
Two requests can read the same inventory value at the same time and both succeed, causing overselling and incorrect stock counts.

**How to fix it**  
Wrap the inventory check, order creation, and inventory update in a transaction and lock the product row using `FOR UPDATE`.

**Suggested fix**
- Start transaction with `BEGIN`
- Lock product row using `SELECT * FROM products WHERE id = $1 FOR UPDATE`
- Check inventory
- Insert order
- Update inventory
- Commit transaction

---

## 4. Invalid status transitions are allowed

**What**  
The order status update endpoint updates the status without checking whether the requested change is valid.

**Where**  
`backend/src/routes/orders.js`  
Route: `PATCH /api/orders/:id/status`

**Why it matters**  
An order can move backward in the process, for example from `delivered` back to `pending`, which breaks the order lifecycle and makes data unreliable.

**How to fix it**  
Validate both:
- the requested status value
- whether the transition from current status to new status is allowed

**Suggested rules**
- `pending -> confirmed`
- `confirmed -> shipped`
- `shipped -> delivered`

Cancellation should be handled through a separate cancel endpoint.

---

## 5. Broken global error handler

**What**  
The global error handler responds with HTTP `200` and a success response even when an actual error occurs.

**Where**  
`backend/src/index.js`

**Why it matters**  
This hides server failures from the client and makes debugging harder. The frontend may treat failed requests as successful.

**How to fix it**  
Return a proper error response with a 5xx status code and log the actual error.

**Suggested fix**
```js
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
```

---

## 6. Hardcoded database credentials

**What**  
Database credentials are hardcoded directly inside the backend database configuration.

**Where**  
`backend/src/config/db.js`

**Why it matters**  
This is not secure and also makes the application less flexible across environments. Credentials should not be stored directly in source code.

**How to fix it**  
Move the database settings to environment variables and read them from `process.env`.

**Suggested fix**
```js
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});
```

---

## 7. Missing validation / schema constraints for order quantity and customer input

**What**  
Important inputs are not validated properly in the backend, and the database schema does not enforce basic integrity rules.

**Where**  
Backend:
- `backend/src/routes/orders.js`
- `backend/src/routes/customers.js`

Database:
- `db/init.sql`

**Why it matters**  
Without proper validation:
- orders can be created with invalid quantity values
- customers can be created with empty or bad input
- invalid data can still enter the database if a validation path is missed

Without schema-level constraints:
- `quantity` can be zero or negative
- `inventory_count` can become negative
- `status` can contain invalid values
- customer input quality depends entirely on application code

**How to fix it**

### Backend validation
Add validation for:
- positive order quantity
- non-empty shipping address
- non-empty customer name
- valid customer email format

### Schema-level checks
Add basic constraints in `db/init.sql`, such as:
- `quantity > 0`
- `inventory_count >= 0`
- `total_amount >= 0`
- status limited to valid values

---

## Priority Summary

### Highest priority
1. SQL injection in customer search
2. N+1 query problem in orders list
3. Order creation race condition

### Medium priority
4. Invalid status transitions
5. Broken global error handler
6. Hardcoded database credentials
7. Missing validation and schema constraints

---

## Fix Plan

I would address the issues in the following order:

1. Fix SQL injection in customer search  
2. Replace N+1 order loading with a single joined query  
3. Make order creation transactional and inventory-safe  
4. Add validation for status transitions  
5. Fix the global error handler  
6. Move database credentials to environment variables  
7. Add backend validation and basic schema constraints