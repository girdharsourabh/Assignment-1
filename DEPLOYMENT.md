# Deployment Improvements

The original Docker configuration was suitable for local development but lacked optimizations for a production environment. I have overhauled the containerization strategy to improve performance, security, and reliability.

## 1. Multi-Stage Frontend Build
* **Change:** Converted the frontend `Dockerfile` to a multi-stage build.
* **Why:** The original setup shipped the entire Node.js runtime and used `react-scripts start` (a development server) to serve the app. The new setup compiles the React app into static HTML/CSS/JS in Stage 1, and then serves only those static files using a lightweight `nginx:alpine` image in Stage 2. This reduces the final image size by over 80% and provides a robust web server designed for production traffic.

## 2. Alpine Base Images
* **Change:** Switched all base images (`node:18` and `postgres:15`) to their `-alpine` variants.
* **Why:** Alpine Linux is a highly stripped-down OS. Using it significantly reduces the image footprint, which means faster pull/push times in CI/CD pipelines, lower storage costs, and a drastically reduced attack surface for security vulnerabilities.

## 3. Docker Layer Caching & Dependency Optimization
* **Change:** In both Node.js Dockerfiles, `package.json` and `package-lock.json` are now copied and installed *before* the rest of the source code.
* **Why:** Docker caches image layers. If the application code changes but the dependencies do not, Docker skips the `npm install` step, drastically speeding up subsequent builds. Additionally, changed `npm install` to `npm ci --only=production` in the backend to ensure deterministic builds without installing unnecessary `devDependencies`.

## 4. Security: Non-Root Execution
* **Change:** Added `USER node` to the backend `Dockerfile`.
* **Why:** By default, Docker containers run as the `root` user. If an attacker manages to exploit a vulnerability in the Node application, they gain root access to the container. Running the process as the restricted `node` user mitigates this risk.

## 5. Container Orchestration & Health Checks
* **Change:** Added a `healthcheck` to the PostgreSQL service and updated the backend's `depends_on` to wait for `service_healthy`.
* **Why:** Previously, the backend container would start immediately after the database container was created, often crashing because PostgreSQL takes a few seconds to initialize and accept connections. The health check ensures the backend waits until the database is fully ready to accept queries.
