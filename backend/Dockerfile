# ---- dependencies ----
FROM node:18-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

# ---- runtime ----
FROM node:18-slim AS runner
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3001

CMD ["npm", "start"]