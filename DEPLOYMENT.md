# Deployment Guide

## Overview

This app can be run in three ways:

| Mode                      | Command                        | Use case               |
| ------------------------- | ------------------------------ | ---------------------- |
| Local development         | `docker compose up --build`    | Day-to-day development |
| Single image (Docker Hub) | `docker build` + `docker push` | Cloud deployment       |
| Production on Render      | Pull from Docker Hub + Neon DB | Live deployment        |

---

## Local Development

Uses `docker-compose.yml` which spins up all three services (frontend, backend, database) together.

```bash
docker compose up --build
```

| Service     | URL                          |
| ----------- | ---------------------------- |
| Frontend    | http://localhost:3000        |
| Backend API | http://localhost:3001/api    |
| Database    | PostgreSQL on localhost:5432 |

The database is seeded automatically from `db/init.sql` on first run.

---

## Docker Improvements (from original)

### Backend Dockerfile

**Before:**

```dockerfile
FROM node:18
COPY . .
RUN npm install
CMD ["npm", "start"]
```

**After:**

```dockerfile
FROM node:18-alpine
COPY package*.json ./
RUN npm install --omit=dev
COPY src/ ./src/
CMD ["node", "src/index.js"]
```

**Why:**

- `node:18-alpine` is ~180 MB vs ~1 GB for `node:18`
- Copying `package*.json` first means the `npm install` layer is cached unless dependencies change — a one-line code edit no longer re-downloads all packages
- `--omit=dev` excludes dev dependencies from the production image
- `node` directly instead of `npm start` avoids spawning an extra process

### Frontend Dockerfile

**Before:**

```dockerfile
FROM node:18
CMD ["npm", "start"]   # CRA dev server — not for production
```

**After:**

```dockerfile
FROM node:18-alpine AS builder
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=builder /app/build /usr/share/nginx/html
```

**Why:**

- CRA dev server is not suitable for production — slow, serves unminified files
- Multi-stage build: Node builds the app, nginx serves the static output
- Final image is ~25 MB vs ~1 GB — Node runtime is discarded after build

### docker-compose.yml

- Added `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` to backend environment — these were missing, causing the backend to fail to connect to the database inside Docker
- `DB_HOST` must be `db` (the Docker Compose service name) not `localhost`
- Added `package-lock.json` to both backend and frontend for deterministic dependency versions

---

## Production Deployment — Single Docker Image

For cloud deployment, the app is packaged as a **single image** containing both the React frontend and Node backend. nginx serves the frontend and proxies `/api/*` requests to Node internally.

### Architecture inside the single container

```
Browser → port (Render assigns) → nginx
                                    ├── /api/*  → proxies to Node on :3001
                                    └── /*      → serves React static files
```

### Files added for single-image build

| File         | Purpose                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| `Dockerfile` | Root-level multi-stage build — builds React + backend, serves via nginx |
| `nginx.conf` | nginx config — serves frontend, proxies `/api/` to Node                 |
| `start.sh`   | Startup script — injects `$PORT` into nginx config, starts nginx + Node |

### Build and push to Docker Hub

```bash
# Login
docker login

# Build the single combined image
docker build -t YOUR_DOCKERHUB_USERNAME/order-management:latest .

# Push to Docker Hub
docker push YOUR_DOCKERHUB_USERNAME/order-management:latest
```

### Why a single image

Cloud platforms like Render do not support `docker-compose` — each service must be deployed separately or packaged into one image. Bundling frontend + backend into one image means:

- One service to deploy and manage
- No separate frontend hosting needed
- Works on any platform that can run a Docker container

---

## Production Deployment on Render

### Database — Neon (free managed Postgres)

The production database is hosted on [Neon](https://neon.tech) (free tier, no expiry).

**One-time setup — seed the database:**

1. Go to [console.neon.tech](https://console.neon.tech) → your project → **SQL Editor**
2. Paste and run the full contents of `db/init.sql`

This creates the tables and inserts sample data.

### Web Service on Render

1. Render dashboard → **New** → **Web Service**
2. Select **Deploy an existing image from a registry**
3. Image URL: `sparkdevelopie/order-management:latest`
4. Go to **Environment** tab and add:

| Key           | Value                                                             |
| ------------- | ----------------------------------------------------------------- |
| `DB_HOST`     | `ep-billowing-breeze-adlyfwfz-pooler.c-2.us-east-1.aws.neon.tech` |
| `DB_PORT`     | `5432`                                                            |
| `DB_USER`     | `neondb_owner`                                                    |
| `DB_PASSWORD` | `npg_a5Z9jwrUhqLH`                                                |
| `DB_NAME`     | `neondb`                                                          |
| `DB_SSL`      | `true`                                                            |
| `PORT`        | `10000`                                                           |

5. Click **Manual Deploy**

### Why `DB_SSL=true`

Cloud Postgres providers (Neon, Supabase, Render Postgres) require SSL connections. The `db.js` config reads `DB_SSL` and enables SSL when set to `true`. This env var is not set in local `docker-compose.yml` so SSL stays off locally where it is not needed.

### Why `PORT=10000`

Render assigns its own public port via the `$PORT` environment variable (typically `10000`). nginx binds to this port. Node runs on a fixed internal port `3001` — the `start.sh` script unsets `$PORT` before starting Node so Node always uses its fallback of `3001` and never conflicts with nginx.

### Live URL

https://order-management-latest.onrender.com

---

## Re-deploying after code changes

```bash
# 1. Make your changes
# 2. Rebuild the image
docker build -t sparkdevelopie/order-management:latest .

# 3. Push to Docker Hub
docker push sparkdevelopie/order-management:latest

# 4. Go to Render → Manual Deploy
# Render pulls the new image and restarts the service
```

---

## Notes

- Render's free tier spins down the service after inactivity — the first request after a period of inactivity may take ~50 seconds to respond
- The Neon free tier keeps the database alive indefinitely (no 90-day expiry unlike Render's own Postgres)
- Local `docker compose up` is completely unaffected by the production setup — it uses its own postgres container and does not need any of the cloud env vars

<!-- # Deployment Improvements

## Changes Made

### 1. Backend Dockerfile — layer caching + alpine base

**Before:**

```dockerfile
FROM node:18
COPY . .
RUN npm install
CMD ["npm", "start"]
```

**After:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY src/ ./src/
CMD ["node", "src/index.js"]
```

**Why:**

- `COPY . .` before `npm install` busts the Docker layer cache on every source file change, forcing a full re-download of all packages even for a one-line edit. Copying `package*.json` first means the install layer is only re-run when dependencies actually change.
- `node:18-alpine` is ~180 MB vs ~1 GB for `node:18`. Smaller image = faster pulls, less disk usage, smaller attack surface.
- `--omit=dev` excludes dev dependencies (nodemon etc.) from the production image.
- `node src/index.js` directly instead of `npm start` avoids spawning an extra npm process.

---

### 2. Frontend Dockerfile — multi-stage build with nginx

**Before:**

```dockerfile
FROM node:18
COPY . .
RUN npm install
CMD ["npm", "start"]   # CRA dev server in production
```

**After:**

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

FROM nginx:1.25-alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Why:**

- The CRA dev server (`react-scripts start`) is not suitable for production. It is slow, includes hot-reload overhead, and serves unminified source files.
- `npm run build` produces a minified, optimised static bundle. nginx serves it ~10× faster under load.
- The final image contains only nginx + the static files. The Node.js runtime, source code, and all build tooling are discarded after the build stage. The resulting image is ~25 MB vs ~1 GB.
- The frontend now serves on port 80 (mapped to 3000 on the host in docker-compose).

---

### 3. docker-compose.yml — DB environment variables passed to backend

**Before:**

```yaml
backend:
  environment:
    PORT: 3001
    # DB_HOST, DB_USER etc. were missing
```

**After:**

```yaml
backend:
  environment:
    PORT: 3001
    DB_HOST: db
    DB_PORT: 5432
    DB_USER: admin
    DB_PASSWORD: admin123
    DB_NAME: orderdb
```

**Why:**
Without these variables the backend container had no way to connect to the database inside Docker (`process.env.DB_HOST` was `undefined`). This caused a 500 error on every API call when running via `docker compose up`.

Note: `DB_HOST` must be `db` (the service name), not `localhost`. Each Docker Compose service runs in its own container and they communicate via service names on an internal network — `localhost` inside the backend container refers to the backend container itself, not the database.

---

## How to Run

**Docker (recommended):**

```bash
docker compose down       # stop and remove old containers
docker compose up --build # rebuild with updated Dockerfiles
```

Services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api
- Database: PostgreSQL on port 5432

**Local development (running Node directly):**

```bash
# Terminal 1 — start the DB however you normally do
# Terminal 2 — backend
cd backend
cp .env.example .env    # edit .env with your local Postgres credentials
npm install
npm start

# Terminal 3 — frontend
cd frontend
npm install
npm start               # runs on http://localhost:3000
```

Your local `.env` should have `DB_HOST=localhost` when running Node directly (not in Docker). -->
