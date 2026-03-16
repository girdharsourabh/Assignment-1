FROM node:18-alpine

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install only production dependencies for small, safer footprint
RUN npm ci --only=production

# Copy application source code
COPY . .

# Switching to restricted 'node' user provided by base image
USER node

EXPOSE 3001

CMD ["node", "src/index.js"]
