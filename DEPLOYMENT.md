# Deployment Configuration Changes

This document outlines the changes made to the Docker and deployment configurations for the Order Mangement API (Backend) and UI (Frontend) to make them fully production-ready, secure, and highly performant.

## 1. Backend (`backend/Dockerfile`)

* **Changed Starter Command:** Replaced development-only `nodemon` (`npm run dev`) with the direct Node binary (`CMD ["npm", "run", "start"]`). `nodemon` consumes unnecessary resources and is not intended for production traffic.
* **Separated Environment Secrets:** Removed `COPY .env .env`. Baking secrets into a Docker image is a major security risk. Environment variables are now injected at runtime via `docker-compose.yml`.
* **Set `NODE_ENV=production`:** Added this environment variable to tell Node.js and Express to optimize for production (e.g., caching templates, reducing verbose error logging).
* **Non-Root Execution:** Added `USER node`. By default, Docker runs applications as the powerful `root` user. Utilizing the unprivileged `node` user provided by Alpine Linux strongly mitigates security vulnerabilities.
* **Correct Permissions:** Updated `COPY` statements to use `--chown=node:node` so the unprivileged user has correct read/write access to the application files.

## 2. Frontend (`frontend/Dockerfile`)

* **Multi-Stage Build Architecture:** Converted the Dockerfile to use two distinct stages (`builder` and `runner`) to drastically reduce the final image size.
* **Removed Development Server:** Replaced `npm start` (which runs `react-scripts start`) with the lightweight `serve` package. The React development server is notoriously slow, heavily unoptimized, and ships with massive compilers (Webpack/Babel). `serve` simply hosts the minified, static HTML/JS files lightning fast.
* **Static File Isolation:** The final image now *only* contains the compiled `build/` folder rather than the entire source code and gigabytes of `devDependencies`.
* **Non-Root Execution:** Mirrored the backend by switching to the unprivileged `node` user for the final serving stage.

## 3. General Optimizations

* **Added `.dockerignore` Files:** Created `.dockerignore` files for both frontend and backend to ignore the local `node_modules`, `build`, and `.git` folders. This prevented Docker from needlessly copying ~250MB of local data to the Docker daemon, reducing the "build context transfer" time from ~7.5 minutes to less than a second.
* **Updated `docker-compose.yml`:** Added the `env_file` property to the backend service. Since the backend image no longer contains the hardcoded `.env` file, this ensures the container automatically receives the necessary database credentials when starting up.
