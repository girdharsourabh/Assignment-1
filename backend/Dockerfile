FROM node:18-alpine

# Use production environment
ENV NODE_ENV=production

WORKDIR /app

# Copy package files and install production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy application source
COPY . .

# Run as non-root user for security
USER node

EXPOSE 3001

CMD ["npm", "start"]
