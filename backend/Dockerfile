FROM node:24-alpine3.23

ENV NODE_ENV=production

RUN apk add --no-cache curl

USER node

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

RUN npm install --omit=dev

COPY --chown=node:node src/ src/

HEALTHCHECK --interval=10s --timeout=15s --start-period=5s --retries=3 CMD [ "curl", "-f", "http://localhost:3001/api/health" ]

EXPOSE 3001

CMD ["npm", "run", "start"]