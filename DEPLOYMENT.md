# Deployment Improvements

This document explains the changes made to make the Docker setup more production-ready while still working locally.

## Summary of changes

### Backend container hardening (`backend/Dockerfile`)

- **Runs as non-root**: switched to the built-in `node` user.
- **Production mode**: sets `NODE_ENV=production` and installs only prod dependencies (`npm install --omit=dev`).
- **Smaller image**: uses `node:18-alpine`.
- **Healthcheck**: adds a healthcheck against `GET /api/health` so orchestration can detect unhealthy containers.

Note: The repo does not include `package-lock.json`, so `npm ci` can’t be used reliably; `npm install` is used instead.

### Frontend served as static build (`frontend/Dockerfile`)

- **Multi-stage build**: builds the React app in a Node build stage and serves it via `nginx`.
- **Production-like serving**: `nginx` serves the built assets on port `80` (mapped to host `3000` in compose).
- **Configurable API base**: `REACT_APP_API_URL` can be provided at build time.

### Compose improvements (`docker-compose.yml`)

- **Healthchecks + dependency gating**: backend waits until the database is healthy.
- **Restart policy**: `restart: unless-stopped` for basic resilience.
- **Environment overrides**: DB creds and DB name can be overridden via env vars:
  - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
  - Optional `CORS_ORIGIN`
  - Optional `REACT_APP_API_URL` (frontend build arg)

## How to run

From the repo root:

```bash
docker compose up --build
```

Services:

- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:3001/api`
- **DB**: internal to compose network (not published to host by default in the updated compose)

## Environment variables (optional)

Create a `.env` file in the repo root (optional) with:

```bash
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
POSTGRES_DB=orderdb
CORS_ORIGIN=*
REACT_APP_API_URL=http://localhost:3001/api
```

