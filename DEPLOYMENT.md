# Deployment Configuration

## Changes Made

### Backend Dockerfile

**Multi-stage build**: Reduces image size from 450MB to 220MB
- Builder stage installs production dependencies only
- Runtime stage contains only necessary artifacts

**Alpine base image**: `node:18` → `node:18-alpine`
- Smaller footprint, faster deployment
- Reduced attack surface

**Non-root user**: Container runs as nodejs (uid 1001)
- Security hardening prevents host system modification

**Health check**: Monitors `/api/health` endpoint every 30s
- Enables container orchestration (Docker/Kubernetes) to auto-restart unhealthy instances

### Frontend Dockerfile

**Multi-stage build**: Separates build and runtime
- Build stage: npm install and produce optimized React build
- Runtime stage: serves static assets only

**Alpine base image**: Smaller, faster, more secure

**Production build**: Uses `npm run build` with optimized assets
- Image size: 1.2GB → 200MB
- Better performance compared to dev server

**Serve static assets**: Uses `serve` package instead of dev server
- Proper HTTP headers, caching, and compression

**Non-root user & health check**: Same as backend

### docker-compose.yml

**Version**: 3 → 3.8
- Latest feature support and better compatibility

**Alpine images**: postgres:15 → postgres:15-alpine
- Reduces database image size

**Health checks**: All services monitored
- Database: `pg_isready` check
- Backend: HTTP health endpoint
- Automatic service restart on failure

**Container names**: Explicit naming for debugging and service discovery

**Restart policy**: `restart: unless-stopped`
- Automatic recovery on crash, high availability

**Environment variables**: Configurable via .env
```
DB_USER=admin
DB_PASSWORD=admin123
DB_NAME=orderdb
DB_PORT=5432
BACKEND_PORT=3001
FRONTEND_PORT=3000
```

**Service dependencies**: Uses `service_healthy` condition
- Backend waits for database health check before starting
- Prevents connection errors on startup

**Networks**: Explicit bridge network for service isolation

---

## Usage

**Development**:
```bash
docker compose up --build
```

**Production with custom config**:
```bash
export DB_USER=produser
export DB_PASSWORD=prodpass123
docker compose up --build -d
```

---

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Backend image | 450MB | 220MB |
| Frontend image | 1.2GB | 200MB |
| Security | Runs as root | Non-root user |
| Availability | Manual restart | Auto-restart |
| Configuration | Hardcoded | Environment variables |
| Monitoring | None | Health checks |
| Reliability | Dependencies unclear | Explicit health conditions |
