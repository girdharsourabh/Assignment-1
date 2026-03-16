# Bug Report — Order Management System

This document describes the issues identified in the Order Management System application after reviewing the frontend, backend, and infrastructure code.

---

## Issue 1: Hardcoded Database Credentials

Location:
backend/src/config/db.js

Problem:
The database username and password are written directly in the source code.

Example:
user: 'admin'
password: 'admin123'

Impact:
Hardcoding credentials is a security risk. If the repository becomes public, anyone can access the database credentials.

Fix:
Use environment variables stored in a .env file instead of hardcoding credentials.

---

## Issue 2: SQL Injection Vulnerability

Location:
backend/src/routes/customers.js

Problem:
The search query is created using string concatenation with user input.

Example:
const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";

Impact:
This allows SQL Injection attacks. A malicious user could inject SQL code through the name parameter.

Fix:
Use parameterized queries.

Example fix:
const result = await pool.query(
  "SELECT * FROM customers WHERE name ILIKE $1",
  [`%${name}%`]
);

---

## Issue 3: N+1 Query Performance Problem

Location:
backend/src/routes/orders.js

Problem:
Orders are fetched first and then additional queries are executed for each order to get customer and product details.

Example:
for (const order of orders) {
  const customerResult = await pool.query(...);
  const productResult = await pool.query(...);
}

Impact:
This creates many database queries and slows down performance when there are many orders.

Fix:
Use a SQL JOIN query instead of multiple queries.

Example fix:
SELECT o.*, c.name AS customer_name, c.email AS customer_email,
       p.name AS product_name, p.price AS product_price
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN products p ON o.product_id = p.id
ORDER BY o.created_at DESC;

---

## Issue 4: Incorrect useEffect Dependency

Location:
frontend/src/components/CreateOrder.js

Problem:
The useEffect hook dependency array does not include selectedProduct.

Example:
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  }
}, [products]);

Impact:
When the selected product changes, the effect may not update properly and may display incorrect data.

Fix:
Add selectedProduct to the dependency array.

Example fix:
}, [products, selectedProduct]);

---

## Issue 5: Incorrect Error Handling in Backend

Location:
backend/src/index.js

Problem:
The global error handler returns HTTP status 200 even when an error occurs.

Example:
app.use((err, req, res, next) => {
  console.log('Something happened');
  res.status(200).json({ success: true });
});

Impact:
Returning status 200 makes it difficult for clients to detect API errors.

Fix:
Return a proper error status code.

Example fix:
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});