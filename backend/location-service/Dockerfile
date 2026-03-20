FROM node:20-alpine

WORKDIR /app/backend/location-service

COPY backend/location-service/package*.json .

RUN npm install

WORKDIR /app
COPY backend/location-service backend/location-service

WORKDIR /app/backend/location-service

EXPOSE 3003

CMD ["npm", "run", "start:dev"]
