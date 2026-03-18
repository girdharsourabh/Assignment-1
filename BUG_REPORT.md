BUG REPORT — Order Management System

1. Hardcoded Database Host (Environment Issue)

    Location: backend/src/config/db.js

    Issue:
        The database host is hardcoded as db, which only works inside Docker.

    Impact:
        Breaks local development
        Causes connection errors (ENOTFOUND db)
        Environment-dependent behavior
    
    Fix:
        Use environment variable:
        host: process.env.DB_HOST || 'localhost'


2. N+1 Query Problem in Orders API (Performance Issue)

    Location: backend/src/routes/orders.js (GET /orders)

    Issue:
        For each order, separate queries are made to fetch customer and product data.

    Impact:

        Poor performance
        Scales badly with more data
        Multiple unnecessary DB calls

    Fix:
        Replace loop with JOIN query:

    SELECT o.*, c.name, p.name FROM orders o
    JOIN customers c ON o.customer_id = c.id
    JOIN products p ON o.product_id = p.id


3. Missing Error Logging (Debugging Issue)

    Location: backend/src/routes/orders.js

    Issue:
        Errors are not logged in the catch block.

    Impact:
        Difficult debugging
        Hidden failures

    Fix:
        Add: console.error(err);


4. Frontend Crash — "orders is not iterable" (Correctness Issue)

    Location: frontend/src/components/OrderList.js

    Issue:
        Frontend assumes API always returns an array.

    Impact:
        App crashes if API fails
        Poor user experience

    Fix:
        {Array.isArray(orders) && orders.map(...)}


5. Ordering by Non-Existent Column (Potential Bug)

    Location: backend/src/routes/orders.js

    Issue:
        Query uses ORDER BY created_at which may not exist.

    Impact:
        API failure
        Data retrieval breaks

    Fix: 
        Use: ORDER BY id DESC


6. No Input Validation in Order Creation (Security Issue)

    Location: backend/src/routes/orders.js (POST /orders)

    Issue:
        User input is not validated.

    Impact:
        Invalid data insertion
        Potential abuse

    Fix:
        Validate request body fields before query execution.