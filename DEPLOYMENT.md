# Deployment Improvements (Option B)

This project was updated to make container deployment more stable and production-friendly while keeping changes simple.

## What changed

### 1) Dockerfile improvements

- backend/Dockerfile
  - Copy `package*.json` first, then install dependencies with `npm ci --omit=dev`.
  - Set `NODE_ENV=production`.
- frontend/Dockerfile
  - Copy `package*.json` first, then install with `npm ci`.
  - Set `HOST=0.0.0.0` for container accessibility.

Why: Better layer caching, more predictable installs, and safer runtime defaults.

### 2) docker-compose improvements

- Added `restart: unless-stopped` for `db`, `backend`, and `frontend`.
- Added PostgreSQL healthcheck using `pg_isready`.
- Updated backend `depends_on` to wait for DB health (`condition: service_healthy`).
- Added backend `NODE_ENV=production` and frontend `REACT_APP_API_URL` in compose.

Why: Improves startup reliability, recoverability, and explicit runtime config.

## How to run

```bash
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Health: http://localhost:3001/api/health
