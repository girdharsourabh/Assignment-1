# Bug Report

## Issue 1: SQL Injection Vulnerability

**Location:** `backend/src/routes/customers.js`, line 13-16  
**Description:** The search endpoint constructs SQL queries by directly concatenating user input without parameterization, allowing SQL injection attacks.  
**Impact:** Security - Attackers can execute arbitrary SQL commands, potentially leading to data theft, modification, or deletion.  
**Fix:** Use parameterized queries with placeholders instead of string concatenation.

## Issue 2: Hardcoded Database Credentials

**Location:** `backend/src/config/db.js`, lines 4-9  
**Description:** Database username, password, and other connection details are hardcoded in the source code.  
**Impact:** Security - Credentials are exposed in version control and can be easily accessed by unauthorized users.  
**Fix:** Use environment variables for database configuration.

## Issue 3: Incorrect Error Handling in Global Error Handler

**Location:** `backend/src/index.js`, lines 20-23  
**Description:** The global error handler sets status 200 and returns success: true for all errors.  
**Impact:** Reliability - Errors are masked as successes, making debugging difficult and potentially hiding critical failures from clients.  
**Fix:** Return appropriate HTTP status codes (e.g., 500) and error messages for actual errors.

## Issue 4: N+1 Query Problem in Orders Fetch

**Location:** `backend/src/routes/orders.js`, lines 6-22  
**Description:** For each order, separate queries are made to fetch customer and product details, resulting in N+1 database queries.  
**Impact:** Performance - As the number of orders grows, this causes excessive database load and slow response times.  
**Fix:** Use JOINs in a single query to fetch all required data at once.

## Issue 5: Race Condition in Order Creation

**Location:** `backend/src/routes/orders.js`, lines 35-65  
**Description:** Inventory check and decrement are not wrapped in a database transaction, allowing concurrent requests to overbook inventory.  
**Impact:** Correctness - Multiple users can create orders for the same product simultaneously, leading to negative inventory or overselling.  
**Fix:** Wrap the inventory check, order creation, and inventory update in a database transaction.

## Issue 6: React Key Using Array Index

**Location:** `frontend/src/components/OrderList.js`, line 47  
**Description:** The map function uses the array index as the key for React elements.  
**Impact:** Performance/Reliability - Can cause incorrect re-rendering and state issues when the list changes.  
**Fix:** Use a unique identifier like order.id as the key.

## Issue 7: Missing Dependency in useEffect

**Location:** `frontend/src/components/CreateOrder.js`, lines 15-20  
**Description:** The useEffect for selectedProductData depends on selectedProduct but doesn't include it in the dependency array.  
**Impact:** Correctness - The effect may not run when selectedProduct changes, leading to stale data.  
**Fix:** Add selectedProduct to the dependency array.

## Issue 8: Exposed Database Port in Docker Compose

**Location:** `docker-compose.yml`, line 8  
**Description:** The database service exposes port 5432 to the host machine.  
**Impact:** Security - In production, the database should not be accessible from outside the container network.  
**Fix:** Remove the ports section for the db service in production configurations.</content>
<parameter name="filePath">c:\Users\Victus\Desktop\F1 Assignment\Assignment-1\BUG_REPORT.md
