FROM node:18-alpine

WORKDIR /app

# Copy dependency files first (better caching)
COPY package*.json ./

COPY . .

RUN npm install

EXPOSE 3001

CMD ["npm", "start"]
