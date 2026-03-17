# Order Management System

# Bug Report Summary

During review of the codebase, several issues were discovered across **security, performance, correctness, and frontend architecture**.

## Identified Issues

| Category            | Issue                                                   |
| ------------------- | ------------------------------------------------------- |
| Security            | SQL Injection vulnerability in customer search          |
| Security            | Hardcoded database credentials                          |
| Correctness         | Global error handler returns HTTP 200 for errors        |
| Performance         | N+1 database query problem in orders API                |
| Data Integrity      | Missing database transaction when creating orders       |
| Frontend Bug        | Incorrect React useEffect dependency                    |
| Performance         | Customer search triggers API on every keystroke         |
| Architecture        | API calls managed manually instead of using React Query |
| React Best Practice | Using index as key in lists                             |
| Validation          | Missing input validation for API requests               |

---

# Critical Fixes Implemented

The following critical issues were fixed as part of this assignment.

---

# 1. SQL Injection Vulnerability

### Problem

Customer search endpoint builds SQL query using string concatenation.

Example:

```
SELECT * FROM customers WHERE name ILIKE '%" + name + "%'
```

This allows attackers to inject malicious SQL queries.

Example attack:

```
/api/customers/search?name=' OR 1=1 --
```

### Fix

Replaced dynamic SQL with parameterized queries.

```
SELECT * FROM customers WHERE name ILIKE $1
```

```
[`%${name}%`]
```

### Impact

Prevents SQL injection attacks and protects database integrity.

---

# 2. Hardcoded Database Credentials

### Problem

Database credentials were hardcoded inside the application.

```
user: 'admin'
password: 'admin123'
```

### Fix

Moved credentials to environment variables.

Example `.env`:

```
DB_USER=admin
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=orderdb
```

Database configuration now reads from environment variables.

### Impact

Improves security and supports different deployment environments.

---

# 3. Incorrect Global Error Handler

### Problem

The Express error handler returned HTTP 200 even when errors occurred.

Example:

```
res.status(200).json({ success: true })
```

This hides failures and breaks API reliability.

### Fix

Updated error handler to return proper status codes.

```
res.status(500).json({
  error: "Internal Server Error"
})
```

### Impact

Improves debugging, monitoring, and API correctness.

---

# 4. N+1 Query Performance Problem

### Problem

Orders endpoint fetched customer and product information inside a loop.

For N orders:

```
1 query to fetch orders
+ N queries for customers
+ N queries for products
```

Example:

100 orders → **201 database queries**

### Fix

Replaced multiple queries with a single SQL JOIN query.

```
SELECT 
o.*,
c.name as customer_name,
c.email as customer_email,
p.name as product_name,
p.price as product_price
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN products p ON o.product_id = p.id
```

### Impact

Significantly improves database performance.

---

# 5. Missing Database Transaction

### Problem

Order creation and inventory update were executed as separate queries.

```
INSERT INTO orders
UPDATE products inventory
```

If the server fails between these queries, inventory becomes inconsistent.

### Fix

Wrapped operations inside a database transaction.

```
BEGIN
INSERT ORDER
UPDATE INVENTORY
COMMIT
```

Rollback occurs if any query fails.

### Impact

Ensures **data consistency and atomic operations**.

---

# Frontend Issues & Improvements

## 1. Incorrect useEffect Dependency

### Problem

In `CreateOrder.js`, `selectedProduct` was missing from the dependency array.

```
useEffect(() => {...}, [products])
```

### Fix

```
useEffect(() => {...}, [products, selectedProduct])
```

### Impact

Ensures product information updates correctly when user changes product.

---

# 2. No Debouncing on Customer Search

### Problem

Customer search API is called on every keystroke.

Typing `alex` results in:

```
a
al
ale
alex
```

4 API calls.

### Improvement

Add **debouncing** to reduce unnecessary requests.

Example using lodash debounce:

```
const debouncedSearch = debounce(handleSearch, 400)
```

### Impact

Reduces API load and improves UX.

---

# 3. API Fetching with useEffect

### Problem

API calls are managed manually using `useEffect`.

Example:

```
useEffect(() => {
 fetchOrders().then(setOrders)
}, [])
```

### Improvement

Use **TanStack Query (React Query)**.

Example:

```
const { data, isLoading } = useQuery({
 queryKey: ["orders"],
 queryFn: fetchOrders
})
```

### Benefits

* Automatic caching
* Background refetch
* Request deduplication
* Built-in loading and error states

---

# 4. React Key Issue

### Problem

Using array index as key:

```
<tr key={index}>
```

### Fix

Use stable key:

```
<tr key={order.id}>
```

### Impact

Prevents UI rendering bugs.

---

# API Validation Improvements

Currently the API accepts **unvalidated input**.

Example issues:

```
quantity = -5
email = invalid
shipping_address = empty
```

### Recommended Solution

Use **Zod schema validation**.

Example:

```
const orderSchema = z.object({
  customer_id: z.number(),
  product_id: z.number(),
  quantity: z.number().min(1),
  shipping_address: z.string().min(5)
})
```

### Benefits

* Prevents invalid data
* Protects database
* Improves API reliability

---

# Additional Improvements

## Rate Limiting

Prevent API abuse using:

```
express-rate-limit
```

---

## Security Middleware

Use:

```
helmet
```

Adds HTTP security headers.

---

## Request Logging

Use:

```
morgan
```

Improves debugging and observability.

---

## Pagination

Current endpoint:

```
GET /orders
```

Returns all records.

Better approach:

```
GET /orders?page=1&limit=20
```

Benefits:

* Scalability
* Faster responses
* Reduced memory usage

---