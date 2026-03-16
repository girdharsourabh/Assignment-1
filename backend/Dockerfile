# Build stage
FROM node:18-alpine AS base

WORKDIR /app
COPY package*.json ./
RUN npm install --production

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY --from=base /app/node_modules ./node_modules
COPY . .

EXPOSE 3001
CMD ["node", "src/index.js"]
