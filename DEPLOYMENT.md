# Deployment Improvements

## Changes Made

### 1. Alpine-based images
**Before:** `node:18`, `postgres:15` (full Debian images ~900MB+)
**After:** `node:18-alpine`, `postgres:15-alpine` (~100-150MB)
**Why:** Smaller images mean faster pulls, less disk usage, and reduced attack surface.

### 2. Multi-stage frontend build
**Before:** Frontend ran `react-scripts start` (dev server) in production.
**After:** Two-stage build — Stage 1 builds the React app, Stage 2 serves static files with nginx.
**Why:** The CRA dev server is not meant for production (slow, no caching, large image with dev dependencies). Nginx serves static files efficiently and handles client-side routing with `try_files`.

### 3. Nginx reverse proxy for API
Added `nginx.conf` that proxies `/api/` requests to the backend service. This means the frontend and backend are accessed through the same origin, eliminating CORS issues in production.

### 4. .dockerignore files
Added `.dockerignore` to both `backend/` and `frontend/` to exclude `node_modules` and other unnecessary files from the build context. This speeds up builds and prevents the host's `node_modules` from overwriting container dependencies.

### 5. Layer caching for dependencies
**Before:** `COPY . .` then `RUN npm install` — any file change invalidates the npm install cache.
**After:** `COPY package.json` first, then `npm install`, then copy source. Dependencies are only reinstalled when `package.json` changes.

### 6. Production-only dependencies in backend
Backend Dockerfile uses `npm install --production` to skip devDependencies (nodemon), reducing image size.

### 7. Non-root user in backend
Added `USER node` to run the backend process as a non-root user, following the principle of least privilege.

### 8. Database health checks
Added `pg_isready` health check to the PostgreSQL service and `condition: service_healthy` on the backend's `depends_on`. This ensures the backend only starts after the database is actually ready to accept connections (not just when the container is running).

### 9. Environment variables for database credentials
**Before:** Database credentials were hardcoded in `backend/src/config/db.js`.
**After:** Read from environment variables (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`) passed via docker-compose, with fallback defaults for local development.

### 10. Fixed global error handler
Changed the Express error handler from returning `200 { success: true }` to returning `500 { error: 'Internal server error' }` with proper error logging.

### 11. Backend restart policy
Added `restart: on-failure` to the backend service so it automatically recovers from transient failures.
