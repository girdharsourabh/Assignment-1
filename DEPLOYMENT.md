# Deployment Improvements

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

Your local `.env` should have `DB_HOST=localhost` when running Node directly (not in Docker).
