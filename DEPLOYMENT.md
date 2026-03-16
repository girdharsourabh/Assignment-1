# Deployment Guide – Order Management System

This document explains how the system is deployed using Docker and Docker Compose.

The goal is to make the application easy to run locally and maintain a consistent development environment.

---

# Architecture Overview

The application is composed of three main services:

1. **PostgreSQL Database**
2. **Node.js Backend API**
3. **React Frontend**

Each service runs inside its own Docker container.

This architecture ensures clear separation of concerns and allows each component to scale independently.

---

# Container Structure

Docker Compose orchestrates the following services:

### Database Service

Runs PostgreSQL and stores application data.

Responsibilities:

* Store customers
* Store products
* Store orders
* Maintain inventory

The database is initialized using the `init.sql` file when the container starts.

---

### Backend Service

The backend is built with **Node.js and Express**.

Responsibilities:

* Handle REST API requests
* Validate user input
* Manage business logic
* Interact with the database
* Process order creation and cancellation

Key endpoints include:

* `/api/orders`
* `/api/customers`
* `/api/products`
* `/api/health`

---

### Frontend Service

The frontend is a **React application** that provides the user interface.

Responsibilities:

* Display customers, products, and orders
* Create new orders
* Cancel orders
* Search customers

The frontend communicates with the backend through REST APIs.

---

# Running the Application

To build and start all services:

```
docker compose up --build
```

This command will:

1. Build backend and frontend images
2. Start PostgreSQL database
3. Initialize database schema
4. Start backend API server
5. Start React frontend

---

# Stopping the Application

To stop all running containers:

```
docker compose down
```

---

# Database Persistence

A Docker volume is used to store database data.

Example:

```
volumes:
  - pgdata:/var/lib/postgresql/data
```

This ensures that data is preserved even if containers restart.

---

# Health Monitoring

The backend service exposes a health check endpoint:

```
/api/health
```

This allows Docker and orchestration systems to verify that the API service is running correctly.

Example health check configuration:

```
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

---

# Environment Variables

Sensitive configuration such as database credentials should be stored in a `.env` file rather than inside the repository.

Example:

```
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
POSTGRES_DB=orderdb
```

Docker Compose automatically loads environment variables from this file.

---

# Deployment Benefits

Using Docker Compose provides several advantages:

* Consistent development environment
* Easy project setup
* Simplified dependency management
* Isolated services
* Improved portability across machines

---

# Summary

The application is deployed using a containerized architecture with Docker Compose.
This setup ensures that the system can be easily run, tested, and extended while maintaining reliable service separation and database persistence.
