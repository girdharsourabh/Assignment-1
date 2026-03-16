# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
# Default Nginx config works fine for React SPA usually, but could add custom one if needed
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
