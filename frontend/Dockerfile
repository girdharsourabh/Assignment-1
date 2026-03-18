# Stage 1 — build the React app
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY public/ ./public/
COPY src/ ./src/

RUN npm run build

# Stage 2 — serve the static build with nginx (no Node dev server in production)
FROM nginx:1.25-alpine

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
