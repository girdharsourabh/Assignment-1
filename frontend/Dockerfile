FROM node:18-alpine

WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./

RUN npm install

# Copy rest of code
COPY . .

# Build production app
RUN npm run build

# Install lightweight static server
RUN npm install -g serve

EXPOSE 3000

CMD ["serve", "-s", "build"]



# FROM node:18

# WORKDIR /app

# COPY . .

# RUN npm install

# EXPOSE 3000

# CMD ["npm", "start"]
