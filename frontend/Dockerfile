# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy only package files first to leverage Docker layer caching
COPY package*.json ./
RUN npm ci

# Copy the rest of the source code and build
COPY . .
RUN npm run build

# Stage 2: Serve the static files with Nginx
FROM nginx:alpine

# Copy the built assets from the builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Expose Nginx default port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
