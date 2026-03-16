# Deployment Improvements (Option B)

This document summarizes the production-readiness improvements made to Docker and Compose.

## What Changed

### 1) Backend Dockerfile hardening
- File: `backend/Dockerfile`
- Updated to `node:20-alpine`.
- Installs only production dependencies (`npm install --omit=dev`).
- Copies only required files (`package*.json`, `src/`) for better layer caching.
- Runs as non-root (`USER node`).
- Uses direct runtime command (`node src/index.js`).

### 2) Frontend Dockerfile switched to multi-stage build
- File: `frontend/Dockerfile`
- Build stage uses Node to compile React assets.
- Runtime stage uses `nginx:alpine` to serve static files.
- Supports configurable API base URL at build time (`REACT_APP_API_URL`).

### 3) Nginx SPA fallback config
- File: `frontend/nginx.conf`
- Added `try_files ... /index.html` so client-side routes work after refresh/deep links.

### 4) docker-compose improvements
- File: `docker-compose.yml`
- Removed deprecated `version` field.
- Added `restart: unless-stopped` on all services.
- Added health checks for `db`, `backend`, and `frontend`.
- Added startup ordering using health-based `depends_on` conditions.
- Mounted DB init SQL as read-only (`:ro`).
- Frontend now serves on `3000:80` via Nginx.
- Backend now receives DB config from environment variables instead of hardcoded values.

### 5) Environment-driven DB config in backend
- File: `backend/src/config/db.js`
- Replaced hardcoded DB credentials/host with env var fallbacks.
- Added pool/timeout tuning (`max`, `idleTimeoutMillis`, `connectionTimeoutMillis`).

### 6) Reduced Docker build context
- Files:
  - `backend/.dockerignore`
  - `frontend/.dockerignore`
- Excludes unnecessary files (`node_modules`, git metadata, logs, etc.) from image build context.

## Run

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001/api`

## Optional Environment Overrides

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `REACT_APP_API_URL`
- `DB_POOL_MAX`
- `DB_IDLE_TIMEOUT_MS`
- `DB_CONN_TIMEOUT_MS`
