# Deployment Improvements

## Overview

This document explains all changes made to the Docker and deployment configuration as part of **Task 4 (Option B)** — making the application production-ready.

---

## 1. Backend Dockerfile

**File:** `backend/Dockerfile`

### What changed

| Before | After |
|---|---|
| `FROM node:18` (full image, ~1 GB) | `FROM node:18-alpine` (~170 MB) |
| `COPY . .` then `RUN npm install` | `COPY package*.json ./` → `RUN npm ci` → `COPY src ./src` |
| `npm install` (non-deterministic) | `npm ci --only=production` (exact lockfile, no devDeps) |
| `CMD ["npm", "start"]` | `CMD ["node", "src/index.js"]` (no npm overhead) |

### Why it matters

**Layer caching:** Docker rebuilds every layer below a changed layer. The old order (`COPY . .` first) meant *any* source file change triggered a full `npm install`. The new order copies `package*.json` first — npm install is cached until dependencies actually change.

**`npm ci` vs `npm install`:** `npm ci` installs exact versions from `package-lock.json`, never modifies it, and deletes `node_modules` before installing — giving deterministic, reproducible builds.

---

## 2. Frontend Dockerfile

**File:** `frontend/Dockerfile`

### What changed

The old Dockerfile ran `npm start` (Create React App dev server) inside the container. That is not suitable for production:

- Single-threaded Node process
- No response compression
- No cache headers for static assets
- Hot-reload overhead included

### New: Multi-stage build

```
Stage 1 (builder): node:18-alpine
  → npm ci
  → npm run build   (produces /app/build/)

Stage 2 (serve): nginx:1.25-alpine
  → COPY --from=builder /app/build /usr/share/nginx/html
```

**Benefits:**
- Final image contains **only nginx + static files** — no Node.js, no source code, no devDependencies
- nginx handles compression (gzip), proper `Cache-Control` headers, and serves thousands of concurrent connections efficiently
- Image goes from ~1 GB → ~25 MB

---

## 3. docker-compose.yml

### Changes summary

| Area | Before | After |
|---|---|---|
| Postgres image | `postgres:15` (floating tag) | `postgres:15.6` (pinned) |
| DB credentials | Hardcoded inline | Read from `.env` via `env_file: .env` |
| DB port | Exposed to host on `5432` | **Not exposed** — only reachable inside Docker network |
| Backend startup | `depends_on: - db` (starts when container starts) | `depends_on: db: condition: service_healthy` |
| DB healthcheck | None | `pg_isready` check every 5s, 5 retries |
| Restart policy | None | `restart: unless-stopped` on db and backend |
| Frontend port | `3000:3000` | `3000:80` (matches nginx in new Dockerfile) |

### Why the healthcheck matters

`depends_on` with no `condition` only waits for the *container* to start — not for Postgres to be ready to accept connections. Without the healthcheck, the backend often crashed on first startup with `ECONNREFUSED` because Postgres was still initialising. The `pg_isready` healthcheck ensures the backend only starts once the database is actually accepting connections.

### Why the DB port is not exposed

In production, the database should never be directly reachable from outside the Docker network. Backend communicates with it via the internal Docker hostname `db:5432`. Removing the host port binding (`5432:5432`) prevents accidental external access.

---

## 4. Credentials via Environment Variables

**Files changed:** `backend/src/config/db.js`, `.env.example`

`db.js` previously had credentials hardcoded (Issue #2 in the bug report). It now reads from `process.env`:

```js
const pool = new Pool({
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host:     process.env.POSTGRES_HOST || 'db',
  port:     parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB,
});
```

---

## 5. Local Setup

```bash
# 1. Copy the example env file
cp .env.example .env

# 2. Edit .env with your actual credentials (or keep the defaults for local dev)

# 3. Build and start all services
docker compose up --build

# App is now available at:
#   Frontend:  http://localhost:3000
#   Backend:   http://localhost:3001/api
```

> **Note:** `.env` is listed in `.gitignore` and must never be committed to version control. Only `.env.example` (with placeholder values) is tracked.

---

## 6. Verifying the Changes

```bash
# Check that the frontend image is now nginx-based (not node)
docker compose build
docker images | grep assignment

# Watch backend logs — it should only start AFTER postgres is healthy
docker compose up 2>&1 | grep -E "(db|backend|healthy)"

# Confirm only one SQL query per GET /api/orders (N+1 fix verification)
docker compose logs backend
```
