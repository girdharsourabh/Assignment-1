# Deployment Notes (Option B)

This repo was originally set up primarily for local development. The changes below make Docker builds more reproducible and the compose setup more production-like and reliable, without rewriting the app.

## What changed

### 1) Reproducible, cache-friendly Node image builds

- **Backend**: `backend/Dockerfile`
- **Frontend**: `frontend/Dockerfile`

Changes:
- Copy `package*.json` first, run `npm ci`, then copy the rest of the source.

Why:
- `npm ci` produces repeatable installs based on `package-lock.json`.
- Copying dependency manifests first allows Docker layer caching (faster rebuilds).

### 2) Smaller Docker build contexts

- Added `.dockerignore` files:
  - `backend/.dockerignore`
  - `frontend/.dockerignore`

Why:
- Prevents shipping `node_modules`, git metadata, and other unnecessary files to the Docker daemon.
- Improves build speed and avoids bloated images.

### 3) Environment-driven DB configuration

- **Backend**: `backend/src/config/db.js`

Changes:
- Read PostgreSQL connection parameters from `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` with safe local defaults.

Why:
- Avoids hard-coded credentials and supports different environments (CI/staging/prod).

### 4) Health checks for more reliable startup

- **Compose**: `docker-compose.yml`

Changes:
- Added a DB healthcheck (`pg_isready`).
- Added a backend healthcheck (`GET /api/health`).

Why:
- Makes it easier to detect “service is up but not ready” situations.
- Improves observability when running containers.

### 5) DB port not published by default

- **Compose**: `docker-compose.yml`

Change:
- Removed host publishing of port `5432` by default.

Why:
- Better default security posture (DB is reachable only within the compose network).

If you need host access to Postgres locally (psql/DB GUI), temporarily add back:

```yaml
ports:
  - "5432:5432"
```

## How to run

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001/api
- Health: http://localhost:3001/api/health
