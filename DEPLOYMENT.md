# DEPLOYMENT

This project uses Docker Compose for local deployment. I chose **Option B** and made the container setup more production-ready without changing the application architecture.

## Changes Made

### 1. Improved Docker build efficiency

- Updated [backend/Dockerfile](backend/Dockerfile) to copy `package*.json` first, use `npm ci --omit=dev`, and only copy the runtime source directory.
- Updated [frontend/Dockerfile](frontend/Dockerfile) to use a multi-stage build:
  - build the React app with Node
  - serve the compiled static files with Nginx

The backend keeps deterministic installs with `npm ci`. The frontend uses `npm install` in the build stage because the original repo lockfile is not stable enough for `npm ci` without additional dependency-manifest changes, which I intentionally avoided.

These changes reduce image size, improve build caching, and avoid shipping development tooling in the final frontend image.

For the frontend, the original `react-scripts start` setup would still work, but it is a development server. After `npm run build`, the React app is just static files, so serving it with Nginx is a more production-appropriate choice. Nginx is better suited for static assets than keeping a Node-based development server running in the final container.

I also added [frontend/nginx.conf](frontend/nginx.conf) so the built frontend is served correctly and client-side navigation falls back to `index.html`.

### 2. Added Docker ignore files

- Added [backend/.dockerignore](backend/.dockerignore)
- Added [frontend/.dockerignore](frontend/.dockerignore)

These files keep `node_modules`, local build artifacts, and Git metadata out of the Docker build context, which makes builds faster and avoids copying host-specific files into images.

### 3. Made backend database configuration environment-driven

- Updated [backend/src/config/db.js](backend/src/config/db.js) to read database connection settings from environment variables with safe local defaults.

This makes the backend easier to run in different environments and removes hard dependency on one fixed host configuration in source code.

### 4. Added service health checks and startup ordering

- Added a Postgres health check using `pg_isready`
- Added a backend health check against `/api/health`
- Added a frontend health check against the served site
- Updated `depends_on` in [docker-compose.yml](docker-compose.yml) so backend waits for a healthy database and frontend waits for a healthy backend

This improves startup reliability and reduces failures caused by services starting before their dependencies are ready.

### 5. Added restart policies

- Set `restart: unless-stopped` for `db`, `backend`, and `frontend`

This makes the stack more resilient if a container exits unexpectedly.

## Result

The Compose stack still starts the same three services:

- frontend on `http://localhost:3000`
- backend on `http://localhost:3001/api`
- postgres on `localhost:5432`

But the deployment is now more reliable, more cache-friendly, and closer to a production-style container setup.
