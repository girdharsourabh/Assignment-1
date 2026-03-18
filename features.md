# Order Management System — Feature Overview

This document provides a detailed explanation of all the features and improvements implemented in the Order Management System.

---

## 🚀 Core Features

### 1. Order Management
- **Order Listing**: View a comprehensive table of all orders with details like Customer, Product, Quantity, Total Price, and Status.
- **Status Updates**: Administrators can change the status of an order (e.g., from `pending` to `shipped`) directly from the table.
- **Order Cancellation**: A newly added feature! Any `pending` or `confirmed` order can be cancelled with a single click, automatically restoring the product inventory.

### 2. Customer Management
- **Search & Filter**: Search for existing customers by name using a real-time search interface.
- **Add New Customer**: Easily add new customers to the system with their Name, Email, and Phone number.
- **Data Persistence**: All customer data is saved permanently in the PostgreSQL database.

### 3. Product Management (NEW) ✨
- **Product Listing**: Dedicated section to view the entire product catalog, price, and current stock levels.
- **Add New Product**: Add new products to the catalog with Name, Description, Price, and Initial Inventory.
- **Real-time Availability**: Newly added products immediately become available for new orders.

### 4. New Order Creation
- **Streamlined Workflow**: Select a customer and a product from intuitive dropdowns to create an order.
- **Inventory Validation**: The system prevents creating orders for products that are out of stock.
- **Automatic Calculation**: Total order value is automatically calculated based on product price and quantity.

---

## 🛠️ Technical Improvements & Bug Fixes

### 1. Security Enhancements
- **SQL Injection Prevention**: Fixed critical vulnerabilities in the backend by using **Parameterization** ($1, $2) for all database queries. Your data is now safe from malicious input.

### 2. Database & Performance
- **Automatic Schema Initialization**: The system now automatically creates and sets up database tables (`customers`, `products`, `orders`) on the first startup. No manual SQL scripts required after deployment!
- **N+1 Query Fix**: Optimized the "New Order" page to fetch products efficiently, reducing database load and speeding up page load times.
- **Race Condition Prevention**: Implemented database **Transactions** for order creation. This ensures that inventory is correctly deducted and orders are saved only if both operations succeed.

### 3. Error Handling
- **Robust Backend**: Fixed the global error handler to properly log and return actual error messages (500 status codes) instead of masking them with blank responses.
- **Frontend Feedback**: Added user-friendly error messages and confirmation dialogs for critical actions like order cancellation.

---

## 🌐 Deployment Configuration
- **Vercel Build Fix**: Resolved the `react-scripts` permission issue using a custom `vercel.json` configuration.
- **Direct Database Support**: The backend seamlessly switches between local Docker PostgreSQL and cloud-hosted databases (via `DATABASE_URL`).
- **SSL Support**: Pre-configured for cloud databases that require secure connections (like Render/Neon).

---

## 💻 Tech Stack
- **Frontend**: React.js with Vanilla CSS.
- **Backend**: Node.js with Express.
- **Database**: PostgreSQL.
- **DevOps**: Docker & Docker Compose for local development; Vercel & Render for live deployment.
