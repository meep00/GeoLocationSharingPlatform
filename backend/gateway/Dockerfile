FROM node:20-alpine

WORKDIR /app

COPY backend/shared/package*.json backend/shared/
COPY backend/gateway/package*.json backend/gateway/

WORKDIR /app/backend/gateway

RUN npm install

WORKDIR /app
COPY backend/shared backend/shared
COPY backend/gateway backend/gateway

WORKDIR /app/backend/gateway

EXPOSE 3000

CMD ["npm", "run", "start:dev"]
