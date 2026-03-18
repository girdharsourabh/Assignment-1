# Bug Report

## 1. Improper Error Handling

* Location: backend/index.js
* Issue: Always returns 200 OK even when error occurs
* Impact: Client cannot detect failures
* Fix: Return proper status codes

---

## 2. Hardcoded Database Credentials

* Location: backend/config/db.js
* Issue: Credentials written in code
* Impact: Security risk
* Fix: Use environment variables

---

## 3. N+1 Query Problem

* Location: backend/routes/orders.js
* Issue: Multiple queries per order
* Impact: Slow performance
* Fix: Use JOIN

---

## 4. Missing Transactions

* Location: POST /orders
* Issue: No atomic operations
* Impact: Data inconsistency
* Fix: Use BEGIN / COMMIT

---

## 5. No Input Validation

* Location: POST /orders
* Issue: Invalid data allowed
* Impact: Bad data stored
* Fix: Add validation

---

## 6. No Status Validation

* Location: PATCH /orders
* Issue: Any status allowed
* Impact: Logic issue
* Fix: Restrict values

---

## 7. Quantity Input Issue

* Location: Frontend
* Issue: Cannot type directly
* Impact: Poor UX
* Fix: Allow input

---

## 8. Weak Address Validation

* Location: Backend
* Issue: Invalid address accepted
* Impact: Data issue
* Fix: Add length check

## 9. SQL Injection Vulnerability 

Location: backend/routes/customers.js (search API)

Issue: Query is constructed using string concatenation:

"SELECT * FROM customers WHERE name ILIKE '%" + name + "%'"

Impact:

Attackers can inject malicious SQL

Can lead to data leakage or database damage

Fix: Use parameterized queries:

const result = await pool.query(
  "SELECT * FROM customers WHERE name ILIKE $1",
  [`%${name}%`]
);
