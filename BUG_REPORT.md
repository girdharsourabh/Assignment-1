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