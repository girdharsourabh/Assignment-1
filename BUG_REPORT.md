### "Orders is not iterable" Crash

- **What**: The frontend crashes with a `TypeError: orders is not iterable` when the backend fails to fetch orders. Because the backend returns a JSON error object (e.g. `{ "error": "..." }`) instead of an array, the frontend's `.map()` function fails when trying to iterate over the `orders` variable.
- **Where**: `frontend/src/components/OrderList.js`. The issue occurs at line `20` (`[...orders].sort(...)`) and line `59` (`sortedOrders.map(...)`), as well as line `44` (`orders.length`).
- **Why**: It matters for **correctness** and **reliability**. If the backend database goes down or the API fails, the entire frontend React application crashes and shows a blank white screen (fatal UI crash), providing a terrible user experience instead of a graceful error state (like "Failed to fetch orders" or displaying 0 orders).
- **How**: Fix it by ensuring `orders` is validated as an array before spreading or mapping it. Example:
  - Line 20: `const sortedOrders = Array.isArray(orders) ? [...orders].sort(...) : [];`
  - Line 44: `<h2>Orders ({Array.isArray(orders) ? orders.length : 0})</h2>`
  - Line 59: `{Array.isArray(sortedOrders) && sortedOrders.map(...)`

### Array Index used as React `key` Prop

- **What**: The `key` prop for the table row mapping the orders array was set to the array `index` rather than a unique identifier like `order.id`.
- **Where**: `frontend/src/components/OrderList.js` at line `60` (`<tr key={index}>`).
- **Why**: It matters for **correctness** and **performance**, especially when a list can be re-ordered (like the table sorting in this app). Using an array index as a key confuses React's reconciliation algorithm. When items are sorted, React assumes the item at index `0` is still the same entity, leading to buggy UI updates, state mismatch within list items, and unnecessary DOM mutations.
- **How**: Fix it by using a unique string or number associated with the item. Example: `<tr key={order.id}>`.


### Missing Field Validation in Add Customer

- **What**: Form validation is missing when adding a new customer, allowing submission of incomplete data.
- **Where**: `frontend/src/components/CustomerSearch.js` in the `handleAddCustomer` function.
- **Why**: It matters for **data integrity** and **user experience**. Without validation, the application can submit empty fields, potentially causing backend errors or storing invalid records.
- **How**: Fix it by verifying that all required fields are provided before making the API call. Example:
```javascript
if (!newName || !newEmail || !newPhone) {
  setMessage({ type: 'error', text: "All fields are required." });
  return;
}
```

### Unsafe Array Mapping in CreateOrder
- **What**: The application crashes if `customers` or `products` APIs fail and return objects instead of arrays. Similar to the "Orders is not iterable" crash.
- **Where**: `frontend/src/components/CreateOrder.js` at lines 64 and 74 (`customers.map(...)` and `products.map(...)`).
- **Why**: Prevent fatal UI crashes during API failures.
- **How**: Wrap map functions with array validation: `Array.isArray(customers) && customers.map(...)`.

### Stale `useEffect` Dependency in Product Selection
- **What**: The `useEffect` that updates `selectedProductData` was missing `selectedProduct` in its dependency array, so the product details panel never updated when the user changed the dropdown selection.
- **Where**: `frontend/src/components/CreateOrder.js` at line 25 (`}, [products]`).
- **Why**: It matters for **correctness**. The product info section (price × quantity calculation, available stock) would show stale or no data.
- **How**: Replace the `useEffect` + state with a simple derived value: `const selectedProductData = products.find(p => p.id === parseInt(selectedProduct)) || null;`

### Quantity Input Snaps Back to 1
- **What**: When a user clears the quantity input field (via Backspace), it immediately resets to `1` because `parseInt("") || 1` evaluates to `1`, making it impossible to clear and retype a new number.
- **Where**: `frontend/src/components/CreateOrder.js` at line 88 (`onChange` handler).
- **Why**: It matters for **usability**. Users cannot easily type a new quantity without highlighting and overwriting.
- **How**: Allow empty string temporarily: `setQuantity(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value)))`.

### No Max Quantity Validation Against Inventory
- **What**: The quantity input has no upper bound, allowing users to order more units than available in stock.
- **Where**: `frontend/src/components/CreateOrder.js` at line 87 (quantity `<input>`).
- **Why**: It matters for **data integrity**. Orders exceeding available stock should be prevented at the UI level.
- **How**: Add a `max` attribute tied to the selected product's inventory: `max={selectedProductData.inventory_count}`.

### Missing Input Validation on Create Customer API
- **What**: The POST `/customers` endpoint does not validate that `name`, `email`, and `phone` are provided, allowing `NULL` values to be inserted into the database.
- **Where**: `backend/src/routes/customers.js` in the `POST /` route handler.
- **Why**: It matters for **data integrity**. Without validation, incomplete customer records can be created, leading to downstream errors when other parts of the app expect these fields to exist.
- **How**: Add a validation check before the INSERT query: `if (!name || !email || !phone) return res.status(400).json({ error: 'Name, email, and phone are required' });`
