# FIX: Copy package files first so npm ci is only re-run when dependencies change,
# not on every source code change. Switch to alpine for a smaller image.
FROM node:18-alpine

WORKDIR /app

# Layer 1: dependencies (cached unless package*.json changes)
COPY package*.json ./
RUN npm ci --only=production

# Layer 2: source code (invalidates only this layer on code changes)
COPY src ./src

EXPOSE 3001

CMD ["node", "src/index.js"]
