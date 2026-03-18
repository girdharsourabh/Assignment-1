FROM node:18-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json ./

RUN npm install --omit=dev

COPY src ./src

USER node

EXPOSE 3001

HEALTHCHECK --interval=10s --timeout=3s --retries=10 CMD node -e "fetch('http://localhost:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/index.js"]
