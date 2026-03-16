# Assignment Code Review - Bug Report

This document presents findings from a review of the provided codebase, covering **backend APIs, frontend components, and infrastructure configuration**.

The goal of this review is to identify **security vulnerabilities, performance risks, correctness issues, and architectural limitations** that could impact the reliability, scalability, or maintainability of the system.

The issues below are prioritized based on their **potential impact on production environments**, with particular attention to:

* Security risks (e.g., SQL injection)
* Data integrity issues (e.g., race conditions)
* Performance bottlenecks (e.g., N+1 queries)
* Architectural design limitations
* User experience and reliability concerns

Each issue includes:

* **What the issue is**
* **Where it appears in the code**
* **Why it matters**
* **How it can be resolved**

---

# Issue 1: Improper Server Configuration and Error Handling

## What the issue is

The server entry file (`src/index.js`) contains several configuration and error-handling problems:

1. `dotenv` is not used to manage environment variables.
2. PORT configuration falls back to a hardcoded value (`3001`).
3. CORS is enabled without restrictions.
4. Unknown API routes are not handled (missing 404 handler).
5. Global error middleware returns **HTTP 200 even when errors occur**.

---

## Where it is in the code

`src/index.js`

```javascript
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Global error handler
app.use((err, req, res, next) => {
  console.log('Something happened');
  res.status(200).json({ success: true });
});
```

---

## Why it matters

These issues introduce multiple risks:

* Environment variables may not load correctly across environments.
* Unrestricted CORS allows any origin to call the API.
* Missing 404 handling produces confusing API responses.
* Returning HTTP 200 for failures hides errors from API consumers.

---

## How to fix it

Use environment variables and proper error responses.

```javascript
require("dotenv").config();

app.use(
  cors({
    origin: ["http://localhost:3000"],
    methods: ["GET","POST","PUT","DELETE"]
  })
);

app.use((req,res)=>{
  res.status(404).json({ error:"Route not found"});
});

app.use((err,req,res,next)=>{
  console.error(err);
  res.status(err.status || 500).json({
    success:false,
    message:err.message || "Internal Server Error"
  });
});
```

---

# Issue 2: Insecure Database Configuration

## What the issue is

Database credentials and configuration are hardcoded directly in the application.

---

## Where it is in the code

`src/config/db.js`

```javascript
const pool = new Pool({
  user: 'admin',
  password: 'admin123',
  host: 'db',
  port: 5432,
  database: 'orderdb',
});
```

---

## Why it matters

* Hardcoded credentials are a **security risk**.
* The application does not verify database connectivity during startup.
* The host `db` creates a dependency on a specific Docker environment.

---

## How to fix it

Use environment variables and verify the database connection during startup.

```javascript
require("dotenv").config();

const pool = new Pool({
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD,
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME
});
```

Verify connection:

```javascript
async function connectDB(){
  try{
    await pool.query("SELECT 1");
    console.log("Database connected");
  }catch(err){
    console.error("Database connection failed",err);
    process.exit(1);
  }
}
```

---

# Issue 3: SQL Injection Vulnerability in Customer Search Endpoint

## What the issue is

The customer search endpoint constructs SQL queries using **string concatenation**, allowing attackers to inject SQL commands.

---

## Where it is in the code

`src/routes/customers.js`

```javascript
const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";
```

---

## Why it matters

This creates a **critical SQL injection vulnerability**.

Example attack input:

```
' OR 1=1 --
```

This could expose the entire customer table.

---

## How to fix it

Use parameterized queries.

```javascript
const result = await pool.query(
  "SELECT id,name,email FROM customers WHERE name ILIKE $1",
  [`%${name}%`]
);
```

---

# Issue 4: Race Condition in Order Creation and Inventory Update

## What the issue is

The order creation process reads inventory, creates an order, and then updates inventory in separate queries.

---

## Where it is in the code

`src/routes/orders.js`

```javascript
const productResult = await pool.query(
  'SELECT * FROM products WHERE id = $1',
  [product_id]
);

await pool.query(
  'UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2'
);
```

---

## Why it matters

Concurrent requests may both pass the inventory check and oversell stock.

Example:

```
Request A reads inventory = 1
Request B reads inventory = 1
Both create orders
Inventory becomes -1
```

---

## How to fix it

Use database transactions.

```sql
BEGIN;

INSERT INTO orders (...);

UPDATE products
SET inventory_count = inventory_count - $1
WHERE id = $2 AND inventory_count >= $1;

COMMIT;
```

---

# Issue 5: N+1 Query Performance Problem in Orders Endpoint

## What the issue is

The orders listing endpoint fetches related customer and product data inside a loop.

---

## Where it is in the code

`src/routes/orders.js`

```javascript
for (const order of orders) {
  const customerResult = await pool.query(...);
  const productResult = await pool.query(...);
}
```

---

## Why it matters

For `N` orders this results in:

```
1 query for orders
N queries for customers
N queries for products
```

This significantly increases database load.

---

## How to fix it

Use SQL joins.

```sql
SELECT
  o.id,
  o.quantity,
  c.name AS customer_name,
  p.name AS product_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN products p ON o.product_id = p.id;
```

---

# Issue 6: Missing Input Validation Across API Endpoints

## What the issue is

Multiple endpoints accept request data without validation.

Examples:

* `customer_id`
* `product_id`
* `quantity`
* `inventory_count`

---

## Where it is in the code

Affected files:

* `routes/products.js`
* `routes/customers.js`
* `routes/orders.js`

---

## Why it matters

Invalid inputs may cause:

* corrupted data
* unexpected database errors
* security vulnerabilities

---

## How to fix it

Introduce request validation middleware.

Example:

```javascript
if(quantity <= 0){
  return res.status(400).json({error:"Invalid quantity"});
}
```

Libraries such as **Zod** or **Joi** can be used for structured validation.

---

# Issue 7: Inconsistent Error Handling Strategy

## What the issue is

Although a global error middleware exists, routes manually handle errors using `try/catch`.

---

## Where it is in the code

Across route files:

```javascript
try {
  const result = await pool.query(...);
} catch (err) {
  res.status(500).json({ error: "Failed to fetch data" });
}
```

---

## Why it matters

This creates duplicated logic and inconsistent API responses.

---

## How to fix it

Delegate errors to centralized middleware.

```javascript
router.get("/", async (req,res,next)=>{
  try{
    const result = await pool.query(...);
    res.json(result.rows);
  }catch(err){
    next(err);
  }
});
```

---

# Issue 8: Lack of Layered Backend Architecture

## What the issue is

The backend mixes routing logic and database access in the same files.

Current structure:

```
src/
 ├ config/db.js
 ├ routes/
 │   ├ customers.js
 │   ├ orders.js
 │   └ products.js
 └ index.js
```

---

## Why it matters

This tightly couples business logic and routing, making the code harder to maintain and test.

---

## How to fix it

Adopt a layered architecture.

Example structure:

```
src/
 ├ config/
 ├ routes/
 ├ controllers/
 ├ services/
 └ repositories/
```

Request flow:

```
Route → Controller → Service → Repository → Database
```

---

# Issue 9: Frontend Components Lack Error Handling and UX Safeguards

## What the issue is

Several frontend components lack proper API error handling and user-experience safeguards.

Examples observed:

* No loading states when fetching API data
* No error handling for failed API requests
* Customer search triggers requests on every keystroke without debounce
* Using array index as React key in lists
* Navigation handled via local state instead of routing

---

## Where it is in the code

Affected files:

```
src/App.js
src/components/CustomerSearch.js
src/components/CreateOrder.js
src/components/OrderList.js
```

---

## Why it matters

These issues reduce usability and may cause inconsistent UI behavior when API requests fail or network latency is high.

---

## How to fix it

Recommended improvements:

* Implement loading and error states
* Use debounce for search inputs
* Replace index keys with stable identifiers (`id`)
* Introduce **React Router** for navigation
* Wrap API calls with `try/catch` and show user feedback

---

# Summary

The codebase provides a functional implementation of an order management system; however, several issues were identified that may affect **security, performance, data integrity, and maintainability**.

The most critical findings include:

* A **SQL injection vulnerability** in the customer search endpoint caused by unsafe query construction.
* A **race condition in the order creation workflow**, which can lead to inconsistent inventory counts when concurrent requests are processed.
* **Hardcoded database credentials** and missing environment configuration in the database setup.
* **Unrestricted CORS configuration**, allowing any origin to access the API, which can expose the backend to unauthorized usage.
* **Missing authentication and authorization mechanisms**, meaning all API endpoints are publicly accessible without access control.
* A **performance bottleneck (N+1 queries)** in the orders endpoint, which can significantly increase database load as the number of orders grows.

Additionally, improvements in **input validation, centralized error handling, and backend architecture (layered or MVC design)** would significantly improve the reliability, scalability, and maintainability of the system.

Addressing these issues would strengthen the system's **security posture, operational reliability, and long-term maintainability**, making it better suited for production environments.