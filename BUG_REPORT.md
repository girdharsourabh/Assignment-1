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
