FROM node:18-alpine

WORKDIR /app

# Copy package files first — npm install layer is cached unless dependencies change
COPY package*.json ./
RUN npm install --omit=dev

# Copy source after installing dependencies
COPY src/ ./src/

EXPOSE 3001

CMD ["node", "src/index.js"]
