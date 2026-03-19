# Bug Report

## 1. SQL injection in customer search
- What: The customer search endpoint originally built raw SQL by concatenating the `name` query string.
- Where: `backend/src/routes/customers.js`, `GET /search`.
- Why it matters: A crafted search term can alter the SQL query, expose data, or break the endpoint.
- How to fix it: Use a parameterized `ILIKE $1` query and trim empty input before querying.
- Status: Fixed in this submission.

## 2. N+1 query pattern in the order list API
- What: Fetching all orders first and then loading the related customer and product row inside a loop multiplies database queries as the order count grows.
- Where: `backend/src/routes/orders.js`, `GET /`.
- Why it matters: Response time and database load grow unnecessarily with every additional order.
- How to fix it: Replace the loop with a single `JOIN` query that returns the order with customer and product details in one round-trip.
- Status: Fixed in this submission.

## 3. Order creation is not transactional
- What: The API inserted an order first and decremented inventory afterward without a transaction or row locking.
- Where: `backend/src/routes/orders.js`, `POST /`.
- Why it matters: Partial failures can leave inventory and order records out of sync, and concurrent requests can oversell stock.
- How to fix it: Use a database transaction, lock the product row with `FOR UPDATE`, validate inventory, update stock, and insert the order atomically.
- Status: Fixed in this submission.

## 4. Broken global error handling masks server failures
- What: The top-level Express error middleware returned HTTP 200 with `{ success: true }` even when something failed.
- Where: `backend/src/index.js`, global error middleware.
- Why it matters: Clients receive false success responses, debugging becomes harder, and operational failures can go unnoticed.
- How to fix it: Return the actual error status code and a consistent error payload, while logging unexpected server errors.
- Status: Fixed in this submission.

## 5. Hardcoded database credentials and config in source
- What: Database credentials and host values were hardcoded directly in the backend config and Compose file.
- Where: `backend/src/config/db.js` and `docker-compose.yml`.
- Why it matters: Hardcoded secrets are difficult to rotate, unsafe to share, and make environment-specific deployment harder.
- How to fix it: Read configuration from environment variables and provide an `.env.example` file with local defaults.
- Status: Fixed in this submission.

## 6. Order status updates accepted arbitrary values
- What: The order status endpoint accepted any `status` string from the client.
- Where: `backend/src/routes/orders.js`, `PATCH /:id/status`.
- Why it matters: Invalid states can be written into the database, which breaks business rules and downstream UI logic.
- How to fix it: Validate status values against an allowed list and block updates to cancelled orders.
- Status: Fixed in this submission.

## 7. Product summary preview in the create-order form goes stale
- What: The selected product preview effect depended only on `products`, not on `selectedProduct`.
- Where: `frontend/src/components/CreateOrder.js`, selected product effect.
- Why it matters: The UI can display the wrong product summary or fail to update when the user changes the selection.
- How to fix it: Include `selectedProduct` in the effect dependency list and clear the preview when nothing is selected.
- Status: Fixed in this submission.
