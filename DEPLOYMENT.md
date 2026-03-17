# DEPLOYMENT.md

## Overview

This document explains the deployment improvements made to the Order Management System as part of Task 4 (Option B).

---

## What Was Changed

### 1. Backend `Dockerfile` — Multi-Stage Build

**Before:**
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3001
CMD ["npm", "start"]
```

**After:**
```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
EXPOSE 3001
CMD ["node", "src/index.js"]
```

**Why:**
- **Multi-stage build**: Separates the dependency installation from the final image so no unnecessary build tools end up in production.
- **`node:18-alpine`**: The alpine variant is ~70% smaller than the full Debian-based `node:18` image (≈50 MB vs ≈350 MB), reducing attack surface and pull time.
- **`npm ci --only=production`**: Installs exact locked versions from `package-lock.json` and skips devDependencies — deterministic and minimal.
- **Non-root user**: Running as a non-root user inside the container is a security best practice. If the application is compromised, the attacker has no root access to the host.
- **Direct `node` invocation**: Avoids the overhead of npm script parsing; also ensures signals (SIGTERM) propagate correctly so Docker can gracefully shut down the process.

---

### 2. Frontend `Dockerfile` — Static Build via Nginx

**Before:**
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["npm", "start"]
```

**After:**
```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Why:**
- **Static build**: The React dev server (`npm start`) is only meant for development. In production, compiling to static files and serving them with nginx is orders of magnitude more performant and secure.
- **`nginx:alpine`**: Tiny image (~25 MB) that serves HTML/CSS/JS efficiently with correct caching headers and gzip compression out of the box.
- **Final image has no Node.js**: The build tools are only in the intermediate `build` stage — the shipped image is `nginx:alpine` + static files only.

---

### 3. `docker-compose.yml` — Health Checks, Restart Policies, and Environment Variables

**Key changes:**

| Feature | Before | After |
|---|---|---|
| Compose version | `3` | `3.9` |
| DB image | `postgres:15` | `postgres:15-alpine` |
| DB credentials | Hardcoded | Read from env vars (`${DB_USER}`) |
| Health check | None | `pg_isready` probe on the db service |
| Backend waits for DB | `depends_on: db` | `depends_on: db: condition: service_healthy` |
| Restart policy | None | `restart: unless-stopped` |
| Frontend port | `3000:3000` | `3000:80` (matches nginx) |

**Why:**
- **Health check + `condition: service_healthy`**: Without this, the backend starts at the same time as the database and immediately crashes because Postgres isn't ready yet. The health check makes the backend wait until Postgres accepts connections.
- **`restart: unless-stopped`**: Ensures services automatically recover from unexpected crashes in production without manual intervention.
- **Environment variables for credentials**: Secrets are now read from the host environment or a `.env` file, not baked into source code. A `.env.example` file is included as a template.

---

## Running in Production

1. Copy `.env.example` to `.env` and set strong passwords:
   ```bash
   cp .env.example .env
   # edit .env with real credentials
   ```
2. Start the stack:
   ```bash
   docker compose up --build -d
   ```
3. Frontend is available at `http://localhost:3000`; backend API at `http://localhost:3001/api`.
