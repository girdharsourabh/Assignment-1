# ---- Stage 1: Build ----
# FIX: Multi-stage build. The dev server (npm start) is not production-ready —
# it's single-threaded, has no compression, and no caching headers.
# This stage builds the static assets with Create React App.
FROM node:18-alpine AS builder

WORKDIR /app

# Cache dependencies separately from source
COPY package*.json ./
RUN npm ci

COPY public ./public
COPY src    ./src

RUN npm run build

# ---- Stage 2: Serve ----
# Serve the compiled static files with nginx — much faster, handles compression
# and caching headers out of the box, and the final image has no Node.js at all.
FROM nginx:1.25-alpine

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

# nginx starts automatically — no CMD needed (inherited from base image)
