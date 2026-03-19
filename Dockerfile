# ── Stage 1: Build React frontend ──────────────────────────────────────────────
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/src/ ./src/
COPY frontend/public/ ./public/

# Bake the API URL at build time — override with --build-arg if needed
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# ── Stage 2: Build backend dependencies ────────────────────────────────────────
FROM node:18-alpine AS backend-builder

WORKDIR /app/backend

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY backend/src/ ./src/

# ── Stage 3: Final image — nginx + node together ───────────────────────────────
FROM node:18-alpine

# Install nginx
RUN apk add --no-cache nginx

WORKDIR /app

# Copy backend
COPY --from=backend-builder /app/backend ./backend

# Copy built React app into nginx html directory
COPY --from=frontend-builder /app/frontend/build /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Startup script — launches both nginx and node
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 80

CMD ["./start.sh"]