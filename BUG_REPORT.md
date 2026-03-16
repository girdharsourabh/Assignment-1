## SQL injection attack posiible in customer search (critical issue)
   in backend/src/routes/customer.js

   problem: 
   const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";
const result = await pool.query(query);

user query has script where user input is directly concatenated, attackers can use this vulnerability to inject malicious code and change or convert database data

    fix:
    const query = 'SELECT * FROM customers WHERE name ILIKE $1';
    const result = await pool.query(query, [`%${name}%`]);

## Missing input validation ( Security, integrity)
    in backend/src/routes/customers.js -> post/ customers

    problem:
    const { name, email, phone } = req.body;

    No validation, user can input random or no stuff which could corrupt our database

    fix:
    if (!name || !email) {
        return res.status(400).json({ error: "Name and email required" });
    }

## SELECT * used everywhere (performance issue)
    in backend/src/routes/customers.js

    problem:
    SELECT * FROM customers

    this fetches unnnecessary columns from data table which causes slow queries, large payload and large memory usage

    fix:
    SELECT id, name, email FROM customers

## Error handling broken (correctness, debbugging)
    in backend/src/index.js

    problem: 
    app.use((err, req, res, next) => {
        console.log('Something happened');
        res.status(200).json({ success: true });
    });

    always returns HTTP 200 which causes user to think their request has success, and debugging of error becomes difficult like:

    200 OK
    { success: true } always

    fix:
    app.use((err, req, res, next) => {
        console.error(err);
        res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
        });
    });

## When creating orders, inventory is not checked
    in backend/src/routes/orders.js

    when order is created it reduces the product from inventory but doesn't check its existence in the inventory

    problem:
    await pool.query(
      'UPDATE products SET inventory_count = inventory_count - $1 WHERE id = $2',
      [quantity, product_id]
    );

    fix:
    should check inventory >= quantity

    UPDATE products SET inventory = inventory - $1
        WHERE id = $2
        AND inventory >= $1
    RETURNING *

## When updating Inventory their is Race condition
    in orders.js

    problem: 
    when inventory is updating their is no locking mechanism which under particular situations may lead to race condition.

    like if my inventory has 5 units and 2 users request for 3 units each the request of both users show 5 units and the transation is completed but now the inventory has -1 units available and that an issue.

    fix:
    using a transaction with row locking.

## API is not validating the order status transition
    Order status updates in orders.js.

    problem:
    The API allows updating order status without enforcing valid state transitions.

    the order status may be invalid

    fix:
    Restrict the valid transition.
    pending -> confirmed, confirmed -> shipped, shipped -> delivered, pending -> cancelled
    check validation before updating status

## Bugs in frontend code
    missing dependency in CreateOrder.js

    problem:
    useEffect(() => {
        if (selectedProduct) {
            const product = products.find(p => p.id === parseInt(selectedProduct));
            setSelectedProductData(product);
        }
    }, [products]);

    stale data

    fix:
    useEffect(() => {
        if (selectedProduct) {
            const product = products.find(p => p.id === parseInt(selectedProduct));
            setSelectedProductData(product);
        }
    }, [products, selectedProduct]);

## OrderList.js uses array index as react key

    problem:
    <tr key={index}>

    fix:
    <tr key={order.id}>

## CustomerSearch.js uses array index as react key
    problem:
    results.map((customer, idx) => (
        <div className="customer-card" key={idx}>

  fix:
  results.map((customer) => (
    <div className="customer-card" key={customer.id}>

## Debouncing search and validation issue
    in CustomerSearch.js 

    problem:
    api is called on every keystroke and NO LOADING STATE present also no error handling
    Also no validation check for Email in handleAddCustomer

    fix:
    Added debounce (400ms) to prevent spamming of API, loading state during search, added error handling for API failures, added client-side validation for customer create, Added email format validation

## Sensetive credentials hardcoded in docker-compose.yml (security)

    in docker-compose.yml

    problem:
    environment:
    POSTGRES_USER: admin
    POSTGRES_PASSWORD: admin123
    POSTGRES_DB: orderdb

    fix:
    move the sensetive data to .env file

    environment:
    POSTGRES_USER: ${POSTGRES_USER}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_DB: ${POSTGRES_DB}

## Dockerfile Caching inefficiency

    problem:
    COPY . .
    RUN npm install