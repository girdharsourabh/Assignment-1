# Deployment Guide

## What Changed and Why

### Problem: The original setup had several deployment issues

1. **Hardcoded credentials** in `db.js` and `docker-compose.yml`
2. **Oversized Docker images** — full `node:18` base (~1GB) and `COPY .` copying `node_modules`
3. **Containers running as root** — security risk in production
4. **No `.dockerignore`** — `node_modules`, `.git`, etc. bloated the build context
5. **`depends_on` without health checks** — backend could start before Postgres was ready to accept connections
6. **No restart policy** — containers stay down after a crash
7. **Frontend served via `react-scripts start`** — a dev server, not suitable for production

---

### Changes Made

| File | Change | Why |
|------|--------|-----|
| `backend/Dockerfile` | Switched to `node:18-alpine`, copy `package*.json` first, use `npm ci --only=production`, run as `node` user | Smaller image (~180MB → ~50MB), deterministic installs, non-root for security |
| `frontend/Dockerfile` | Multi-stage build: build with node, serve with `nginx:alpine` | Final image is ~25MB instead of ~1GB; nginx is a proper production static server |
| `docker-compose.yml` | Read credentials from `${ENV_VARS}`, add `healthcheck` on db, use `condition: service_healthy`, add `restart: unless-stopped` | No hardcoded secrets, backend waits for Postgres to be *ready* (not just started), auto-restart on crash |
| `backend/src/config/db.js` | Read `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME` from `process.env` | Removes hardcoded credentials from source control |
| `backend/.dockerignore` | Ignore `node_modules`, `.git`, `Dockerfile` | Faster builds, no accidental host `node_modules` in image |
| `frontend/.dockerignore` | Ignore `node_modules`, `build`, `.git`, `Dockerfile` | Same as above |
| `.env.example` | Template with required env vars | Shows contributors what to configure without exposing real values |

---

## How to Run

1. **Copy the env file and set your values:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Build and start:**
   ```bash
   docker-compose up --build
   ```

3. **Access the app:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api
   - Health check: http://localhost:3001/api/health

4. **Stop:**
   ```bash
   docker-compose down
   ```

5. **Stop and remove data:**
   ```bash
   docker-compose down -v
   ```
