# Deployment Documentation

This document explains the improvements made to the Docker setup to make it more production-ready.

## Changes Made

### 1. Multi-Stage Builds
- **Backend**: Separated the build environment from the runtime environment. The final image only contains the necessary `node_modules` (production only) and source code, reducing the image size and security surface area.
- **Frontend**: Now uses a two-stage build. 
    1. The React app is built using Node.js.
    2. The static build artifacts are served using a lightweight **Nginx** image. This is much more efficient than using a development server (`npm start`) in production.

### 2. Security and Reliability
- **Alpine Images**: Switched to Alpine-based images for both backend and frontend to minimize the OS footprint and vulnerabilities.
- **Health Checks**: Added a health check to the PostgreSQL service. The backend now waits for the database to be "healthy" before starting, preventing crash loops during initial deployment.
- **Restart Policies**: Added `restart: always` to all services to ensure they recover automatically from failures or system reboots.
- **Environment Variables**: Moved credentials into environment variables with support for `.env` files and `docker-compose` defaults.

### 3. Data Persistence
- Added a named volume `postgres_data` for the database to ensure data is not lost when the container is removed.

## How to Run

1.  Create or update the `.env` file in the root if you want to override defaults.
2.  Run the following command:
    ```bash
    docker compose up --build
    ```
3.  The frontend will be available at `http://localhost:3000` (served by Nginx on port 80).
4.  The backend API is at `http://localhost:3001/api`.
