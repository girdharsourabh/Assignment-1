Issue 1 : 
Performance issue
File Name:   
backend/src/routes/orders.js
Description:
The API fetches all orders first and then makes separate database queries for each order to retrieve customer and product details.
Impact:
This results in a large number of database queries (2 additional queries per order), causing severe performance degradation as the number of orders increases.
Fix:
Replace multiple queries with a single JOIN query to fetch all required data at once.


Issue 2 : 
Missing Database Transaction
File Name : 
backend/src/routes/orders.js
Description:
Order creation and inventory update are executed as separate queries without a transaction.
Impact:
If one operation succeeds and the other fails, the database can become inconsistent (e.g., order created but inventory not updated).
Fix:
Wrap both operations in a database transaction using BEGIN, COMMIT, and ROLLBACK.

Issue 3 :
Missing Input Validation
File Name: 
backend/src/routes/orders.js
Description:
The API does not validate request body fields such as customer_id, product_id, or quantity.
Impact:
Invalid or malicious input can lead to incorrect data being stored or unexpected system behavior.
Fix:
Add validation checks for required fields and ensure quantity is a positive number.

Issue 4: 
No Status Validation
File Name:
backend/src/routes/orders.js
Description:
The API allows updating order status to any arbitrary value without validation.
Impact:
Invalid statuses can break business logic and lead to inconsistent system states.
Fix:
Restrict status updates to a predefined set of valid values (e.g., pending, confirmed, shipped, delivered).

Issue 5: 
Poor Error Handling
File Name:
orders.js
Description:
Errors are caught but not logged, making debugging difficult.
Impact:
Developers cannot trace the root cause of failures in production.
Fix:
Log errors using console.error(err) or a logging library before returning a response.

Issue 6: 
Inefficient Data Fetching Pattern
File Name:
backend/src/routes/orders.js
Description:
Sequential await calls inside a loop block execution and increase response time.
Impact:
Slower response times and reduced scalability under load.
Fix:
Use optimized queries or parallel execution where applicable.