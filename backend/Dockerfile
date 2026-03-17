FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3001

CMD ["npm", "start"]
