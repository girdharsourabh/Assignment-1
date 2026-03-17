### BUG_REPORT.md

## 1. SQL Injection (Security)

**What**
The search feature takes whatever the user types and drops it directly into the database query string.

**Where**
`backend/src/routes/customers.js` — GET `/search` route

**Why**
this is a big security hole. A hacker can type SQL commands into the search bar instead of a name, which lets them read private user data, delete tables, or break the database entirely.

**How**
Stop concatenating strings. Use a parameterized query (like "$1"). This forces the database to treat the users input strictly as text, not as executable code.

---

## 2. N+1 Query Problem (Performance)

**What**
The code asks the database for all orders, and then runs a "for" loop, making two new database requests (for customer and product info) for every single order.

**Where**
`backend/src/routes/orders.js` — GET `/` route.

**Why**
This will kill the database as the app grows. If we have 1000 orders, this endpoint makes 2001 separate database calls. It will cause big slowdowns and exhaust our connection limits.

**How**
get rid of the loop. Write one single SQL query using "JOIN" statements to grab the order, customer, and product data all at the same time.

---

## 3. Transactional Race Condition (Data Integrity)

**What**
Creating an order and lowering the product inventory count happen as two completely disconnected steps

**Where**
`backend/src/routes/orders.js` — POST `/` route (Create order).

**Why**
if two people try to buy the last item at the exact same millisecond, the system might sell it to both, pushing inventory into negative numbers. Also, if the server crashes right after making the order but before updating the inventory, our data gets permanently corrupted.

**How**
Put the inventory check, the order creation, and the inventory update inside a single SQL transaction ("BEGIN", "COMMIT", "ROLLBACK"). This guarantees that either everything succeeds, or nothing happens at all.

---

## 4. Swallowed Exceptions (Reliability)

**What**
the global error handler catches server crashes but tells the frontend that everything went fine by returning a 200 OK status.

**Where**
`backend/src/index.js` — global error middleware.

**Why**
This makes debugging almost impossible. If an order fails, the frontend thinks it succeeded. And our automated monitoring tools wont trigger any alerts because the server claims there are no errors.

**How**
When an error happens, log the actual stack trace to the console and send back a proper `500 Internal Server Error` status code so the frontend knows something broke

---

## 5. Hardcoded Infrastructure Secrets (Security)

**What**
The database username and password are saved directly in the code files.

**Where**
`backend/src/config/db.js` and `docker-compose.yml`.

**Why**
anyone who looks at the GitHub repository can see our passwords and gain full admin access to our database. You should never commit passwords to git (version control)

**How**
Remove the passwords from the code. Use a `.env` file to load them as environment variables during development, and inject them via Docker in production

---

## 6. Missing Authentication (Security)

**What**
The API lets anyone change data without checking who they are.

**Where**
`backend/src/routes/orders.js` (creating/updating orders) and `backend/src/routes/products.js` (updating inventory).

**Why**
A random person on the internet could easily send an Api request to change an orders status to delivered or artificially change our product inventory counts.

**How**
We need to add authentication (like JWT tokens). At the very least, routes that change inventory or order statuses should require admin privileges.

---

## 7. Missing Database Rules (Data Integrity)

**What**
The database tables dont have strict rules to prevent bad data from being saved.

**Where**
`db/init.sql` — table setups for `orders` and `products`.

**Why**
Even if our Node.js code is perfect, someone could manually insert bad data (like an order with a negative quantity or an invalid status). This leads to broken reports and bugs later 

**How**
Add database-level checks in the SQL file. For example, add "CHECK (inventory_count >= 0)" and make sure foreign keys are set to "NOT NULL".

---

## 8. Overly Permissive CORS (Security)

**What**
CORS is turned on with default settings, which means any website on the internet can talk to our API.

**Where**
`backend/src/index.js` — `app.use(cors())`.

**Why**
If a user is logged in, a malicious website could trick their browser into sending unwanted requests to our API 

**How**
Configure the CORS setup to only accept requests coming from our specific frontend URL (like `http://localhost:3000`).

