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