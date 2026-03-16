# Deployment Improvements

This document outlines the changes made to the deployment configuration as per Task 4 Option B.

## Backend Improvements
1. **Production Node Environment**: Set `NODE_ENV=production` in the Dockerfile. This enables optimization features in Express and other Node libraries, improving performance.
2. **Minimal Dependencies**: Switched from `npm install` to `npm ci --only=production`. This ensures only the exact dependencies listed in `package-lock.json` are installed without dev dependencies like `nodemon` or testing frameworks, reducing the image size and attack surface.
3. **Alpine Base Image**: Switched from `node:18` to `node:18-alpine` to significantly reduce the base image size.
4. **Non-Root Execution**: Added `USER node` before running the CMD. Running as a non-root inside the container follows security best practices and limits blast radius in case of RCE vulnerabilities.

## Frontend Improvements
1. **Multi-Stage Build**: Converted the frontend Dockerfile to a multi-stage process. 
2. **Static Serve Layer**: Instead of running a heavy `node:18` development server for production (the default `npm start`), the first stage builds the static HTML, JS, and CSS files. The second stage uses `nginx:alpine` to serve those pre-built files over port 80. This drastically reduces the image size and dramatically improves static file serving performance.

## Docker Networking and Compose Improvements
1. **Environment Variables**: Extracted hardcoded database credentials from code (which was listed in the bug report) and now injected them via `docker-compose.yml` environment variables.
2. **Port Mappings**: Updated the frontend port mapping to `3000:80` since the application is now served by NGINX internally on port 80 instead of the Node dev server on port 3000.
