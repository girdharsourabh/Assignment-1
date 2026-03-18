# BUG\_[REPORT.md](http://REPORT.md)

## Overview

This report documents issues identified across the backend, frontend, and configuration of the Order Management System. The issues below cover correctness, performance, reliability, consistency risks, and frontend error handling.

Each issue includes:\
•⁠  ⁠what the issue is\
•⁠  ⁠where it is in the code\
•⁠  ⁠why it matters\
•⁠  ⁠how it should be fixed

---

## Issue 1: Order listing has an N+1 query performance problem

*What the issue is*\
The ⁠ GET /orders ⁠ endpoint first fetches all orders, then performs separate customer and product queries for each order inside a loop.

*Where it is in the code*\
Backend, ⁠ routes/orders.js ⁠, ⁠ router.get('/') ⁠

*Why it matters*\
This creates an N+1 query problem. As the number of orders grows, the number of database round-trips increases significantly, which slows down the endpoint and adds unnecessary load on PostgreSQL. This is the most impactful backend performance issue in the current code.

*How I would fix it*\
Replace the loop-based enrichment with a single SQL query using ⁠ JOIN ⁠ between ⁠ orders ⁠, ⁠ customers ⁠, and ⁠ products ⁠, ordered by ⁠ created_at DESC ⁠.

---

## Issue 2: Order creation is not transactional

*What the issue is*\
The ⁠ POST /orders ⁠ flow inserts a new order and updates product inventory in separate database operations without a transaction.

*Where it is in the code*\
Backend, ⁠ routes/orders.js ⁠, ⁠ [router.post](http://router.post)('/') ⁠

*Why it matters*\
This is a critical data integrity and reliability issue. If the order is inserted successfully but the inventory update fails, the system will store an order without actually reserving stock. The reverse can also leave the database in an inconsistent state. This directly affects correctness and trust in order/inventory data.

*How I would fix it*\
Wrap the entire order creation flow in a database transaction using:\
•⁠  ⁠⁠ BEGIN ⁠\
•⁠  ⁠inventory validation\
•⁠  ⁠order insert\
•⁠  ⁠inventory decrement\
•⁠  ⁠⁠ COMMIT ⁠\
•⁠  ⁠⁠ ROLLBACK ⁠ on failure

---

## Issue 3: Inventory race condition can oversell stock

*What the issue is*\
The backend checks the current inventory first and updates it later. Because those actions are separate, concurrent requests can both pass the stock check before either update is committed.

*Where it is in the code*\
Backend, ⁠ routes/orders.js ⁠, ⁠ [router.post](http://router.post)('/') ⁠

*Why it matters*\
This can lead to overselling inventory under concurrent load. Two users ordering the same product at the same time may both succeed even if only one should have enough stock available. This is a correctness and consistency issue with real business impact.

*How I would fix it*\
Use row-level locking with ⁠ SELECT ... FOR UPDATE ⁠ inside the transaction so inventory validation and deduction happen atomically for the product row.

---

## Issue 4: Order details route does not validate the route parameter

*What the issue is*\
The ⁠ GET /orders/:id ⁠ route uses the incoming ⁠ id ⁠ directly without validating that it is a positive integer.

*Where it is in the code*\
Backend, ⁠ routes/orders.js ⁠, ⁠ router.get('/:id') ⁠

*Why it matters*\
Invalid route parameters should fail early with a client error instead of reaching the database. This improves API correctness, defensive programming, and clarity for consumers of the endpoint.

*How I would fix it*\
Validate ⁠ [req.params.id](http://req.params.id) ⁠ before querying. If it is not a positive integer, return ⁠ 400 Bad Request ⁠ with a clear error message.

---

## Issue 5: Order creation validation is too weak

*What the issue is*\
The order creation flow does not explicitly validate each required input before performing business logic.

*Where it is in the code*\
Backend, ⁠ routes/orders.js ⁠, ⁠ [router.post](http://router.post)('/') ⁠\
Frontend, order creation form component

*Why it matters*\
Bad or incomplete input can lead to unclear errors, inconsistent behavior, or invalid order attempts. Validation should happen before database work and should clearly identify the problem field.

*How I would fix it*\
Validate each field explicitly:\
•⁠  ⁠⁠ customer_id ⁠ must exist and be a positive integer\
•⁠  ⁠⁠ product_id ⁠ must exist and be a positive integer\
•⁠  ⁠⁠ quantity ⁠ must be a positive integer\
•⁠  ⁠⁠ shipping_address ⁠ must be present and non-empty

Return field-specific validation messages from the backend and render those errors inline in the frontend form.

---

## Issue 6: Frontend API layer ignores HTTP error states

*What the issue is*\
The frontend API helpers call ⁠ res.json() ⁠ directly and do not check whether the response succeeded.

*Where it is in the code*\
Frontend, ⁠ src/api.js ⁠, functions such as ⁠ fetchOrders ⁠, ⁠ fetchOrder ⁠, ⁠ createOrder ⁠, ⁠ updateOrderStatus ⁠

*Why it matters*\
If the backend returns a ⁠ 4xx ⁠ or ⁠ 5xx ⁠ response, the frontend still treats the response body like a normal success payload. This causes inconsistent UI behavior and makes error handling unreliable across the application.

*How I would fix it*\
Create a shared request helper that:\
•⁠  ⁠checks ⁠ res.ok ⁠\
•⁠  ⁠safely parses JSON\
•⁠  ⁠throws an error for non-2xx responses\
•⁠  ⁠preserves backend error payloads for UI handling

---

## Issue 7: Customer search query parameter is not encoded

*What the issue is*\
The customer search request sends raw user input directly in the query string.

*Where it is in the code*\
Frontend, ⁠ src/api.js ⁠, ⁠ searchCustomers(name) ⁠

*Why it matters*\
Special characters, spaces, and symbols can break the request or produce inconsistent search behavior. This is a correctness and robustness issue.

*How I would fix it*\
Use ⁠ encodeURIComponent(name) ⁠ when building the search URL.

---

## Issue 8: Product inventory does not update in real time after order creation

*What the issue is*\
When a new order is created for a product, the displayed product inventory count in the frontend does not update immediately. The correct inventory appears only after a manual page refresh.

*Where it is in the code*\
Frontend, create-order component / product list state handling\
Likely in:\
•⁠  ⁠the component that loads products using ⁠ fetchProducts() ⁠\
•⁠  ⁠the order creation success flow, where product state is not refreshed after a successful order

*Why it matters*\
This is a correctness and UX issue. After placing an order, the UI continues showing stale stock values, which can mislead users into thinking more inventory is available than actually remains. It also makes the application feel unreliable because the backend state and frontend state are temporarily out of sync.

*How I would fix it*\
Refresh the products list after a successful order creation so the latest inventory count is shown immediately.

Possible approaches:\
•⁠  ⁠call ⁠ fetchProducts() ⁠ again after ⁠ createOrder() ⁠ succeeds and update local state\
•⁠  ⁠or optimistically update the selected product’s ⁠ inventory_count ⁠ in local state by subtracting the ordered quantity

The safer fix is to re-fetch products after order creation so the frontend always reflects the persisted backend state.

---

## Issue 9: Quantity input handling is incorrect

*What the issue is*\
The quantity field uses ⁠ parseInt([e.target](http://e.target).value) || 1 ⁠, which can silently coerce invalid input back to ⁠ 1 ⁠ and makes manual editing awkward.

*Where it is in the code*\
Frontend, create-order component, quantity input ⁠ onChange ⁠

*Why it matters*\
Users can have trouble entering values cleanly, and invalid input handling is not explicit. This affects correctness and user experience.

*How I would fix it*\
Use a controlled numeric input that:\
•⁠  ⁠stores the raw value as input state\
•⁠  ⁠validates on submit and/or change\
•⁠  ⁠only accepts positive integers\
•⁠  ⁠shows a clear field-level validation error instead of silently resetting to ⁠ 1 ⁠

---

## Issue 10: Validation feedback is too generic

*What the issue is*\
The create-order flow shows a generic message like “Please fill all fields” instead of identifying which specific field is invalid.

*Where it is in the code*\
Frontend, create-order component, ⁠ handleSubmit ⁠

*Why it matters*\
This reduces usability because users do not know which field needs correction. It also makes forms feel less polished and harder to use.

*How I would fix it*\
Add field-level validation and show inline messages next to the relevant input fields, while preserving entered values.

---

## Issue 11: Backend error responses are too generic

*What the issue is*\
Several backend endpoints return broad messages such as ⁠ Failed to fetch orders ⁠, ⁠ Failed to fetch order ⁠, or ⁠ Failed to create order ⁠ for all failures.

*Where it is in the code*\
Backend, ⁠ routes/orders.js ⁠, multiple handlers

*Why it matters*\
Generic errors make debugging harder and prevent the frontend from showing meaningful feedback for expected failures such as validation errors, missing records, or insufficient inventory.

*How I would fix it*\
Return:\
•⁠  ⁠specific validation and business-rule errors for expected failures\
•⁠  ⁠generic ⁠ 500 ⁠ responses only for unexpected exceptions\
•⁠  ⁠server-side logs for diagnostics

---

## Issue 12: Frontend messages are not cleared gracefully

*What the issue is*\
Success and error messages remain on screen until another manual action clears them.

*Where it is in the code*\
Frontend, create-order component, ⁠ message ⁠ state handling

*Why it matters*\
This can leave stale feedback visible after the user changes fields or performs another action, which is confusing and hurts UX.

*How I would fix it*\
Auto-dismiss messages after a short timeout or clear them whenever the user starts a new action such as editing a field or resubmitting a form.

---

## Issue 13: Frontend API base URL has an unsafe [localhost](http://localhost) fallback

*What the issue is*\
The frontend falls back to ⁠ <http://localhost:3001/api> ⁠ when the environment variable is missing.

*Where it is in the code*\
Frontend, ⁠ src/api.js ⁠

*Why it matters*\
This can silently break production deployments if environment variables are missing or misconfigured. The application may try to connect to a non-existent local backend in deployed environments.

*How I would fix it*\
Use environment-specific configuration and fail clearly when required variables are missing outside local development.

---

## Issue 14: Active tab/view state is lost on page refresh

*What the issue is*\
When the user is on the *Create Order* tab or the *Customer Search* tab and refreshes the page, the application resets back to the default *Orders Listing* tab instead of preserving the current view.

*Where it is in the code*\
Frontend, tab/navigation state handling for the main order management page\
Likely in the component managing the active tab, such as:\
•⁠  ⁠⁠ src/App.js ⁠\
•⁠  ⁠⁠ src/pages/Home.js ⁠\
•⁠  ⁠or the parent component that renders Orders / Create Order / Customer Search tabs

*Why it matters*\
This is a UX and state management issue. Refreshing the page causes the user to lose context and interrupts their workflow. It is especially frustrating if they were in the middle of creating an order or searching for a customer. It also makes the interface feel unreliable because the selected tab is not reflected in the URL or persisted in state.

*How I would fix it*\
Persist the active tab using one of these approaches:\
•⁠  ⁠store the selected tab in the URL query/path so refresh restores the same view\
•⁠  ⁠or store the selected tab in ⁠ localStorage ⁠ and restore it on load

The better fix is to make tabs route-based, for example:\
•⁠  ⁠⁠ /orders ⁠\
•⁠  ⁠⁠ /orders/create ⁠\
•⁠  ⁠⁠ /customers/search ⁠

That way refresh, browser back/forward, and direct linking all preserve the correct screen.

---

## Summary of Highest-Priority Issues

The three most critical issues in the current codebase are:

1.⁠ ⁠*Order creation is not transactional*\
This can leave order and inventory data inconsistent.

2.⁠ ⁠*Inventory race condition can oversell stock*\
Concurrent requests can bypass stock protection and corrupt inventory accuracy.

3.⁠ ⁠*N+1 query problem in order listing*\
The main order list endpoint performs poorly and will not scale with more data.

These were prioritized because they have the highest impact on correctness, reliability, and performance.