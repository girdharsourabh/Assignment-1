FROM node:18-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json package-lock.json* ./

RUN npm install --production

COPY src/ ./src/

EXPOSE 3001

USER node

CMD ["node", "src/index.js"]
