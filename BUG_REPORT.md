# Bug Report — Order Management System

I went through the entire codebase file by file before writing this. Every issue below is something I verified exists in the actual code.

---

## Issue 1: Hardcoded Database Credentials

**What:** Database username and password are hardcoded directly in source code  
**Where:** `backend/src/config/db.js`, lines 4–9  

```javascript
const pool = new Pool({
  user: 'admin',
  password: 'admin123',  // hardcoded
  host: 'db',
  port: 5432,
  database: 'orderdb',
});
```

**Why it matters:** Anyone with access to the repository has the database password. You can't use different credentials for dev vs staging vs production without changing the code. If this repo were ever made public or leaked, the database would be immediately accessible.

**Fix:** Read credentials from environment variables. Remove the hardcoded fallbacks entirely in production — if the env vars are missing, the app should fail to start, not silently use weak defaults.

```javascript
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
});
```

Set the actual values in `docker-compose.yml` using environment variables, and use a `.env` file locally (added to `.gitignore`).

---

## Issue 2: Order Status Update Accepts Any Value

**What:** The status update endpoint writes whatever string it receives directly to the database with no validation  
**Where:** `backend/src/routes/orders.js`, lines 88–100 (PATCH `/:id/status`)

```javascript
const { status } = req.body;
const result = await pool.query(
  'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
  [status, req.params.id]
);
```

**Why it matters:** An order can be set to `"banana"`, `"hacked"`, or any arbitrary string. It also allows illegal status transitions — for example jumping an order from `pending` directly to `delivered`, or setting a `cancelled` order back to `pending`. This will silently corrupt data and break any logic that relies on status values being predictable.

**Fix:** Validate against the known allowed values before writing:

```javascript
const VALID_STATUSES = ['pending', 'confirmed', 'shipped', 'delivered'];
const { status } = req.body;

if (!VALID_STATUSES.includes(status)) {
  return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
}
```

You could go further and enforce transition rules (e.g. can't go from `shipped` back to `pending`), but at minimum the value must be validated.

---

## Issue 3: No Input Validation on Customer Creation

**What:** The customer creation endpoint accepts and inserts whatever it receives with no checks  
**Where:** `backend/src/routes/customers.js`, lines 22–31 (POST `/`)

```javascript
const { name, email, phone } = req.body;
const result = await pool.query(
  'INSERT INTO customers (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
  [name, email, phone]
);
```

**Why it matters:** You can create customers with no name, no email, or a completely invalid email address. This leads to dirty data in the database and confusing UI behavior (customer cards with blank names, broken email links).

**Fix:** Add basic validation before hitting the database:

```javascript
const { name, email, phone } = req.body;

if (!name || !email) {
  return res.status(400).json({ error: 'Name and email are required' });
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return res.status(400).json({ error: 'Invalid email format' });
}
```

---

## Issue 4: Inventory Can Be Set to a Negative Number

**What:** The inventory update endpoint accepts any integer including negative values  
**Where:** `backend/src/routes/products.js`, lines 20–31 (PATCH `/:id/inventory`)

```javascript
const { inventory_count } = req.body;
const result = await pool.query(
  'UPDATE products SET inventory_count = $1 WHERE id = $2 RETURNING *',
  [inventory_count, req.params.id]
);
```

**Why it matters:** Passing `{ "inventory_count": -50 }` will write `-50` to the database. The order creation endpoint checks `product.inventory_count < quantity` before allowing orders — negative inventory means that check passes even when there's no stock, allowing orders to be placed for products that don't exist.

**Fix:** Validate that inventory_count is a non-negative integer:

```javascript
const { inventory_count } = req.body;

if (inventory_count === undefined || !Number.isInteger(inventory_count) || inventory_count < 0) {
  return res.status(400).json({ error: 'inventory_count must be a non-negative integer' });
}
```

---

## Issue 5: useEffect Missing Dependency in CreateOrder

**What:** The useEffect that syncs selected product data is missing `selectedProduct` from its dependency array  
**Where:** `frontend/src/components/CreateOrder.js`, line ~26

```javascript
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  }
}, [products]); // selectedProduct is missing here
```

**Why it matters:** When a user selects a product from the dropdown, `selectedProduct` changes but the effect doesn't re-run because it's not in the dependency array. The product details panel (showing price, stock, and estimated total) won't update until something causes `products` to change — which never happens after initial load. So the user sees stale or no product information while creating an order.

**Fix:** Add the missing dependency:

```javascript
}, [products, selectedProduct]);
```

---

## Issue 6: CustomerSearch Uses Array Index as React Key

**What:** The customer search results list uses the loop index as the React key instead of the customer's ID  
**Where:** `frontend/src/components/CustomerSearch.js`, line ~104

```javascript
results.map((customer, idx) => (
  <div className="customer-card" key={idx}>
```

**Why it matters:** When the search results change (user types a different query), React uses the key to decide which DOM nodes to reuse. With index keys, a list of 5 results changing to a different 5 results will appear to React as "the same 5 items with different content" rather than "5 different items." This causes React to patch existing nodes instead of replacing them, which can produce visual glitches and stale component state.

**Fix:** Use the customer's unique ID:

```javascript
results.map((customer) => (
  <div className="customer-card" key={customer.id}>
```

---

## Issue 7: CORS Is Fully Open

**What:** The API accepts requests from any origin  
**Where:** `backend/src/index.js`, line 10

```javascript
app.use(cors());
```

**Why it matters:** With no origin restriction, any website on the internet can make requests to this API from a user's browser. In a production app with authentication, this would allow malicious sites to make authenticated requests on behalf of logged-in users (CSRF-style attacks).

**Fix:** Restrict to the known frontend origin:

```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
}));
```

---

## Priority Order

| # | Issue | Severity |
|---|-------|----------|
| 1 | Hardcoded DB credentials | Critical — Security |
| 2 | Status update accepts any value | High — Data integrity |
| 3 | Inventory can go negative | High — Data integrity |
| 4 | No customer input validation | Medium — Correctness |
| 5 | useEffect missing dependency | Medium — Frontend bug |
| 6 | Open CORS policy | Medium — Security |
| 7 | Array index as React key | Low — Performance |