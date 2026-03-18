FROM node:20-alpine AS base

# Stage 1: Build Stuff
FROM base as builder

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Stage 2: Run Stuff
FROM base as runner

RUN npm install -g serve

USER node

WORKDIR /usr/src/app
COPY --chown=node:node --from=builder /app/build ./build

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
