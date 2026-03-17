## Major issues (fix first)

First four: **BUG 1**, **BUG 2**, **BUG 3**, **BUG 4**.

---

BUG 1:

What the issue is ?

Admin-facing functionality is unauthenticated. There is no user/login system, so anyone can access the API and perform privileged actions (view orders, create orders, search customers, etc.). In addition, secrets/config (e.g., DB credentials and seeded admin credentials) are not clearly managed via environment variables, increasing the risk of accidental exposure.

Where it is in the code (file + line or function)

- Backend: No auth middleware; all routes in index.js are open (app.use('/api/customers', ...), app.use('/api/products', ...), app.use('/api/orders', ...))
- Frontend: App.js shows Orders, New Order, Customer Search to everyone without any login gate
- Database: No users table in db/init.sql

Why it matters (impact — security, performance, correctness, reliability)

Security (critical): Unauthorized users can read/modify/create orders, customers, and product data. Poor secret handling increases the likelihood of credential leakage and broader compromise.

How you would fix it ?

- Add a users table (id, username, password_hash, created_at) in db/init.sql and seed at least one admin user with a bcrypt-hashed password.
- Backend: Add auth routes (POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me), use session or JWT-based auth middleware, and protect all existing API routes with it.
- Frontend: Add a login UI; show it when the user is not authenticated; after login, show the main app (Orders, New Order, Customer Search). If using cookie-based sessions, use credentials: 'include' for all API calls.
- Secrets: Move DB credentials and any seeded admin credentials/config into environment variables (e.g., .env) and keep them out of source control.

---

BUG 2:

What the issue is ?

For getting all the orders we are applying a loop and doing (2*n+1) queries to return all the orders. Instead of that we can use Joins and create indexing for order_id, id, customer_id. We can also enforce pagination here so that we only return a fixed number of orders at a time.

API : /api/orders
REQUEST TYPE : GET (Get all the orders)

Where it is in the code (file + line or function)

Folder : Backend
File : orders.js
Function :
// Get all the orders
router.get('/', async (req, res))

Why it matters (impact — security, performance, correctness, reliability)

Performance: One join query instead of 2*n+1 queries will significantly improve performance. Index on ids (id, order_id, product_id, customer_id) will make query fast. Returning only 20 orders at a time (pagination) is better because usually user only wants to see recent or pending orders not all delivered orders in one go.

How you would fix it ?

First apply Join to get orders with customer and product in one query. Then add Limit and Offset for pagination. Create indexes for order_id, id, customer_id, product_id.

---

BUG 3:

What the issue is ?

SQL injection threat in search the customer. Search query builds SQL with string concatenation so user input can change the query.

Where it is in the code (file + line or function)

Folder : Backend
File : customers.js (around line where search by name is done)
Example: query like "SELECT * FROM customers WHERE name ILIKE '%" + name + "%'"

Why it matters (impact — security, performance, correctness, reliability)

Security: Attacker can inject SQL and read or change data. We must use parameterized query.

How you would fix it ?

Do not concatenate name into SQL. Use parameterized query e.g. WHERE name ILIKE $1 with param ['%' + name + '%']. This will reduce sql injection threat.

Also add frontend debouncing for customer search input (and URL-encode query params) to avoid firing a network request on every keystroke and reduce load on the backend.

---

BUG 4:

What the issue is ?

After creating order we are decrementing the inventory in a separate step. What if system fails after order creation? Then order is created but inventory is not updated. Also what basically this issue is about: when order is created we run two queries in the function — first create order then update inventory. What if two admin try to create an order at same time? Then both can pass the inventory check and both decrement so inventory can go into negative. We should apply transaction here to avoid this and to protect from this situation.

Where it is in the code (file + line or function)

Folder : Backend
File : orders.js
Function : POST create order (create order + update product inventory)

Why it matters (impact — security, performance, correctness, reliability)

Correctness and reliability: Without transaction we get race condition and wrong inventory. With transaction we make create order + update inventory atomic.

How you would fix it ?

Use a database transaction: start transaction, create order, update product inventory (and optionally lock product row with SELECT ... FOR UPDATE), then commit. If any step fails rollback so that we do not have order without inventory update or negative inventory.

---

## Other backend issues

---

BUG 5:

What the issue is ?

We are wasting network call for creating the order when the order is invalid (e.g. empty or quantity not enough).

API : /api/orders
REQUEST TYPE : POST

When we hit this api with bad data from frontend we still make the call. Example:

Request with quantity : 0
{
    "customer_id": 6,
    "product_id": 4,
    "quantity": 0,
    "shipping_address": "Bihar"
}

Request with quantity : 111111111
{
    "customer_id": 6,
    "product_id": 4,
    "quantity": 111111111,
    "shipping_address": "Bihar"
}

Here we are wasting network call every time for this type of request. We should apply safety at the frontend level so that user cannot send request with quantity 0 or quantity > inventory_count.

Where it is in the code (file + line or function)

Folder : Frontend
File : CreateOrder.js
Function : handleSubmit

Why it matters (impact — security, performance, correctness, reliability)

It basically will enhance the performance of this api call.

How you would fix it ?

We should apply safety check for quantity:

if (!selectedCustomer || !selectedProduct || !address || quantity <= 0 || quantity > selectedProductData.inventory_count) {
    setMessage({ type: 'error', text: 'Please fill all fields' });
    return;
}

---

BUG 6:

What the issue is ?

We are using SQL query directly. Instead of that we can use Prisma or Drizzle for safety purpose so that we can reduce the threat of sql injection.

Where it is in the code (file + line or function)

Folder : Backend
File : All route files that run SQL (customers.js, orders.js, products.js)

Why it matters (impact — security, performance, correctness, reliability)

Security: Raw SQL can lead to sql injection. Using ORM gives safety and better maintainability.

How you would fix it ?

Add Prisma or Drizzle, define models for customers, orders, products, and use ORM queries instead of raw SQL everywhere.

---

BUG 7:

What the issue is ?

There is no indexing on tables. We can create indexing to enhance the performance for query.

Where it is in the code (file + line or function)

Folder : Database
File : db/init.sql

Why it matters (impact — security, performance, correctness, reliability)

Performance: Without index every search does full scan. With index on id, order_id, customer_id, product_id query will return fast.

How you would fix it ?

Add CREATE INDEX in db/init.sql for columns we filter or join on (e.g. orders.customer_id, orders.product_id, orders.created_at, customers.name).

---

BUG 8:

What the issue is ?

Searching by name for customer is not efficient.

Where it is in the code (file + line or function)

Folder : Backend
File : customers.js
Function : search by name (e.g. GET with name param)

Why it matters (impact — security, performance, correctness, reliability)

Performance: No index on name and query might not be parameterized so search is slow and can have sql injection threat (see BUG 14).

How you would fix it ?

Add index on customers.name. Use parameterized query for name search (e.g. WHERE name ILIKE $1 with param) so that we avoid sql injection and get better performance.

---

BUG 9:

What the issue is ?

Before creating Customer we are not applying safety check for email, name, phone. There is no safety check before creating customer so user can dump any data to database which can be security issue for future purpose.

Where it is in the code (file + line or function)

Folder : Backend
File : customers.js
Function : POST create customer

Why it matters (impact — security, performance, correctness, reliability)

Security and correctness: Bad or duplicate data can get in. We should validate required fields and format (email, name, phone) before insert.

How you would fix it ?

Apply safety check before creating customer: check email format, name and phone present and valid. Return clear error if validation fails.

---

BUG 10:

What the issue is ?

Status code is missing everywhere. API often returns same status (e.g. 200) even when there is error.

Where it is in the code (file + line or function)

Folder : Backend
File : index.js (error handler), all route files (customers.js, orders.js, products.js)

Why it matters (impact — security, performance, correctness, reliability)

Correctness and reliability: Frontend and client cannot know if request failed. We should return proper status (e.g. 400 for bad input, 404 for not found, 500 for server error).

How you would fix it ?

Set correct status code in every response: res.status(400), res.status(404), res.status(500) etc. Fix global error handler so that it does not always send 200 with success: true on error.

---

BUG 11:

What the issue is ?

Before creating orders we are not applying safety check. No safety check is applied before creating order.

API : /api/orders
REQUEST TYPE : POST
Json data :
{
    customer_id,
    product_id,
    quantity,
    shipping_address
}

Safety check is not applied on any of the field.

Where it is in the code (file + line or function)

Folder : Backend
File : orders.js
Function : POST create order

Why it matters (impact — security, performance, correctness, reliability)

Security and correctness: Invalid or missing fields can create bad orders and waste network call (see BUG 2). We should validate all required fields and quantity range before any DB call.

How you would fix it ?

Apply safety check before creating order: check customer_id, product_id, quantity, shipping_address are present; quantity > 0 and <= inventory_count; customer_id and product_id exist. Return 400 with clear message if check fails.

---

BUG 12:

What the issue is ?

Total amount calculation should round to 2 decimal places and use explicit number conversion for currency so that we do not get floating point issues.

Where it is in the code (file + line or function)

Folder : Backend
File : orders.js (where total/amount is set)

Why it matters (impact — security, performance, correctness, reliability)

Correctness: Currency must be exact. Round to 2 decimal and use proper number type.

How you would fix it ?

When calculating total amount use explicit conversion and round to 2 decimal places (e.g. Number((price * quantity).toFixed(2)) or equivalent in DB).

---

BUG 13:

What the issue is ?

Validation check is missing for API PATCH /:id/inventory (products). Same bug as BUG 11 for inventory_count — we can set negative or invalid inventory_count.

Where it is in the code (file + line or function)

Folder : Backend
File : products.js
Function : PATCH /:id/inventory (update inventory_count)

Why it matters (impact — security, performance, correctness, reliability)

Correctness: Negative inventory should not be allowed. We should validate inventory_count (e.g. non-negative integer).

How you would fix it ?

Apply safety check for inventory_count before update: must be number and >= 0. Return 400 if invalid.

---

BUG 14:

What the issue is ?

We are returning all the orders in one go. We should only return last n number of orders (or use pagination) instead of all the orders in one go.

Where it is in the code (file + line or function)

Folder : Backend
File : orders.js
Function : router.get('/', ...) — get all orders

Why it matters (impact — security, performance, correctness, reliability)

Performance: Returning all orders can be slow and heavy. User usually needs recent or paginated list. Same idea as BUG 4 — use limit and offset.

How you would fix it ?

Add limit and offset (or page/size) to GET /api/orders. Return only that many orders (e.g. last 20 or first page). Frontend can ask for more with next page.

---

## Frontend bugs

BUG 15:

What the issue is ?

In CreateOrder we have useEffect that sets selectedProductData from selected product. But the dependency array has only [products] so when user changes selectedProduct the selectedProductData does not update until products change. So we can show wrong product info or wrong inventory_count for the selected product.

Where it is in the code (file + line or function)

Folder : Frontend
File : CreateOrder.js
Function : useEffect (around line 20–25)
```js
useEffect(() => {
  if (selectedProduct) {
    const product = products.find(p => p.id === parseInt(selectedProduct));
    setSelectedProductData(product);
  }
}, [products]); // Missing: selectedProduct
```

Why it matters (impact — security, performance, correctness, reliability)

Correctness: User selects product B but UI might still show product A name/price/inventory. So safety check for quantity > inventory_count can use wrong data and we can send wrong request to backend.

How you would fix it ?

Add selectedProduct to dependency array: ```}, [products, selectedProduct]);.``` So that when user changes product dropdown we update selectedProductData.

---

BUG 16:

What the issue is ?

When we click Place Order we call createOrder API but there is no loading state. So user can click again and again and we send duplicate requests. We are wasting network call and we can create duplicate orders.

Where it is in the code (file + line or function)

Folder : Frontend
File : CreateOrder.js
Function : handleSubmit (no loading state), button has no disable

Why it matters (impact — security, performance, correctness, reliability)

Performance and correctness: Duplicate orders and extra api call. We should disable button and show loading so that user cannot double submit.

How you would fix it ?

Add state like const [submitting, setSubmitting] = useState(false). In handleSubmit set submitting true at start and false when done (in finally block). Disable button when submitting and show text like "Placing order..." so that user knows we are processing.

---

BUG 17:

What the issue is ?

Total amount shown in CreateOrder (price × quantity) uses .toLocaleString() but we are not rounding to 2 decimal places first. So we can show long float like 99.99999999. Same idea as BUG 11 on backend — currency should be 2 decimal.

Where it is in the code (file + line or function)

Folder : Frontend
File : CreateOrder.js
Line : around 80 where we show selectedProductData.price * quantity

Why it matters (impact — security, performance, correctness, reliability)

Correctness: User sees wrong total. We should round to 2 decimal and then show.

How you would fix it ?

Use something like (selectedProductData.price * quantity).toFixed(2) or Number((selectedProductData.price * quantity).toFixed(2)).toLocaleString() so that we show only 2 decimal for currency.

---

BUG 18:

What the issue is ?

Before adding customer we are not applying safety check for name email phone. User can click Save Customer with empty name or empty email or invalid email and we still send request to API. So we waste network call and we get error from backend only. We should apply safety at frontend level so that we do not send invalid data.

Where it is in the code (file + line or function)

Folder : Frontend
File : CustomerSearch.js
Function : handleAddCustomer (no check before createCustomer)

Why it matters (impact — security, performance, correctness, reliability)

Performance and correctness: We reduce unnecessary api call. User gets clear message like "Please fill name and email" instead of generic error from backend. Same idea as BUG 8 — safety check before creating.

How you would fix it ?

Apply safety check at start of handleAddCustomer: if (!newName.trim() || !newEmail.trim()) set error message and return. We can also check simple email format (e.g. has @) so that we do not send bad data.

---

BUG 19:

What the issue is ?

When user types in customer search we call search API on every keystroke. So for typing "john" we make 4 api calls (j, jo, joh, john). We are wasting network call every time. We should debounce so that we only call API after user stops typing for some time.

Where it is in the code (file + line or function)

Folder : Frontend
File : CustomerSearch.js
Function : handleSearch is called from onChange so every key press triggers search

Why it matters (impact — security, performance, correctness, reliability)

Performance: Too many api calls. It will enhance performance if we debounce search (e.g. 300ms after last keystroke) so that we only hit API when user pauses.

How you would fix it ?

Use debounce: we can use a timer and clear it on each keystroke, then after 300ms call searchCustomers. Or use a hook like useDebouncedValue(query, 300) and run search in useEffect when debounced value changes. So that we reduce network call for this type of request.

---

BUG 20:

What the issue is ?

In CustomerSearch we are using key={idx} (index) for the list of customer cards. When list changes or reorders React can reuse wrong component and show wrong data. We should use stable id for key so that React can track correctly.

Where it is in the code (file + line or function)

Folder : Frontend
File : CustomerSearch.js
Line : results.map((customer, idx) => ( <div className="customer-card" key={idx}>

Why it matters (impact — security, performance, correctness, reliability)

Correctness: Using index as key can cause wrong UI when list updates. Use customer.id for key so that each row is tracked by id.

How you would fix it ?

Change key={idx} to key={customer.id}. So that we have stable key for each customer.

---

BUG 21:

What the issue is ?

In OrderList we are using key={index} for order rows. Same bug as BUG 21 — we should use order.id for key so that React does not get confused when list changes or when we add pagination later.

Where it is in the code (file + line or function)

Folder : Frontend
File : OrderList.js
Line : sortedOrders.map((order, index) => ( <tr key={index}>

Why it matters (impact — security, performance, correctness, reliability)

Correctness: When we sort or refetch, using index as key can cause wrong row to update or focus. Use order.id so that each row is stable.

How you would fix it ?

Change key={index} to key={order.id}.

---

BUG 22:

What the issue is ?

When we fetch orders we do not show loading state. So user sees empty table until data comes. And when fetch fails we do not show any error we just have empty list. There is no loading and no error handling for fetchOrders.

Where it is in the code (file + line or function)

Folder : Frontend
File : OrderList.js
Function : useEffect(() => fetchOrders().then(data => setOrders(data)), []);

Why it matters (impact — security, performance, correctness, reliability)

Reliability and correctness: User does not know if app is loading or failed. We should show loading spinner and on error show message like "Failed to load orders" so that user knows what happened.

How you would fix it ?

Add state loading and error. Before fetch set loading true. In then set orders and loading false. In catch set error message and loading false. In UI show loading when loading true and show error message when error. So that we handle both loading and fail case.

---

BUG 23:

What the issue is ?

Sort comparison in OrderList does not handle equal values. When aVal === bVal we return -1 so sort order for equal items is not stable and can look random. We should return 0 when values are equal.

Where it is in the code (file + line or function)

Folder : Frontend
File : OrderList.js
Function : sortedOrders sort callback (around line 20–27)
```js
if (sortDir === 'asc') return aVal > bVal ? 1 : -1;
return aVal < bVal ? 1 : -1;
```

Why it matters (impact — security, performance, correctness, reliability)

Correctness: When two orders have same total or same date the list can jump or order can change on re-render. Return 0 when equal so that sort is stable.

How you would fix it ?

When aVal === bVal return 0. For asc: return aVal > bVal ? 1 : aVal < bVal ? -1 : 0. For desc: return aVal < bVal ? 1 : aVal > bVal ? -1 : 0. So that equal values keep their order.

---

BUG 24:

What the issue is ?

When we change order status we call updateOrderStatus and then refetch all orders. But we do not check if update failed. If API returns error we still refetch and UI might show old status so user thinks it updated but it did not. We should check result and show error when update fails.

Where it is in the code (file + line or function)

Folder : Frontend
File : OrderList.js
Function : handleStatusChange — no check of response before refetch

Why it matters (impact — security, performance, correctness, reliability)

Correctness: User changes status to shipped but if backend fails we do not show error. User thinks it is shipped but it is still pending. We should show error message when update fails.

How you would fix it ?

Check result from updateOrderStatus. If result.error or if we add res.ok check in API then when request failed show setMessage or setError with "Failed to update status" and do not refetch. So that user knows update failed and can try again.

---

BUG 25:

What the issue is ?

All API calls in frontend use fetch but we do not pass credentials: 'include'. So when we add login (BUG 1) the session cookie will not be sent and user will not be authenticated on API. We should add credentials: 'include' to all fetch so that cookies are sent.

Where it is in the code (file + line or function)

Folder : Frontend
File : src/api/index.js
All fetch calls (fetchOrders, createOrder, updateOrderStatus, fetchCustomers, searchCustomers, createCustomer, fetchProducts)

Why it matters (impact — security, performance, correctness, reliability)

Security and correctness: After we add auth (BUG 1) API will need cookie or token. Without credentials: 'include' browser will not send cookie so every request will look unauthenticated. We should add it now so that when we add login it works.

How you would fix it ?

Add credentials: 'include' to every fetch call in api/index.js. Example: fetch(url, { method: 'GET', credentials: 'include' }) and same for POST/PATCH. So that when we have session auth cookie is sent with request.

---

BUG 26:

What the issue is ?

API functions always do res.json() and return. We never check res.ok or res.status. So when backend returns 400 or 500 we still return the json body and caller has to guess from result.error. But sometimes backend might send 500 with no body or different shape so we can get wrong behaviour. We should check res.ok and return or throw so that caller knows request failed.

Where it is in the code (file + line or function)

Folder : Frontend
File : src/api/index.js
Every function does const res = await fetch(...); return res.json(); no status check

Why it matters (impact — security, performance, correctness, reliability)

Correctness and reliability: Components might show success when actually server returned error. We should handle error response and return { error: message } or throw so that UI can show error properly.

How you would fix it ?

After fetch get const data = await res.json(). If (!res.ok) return { error: data.message || data.error || 'Request failed' } or similar so that every caller gets result.error when request failed. Then in CreateOrder CustomerSearch OrderList we already check result.error so they will show error message. So that we have one place for error handling in API layer.

---

BUG 27:

What the issue is ?

In searchCustomers we build URL with ?name=${name}. If name has space or special character like & or # the URL can break or backend can get wrong value. We should encode the name so that URL is valid.

Where it is in the code (file + line or function)

Folder : Frontend
File : src/api/index.js
Function : searchCustomers(name) — line like `${API_BASE}/customers/search?name=${name}`

Why it matters (impact — security, performance, correctness, reliability)

Correctness: User searches "O'Brien" or "a & b" and we send wrong query. Use encodeURIComponent(name) so that special chars are encoded and backend gets correct name.

How you would fix it ?

Change to ?name=${encodeURIComponent(name)} so that we do not break URL and backend gets correct search string.
