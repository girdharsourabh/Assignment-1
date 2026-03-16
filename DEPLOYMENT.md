# Deployment Improvements

## Changes Made

### Backend Dockerfile
- Switched from `node:18` to `node:18-alpine` for a smaller image
- Separated `package*.json` copy from source code copy so npm install layer is cached and only re-runs when dependencies change
- Replaced `npm install` with `npm ci --only=production` for reproducible, production-only installs
- Added `USER node` to run the process as a non-root user, reducing the attack surface if the container is compromised

### Frontend Dockerfile
- Converted to a multi-stage build: the first stage builds the React app, the second stage copies only the static output into an `nginx:alpine` image
- The final image is much smaller since it contains no Node.js runtime, no source code, and no dev dependencies
- Added a custom `nginx.conf` that listens on port 3000 and handles React client-side routing

### .dockerignore Files
- Added `.dockerignore` for both backend and frontend to exclude `node_modules`, `.git`, and build artifacts from the Docker build context
- This reduces build context size and prevents the host's `node_modules` from being copied into the container and overwriting the container's own install

### docker-compose.yml
- Removed the deprecated `version` key
- Switched postgres image to `postgres:15-alpine` for a smaller footprint
- Added a `healthcheck` on the database container using `pg_isready`
- Changed backend's `depends_on` from a simple list to use `condition: service_healthy` so the backend only starts after the database is actually accepting connections (not just after the container starts)
- Added `restart: unless-stopped` to all services so they auto-recover from crashes
- Moved database credentials from hardcoded values in source code to environment variables passed through docker-compose

### Database Configuration
- `backend/src/config/db.js` now reads credentials from environment variables (`DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`) with sensible defaults for backward compatibility
