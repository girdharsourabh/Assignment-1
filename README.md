# Order Management System (PERN Stack)

## System Overview
A full-stack web application built to manage customers, products, and orders. The system provides a React frontend and a Node.js/Express backend, with data safely stored in PostgreSQL.

## Technology Stack
- **Frontend**: React.js
- **Backend**: Node.js & Express
- **Database**: PostgreSQL
- **Infrastructure**: Docker & Docker Compose

## Core Features
- View all orders with customer and product details.
- Create new orders (automatically updates available inventory).
- Update order statuses.
- Search for customers.
- **Cancel Orders**: A new feature that allows users to cancel an order only if it is `pending` or `confirmed`. It strictly blocks cancelling shipped or delivered items and safely returns the items back to the product inventory.

## Improvements & Fixes Made
During development, several critical issues were identified and fixed to make the app production-ready:
- **Security**: Fixed a severe SQL injection vulnerability in the customer search API by using parameterized queries.
- **Performance**: Fixed an "N+1 query" problem in the order list API. Replaced a loop of database calls with a single, efficient `JOIN` query.
- **Data Safety (Transactions)**: Added strict database transactions when creating or cancelling orders. This guarantees that if the server crashes halfway through, the inventory counts won't get corrupted.
- **Docker Optimization**: Replaced the heavy development servers in the Dockerfiles with multi-stage production builds. The React app is now compiled and served quickly using Nginx.

## How to Run the App Locally

### 1. Start the containers
Make sure Docker is running on your machine, then run:
```bash
docker compose up --build
```

### 2. Access the Application
- **Frontend UI**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001/api`
- **Database**: `localhost:5432`

### 3. Database Credentials
If you need to connect to the database manually for testing:
- **User**: `admin`
- **Password**: `admin123`
- **Database**: `orderdb`
