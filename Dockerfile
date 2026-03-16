FROM node:18-alpine AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./

RUN npm install

COPY frontend/public ./public
COPY frontend/src ./src

RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./

RUN npm install --omit=dev

COPY backend/src ./src

COPY --from=frontend-build /app/frontend/build ./public

USER node

EXPOSE 3001

CMD ["node", "src/index.js"]
