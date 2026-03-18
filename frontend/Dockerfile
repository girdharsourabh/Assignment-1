FROM node:18 AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install


FROM node:18 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build


FROM node:18-slim AS runner
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY --from=builder /app ./

EXPOSE 3000

CMD ["npm", "start"]