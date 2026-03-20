FROM node:20-alpine

WORKDIR /app/backend/tours-service

COPY backend/tours-service/package*.json .

RUN npm install

WORKDIR /app
COPY backend/tours-service backend/tours-service

WORKDIR /app/backend/tours-service

EXPOSE 3002

CMD ["npm", "run", "start:dev"]
