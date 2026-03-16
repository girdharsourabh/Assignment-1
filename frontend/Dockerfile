FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./

ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm install

COPY . .

RUN npm run build

# production stage
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]