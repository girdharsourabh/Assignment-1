# From Frontend - frontend/src/api/index.js(file):-

# Basically i got two major errors from the index.js file which are -
# Frist Error (problem)-
-API responses are returned directly without checking if the HTTP request succeeded.
=> NOT HANDLING ERRORS PROPERLY
-const res = await fetch(`${API_BASE}/orders`);
return res.json();
- IN THIS CODE OF LINE IT DOES NOT CHECKS WHAT IF THE REQUEST FAILS 
- IT DOSENT RETURN ANY ERROR CODE LIKE-404 
 - return res.json(); - but this code runs which will give us (unexpected UI crashes).

# proper fix for this problem will be we can use- (!res.ok)
const res = await fetch(`${API_BASE}/orders`);
if (!res.ok) {
  throw new Error('Failed to fetch orders');
}
return res.json(); //


# Second Error (problem)-

-the main issue in second problem is Customer Search Vulnerable in 
-fetch(`${API_BASE}/customers/search?name=${name}`) in this line of code 
-as we can see the The user input name is directly inserted into the URL which can cause a major issue so,
- we can use encodeURIComponent() for query parameters like -
=> fetch(`${API_BASE}/customers/search?name=${encodeURIComponent(name)}`)

# there is one more small issue but it can make a big difference in fixing bugs and finding problem in code later on 
=> return res.json(); this one 
# Fix-(we can use (res.ok))-
const data = await res.json();
if (!res.ok) {
  throw new Error(data.error || "API request failed");
}
return data;

#  From Backend  - backend/src/config/db.js 

 # Frist Error (problem)-
-  in our (GET /orders route) for each order we are using two additional database queries 
# const ordersResult = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
for (const order of orders) {
  const customerResult = await pool.query('SELECT name, email FROM customers WHERE id = $1', [order.customer_id]);
  const productResult = await pool.query('SELECT name, price FROM products WHERE id = $1', [order.product_id]);
}
//
- which can cause a major issue if there are a larger no of orders 
  # solution for this will be we could use a single JOIN query instead.
  like this=>

  SELECT o.*, 
       c.name AS customer_name, 
       c.email AS customer_email,
       p.name AS product_name,
       p.price AS product_price
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN products p ON o.product_id = p.id
ORDER BY o.created_at DESC;

# Second Error in our backend is we have no Proper Validation for  
-const { customer_id, product_id, quantity, shipping_address } = req.body;
# proper fix for this wiil be that we can validate input before processing like this -
 =>
 if (!customer_id || !product_id || quantity <= 0) {
  return res.status(400).json({ error: "Invalid order data" });
}//

# Third and the most crucial Error will be Inventory Update Not Transaction Safe
- These two queries are not wrapped in a transaction
=>
INSERT INTO orders ...
UPDATE products SET inventory_count = inventory_count - $1
//
# Fix for this we can use a database transaction.and wrap it inside a try catch block like -

await pool.query('BEGIN');
try {
  // insert order
  // update inventory
  await pool.query('COMMIT');
} catch (err) {
  await pool.query('ROLLBACK');
}
//

# Forth error is Order Status Update Not Restricted in-
=>
router.patch('/:id/status')
//
in this the API can allow any status change which could break logic 
# Fix -

const allowed = ['pending','confirmed','shipped','delivered'];
if (!allowed.includes(status)) {
  return res.status(400).json({ error: "Invalid status" });
}
//

# in our backend/src/config/db.js we have one issue which is 
- we have Hardcoded Database Credentials which is bad 
# for fixing this we can use Enviroment Variables like -
=>
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
})
//

# DataBase Errors-

# Error 1 -
-Missing Constraints on quantity
- in our order table we have quantity INTEGER NOT NULL
-The orders table does not enforce a constraint ensuring that quantity is greater than zero.
# Fix for this will be -
=> Add a database constraint:
quantity INTEGER NOT NULL CHECK (quantity > 0)
//
