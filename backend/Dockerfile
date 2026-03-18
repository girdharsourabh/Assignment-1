FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV = production

# Copy only package files first (for caching)
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy rest of the code
COPY . .

EXPOSE 3001

CMD ["node", "src/index.js"]



# FROM node:18

# WORKDIR /app

# COPY . .

# RUN npm install

# EXPOSE 3001

# CMD ["npm", "start"]