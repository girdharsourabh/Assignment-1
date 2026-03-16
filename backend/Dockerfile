FROM node:18-alpine

WORKDIR /app

# Copy package files first for layer caching
COPY package*.json ./

# Install only production dependencies for a smaller, safer footprint
RUN npm install --omit=dev

# Copy application source code
COPY . .

# Switch to the restricted 'node' user provided by the base image
USER node

EXPOSE 3001

CMD ["node", "src/index.js"]
