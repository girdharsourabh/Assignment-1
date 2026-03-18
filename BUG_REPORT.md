# BUG_REPORT.md


# 1. SQL Injection Risk in Customer Search

**Issue**
The customer search query was vulnerable to SQL injection due to direct string interpolation.

**Location**
Backend – `routes/customers.js` (customer search endpoint)

**Impact**
An attacker could inject malicious SQL into the query and access or modify database data.

**Fix**
Use parameterized queries with placeholders.

**Example Fix**

```js
// Before
const result = await pool.query(
  `SELECT * FROM customers WHERE name ILIKE '%${query}%'`
);

// After
const result = await pool.query(
  "SELECT * FROM customers WHERE name ILIKE $1",
  [`%${query}%`]
);
```

---

# 2. Missing Input Validation in Create Customer API

**Issue**
Customer creation endpoint accepts user input without validation.

**Location**
Backend – `routes/customers.js`

**Impact**
Invalid or malformed data may enter the database.

**Fix**
Validate required fields and formats.

```js
if (!name || !email) {
  return res.status(400).json({ error: "Name and email are required" });
}
```

---

# 3. N+1 Query Problem When Fetching Orders

**Issue**
Orders were fetched first, and then additional queries were executed for related customer and product data.

**Location**
Backend – `routes/orders.js`

**Impact**
Significant performance degradation when many orders exist.

**Fix**
Use SQL JOIN queries.

```sql
SELECT o.*, c.name AS customer_name, p.name AS product_name
FROM orders o
JOIN customers c ON o.customer_id = c.id
JOIN products p ON o.product_id = p.id;
```

---

# 4. Data Consistency Issue During Order Creation

**Issue**
Order creation and inventory updates were executed separately without transactions.

**Location**
Backend – `routes/orders.js`

**Impact**
If one query fails, the database may become inconsistent.

**Fix**
Use database transactions.

```sql
BEGIN;
UPDATE products SET inventory_count = inventory_count - $1 WHERE id=$2;
INSERT INTO orders (...);
COMMIT;
```

---

# 5. Missing Validation for Inventory Values

**Issue**
Inventory updates did not prevent negative inventory values.

**Location**
Backend – `routes/products.js` or order creation logic.

**Impact**
Products could end up with invalid negative inventory.

**Fix**
Add validation:

```js
if (quantity > product.inventory_count) {
  return res.status(400).json({ error: "Insufficient inventory" });
}
```

---

# 6. Error Handler Returning HTTP 200

**Issue**
The global error handler returned status 200 even when errors occurred.

**Location**
Backend – `src/index.js`

**Impact**
Clients cannot detect failures properly.

**Fix**

```js
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
```

---

# 7. Improper Error Handling and Query Encoding

**Issue**
Search queries were not properly encoded and API errors were not consistently handled.

**Location**
Frontend – API request functions.

**Impact**
Broken search functionality and unhandled errors.

**Fix**
Use `encodeURIComponent` and proper error handling.

```js
fetch(`/api/customers?search=${encodeURIComponent(query)}`);
```

---

# 8. Missing Dependency in useEffect

**Issue**
React `useEffect` hook was missing a dependency, preventing updates when product selection changed.

**Location**
Frontend – product selection component.

**Impact**
UI could display stale product data.

**Fix**

```js
useEffect(() => {
  updateSelectedProduct();
}, [selectedProductId]);
```

---

# 9. Missing Error Handling While Fetching Data

**Issue**
Customer and product fetch requests did not handle network errors.

**Location**
Frontend – API fetch functions.

**Impact**
Application may silently fail without user feedback.

**Fix**

```js
try {
  const data = await fetchCustomers();
} catch (error) {
  setError("Failed to load customers");
}
```

---

# 10. Missing Validation for Order Quantity

**Issue**
Users could order quantities greater than available inventory.

**Location**
Backend – order creation endpoint.

**Impact**
Inventory could become negative.

**Fix**
Validate quantity before creating an order.

---

# 11. Duplicate Order Submission

**Issue**
Order button could be clicked multiple times before API response returned.

**Location**
Frontend – Order creation form.

**Impact**
Duplicate orders may be created.

**Fix**
Disable button during submission.

```js
<button disabled={loading}>Place Order</button>
```

---

# 12. Incorrect React Key Usage

**Issue**
Array index was used as React key instead of a stable ID.

**Location**
Frontend – customer/order lists.

**Impact**
React reconciliation issues and unnecessary re-renders.

**Fix**

```jsx
<tr key={customer.id}>
```

---

# 13. Missing Loading and Error States in Customer Features

**Issue**
Customer search and creation lacked loading states and validation feedback.

**Location**
Frontend – customer management UI.

**Impact**
Poor user experience and lack of error visibility.

**Fix**
Add loading indicators and error messages.

---

# 14. Missing Error Handling in Order Status Updates

**Issue**
Status update API calls lacked error handling.

**Location**
Frontend – order status update handler.

**Impact**
UI may appear updated even if the backend request failed.

**Fix**

```js
try {
  await updateOrderStatus(id, status);
} catch (err) {
  alert("Failed to update order");
}
```

---

# 15. Missing Error Handling When Fetching Orders

**Issue**
Order fetching lacked try/catch logic.

**Location**
Frontend – orders page.

**Impact**
Application crashes or fails silently on API errors.

---

# 16. Inefficient Order Updates

**Issue**
All orders were refetched after status updates.

**Location**
Frontend – order status update handler.

**Impact**
Unnecessary network requests and slower UI.

**Fix**
Update local state instead of refetching.

---

# 17. Expensive Sorting on Every Render

**Issue**
Orders were sorted on every render.

**Location**
Frontend – orders table component.

**Impact**
Performance degradation with large datasets.

**Fix**
Memoize sorted orders.

```js
const sortedOrders = useMemo(() => {
  return [...orders].sort(...);
}, [orders]);
```

---

# 18. Hardcoded Tab Strings

**Issue**
Tab names were hardcoded in multiple places.

**Location**
Frontend – navigation component.

**Impact**
Harder to maintain and risk of typos.

**Fix**

```js
const TABS = {
  ORDERS: "orders",
  CUSTOMERS: "customers",
  PRODUCTS: "products"
};
```

---

# 19. Missing Fallback for Invalid Tabs

**Issue**
Invalid tab values could break the UI.

**Location**
Frontend – tab routing logic.

**Impact**
Application may render blank screens.

**Fix**

```js
if (!TABS.includes(activeTab)) {
  setActiveTab("orders");
}
```

---

# Summary

Total Issues Identified: **19**

Categories:

* Security Issues: 1
* Data Validation Issues: 4
* Performance Issues: 3
* Error Handling Issues: 7
* Frontend Best Practices: 4

These fixes improve the **security, reliability, maintainability, and performance** of the system.
