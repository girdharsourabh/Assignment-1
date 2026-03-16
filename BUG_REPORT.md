# Bug Report – Order Management System

This document describes the key issues identified in the system, their impact, and the fixes implemented.

---

# 1. SQL Injection Vulnerability in Customer Search

**Location**
`backend/src/routes/customers.js`

**Issue**

The customer search API directly concatenates user input into the SQL query.

Example:

```
SELECT * FROM customers WHERE name ILIKE '%${name}%'
```

This allows malicious users to manipulate the SQL query.

Example malicious input:

```
' OR 1=1 --
```

**Impact**

* Attackers can retrieve all database records.
* Potential exposure of sensitive data.

**Fix**

Replaced string interpolation with **parameterized queries**.

```
const result = await pool.query(
  "SELECT * FROM customers WHERE name ILIKE $1",
  [`%${name}%`]
);
```

Parameterized queries ensure user input is treated as data rather than executable SQL.

---

# 2. N+1 Query Problem in Orders API

**Location**
`backend/src/routes/orders.js`

**Issue**

The API retrieves orders first and then executes additional queries for related product or customer data.

Example pattern:

```
SELECT * FROM orders;
SELECT * FROM products WHERE id = ?;
SELECT * FROM products WHERE id = ?;
```

This results in **N additional queries for N orders**.

**Impact**

* Severe performance degradation as data grows
* Increased database load

**Fix**

Replaced multiple queries with a single **JOIN query**.

```
SELECT
  o.*,
  c.name AS customer_name,
  p.name AS product_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN products p ON o.product_id = p.id;
```

This fetches all required data in one query.

---

# 3. Missing Database Transaction in Order Creation

**Location**
`backend/src/routes/orders.js`

**Issue**

Order creation involves multiple database operations:

1. Insert order
2. Update product inventory

If one operation fails, the database may become inconsistent.

**Impact**

* Orders may exist without inventory updates
* Inventory may decrease without a valid order

**Fix**

Wrapped operations inside a **PostgreSQL transaction**.

```
BEGIN;
INSERT INTO orders (...);
UPDATE products SET inventory_count = inventory_count - ?;
COMMIT;
```

If any step fails, the transaction is rolled back.

---

# 4. React List Rendering Uses Index as Key

**Location**
`frontend/src/components/OrderList.jsx`

**Issue**

React list rendering used the array index as a key.

```
orders.map((order, index) => <Row key={index} />)
```

**Impact**

* React may incorrectly re-render list items
* UI inconsistencies when items are added or removed

**Fix**

Use a stable identifier such as the order ID.

```
<Row key={order.id} />
```

---

# 5. Hardcoded Database Credentials

**Location**
`docker-compose.yml`

**Issue**

Database credentials were stored directly in the repository.

**Impact**

* Security risk if the repository becomes public
* Credentials may be exposed

**Fix**

Move credentials to an environment file:

```
.env
```

Example:

```
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
POSTGRES_DB=orderdb
```

---

# 6. Missing API Input Validation

**Location**
`backend/src/routes/orders.js`

**Issue**

User inputs such as quantity, product_id, and customer_id are accepted without validation.

**Impact**

* Invalid data may be stored in the database
* Potential runtime errors

**Fix**

Add request validation middleware before processing API requests.

Example:

```
if (!customer_id || !product_id || quantity <= 0) {
  return res.status(400).json({ error: "Invalid input" });
}
```

---

# 7. Missing Centralized Error Handling

**Location**
`backend/src/index.js`

**Issue**

Errors were handled individually inside route handlers.

**Impact**

* Duplicate error handling logic
* Unhandled exceptions may crash the server

**Fix**

Added centralized Express error middleware.

```
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});
```

---

# 8. Deprecated Docker Compose Version Field

**Location**
`docker-compose.yml`

**Issue**

The `version` field is deprecated in newer Docker Compose versions.

Example:

```
version: "3"
```

**Fix**

Removed the version field to follow modern Docker Compose specifications.

---

# 9. Inventory Race Condition

**Location**
`backend/src/routes/orders.js`

**Issue**

Concurrent orders may reduce product inventory below zero if multiple requests occur simultaneously.

**Impact**

* Negative inventory values
* Incorrect stock tracking

**Fix**

Use transactions and row-level locking when updating inventory.

---

# 10. Missing Container Health Checks

**Location**
`docker-compose.yml`

**Issue**

Containers do not define health checks.

**Impact**

* Docker cannot detect unhealthy containers
* Difficult to monitor service health

**Fix**

Add health check configuration.

Example:

```
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

# Conclusion

The above fixes improve the system in the following areas:

* Security (SQL injection prevention)
* Performance (removal of N+1 queries)
* Data integrity (transactions)
* Reliability (error handling and health checks)
* Maintainability (cleaner architecture and validation)

These changes significantly improve the robustness and scalability of the Order Management System.
