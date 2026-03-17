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

The application runs as three services, all managed by Docker Compose:

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
# Stop containers but keep the database volume intact
docker compose down

# Full reset — removes containers and the database volume
docker compose down -v
```

---

## How Docker Compose Works

Services start in dependency order:

```
db (postgres:15)
  └── backend (Node.js + Express)
        └── frontend (React)
```

### Service Details

#### `db`
- Runs the official `postgres:15` image.
- On first startup, executes `db/init.sql` to create the schema (`customers`, `products`, `orders`) and insert seed data.
- Database files are stored in a named Docker volume (`pgdata`), so data survives container restarts.

#### `backend`
- Built from `./backend/Dockerfile`.
- Reaches the database using the hostname `db` — Docker's internal DNS resolves service names automatically.
- Listens on port `3001`, accessible both from the host and within the Docker network.
- `depends_on: db` makes Docker start the database container first. For a production setup, a health check on `db` is worth adding.

#### `frontend`
- Built from `./frontend/Dockerfile`.
- Has `"proxy": "http://backend:3001"` set in `package.json`, so browser API calls are forwarded to the backend without needing CORS configuration.
- `depends_on: backend` ensures the backend is up before the frontend starts.

### Named Volume

```yaml
volumes:
  pgdata:
```

`pgdata` stores Postgres data files and persists across `docker compose down`. Running `docker compose down -v` will remove it entirely for a clean slate.

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

### Check running services

```bash
docker compose ps
```

### Follow logs

```bash
# All services
docker compose logs -f

# One service at a time
docker compose logs -f backend
```

### Rebuild and restart a single service

Useful when you've changed code and want to pick up the changes without restarting everything:

```bash
docker compose up -d --build backend
```

### Verify the backend is healthy

```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok"}
```

---

## Running the Backend Without Docker

If you need to run the backend directly (for example, when debugging without containers), make sure a Postgres instance is already running and accessible, then:

```bash
cd backend

# Install dependencies
npm install

# Export the required environment variables
export DB_USER=admin
export DB_PASSWORD=admin123
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=orderdb
export PORT=3001

# Start the server
npm start

# Or with auto-reload during development
npm run dev
```

### Linting

```bash
cd backend
npm run lint       # Run ESLint on src/
```

---

## CI Pipeline

The pipeline lives in [`.github/workflows/ci.yml`](.github/workflows/ci.yml) and runs on every pull request.

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
| **2. Setup Node.js** | Installs Node.js 18 and restores the `npm` cache |
| **3. Install dependencies** | Runs `npm install` inside `backend/` |
| **4. ESLint** | Runs `npm run lint` — any ESLint error fails the build |
| **5. Docker build** | Runs `docker compose build` to confirm all images build cleanly |
| **6. Start services** | Runs `docker compose up -d` |
| **7. Health check** | Polls `GET /api/health` every 3 seconds for up to 60 seconds until it returns HTTP 200 |
| **8. Verify response** | Confirms the response body contains the `"status"` field |
| **9. Teardown** | Runs `docker compose down` — this step always runs, even if an earlier step failed |

### ESLint Configuration

ESLint is configured in `backend/.eslintrc.json`:

| Rule | Severity |
|------|----------|
| `no-undef` | Error |
| `eqeqeq` | Error |
| `no-var` | Error |
| `no-unused-vars` | Warning |
| `prefer-const` | Warning |
