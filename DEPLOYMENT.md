# Deployment Guide — Order Management System

## Table of Contents

- [Project Overview](#project-overview)
- [Running Locally (with Docker)](#running-locally-with-docker)
- [How Docker Compose Works](#how-docker-compose-works)
- [Building and Running Containers](#building-and-running-containers)
- [Running the Backend Without Docker](#running-the-backend-without-docker)
- [CI Pipeline](#ci-pipeline)

---

## Project Overview

The system is composed of three services, all orchestrated by Docker Compose:

| Service | Technology | Port |
|---------|------------|------|
| `db` | PostgreSQL 15 | 5432 |
| `backend` | Node.js 18 + Express | 3001 |
| `frontend` | React 18 (CRA) | 3000 |

---

## Running Locally (with Docker)

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes Docker Compose v2)
- Git

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/heyysid18/Assignment-1.git
cd Assignment-1

# 2. Start all services (builds images on first run)
docker compose up --build

# 3. Open the application
open http://localhost:3000
```

The backend API is available at `http://localhost:3001/api`.

### Stopping the Application

```bash
# Stop and remove containers (keeps the database volume)
docker compose down

# Stop and also remove the database volume (full reset)
docker compose down -v
```

---

## How Docker Compose Works

The `docker-compose.yml` defines three services with explicit dependency ordering:

```
db (postgres:15)
  └── backend (Node.js + Express)
        └── frontend (React)
```

### Service Details

#### `db`
- Uses the official `postgres:15` image.
- On first start, runs `db/init.sql` to create tables (`customers`, `products`, `orders`) and seed sample data.
- Data is persisted in a named Docker volume (`pgdata`), so it survives container restarts.

#### `backend`
- Built from `./backend/Dockerfile`.
- Connects to the `db` service using the hostname `db` (Docker's internal DNS resolves service names).
- Exposes port `3001` — both on the host and inside the Docker network.
- `depends_on: db` ensures the `db` container starts before the backend, though a DB health check is recommended for production use.

#### `frontend`
- Built from `./frontend/Dockerfile`.
- Configured with a proxy (`"proxy": "http://backend:3001"` in `package.json`) so API calls from the browser are forwarded to the backend service.
- `depends_on: backend` ensures the backend starts first.

### Named Volume

```yaml
volumes:
  pgdata:
```

The `pgdata` volume stores Postgres data files. It persists across `docker compose down` but is removed with `docker compose down -v`.

---

## Building and Running Containers

### Build all images

```bash
docker compose build
```

### Build a specific service

```bash
docker compose build backend
docker compose build frontend
```

### Start services in the background

```bash
docker compose up -d
```

### View running services

```bash
docker compose ps
```

### View logs

```bash
# All services
docker compose logs -f

# A specific service
docker compose logs -f backend
```

### Restart a single service after code changes

```bash
docker compose up -d --build backend
```

### Verify the backend is running

```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok"}
```

---

## Running the Backend Without Docker

If you want to run only the backend locally (requires a Postgres instance):

```bash
cd backend

# Install dependencies
npm install

# Set environment variables (or export them in your shell)
export DB_USER=admin
export DB_PASSWORD=admin123
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=orderdb
export PORT=3001

# Start the server
npm start

# Or in watch mode during development
npm run dev
```

### Linting

```bash
cd backend
npm run lint       # Run ESLint on src/
```

---

## CI Pipeline

The pipeline is defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) and runs automatically on every **pull request**.

### Trigger

```yaml
on:
  pull_request:
    branches:
      - '**'
```

### Pipeline Steps

| Step | Action |
|------|--------|
| **1. Checkout** | Checks out the repository using `actions/checkout@v4` |
| **2. Setup Node.js** | Installs Node.js 18 and restores `npm` cache |
| **3. Install dependencies** | Runs `npm install` in the `backend/` directory |
| **4. ESLint** | Runs `npm run lint` — fails the build if any ESLint errors are found |
| **5. Docker build** | Runs `docker compose build` to verify all images build successfully |
| **6. Start services** | Runs `docker compose up -d` to start all containers |
| **7. Health check** | Polls `GET /api/health` every 3 seconds for up to 60 seconds until HTTP 200 is returned |
| **8. Verify response** | Confirms the response JSON contains the `"status"` field |
| **9. Teardown** | Runs `docker compose down` — always executes even if an earlier step fails |

### ESLint Configuration

ESLint is configured in `backend/.eslintrc.json` with the following rules:

| Rule | Severity |
|------|----------|
| `no-undef` | Error |
| `eqeqeq` | Error |
| `no-var` | Error |
| `no-unused-vars` | Warning |
| `prefer-const` | Warning |
