
# Bug Report – Order Management System

This document lists issues discovered in the codebase during the review of the Order Management System.

---

## 1. SQL Injection Vulnerability in Customer Search

**Location**

backend/routes/customers.js  
`GET /customers/search`

**Issue**

User input is directly concatenated into the SQL query.

Example code:

SELECT * FROM customers WHERE name ILIKE '%" + name + "%'

**Impact**

An attacker can manipulate the SQL query and access unintended data from the database.

Example malicious input:

' OR 1=1 --

This could expose the entire customers table.

**Fix**

Use parameterized queries instead of string concatenation.

Example fix:

```sql
SELECT * FROM customers WHERE name ILIKE $1

2. N+1 Query Performance Issue

Location

backend/routes/orders.js
GET /orders

Issue

The code fetches orders first and then loops over each order to fetch customer and product data separately.

This results in multiple database queries:

1 query to fetch orders
N queries to fetch customers
N queries to fetch products

Impact

This creates significant performance issues as the number of orders grows.

Example:

10 orders → 21 queries executed

Fix

Use SQL JOINs to fetch related data in a single query.

Example fix:

SELECT o.*, 
       c.name AS customer_name,
       c.email AS customer_email,
       p.name AS product_name,
       p.price AS product_price
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN products p ON o.product_id = p.id
ORDER BY o.created_at DESC
3. Race Condition in Order Creation

Location

backend/routes/orders.js
POST /orders

Issue

Inventory is checked and updated using separate queries.

Flow:

Read product inventory

Create order

Decrement inventory

Two concurrent requests can both read the same inventory value.

Impact

Inventory may become negative and products can be oversold.

Example:

Inventory = 1

Two users place an order simultaneously → inventory becomes -1.

Fix

Use database transactions and row locking.

Example:

SELECT * FROM products WHERE id = $1 FOR UPDATE

Wrap the logic in a transaction:

BEGIN
check inventory
create order
update inventory
COMMIT

4. Invalid Order Status Transitions

Location

backend/routes/orders.js
PATCH /orders/:id/status

Issue

The API allows any status change without validation.

Example invalid transitions:

delivered → pending
shipped → confirmed

Impact

Breaks the logical order workflow and can cause inconsistent order history.

Fix

Restrict status transitions to valid states.

Example allowed flow:

pending → confirmed → shipped → delivered

Reject backward transitions.

5. Frontend Crash When Orders API Fails

Location

frontend/components/OrderList.js

Issue

The component assumes the API always returns an array.

Example code:

const sortedOrders = [...orders]

If the API fails or returns invalid data, orders may not be iterable.

Impact

The application crashes with the error:

TypeError: orders is not iterable

Fix

Validate API response before setting state.

Example fix:

setOrders(Array.isArray(data) ? data : [])
6. Using Array Index as React Key

Location

frontend/components/OrderList.js

Issue

Rows use the array index as a React key.

Example:

<tr key={index}>

Impact

When sorting or updating the list, React may reuse DOM elements incorrectly, causing UI bugs.

Fix

Use a stable unique identifier.

Example:

<tr key={order.id}>
7. Missing Client-Side Validation When Creating Customers

Location

frontend/components/CustomerSearch.js

Issue

Customer creation allows empty fields to be submitted.

Example:

name: ""
email: ""

Impact

Invalid or incomplete data may be stored in the database.

Fix

Add client-side validation before sending the request.

Example:

if (!newName.trim() || !newEmail.trim()) {
  setMessage({ type: 'error', text: 'Name and Email are required' })
  return
}