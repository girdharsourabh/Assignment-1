## SQL injection attack posiible in customer search (critical issue)
   in backend/src/routes/customer.js

   problem: 
   const query = "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'";
const result = await pool.query(query);

user query has script where user input is directly concatenated, attackers can use this vulnerability to inject malicious code and change or convert database data

    fix:
    const query = 'SELECT * FROM customers WHERE name ILIKE $1';
    const result = await pool.query(query, [`%${name}%`]);