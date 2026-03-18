# [DEPLOYMENT.md](http://DEPLOYMENT.md)

## Overview

I improved the Docker setup by replacing the original single-stage Dockerfiles with multi-stage builds for both frontend and backend.

The goal was to make the images smaller, cleaner, and more production-ready without changing how the app is started.

---

## Previous Setup

### Frontend

```dockerfile
FROM node:18

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 3000

CMD ["npm", "start"]
```

### Backend

```dockerfile
FROM node:18

WORKDIR /app

COPY . .

RUN npm install

EXPOSE 3001

CMD ["npm", "start"]
```

### What I improved (Problems)\\

- using a single-stage build for both services, producing larger images than necessary
- copied the full source before installing dependencies, which reduces Docker layer caching efficiency
- dependency installation would rerun more often than needed on source changes
- used a big runtime image

### Why

- Multi-Stage build help separates dependency installation, build, and runtime responsibilities. It avoids carrying unnecessary intermediate layers directly into the final image.
- Dependency layer, docker to cache the dependency install layer. If only source files change and dependencies do not, docker can reuse the cached install step and rebuild faster.
- Reduces final image size compared to the full `node:18` image and makes containers lighter to ship and run. As `node:18` base image size it much larger as compared to `node:18-slim`
-  The frontend has a build process, so it benefits from separating compilation from runtime. The final runtime stage is cleaner and does not need to repeat build work.