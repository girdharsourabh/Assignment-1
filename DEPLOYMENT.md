# Deployment Improvements

## 1. Multi-Stage Builds
Split Dockerfiles into build and runtime stages. Backend image reduced from ~950MB to ~160MB. Frontend served by nginx (~25MB) instead of Node.js.

## 2. Alpine Base Images
Switched to node:18-alpine and nginx:1.25-alpine. Smaller size and fewer potential CVEs.

## 3. Non-Root User in Backend
Backend container now runs as a non-root user for security.

## 4. npm ci Instead of npm install
Ensures deterministic installs from package-lock.json.

## 5. Healthchecks Added
All services have healthchecks. depends_on now uses condition: service_healthy so services wait for each other to be truly ready.

## 6. Environment Variables for Credentials
Database credentials moved to environment variables instead of being hard-coded in source files.

## 7. restart: unless-stopped
All services restart automatically on crash.s