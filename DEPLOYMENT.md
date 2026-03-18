# Task 4: Improve Deployment

## Overview
Task 4 required improving the deployment setup. I chose **Option B**: Improving Dockerfiles and `docker-compose.yml` to be more production-ready.

## Solving Approach
1. **Docker Best Practices**: Implemented multi-stage builds for both frontend and backend to minimize image sizes.
2. **Nginx Integration**: For the frontend, I switched from using a dev server (`npm start`) to serving static files with Nginx, which is the standard for production React apps.
3. **Orchestration Improvements**: Enhanced `docker-compose.yml` with health checks and proper dependency management, ensuring the backend waits for the database to be "healthy" before starting.
4. **Security & Reliability**: Added a non-root user for the backend and implemented restart policies for all services.


